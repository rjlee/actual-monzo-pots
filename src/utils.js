require('dotenv').config();
const fs = require('fs');
const path = require('path');
const api = require('@actual-app/api');
const monzo = require('./monzo-client');
const logger = require('./logger');

async function setupMonzo() {
  logger.info('Initializing Monzo client...');
  await monzo.init();
}

async function openBudget() {
  const url = process.env.ACTUAL_SERVER_URL;
  const password = process.env.ACTUAL_PASSWORD;
  const budgetId = process.env.ACTUAL_BUDGET_ID;
  if (!url || !password || !budgetId) {
    throw new Error(
      'Please set ACTUAL_SERVER_URL, ACTUAL_PASSWORD, and ACTUAL_BUDGET_ID environment variables'
    );
  }
  const dataDir = process.env.BUDGET_CACHE_DIR || './budget';

  // Clean up old budget cache entries, preserving .gitkeep
  if (fs.existsSync(dataDir)) {
    for (const entry of fs.readdirSync(dataDir)) {
      if (entry === '.gitkeep') continue;
      try {
        fs.rmSync(path.join(dataDir, entry), { recursive: true, force: true });
      } catch {
        /* ignore cleanup errors */
      }
    }
  } else {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  logger.info('Connecting to Actual API...');
  await api.init({ dataDir, serverURL: url, password });

  logger.info('Downloading budget...');
  const opts = {};
  const budgetPassword = process.env.ACTUAL_BUDGET_ENCRYPTION_PASSWORD;
  if (budgetPassword) opts.password = budgetPassword;
  try {
    await api.runImport('open-budget', async () => {
      await api.downloadBudget(process.env.ACTUAL_BUDGET_ID, opts);
    });
  } catch (err) {
    logger.warn('runImport failed, falling back to direct downloadBudget');
    await api.downloadBudget(process.env.ACTUAL_BUDGET_ID, opts);
  }
  logger.info('Budget downloaded');
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

module.exports = { setupMonzo, openBudget, closeBudget };
