const pino = require('pino');

// Create a JSON-structured logger with timestamp
const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  timestamp: pino.stdTimeFunctions.isoTime,
});

// Silence logs during tests to avoid polluting test output
if (process.env.NODE_ENV === 'test') {
  logger.level = 'silent';
}

module.exports = logger;
