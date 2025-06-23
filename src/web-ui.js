require('dotenv').config();
const fs = require('fs');
const express = require('express');
const logger = require('./logger');
const config = require('./config');
const { setupMonzo, openBudget } = require('./utils');
const monzo = require('./monzo-client');
const api = require('@actual-app/api');
const { runSync } = require('./sync');
// Helper to wrap async route handlers and forward errors to the global error handler
const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// Generate the HTML for the UI page
function uiPageHtml(hadRefreshToken, refreshError) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Monzo Pots Sync</title>
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
</head>
<body class="bg-light">
    <div class="container py-5">
    <h1 class="mb-4 text-center">Monzo Pots Sync</h1>
    <div class="d-flex justify-content-between align-items-center mb-4">
      <a href="/auth" class="btn btn-secondary">Authenticate Monzo</a>
      <span id="authStatus" class="badge bg-warning">Monzo not authenticated</span>
      <span id="budgetStatus" class="badge bg-info">Budget downloading</span>
    </div>
    <div id="accountsList" class="mb-4">
      <h2 class="h5">Monzo Accounts</h2>
      <table class="table table-sm table-bordered">
        <thead><tr>
          <th>ID</th>
          <th>Description</th>
          <th>Owner</th>
          <th>Type</th>
          <th>Account #</th>
          <th>Sort Code</th>
          <th>Currency</th>
        </tr></thead>
        <tbody id="accountsBody"></tbody>
      </table>
    </div>
    <div id="mappingForm">
      <table class="table table-bordered">
        <thead><tr>
          <th>Pot</th>
          <th>Account</th>
          <th>Owner</th>
          <th>Actual Account</th>
        </tr></thead>
        <tbody id="mappingBody"></tbody>
      </table>
      <div class="d-flex align-items-center gap-2">
        <button id="saveBtn" class="btn btn-primary">Save Mappings</button>
        <button id="syncBtn" class="btn btn-success">Sync Now</button>
        <span id="status"></span>
      </div>
    </div>
  </div>
  <script>
    // Indicate prior Monzo authentication via stored refresh token
    if (${hadRefreshToken}) {
      const authEl = document.getElementById('authStatus');
      authEl.textContent = 'Monzo refreshing authentication';
      authEl.className = 'badge bg-info';
    }
    // Show refresh error if initial Monzo token refresh failed
    if (${refreshError != null}) {
      const authEl = document.getElementById('authStatus');
      authEl.textContent = 'Monzo auth refresh failed: ' + ${JSON.stringify(refreshError)};
      authEl.className = 'badge bg-danger';
    }
    // Display OAuth callback status
    (function() {
      const params = new URLSearchParams(window.location.search);
      const statusEl = document.getElementById('status');
      if (params.get('auth') === 'success') {
        statusEl.textContent = 'Monzo authentication successful';
        statusEl.className = 'mt-4 text-center text-success';
        // After OAuth, retry loading pots/accounts once automatically
        setTimeout(loadData, 200);
      } else if (params.get('auth') === 'error') {
        statusEl.textContent = 'Monzo authentication failed: ' + params.get('message');
        statusEl.className = 'mt-4 text-center text-danger';
      }
    })();
    let mapping = [];
    /**
     * Load Monzo/Actual data and render mapping dropdowns.
     * @param {boolean} ready - whether budget is downloaded (enables dropdowns)
     */
    async function loadData(ready = false) {
      // Attempt to fetch fresh data; if fetch fails, bail out
      let res;
      try {
        res = await fetch('/api/data');
      } catch (err) {
        console.error('Failed to fetch /api/data', err);
        return;
      }
      if (res.status === 401) {
        // Not authenticated; redirect to Monzo OAuth
        window.location.href = '/auth';
        return;
      }
      const json = await res.json();
      const { monoAccounts, pots, accounts, mapping: map, authenticated } = json;
      mapping = map;
      // Update Monzo authentication status badge
      const authEl = document.getElementById('authStatus');
      authEl.textContent = authenticated ? 'Monzo authenticated' : 'Monzo not authenticated';
      authEl.className = 'badge ' + (authenticated ? 'bg-success' : 'bg-warning');
      // Populate Monzo accounts table (only show uk_retail* accounts)
      const retailAccounts = monoAccounts.filter(a => a.type?.startsWith('uk_retail'));
      const accountsBody = document.getElementById('accountsBody');
      accountsBody.innerHTML = retailAccounts.map(ac => {
        // Replace any user_id tokens in description with preferred names
        const desc = ac.owners.reduce(
          (d, o) => d.replace(new RegExp(o.user_id, 'g'), o.preferred_name),
          ac.description || ''
        );
        const ownerNames = ac.owners.map(o => o.preferred_name).join(', ');
        return (
          '<tr>' +
            '<td>' + ac.id + '</td>' +
            '<td>' + desc + '</td>' +
            '<td>' + ownerNames + '</td>' +
            '<td>' + ac.type + '</td>' +
            '<td>' + (ac.account_number || '') + '</td>' +
            '<td>' + (ac.sort_code     || '') + '</td>' +
            '<td>' + ac.currency       + '</td>' +
          '</tr>'
        );
      }).join('');
      // Populate pot-account mapping table (including pot’s owning Monzo account and owner name)
      const tbody = document.getElementById('mappingBody');
      tbody.innerHTML = pots.map(pot => {
        const selected = mapping.find(m => m.potId === pot.id)?.accountId || '';
        const options = accounts.map(ac => {
          const sel = ac.id === selected ? ' selected' : '';
          return '<option value="' + ac.id + '"' + sel + '>' + ac.name + '</option>';
        }).join('');
        const acct = monoAccounts.find(a => a.id === pot.current_account_id);
        const owner = acct
          ? acct.owners.map(o => o.preferred_name).join(', ')
          : '';
        return (
          '<tr>' +
            '<td>' + pot.name + ' (' + (pot.balance / 100).toFixed(2) + ' ' + pot.currency + ')</td>' +
            '<td>' + pot.current_account_id + '</td>' +
            '<td>' + owner + '</td>' +
            '<td><select data-pot="' + pot.id + '" class="form-select"' +
              (ready ? '' : ' disabled') + '>' +
              '<option value="">-- none --</option>' + options +
            '</select></td>' +
          '</tr>'
        );
      }).join('');
    }

    /**
     * Poll server until budgetReady, then load data
     */
    async function waitForBudgetThenLoad() {
      const statusEl = document.getElementById('budgetStatus');
      while (true) {
        try {
          const res = await fetch('/api/budget-status');
          const { ready } = await res.json();
          if (ready) {
            statusEl.textContent = 'Budget downloaded';
            statusEl.className = 'badge bg-success';
            break;
          } else {
            statusEl.textContent = 'Budget downloading';
            statusEl.className = 'badge bg-info';
          }
        } catch (err) {
          console.error('Error polling budget-status', err);
          statusEl.textContent = 'Budget downloading';
          statusEl.className = 'badge bg-info';
        }
        await new Promise(r => setTimeout(r, 1000));
      }
      loadData(true);
    }
    document.getElementById('saveBtn').onclick = async () => {
      const statusEl = document.getElementById('status');
      statusEl.textContent = 'Saving mappings...';
      try {
        const newMap = [];
        document.querySelectorAll('select[data-pot]').forEach(sel => {
          const potId = sel.getAttribute('data-pot');
          const accountId = sel.value;
          const existing = mapping.find(m => m.potId === potId);
          newMap.push({ potId, accountId, lastBalance: existing?.lastBalance || 0 });
        });
        const res = await fetch('/api/mappings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newMap),
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || 'Failed to save mappings');
        }
        statusEl.textContent = 'Mappings saved.';
        await loadData(true);
      } catch (err) {
        statusEl.textContent = 'Error saving mappings: ' + err.message;
      }
    };
    const syncBtn = document.getElementById('syncBtn');
    syncBtn.onclick = async () => {
      const statusEl = document.getElementById('status');
      syncBtn.disabled = true;
      statusEl.textContent = 'Syncing...';
      try {
        const res = await fetch('/api/sync', { method: 'POST' });
        const json = await res.json();
        if (!res.ok) {
          throw new Error(json.error || 'Failed to sync');
        }
        statusEl.textContent = json.message || ('Synced ' + json.count + ' pot(s)');
      } catch (err) {
        statusEl.textContent = 'Error syncing: ' + err.message;
      } finally {
        syncBtn.disabled = false;
      }
    };
    // Initial data load (e.g. Monzo auth status), then poll budget until ready
    loadData(false);
    waitForBudgetThenLoad();
  </script>
</body>
</html>`;
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
  // Kick off budget download in background; UI will poll for readiness
  let budgetReady = false;
  openBudget()
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
  const mappingFile = process.env.MAPPING_FILE || config.MAPPING_FILE || './mapping.json';

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

  app.get('/', (_req, res) => res.send(uiPageHtml(hadRefreshToken, refreshError)));

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
      } catch (_) {
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
