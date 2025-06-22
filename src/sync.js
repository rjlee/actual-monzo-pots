const fs = require('fs');
const path = require('path');
const logger = require('./logger');
const config = require('./config');
const monzo = require('./monzo-client');
const { setupMonzo, openBudget, closeBudget } = require('./utils');
const api = require('@actual-app/api');

/**
 * Sync Monzo pot balances to Actual Budget accounts.
 * @param {{verbose?: boolean, useLogger?: boolean}} options
 * @returns {Promise<number>} Number of pot syncs applied
 */
async function runSync({ verbose = false, useLogger = false } = {}) {
  const log =
    verbose || useLogger
      ? logger
      : { info: () => {}, debug: () => {}, warn: () => {}, error: () => {} };
  const cwd = process.cwd();
  const mappingFile = process.env.MAPPING_FILE || config.MAPPING_FILE || './data/mapping.json';
  const mappingPath = path.isAbsolute(mappingFile) ? mappingFile : path.join(cwd, mappingFile);

  // Load or initialize mapping entries
  let mapping = [];
  try {
    const data = fs.readFileSync(mappingPath, 'utf8');
    mapping = JSON.parse(data);
  } catch (_) {
    mapping = [];
  }
  if (verbose) log.debug({ mappingPath, count: mapping.length }, 'Loaded mapping entries');

  log.info('Initializing Monzo client');
  await setupMonzo();

  // Open Actual Budget
  try {
    log.info('Opening Actual Budget');
    await openBudget();
  } catch (err) {
    log.error({ err }, 'Failed to open budget; aborting sync');
    return 0;
  }

  let applied = 0;
  try {
    // Fetch available Actual accounts
    const accounts = await api.getAccounts();
    const accountIds = accounts.map((a) => a.id);

    // Fetch Monzo pots across all accounts
    const monoAccounts = await monzo.listAccounts();
    let pots = [];
    for (const acct of monoAccounts) {
      const acctPots = await monzo.listPots(acct.id);
      pots = pots.concat(acctPots);
    }

    // Process each mapped pot
    for (const entry of mapping) {
      const pot = pots.find((p) => p.id === entry.potId);
      if (!pot) {
        log.warn({ potId: entry.potId }, 'Pot not found; skipping');
        continue;
      }
      const acctId = entry.accountId;
      if (!accountIds.includes(acctId)) {
        log.warn({ accountId: acctId }, 'Actual account not found; skipping');
        continue;
      }
      // Fetch the current balance from Actual Budget to guard against stale mapping.json
      let last = 0;
      try {
        last = await api.getAccountBalance({ id: acctId, cutoff: new Date() });
      } catch (err) {
        log.warn(
          { accountId: acctId, err },
          'Unable to fetch budget balance; falling back to stored lastBalance'
        );
        last = typeof entry.lastBalance === 'number' ? entry.lastBalance : 0;
      }
      const current = pot.balance;
      const delta = current - last;
      if (delta === 0) {
        continue;
      }
      log.info({ pot: pot.name, delta }, 'Syncing pot change');
      // Import transaction to Actual Budget
      const tx = {
        id: `${pot.id}-${Date.now()}`,
        date: new Date().toISOString(),
        amount: delta,
        payee: pot.name,
      };
      await api.importTransactions(acctId, [tx]);
      entry.lastBalance = current;
      applied++;
    }

    // Save updated mapping
    // Ensure parent directory exists (e.g. data/) before writing mapping
    const mapDir = path.dirname(mappingPath);
    fs.mkdirSync(mapDir, { recursive: true });
    fs.writeFileSync(mappingPath, JSON.stringify(mapping, null, 2));
    log.info({ applied }, 'Completed pot sync');
  } catch (err) {
    log.error({ err }, 'Error during sync');
  } finally {
    await closeBudget();
  }
  return applied;
}

module.exports = { runSync };
