const fs = require('fs');
const path = require('path');
const api = require('@actual-app/api');
const monzo = require('../src/monzo-client');
const { setupMonzo, openBudget, closeBudget } = require('../src/utils');

jest.mock('@actual-app/api');
jest.mock('../src/monzo-client');

describe('setupMonzo', () => {
  const testDir = path.join(process.cwd(), 'test-tokens');
  beforeEach(() => {
    delete process.env.TOKEN_DIRECTORY;
    monzo.init.mockReset();
    if (fs.existsSync(testDir)) fs.rmSync(testDir, { recursive: true, force: true });
  });

  afterEach(() => {
    delete process.env.TOKEN_DIRECTORY;
    if (fs.existsSync(testDir)) fs.rmSync(testDir, { recursive: true, force: true });
  });

  it('initializes Monzo client', async () => {
    process.env.TOKEN_DIRECTORY = testDir;
    monzo.init.mockResolvedValue();
    await setupMonzo();
    expect(monzo.init).toHaveBeenCalled();
  });
});

describe('openBudget', () => {
  const testDir = path.join(process.cwd(), 'test-budget');
  beforeEach(() => {
    delete process.env.ACTUAL_SERVER_URL;
    delete process.env.ACTUAL_PASSWORD;
    delete process.env.ACTUAL_SYNC_ID;
    delete process.env.BUDGET_DIR;
    jest.resetAllMocks();
    // Reset download flag so each test triggers downloadBudget
    require('../src/utils').__resetBudgetDownloadFlag();
    if (fs.existsSync(testDir)) fs.rmSync(testDir, { recursive: true, force: true });
  });

  afterEach(() => {
    jest.resetAllMocks();
    delete process.env.ACTUAL_SERVER_URL;
    delete process.env.ACTUAL_PASSWORD;
    delete process.env.ACTUAL_SYNC_ID;
    delete process.env.BUDGET_DIR;
    if (fs.existsSync(testDir)) fs.rmSync(testDir, { recursive: true, force: true });
  });

  it('throws error when required env vars are missing', async () => {
    await expect(openBudget()).rejects.toThrow(
      'Please set ACTUAL_SERVER_URL, ACTUAL_PASSWORD, and ACTUAL_SYNC_ID environment variables'
    );
  });

  it('initializes budget and downloads via direct downloadBudget', async () => {
    process.env.ACTUAL_SERVER_URL = 'http://example.com';
    process.env.ACTUAL_PASSWORD = 'pw';
    process.env.ACTUAL_SYNC_ID = 'budget1';
    process.env.BUDGET_DIR = testDir;

    api.init.mockResolvedValue();
    api.runImport.mockImplementation(async (_name, fn) => {
      await fn();
    });
    api.downloadBudget.mockResolvedValue();

    await openBudget();

    expect(fs.existsSync(testDir)).toBe(true);
    expect(api.init).toHaveBeenCalledWith({
      dataDir: testDir,
      serverURL: 'http://example.com',
      password: 'pw',
    });
    // runImport is no longer used (no backup); downloadBudget is called directly
    expect(api.downloadBudget).toHaveBeenCalledWith('budget1', {});
  });

  it('falls back to direct downloadBudget when runImport fails', async () => {
    process.env.ACTUAL_SERVER_URL = 'http://example.com';
    process.env.ACTUAL_PASSWORD = 'pw';
    process.env.ACTUAL_SYNC_ID = 'budget1';
    process.env.BUDGET_DIR = testDir;

    api.init.mockResolvedValue();
    api.runImport.mockRejectedValue(new Error('fail'));
    api.downloadBudget.mockResolvedValue();

    await openBudget();

    expect(api.downloadBudget).toHaveBeenCalledWith('budget1', {});
  });
});

describe('closeBudget', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('calls shutdown and resetBudgetCache if available', async () => {
    api.shutdown.mockResolvedValue();
    api.resetBudgetCache = jest.fn().mockResolvedValue();

    await closeBudget();
    expect(api.shutdown).toHaveBeenCalled();
    expect(api.resetBudgetCache).toHaveBeenCalled();
  });

  it('exits process on error', async () => {
    api.shutdown.mockRejectedValue(new Error('oops'));
    const exitSpy = jest.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('process.exit');
    });

    await expect(closeBudget()).rejects.toThrow('process.exit');
    expect(exitSpy).toHaveBeenCalledWith(1);
    exitSpy.mockRestore();
  });
});
