require('dotenv').config();
const fs = require('fs');
const api = require('@actual-app/api');
const monzo = require('./monzo-client');
const logger = require('./logger');

async function setupMonzo() {
  logger.info('Initializing Monzo client...');
  await monzo.init();
}

let hasDownloadedBudget = false;

async function openBudget() {
  const url = process.env.ACTUAL_SERVER_URL;
  const password = process.env.ACTUAL_PASSWORD;
  const syncId = process.env.ACTUAL_SYNC_ID;
  if (!url || !password || !syncId) {
    throw new Error(
      'Please set ACTUAL_SERVER_URL, ACTUAL_PASSWORD, and ACTUAL_SYNC_ID environment variables'
    );
  }
  const dataDir = process.env.BUDGET_CACHE_DIR || './budget';

  fs.mkdirSync(dataDir, { recursive: true });

  logger.info('Connecting to Actual API...');
  await api.init({ dataDir, serverURL: url, password });

  const opts = {};
  const budgetPassword = process.env.ACTUAL_BUDGET_ENCRYPTION_PASSWORD;
  if (budgetPassword) opts.password = budgetPassword;

  if (!hasDownloadedBudget) {
    logger.info('Downloading budget (no backup)...');
    try {
      await api.downloadBudget(syncId, opts);
      logger.info('Budget downloaded');
      hasDownloadedBudget = true;
    } catch (err) {
      logger.warn({ err }, 'Failed to download budget');
    }
  }

  logger.info('Syncing budget changes...');
  try {
    await api.sync();
    logger.info('Budget synced');
  } catch (err) {
    logger.warn({ err }, 'Failed to sync budget');
  }
}

async function closeBudget() {
  try {
    await api.shutdown();
    if (typeof api.resetBudgetCache === 'function') {
      await api.resetBudgetCache();
    }
  } catch (err) {
    logger.error(err);
    process.exit(1);
  }
}

/**
 * (Test helper) Reset the internal download flag so openBudget will re-fetch.
 */
function __resetBudgetDownloadFlag() {
  hasDownloadedBudget = false;
}

module.exports = { setupMonzo, openBudget, closeBudget, __resetBudgetDownloadFlag };
