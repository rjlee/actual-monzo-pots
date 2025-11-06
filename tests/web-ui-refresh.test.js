const request = require('supertest');
const fs = require('fs');
const path = require('path');
const os = require('os');

jest.mock('../src/monzo-client');
jest.mock('../src/utils');
jest.mock('../src/logger', () => ({
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
}));
jest.mock('@actual-app/api');
jest.mock('../src/sync');

const monzo = require('../src/monzo-client');
const utils = require('../src/utils');
const logger = require('../src/logger');
const { startWebUi } = require('../src/web-ui');

describe('Web UI token refresh and budget download behavior', () => {
  let server;
  const OLD_ENV = { ...process.env };
  let mappingDir;
  let tokenDir;

  beforeAll(() => {
    mappingDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mapping-'));
    tokenDir = fs.mkdtempSync(path.join(os.tmpdir(), 'monzo-'));
  });
  beforeEach(() => {
    process.env.DATA_DIR = mappingDir;
    process.env.UI_AUTH_ENABLED = 'false';
    monzo.tokenDir = tokenDir;
    monzo.tokenFile = 'refresh.txt';
    utils.setupMonzo.mockClear();
    utils.openBudget.mockClear();
    logger.error.mockClear();
  });
  afterEach(() => {
    if (server && server.close) server.close();
    process.env = { ...OLD_ENV };
  });
  afterAll(() => {
    fs.rmSync(mappingDir, { recursive: true, force: true });
    fs.rmSync(tokenDir, { recursive: true, force: true });
  });

  it('skips Monzo refresh when no token file exists', async () => {
    server = await startWebUi(0, false);
    expect(utils.setupMonzo).not.toHaveBeenCalled();
  });

  it('performs Monzo refresh when token file exists', async () => {
    fs.writeFileSync(path.join(tokenDir, 'refresh.txt'), 'token');
    utils.setupMonzo.mockResolvedValue();
    server = await startWebUi(0, false);
    expect(utils.setupMonzo).toHaveBeenCalled();
  });

  it('captures Monzo refresh errors into refreshError', async () => {
    fs.writeFileSync(path.join(tokenDir, 'refresh.txt'), 'token');
    const err = new Error('bad token');
    utils.setupMonzo.mockRejectedValue(err);
    server = await startWebUi(0, false);
    await new Promise((r) => setTimeout(r, 0));
    const res = await request(server).get('/');
    expect(res.text).toContain('hadRefreshToken: true');
    expect(logger.error).toHaveBeenCalledWith({ err }, 'Monzo refresh failed');
  });

  it('logs budget download failures and still reports ready', async () => {
    utils.openBudget.mockRejectedValue(new Error('download error'));
    server = await startWebUi(0, false);
    await new Promise((r) => setTimeout(r, 0));
    expect(logger.error).toHaveBeenCalledWith({ err: expect.any(Error) }, 'Budget download failed');
    const res = await request(server).get('/api/budget-status');
    expect(res.body).toEqual({ ready: true });
  });
});
