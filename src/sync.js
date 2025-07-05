const fs = require('fs');
const path = require('path');
const logger = require('./logger');
const config = require('./config');
const monzo = require('./monzo-client');
const { setupMonzo, openBudget, closeBudget } = require('./utils');
const api = require('@actual-app/api');
// Use addTransactions for raw imports (with imported_payee)

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
  const dataDir = process.env.DATA_DIR || config.DATA_DIR || './data';
  const absDataDir = path.isAbsolute(dataDir) ? dataDir : path.join(cwd, dataDir);
  const mappingPath = path.join(absDataDir, 'mapping.json');

  // Load or initialize mapping entries
  let mapping = [];
  try {
    const data = fs.readFileSync(mappingPath, 'utf8');
    mapping = JSON.parse(data);
  } catch (err) {
    log.warn(
      { err, mappingPath },
      'Failed to load or parse mapping file; starting with empty mapping'
    );
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

  try {
    log.info('Syncing budget before operations');
    await api.sync();
  } catch {
    /* ignore sync errors */
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
        last = await api.getAccountBalance(acctId, new Date());
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
      // Create or find a payee for our imported transactions, then import
      const PAYEE_NAME = 'actual-monzo-pots';
      let payees = [];
      try {
        payees = await api.getPayees();
      } catch {
        /* ignore errors fetching payees */
      }
      let payeeId = payees.find((p) => p.name === PAYEE_NAME)?.id;
      if (!payeeId) {
        try {
          payeeId = await api.createPayee({ name: PAYEE_NAME });
        } catch (err) {
          log.warn({ err, PAYEE_NAME }, 'Failed to create payee; using raw name');
        }
      }
      const tx = {
        id: `${pot.id}-${Date.now()}`,
        date: new Date(),
        amount: delta,
        payee: payeeId || PAYEE_NAME,
        imported_payee: PAYEE_NAME,
      };
      await api.addTransactions(acctId, [tx], {
        runTransfers: false,
        learnCategories: false,
      });
      entry.lastBalance = current;
      applied++;
    }

    // Save updated mapping atomically
    try {
      const tmpFile = `${mappingPath}.tmp`;
      fs.writeFileSync(tmpFile, JSON.stringify(mapping, null, 2));
      fs.renameSync(tmpFile, mappingPath);
    } catch (err) {
      log.error({ err, mappingPath }, 'Failed to save mapping file atomically');
    }
    log.info({ applied }, 'Completed pot sync');
    try {
      log.info('Syncing budget after pot sync');
      await api.sync();
      log.info('Budget sync complete');
    } catch (err) {
      log.warn({ err }, 'Budget sync after pot sync failed');
    }
  } catch (err) {
    log.error({ err }, 'Error during sync');
  } finally {
    await closeBudget();
  }
  return applied;
}

module.exports = { runSync };
