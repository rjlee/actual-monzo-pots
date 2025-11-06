const pino = require('pino');
const { version } = require('../package.json');

const baseLogger = pino({
  level: process.env.LOG_LEVEL || 'info',
  timestamp: pino.stdTimeFunctions.isoTime,
});

const logger = baseLogger.child({
  service: 'actual-monzo-pots',
  version,
  environment: process.env.NODE_ENV || 'production',
});

if (process.env.NODE_ENV === 'test' && !process.env.LOG_LEVEL) {
  logger.level = 'silent';
}

module.exports = logger;
