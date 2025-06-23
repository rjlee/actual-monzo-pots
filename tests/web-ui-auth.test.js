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

describe('Web UI authentication', () => {
  let server;
  beforeAll(async () => {
    // Prevent refresh/budget code from blocking
    utils.setupMonzo.mockResolvedValue();
    utils.openBudget.mockResolvedValue();
    // Stub minimal dependencies for /api/data
    monzo.isAuthenticated.mockReturnValue(false);
    api.getAccounts.mockResolvedValue([]);
    sync.runSync.mockResolvedValue(0);
    // Use a temporary mapping file so loadData/tests won't error
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'map-'));
    process.env.MAPPING_FILE = path.join(tmp, 'mapping.json');
    // Configure HTTP Basic Auth
    process.env.UI_PASSWORD = 'secret';
    process.env.UI_USER = 'user1';
    server = await startWebUi(0, false);
  });
  afterAll(() => {
    server.close();
    delete process.env.MAPPING_FILE;
    delete process.env.UI_PASSWORD;
    delete process.env.UI_USER;
  });

  it('rejects requests without Authorization header', async () => {
    const res = await request(server).get('/');
    expect(res.status).toBe(401);
    expect(res.headers['www-authenticate']).toMatch(/Basic realm="actual-monzo-pots UI"/);
    expect(res.text).toContain('Authentication required.');
  });

  it('rejects requests with invalid credentials', async () => {
    const bad = Buffer.from('user1:wrong').toString('base64');
    const res = await request(server).get('/').set('Authorization', `Basic ${bad}`);
    expect(res.status).toBe(401);
    expect(res.headers['www-authenticate']).toMatch(/Basic realm="actual-monzo-pots UI"/);
    expect(res.text).toContain('Invalid credentials.');
  });

  it('allows requests with correct credentials', async () => {
    const good = Buffer.from('user1:secret').toString('base64');
    const res = await request(server).get('/').set('Authorization', `Basic ${good}`);
    expect(res.status).toBe(200);
    expect(res.text).toMatch(/<title>actual-monzo-pots<\/title>/);
  });
});
