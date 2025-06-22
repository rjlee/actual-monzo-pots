#!/usr/bin/env node
require('./suppress');
require('dotenv').config();

const config = require('./config');
const { runSync } = require('./sync');
const { runDaemon } = require('./daemon');

/**
 * Main CLI entrypoint: dispatch to sync or daemon.
 * @param {string[]} args Command-line arguments
 */
async function main(args = process.argv.slice(2)) {
  const argv = require('yargs/yargs')(args)
    .option('mode', {
      alias: 'm',
      choices: ['sync', 'daemon'],
      default: config.mode || 'sync',
      describe: 'Mode to run',
    })
    .option('ui', {
      type: 'boolean',
      default: false,
      describe: 'Start web UI server (daemon mode only; also enabled by HTTP_PORT)',
    })
    .option('verbose', {
      alias: 'v',
      type: 'boolean',
      default: false,
      describe: 'Enable verbose logging',
    })
    .option('http-port', {
      type: 'number',
      default: parseInt(config.HTTP_PORT || process.env.HTTP_PORT || 3000, 10),
      describe: 'Port for web UI server',
    })
    .help().argv;

  const { mode, ui, httpPort, verbose } = argv;
  if (verbose) {
    const logger = require('./logger');
    logger.level = 'debug';
  }
  switch (mode) {
    case 'sync':
      await runSync({ verbose });
      break;

    case 'daemon':
      await runDaemon({ verbose, ui, httpPort });
      break;
  }
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

module.exports = { main };
