// Tests for scheduling and daemon logic in src/daemon.js
jest.mock('../src/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));
jest.mock('node-cron', () => ({
  validate: jest.fn(),
  schedule: jest.fn(),
}));
jest.mock('../src/sync', () => ({
  runSync: jest.fn().mockResolvedValue(5),
}));
jest.mock('../src/web-ui', () => ({
  startWebUi: jest.fn(),
}));

const { scheduleSync, runDaemon } = require('../src/daemon');
const logger = require('../src/logger');
const cron = require('node-cron');
const { runSync } = require('../src/sync');
const { startWebUi } = require('../src/web-ui');

describe('scheduleSync', () => {
  afterEach(() => {
    jest.clearAllMocks();
    delete process.env.DISABLE_CRON_SCHEDULING;
    delete process.env.SYNC_CRON;
    delete process.env.SYNC_CRON_TIMEZONE;
  });

  it('does not schedule when cron scheduling is disabled', () => {
    process.env.DISABLE_CRON_SCHEDULING = 'true';
    scheduleSync(false);
    expect(logger.info).toHaveBeenCalledWith({ job: 'sync' }, 'Cron scheduling disabled');
    expect(cron.schedule).not.toHaveBeenCalled();
  });

  it('exits process on invalid schedule', () => {
    cron.validate.mockReturnValue(false);
    const exitSpy = jest.spyOn(process, 'exit').mockImplementation(() => {});
    scheduleSync(false);
    expect(logger.error).toHaveBeenCalledWith(
      { schedule: '0 * * * *' },
      'Invalid SYNC_CRON schedule: 0 * * * *'
    );
    expect(exitSpy).toHaveBeenCalledWith(1);
    exitSpy.mockRestore();
  });

  it('schedules a cron job on valid schedule', () => {
    cron.validate.mockReturnValue(true);
    scheduleSync(true);
    expect(logger.info).toHaveBeenCalledWith(
      { job: 'sync', schedule: '0 * * * *', timezone: 'UTC' },
      'Starting sync daemon'
    );
    expect(cron.schedule).toHaveBeenCalledWith('0 * * * *', expect.any(Function), {
      timezone: 'UTC',
    });
  });

  it('invokes runSync in scheduled callback', async () => {
    cron.validate.mockReturnValue(true);
    scheduleSync(false);
    const callback = cron.schedule.mock.calls[0][1];
    await callback();
    expect(runSync).toHaveBeenCalledWith({ verbose: false, useLogger: true });
    expect(logger.info).toHaveBeenCalledWith(
      expect.objectContaining({ count: 5, ts: expect.any(String) }),
      'Daemon sync run complete'
    );
  });
});

describe('runDaemon', () => {
  afterEach(() => {
    jest.clearAllMocks();
    delete process.env.HTTP_PORT;
  });

  it('starts web UI when ui flag is true', () => {
    runDaemon({ verbose: false, ui: true, httpPort: 3001 });
    expect(startWebUi).toHaveBeenCalledWith(3001, false);
  });

  it('starts web UI when HTTP_PORT env var is set', () => {
    process.env.HTTP_PORT = '4000';
    runDaemon({ verbose: true, ui: false, httpPort: 4000 });
    expect(startWebUi).toHaveBeenCalledWith(4000, true);
  });

  it('always schedules sync jobs', () => {
    const spy = jest.spyOn(require('../src/daemon'), 'scheduleSync').mockImplementation(() => {});
    runDaemon({ verbose: true, ui: false, httpPort: 0 });
    expect(spy).toHaveBeenCalledWith(true);
    spy.mockRestore();
  });
});
