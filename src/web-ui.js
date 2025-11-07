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

const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

function uiPageHtml(hadRefreshToken, refreshError, uiAuthEnabled) {
  const templatePath = path.join(__dirname, 'views', 'index.ejs');
  const template = fs.readFileSync(templatePath, 'utf8');
  return ejs.render(
    template,
    { hadRefreshToken, refreshError, uiAuthEnabled },
    { filename: templatePath }
  );
}

async function createWebApp(verbose = false) {
  const tokenFilePath =
    monzo.tokenDir && monzo.tokenFile ? `${monzo.tokenDir}/${monzo.tokenFile}` : null;
  let hadRefreshToken = Boolean(tokenFilePath && fs.existsSync(tokenFilePath));
  let refreshError = null;
  if (hadRefreshToken) {
    try {
      await setupMonzo();
    } catch (err) {
      logger.error({ err }, 'Monzo refresh failed');
      refreshError = err.message;
    }
  }

  const deprecatedUser = process.env.UI_USER || config.UI_USER;
  const deprecatedPass = process.env.UI_PASSWORD || config.UI_PASSWORD;
  if (deprecatedUser || deprecatedPass) {
    console.error(
      'Error: UI_USER/UI_PASSWORD authentication has been removed.\n' +
        'Please configure session-based auth via ACTUAL_PASSWORD (see README).'
    );
    process.exit(1);
  }

  let budgetReady = false;
  Promise.resolve(openBudget())
    .then(() => {
      budgetReady = true;
    })
    .catch((err) => {
      logger.error({ err }, 'Budget download failed');
      budgetReady = true;
    });

  const app = express();
  app.use(express.json());
  app.use(express.static(path.join(__dirname, '..', 'public')));

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

  app.get('/auth', (_req, res) => monzo.authorize(res));
  app.get(
    '/auth/callback',
    asyncHandler(async (req, res) => {
      const { code, state } = req.query;
      try {
        await monzo.handleCallback(code, state);
        return res.redirect('/?auth=success');
      } catch (err) {
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
      if (!monzo.isAuthenticated()) {
        return res.status(401).end();
      }
      let mapping = [];
      try {
        mapping = JSON.parse(fs.readFileSync(mappingFile, 'utf8'));
      } catch {}

      let monoAccounts = [];
      let pots = [];
      try {
        monoAccounts = await monzo.listAccounts();
        for (const acct of monoAccounts) {
          const acctPots = await monzo.listPots(acct.id);
          pots = pots.concat(acctPots);
        }
        pots = pots.filter((p) => !p.deleted);
      } catch (err) {
        logger.error({ err }, 'Failed to fetch Monzo accounts or pots');
      }

      try {
        await api.sync();
      } catch (err) {
        logger.error({ err }, 'Failed to sync budget');
      }

      let accountsList = [];
      try {
        accountsList = await api.getAccounts();
      } catch (err) {
        logger.error({ err }, 'Failed to fetch Actual Budget accounts');
      }

      const authenticated = monoAccounts.length > 0;
      logger.info({ authenticated }, 'Monzo authentication status');
      return res.json({ monoAccounts, pots, accounts: accountsList, mapping, authenticated });
    })
  );

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

  app.use((err, req, res, next) => {
    logger.error({ err, method: req.method, url: req.url }, 'Web UI route error');
    if (res.headersSent) {
      return next(err);
    }
    res.status(500).json({ error: err.message });
  });

  return app;
}

async function startWebUi(httpPort, verbose) {
  const app = await createWebApp(verbose);

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

  const server = app.listen(httpPort, () => {
    const addr = server.address();
    logger.info(
      { port: addr && typeof addr === 'object' ? addr.port : httpPort },
      'Web UI server listening'
    );
  });
  server.keepAliveTimeout = 0;
  server.requestTimeout = 0;
  return server;
}

module.exports = { startWebUi, createWebApp, uiPageHtml };
