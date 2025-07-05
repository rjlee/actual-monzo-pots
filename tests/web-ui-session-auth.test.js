const request = require('supertest');
const fs = require('fs');
const path = require('path');
const os = require('os');

// Stub dependencies so the UI server can start without real API calls
jest.mock('../src/monzo-client');
jest.mock('@actual-app/api');
jest.mock('../src/utils');
jest.mock('../src/sync');

const monzo = require('../src/monzo-client');
const api = require('@actual-app/api');
const utils = require('../src/utils');
const sync = require('../src/sync');
const { startWebUi } = require('../src/web-ui');

describe('Web UI session-based authentication', () => {
  let server;
  const OLD_ENV = { ...process.env };

  beforeAll(async () => {
    utils.setupMonzo.mockResolvedValue();
    utils.openBudget.mockResolvedValue();
    monzo.isAuthenticated.mockReturnValue(false);
    api.getAccounts.mockResolvedValue([]);
    sync.runSync.mockResolvedValue(0);
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'mapping-'));
    process.env.DATA_DIR = tmp;
    process.env.ACTUAL_PASSWORD = 'secret';
    delete process.env.UI_AUTH_ENABLED; // default on
    server = await startWebUi(0, false);
  });

  afterAll(() => {
    server.close();
    process.env = { ...OLD_ENV };
  });

  it('shows login form for unauthenticated users', async () => {
    const res = await request(server).get('/');
    expect(res.status).toBe(200);
    expect(res.text).toMatch(/<h2[^>]*>Login<\/h2>/);
  });

  it('rejects invalid login attempts', async () => {
    const res = await request(server)
      .post('/login')
      .send('password=wrong')
      .set('Content-Type', 'application/x-www-form-urlencoded');
    expect(res.status).toBe(401);
    expect(res.text).toMatch(/Invalid password/);
  });

  it('authenticates valid password and sets session', async () => {
    const res = await request(server)
      .post('/login?next=/')
      .send('password=secret')
      .set('Content-Type', 'application/x-www-form-urlencoded');
    expect(res.status).toBe(302);
    const cookies = res.headers['set-cookie'];
    expect(cookies.some((c) => /session=/.test(c))).toBe(true);
    const cookieHeader = cookies.map((c) => c.split(';')[0]).join('; ');
    const res2 = await request(server).get('/').set('Cookie', cookieHeader);
    expect(res2.status).toBe(200);
    expect(res2.text).toMatch(/<title>actual-monzo-pots<\/title>/);
  });

  it('logs out and shows login form again', async () => {
    const loginRes = await request(server)
      .post('/login?next=/')
      .send('password=secret')
      .set('Content-Type', 'application/x-www-form-urlencoded');
    const cookies = loginRes.headers['set-cookie'];
    const cookieHeader = cookies.map((c) => c.split(';')[0]).join('; ');
    const res = await request(server).post('/logout').set('Cookie', cookieHeader);
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/login');
    const res3 = await request(server).get('/login');
    expect(res3.status).toBe(200);
    expect(res3.text).toMatch(/<h2[^>]*>Login<\/h2>/);
  });
});
