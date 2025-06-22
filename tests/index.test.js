// Tests for CLI entrypoint main in src/index.js
jest.mock('../src/sync', () => ({
  runSync: jest.fn().mockResolvedValue(),
}));
jest.mock('../src/daemon', () => ({
  runDaemon: jest.fn().mockResolvedValue(),
}));
jest.mock('../src/logger', () => ({ level: 'info' }));

const { main } = require('../src/index');
const { runSync } = require('../src/sync');
const { runDaemon } = require('../src/daemon');
const logger = require('../src/logger');

describe('CLI main', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    logger.level = 'info';
  });

  it('runs sync mode when --mode sync is specified', async () => {
    await main(['--mode', 'sync']);
    expect(runSync).toHaveBeenCalledWith({ verbose: false });
  });

  it('runs daemon mode when --mode daemon is specified with flags', async () => {
    await main(['--mode', 'daemon', '--verbose', '--ui', '--http-port', '1234']);
    expect(runDaemon).toHaveBeenCalledWith({ verbose: true, ui: true, httpPort: 1234 });
  });

  it('sets logger level to debug when --verbose is specified', async () => {
    await main(['--mode', 'sync', '--verbose']);
    expect(logger.level).toBe('debug');
  });
});
