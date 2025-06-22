const cron = require('node-cron');
const config = require('./config');
const logger = require('./logger');
const { runSync } = require('./sync');
const { startWebUi } = require('./web-ui');

// Schedule periodic sync jobs
function scheduleSync(verbose) {
  const disableCron =
    process.env.DISABLE_CRON_SCHEDULING === 'true' || config.DISABLE_CRON_SCHEDULING === true;
  if (disableCron) {
    logger.info({ job: 'sync' }, 'Cron scheduling disabled');
    return;
  }
  const schedule = config.SYNC_CRON || process.env.SYNC_CRON || '0 * * * *';
  const timezone = config.SYNC_CRON_TIMEZONE || process.env.SYNC_CRON_TIMEZONE || 'UTC';
  if (!cron.validate(schedule)) {
    logger.error({ schedule }, `Invalid SYNC_CRON schedule: ${schedule}`);
    process.exit(1);
  }
  logger.info({ job: 'sync', schedule, timezone }, 'Starting sync daemon');
  let running = false;
  cron.schedule(
    schedule,
    async () => {
      const ts = new Date().toISOString();
      if (running) {
        logger.warn({ ts }, 'Skipping scheduled sync: previous run still in progress');
        return;
      }
      running = true;
      logger.info({ ts }, 'Daemon sync run start');
      try {
        const count = await runSync({ verbose, useLogger: true });
        logger.info({ ts, count }, 'Daemon sync run complete');
      } catch (err) {
        logger.error({ err, ts }, 'Daemon sync run failed');
      } finally {
        running = false;
      }
    },
    timezone ? { timezone } : {}
  );
}

/**
 * Run the daemon: start web UI if requested and schedule sync jobs.
 * @param {{ui: boolean, httpPort: number}} options
 */
async function runDaemon({ verbose, ui, httpPort }) {
  const explicitPort =
    typeof config.HTTP_PORT !== 'undefined' || typeof process.env.HTTP_PORT !== 'undefined';
  if (ui || explicitPort) startWebUi(httpPort, verbose);
  // Use exported function to allow test spies to intercept calls
  const { scheduleSync } = require('./daemon');
  scheduleSync(verbose);
}

module.exports = { runDaemon, scheduleSync };
