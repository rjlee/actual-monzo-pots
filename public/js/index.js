/* eslint-env browser */
// Global config passed from server-side EJS
const { hadRefreshToken, refreshError } = window.__UI_CONFIG;

// Update Monzo status badge
if (hadRefreshToken) {
  const authEl = document.getElementById('authStatus');
  authEl.textContent = 'Monzo refreshing authentication';
  authEl.className = 'badge bg-info';
}
if (refreshError != null) {
  const authEl = document.getElementById('authStatus');
  authEl.textContent = 'Monzo auth refresh failed: ' + refreshError;
  authEl.className = 'badge bg-danger';
}

// Check for auth=success or auth=error in the URL
(function () {
  const params = new URLSearchParams(window.location.search);
  const statusEl = document.getElementById('status');
  if (params.get('auth') === 'success') {
    statusEl.textContent = 'Monzo authentication successful';
    statusEl.className = 'mt-4 text-center text-success';
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
  let res;
  try {
    res = await fetch('/api/data');
  } catch (err) {
    console.error('Failed to fetch /api/data', err);
    return;
  }
  if (res.status === 401) {
    // Only auto-redirect to Monzo auth if a refresh token existed
    if (hadRefreshToken) {
      window.location.href = '/auth';
    }
    return;
  }
  const json = await res.json();
  const { monoAccounts, pots, accounts, mapping: map, authenticated } = json;
  mapping = map;
  const authBtn = document.getElementById('authBtn');
  if (authenticated) {
    authBtn.textContent = 'Monzo Authenticated';
    authBtn.className = 'btn btn-success disabled';
    authBtn.removeAttribute('href');
    authBtn.setAttribute('aria-disabled', 'true');
  } else {
    authBtn.textContent = 'Authenticate Monzo';
    authBtn.className = 'btn btn-secondary';
    authBtn.setAttribute('href', '/auth');
    authBtn.removeAttribute('aria-disabled');
  }
  const retailAccounts = monoAccounts.filter((a) => a.type?.startsWith('uk_retail'));
  const accountsBody = document.getElementById('accountsBody');
  accountsBody.innerHTML = retailAccounts
    .map((ac) => {
      const desc = ac.owners.reduce(
        (d, o) => d.replace(new RegExp(o.user_id, 'g'), o.preferred_name),
        ac.description || ''
      );
      const ownerNames = ac.owners.map((o) => o.preferred_name).join(', ');
      return (
        '<tr>' +
        '<td>' +
        ac.id +
        '</td>' +
        '<td>' +
        desc +
        '</td>' +
        '<td>' +
        ownerNames +
        '</td>' +
        '<td>' +
        ac.type +
        '</td>' +
        '<td>' +
        (ac.account_number || '') +
        '</td>' +
        '<td>' +
        ac.currency +
        '</td>' +
        '</tr>'
      );
    })
    .join('');
  const tbody = document.getElementById('mappingBody');
  tbody.innerHTML = pots
    .map((pot) => {
      const selected = mapping.find((m) => m.potId === pot.id)?.accountId || '';
      const options = accounts
        .map((ac) => {
          const sel = ac.id === selected ? ' selected' : '';
          return '<option value="' + ac.id + '"' + sel + '>' + ac.name + '</option>';
        })
        .join('');
      const acct = monoAccounts.find((a) => a.id === pot.current_account_id);
      const owner = acct ? acct.owners.map((o) => o.preferred_name).join(', ') : '';
      return (
        '<tr>' +
        '<td>' +
        pot.name +
        '</td>' +
        '<td>' +
        pot.current_account_id +
        '</td>' +
        '<td>' +
        owner +
        '</td>' +
        '<td><select data-pot="' +
        pot.id +
        '" class="form-select"' +
        (ready ? '' : ' disabled') +
        '>' +
        '<option value="">-- none --</option>' +
        options +
        '</select></td>' +
        '</tr>'
      );
    })
    .join('');
}

/**
 * Poll server until budgetReady, then load data
 */
async function waitForBudgetThenLoad() {
  /* eslint-disable no-constant-condition */
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
    await new Promise((r) => setTimeout(r, 1000));
  }
  loadData(true);
}

// Initial data load (e.g. Monzo auth status), then poll budget until ready
// Attach action handlers
document.getElementById('saveBtn').onclick = async () => {
  const statusEl = document.getElementById('status');
  statusEl.textContent = 'Saving mappings...';
  try {
    const newMap = [];
    document.querySelectorAll('select[data-pot]').forEach((sel) => {
      const potId = sel.getAttribute('data-pot');
      const accountId = sel.value;
      const existing = mapping.find((m) => m.potId === potId);
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
    statusEl.textContent = json.message || 'Synced ' + json.count + ' pot(s)';
  } catch (err) {
    statusEl.textContent = 'Error syncing: ' + err.message;
  } finally {
    syncBtn.disabled = false;
  }
};
// Initial data load (e.g. Monzo auth status), then poll budget until ready
loadData(false);
waitForBudgetThenLoad();
