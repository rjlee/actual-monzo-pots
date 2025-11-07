require('dotenv').config();
const express = require('express');
const path = require('path');
const ejs = require('ejs');
const logger = require('./logger');
const fs = require('fs');
const https = require('https');
const cookieSession = require('cookie-session');
const config = require('./config');
const { setupMonzo, openBudget } = require('./utils');
const monzo = require('./monzo-client');
const api = require('@actual-app/api');
const { runSync } = require('./sync');
// Helper to wrap async route handlers and forward errors to the global error handler
const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// Generate the HTML for the UI page via EJS template
// Generate the HTML for the UI page via EJS template
// uiAuthEnabled toggles display of the logout button in the UI
function uiPageHtml(hadRefreshToken, refreshError, uiAuthEnabled) {
  const templatePath = path.join(__dirname, 'views', 'index.ejs');
  const template = fs.readFileSync(templatePath, 'utf8');
  return ejs.render(
    template,
    { hadRefreshToken, refreshError, uiAuthEnabled },
    { filename: templatePath }
  );
}

/**
 * Launch the Express-based UI server
 */
async function startWebUi(httpPort, verbose) {
  // Attempt to refresh Monzo access token (if a refresh token exists), track status for UI
  // Determine if a stored refresh token exists, then attempt to refresh it, capturing any error
  const tokenFilePath =
    monzo.tokenDir && monzo.tokenFile ? `${monzo.tokenDir}/${monzo.tokenFile}` : null;
  let hadRefreshToken = tokenFilePath && fs.existsSync(tokenFilePath);
  let refreshError = null;
  if (hadRefreshToken) {
    try {
      await setupMonzo();
    } catch (err) {
      logger.error({ err }, 'Monzo refresh failed');
      refreshError = err.message;
    }
  }
  // Validate that no deprecated Basic Auth settings are present (env or config)
  const deprecatedUser = process.env.UI_USER || config.UI_USER;
  const deprecatedPass = process.env.UI_PASSWORD || config.UI_PASSWORD;
  if (deprecatedUser || deprecatedPass) {
    console.error(
      'Error: UI_USER/UI_PASSWORD authentication has been removed.\n' +
        'Please configure session-based auth via ACTUAL_PASSWORD (see README).'
    );
    process.exit(1);
  }
  // Kick off budget download in background; UI will poll for readiness
  let budgetReady = false;
  // Kick off budget download in background; wrap in Promise.resolve to catch sync throws
  Promise.resolve(openBudget())
    .then(() => {
      budgetReady = true;
    })
    .catch((err) => {
      logger.error({ err }, 'Budget download failed');
      // Mark as ready so UI doesn’t hang indefinitely
      budgetReady = true;
    });
  const app = express();
  app.use(express.json());
  // Serve static assets (JS/CSS) from the public/ directory at project root
  app.use(express.static(path.join(__dirname, '..', 'public')));

  // If configured, serve over HTTPS using provided SSL key & cert
  if (process.env.SSL_KEY && process.env.SSL_CERT) {
    const sslOpts = {
      key: fs.readFileSync(process.env.SSL_KEY),
      cert: fs.readFileSync(process.env.SSL_CERT),
    };
    const server = https.createServer(sslOpts, app).listen(httpPort, () => {
      logger.info({ port: httpPort }, 'Web UI HTTPS server listening');
    });
    return server;
  }

  const UI_AUTH_ENABLED = process.env.UI_AUTH_ENABLED !== 'false';
  const LOGIN_PATH = '/login';
  const loginForm = (error) => {
    const templatePath = path.join(__dirname, 'views', 'login.ejs');
    const template = fs.readFileSync(templatePath, 'utf8');
    return ejs.render(template, { error, LOGIN_PATH }, { filename: templatePath });
  };

  if (UI_AUTH_ENABLED) {
    const SECRET = process.env.ACTUAL_PASSWORD;
    if (!SECRET) {
      logger.error('ACTUAL_PASSWORD must be set to enable UI authentication');
      process.exit(1);
    }
    app.use(express.urlencoded({ extended: false }));
    app.use(
      cookieSession({
        name: 'session',
        keys: [process.env.SESSION_SECRET || SECRET],
        maxAge: 24 * 60 * 60 * 1000,
        httpOnly: true,
        secure: Boolean(process.env.SSL_KEY && process.env.SSL_CERT),
        sameSite: 'strict',
      })
    );

    app.get(LOGIN_PATH, (_req, res) => res.send(loginForm()));
    app.post(LOGIN_PATH, (req, res) => {
      if (req.body.password === SECRET) {
        req.session.authenticated = true;
        return res.redirect(req.query.next || '/');
      }
      return res.status(401).send(loginForm('Invalid password'));
    });

    app.use((req, res, next) => {
      // Allow OAuth endpoints through without prior UI login
      if (req.path === '/auth' || req.path === '/auth/callback') {
        return next();
      }
      if (req.session.authenticated) {
        return next();
      }
      return res.send(loginForm());
    });

    app.post('/logout', (req, res) => {
      req.session = null;
      res.redirect(LOGIN_PATH);
    });
  }

  // Log HTTP requests (basic info always; more details if verbose)
  app.use((req, res, next) => {
    const meta = { method: req.method, url: req.url };
    if (verbose) {
      meta.headers = req.headers;
      meta.query = req.query;
      if (req.body) meta.body = req.body;
    }
    logger.info(meta, 'HTTP request');
    next();
  });
  const dataDir = process.env.DATA_DIR || config.DATA_DIR || './data';
  const absDataDir = path.isAbsolute(dataDir) ? dataDir : path.join(process.cwd(), dataDir);
  const mappingFile = path.join(absDataDir, 'mapping.json');

  // OAuth endpoints for Monzo
  app.get('/auth', (_req, res) => monzo.authorize(res));
  app.get(
    '/auth/callback',
    asyncHandler(async (req, res) => {
      const { code, state } = req.query;
      try {
        await monzo.handleCallback(code, state);
        // Notify UI that authentication succeeded
        return res.redirect('/?auth=success');
      } catch (err) {
        // Redirect back with error message for UI display
        return res.redirect('/?auth=error&message=' + encodeURIComponent(err.message));
      }
    })
  );

  app.get(
    '/',
    asyncHandler(async (_req, res) => {
      try {
        await openBudget();
      } catch (err) {
        logger.error({ err }, 'Budget download/sync on page load failed');
      }
      res.send(uiPageHtml(hadRefreshToken, refreshError, UI_AUTH_ENABLED));
    })
  );

  app.get(
    '/api/data',
    asyncHandler(async (_req, res) => {
      // Require Monzo authentication to fetch data
      if (!monzo.isAuthenticated()) {
        return res.status(401).end();
      }
      // Read existing mappings
      let mapping = [];
      try {
        mapping = JSON.parse(fs.readFileSync(mappingFile, 'utf8'));
      } catch {
        // no mapping file or invalid JSON
      }

      // Fetch Monzo accounts and all their pots; fallback to empty arrays on error
      let monoAccounts = [],
        pots = [];
      try {
        monoAccounts = await monzo.listAccounts();
        pots = [];
        for (const acct of monoAccounts) {
          const acctPots = await monzo.listPots(acct.id);
          pots = pots.concat(acctPots);
        }
        // Remove deleted pots
        pots = pots.filter((p) => !p.deleted);
      } catch (err) {
        logger.error({ err }, 'Failed to fetch Monzo accounts or pots');
      }

      try {
        await api.sync();
      } catch (err) {
        logger.error({ err }, 'Failed to sync budget');
      }

      // Fetch Actual Budget accounts; fallback to empty on error
      let accountsList = [];
      try {
        accountsList = await api.getAccounts();
      } catch (err) {
        logger.error({ err }, 'Failed to fetch Actual Budget accounts');
      }

      // Indicate authenticated only if we have some Monzo accounts
      const authenticated = monoAccounts.length > 0;
      logger.info({ authenticated }, 'Monzo authentication status');
      return res.json({ monoAccounts, pots, accounts: accountsList, mapping, authenticated });
    })
  );

  // Provide budget download status for client polling
  app.get('/api/budget-status', (_req, res) => {
    res.json({ ready: budgetReady });
  });

  app.post('/api/mappings', (req, res) => {
    fs.writeFileSync(mappingFile, JSON.stringify(req.body, null, 2));
    res.json({ success: true });
  });

  app.post(
    '/api/sync',
    asyncHandler(async (_req, res) => {
      const count = await runSync({ verbose: false, useLogger: true });
      res.json({ count });
    })
  );

  // NOTE: this must be after all route handlers to catch any errors
  // Global error handler for UI routes
  app.use((err, req, res, next) => {
    logger.error({ err, method: req.method, url: req.url }, 'Web UI route error');
    if (res.headersSent) {
      return next(err);
    }
    res.status(500).json({ error: err.message });
  });

  const server = app.listen(httpPort, () => {
    const realPort = server.address().port;
    logger.info({ port: realPort }, 'Web UI server listening');
  });
  return server;
}

module.exports = { startWebUi };
