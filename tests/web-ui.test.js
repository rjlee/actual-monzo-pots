const request = require('supertest');
const monzo = require('../src/monzo-client');
const api = require('@actual-app/api');
const utils = require('../src/utils');
const sync = require('../src/sync');
const { startWebUi } = require('../src/web-ui');
const fs = require('fs');
const path = require('path');
const os = require('os');

jest.mock('@actual-app/api');
jest.mock('../src/monzo-client');
jest.mock('../src/utils');
jest.mock('../src/sync');

describe('GET /api/data', () => {
  let server;
  beforeAll(async () => {
    // Stub setup & budget download so budgetReady resolves
    utils.setupMonzo.mockResolvedValue();
    utils.openBudget.mockResolvedValue();
    // Use a temporary mapping file outside project tree
    const mappingDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mapping-'));
    process.env.MAPPING_FILE = path.join(mappingDir, 'mapping.json');
    // Stub Monzo authentication and API responses
    monzo.isAuthenticated.mockReturnValue(true);
    monzo.listAccounts.mockResolvedValue([
      {
        id: 'acc1',
        type: 'uk_retail',
        description: 'user_0001',
        owners: [{ user_id: 'user_0001', preferred_name: 'Test User' }],
        account_number: '12345678',
        sort_code: '12-34-56',
        currency: 'GBP',
      },
    ]);
    monzo.listPots.mockResolvedValue([
      {
        id: 'p1',
        name: 'Pot1',
        balance: 500,
        currency: 'GBP',
        current_account_id: 'acc1',
        deleted: false,
      },
    ]);
    api.getAccounts.mockResolvedValue([{ id: 'a1', name: 'Actual Account' }]);
    // Stub pot-sync endpoint
    sync.runSync.mockResolvedValue(3);
    server = await startWebUi(0, false);
  });
  afterAll(() => {
    server.close();
    // cleanup test mapping directory
    try {
      fs.rmSync(path.dirname(process.env.MAPPING_FILE), { recursive: true, force: true });
    } catch (err) {
      /* ignore cleanup errors */
    }
  });

  it('should respond with monoAccounts, pots and accounts', async () => {
    const res = await request(server).get('/api/data');
    expect(res.status).toBe(200);
    expect(res.body.monoAccounts).toHaveLength(1);
    expect(res.body.pots).toHaveLength(1);
    expect(res.body.accounts).toHaveLength(1);
    expect(res.body.authenticated).toBe(true);
  });
  it('blocks /api/data when not authenticated', async () => {
    monzo.isAuthenticated.mockReturnValue(false);
    const res = await request(server).get('/api/data');
    expect(res.status).toBe(401);
  });

  it('serves the UI HTML at root', async () => {
    const res = await request(server).get('/');
    expect(res.status).toBe(200);
    expect(res.text).toMatch(/<title>actual-monzo-pots<\/title>/);
    expect(res.text).toMatch(/<script>/);
  });

  it('reports budget-ready status', async () => {
    // wait for openBudget to mark ready
    await new Promise((r) => setTimeout(r, 0));
    const res = await request(server).get('/api/budget-status');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ready: true });
  });

  it('accepts mapping posts', async () => {
    const mappings = [{ potId: 'p1', accountId: 'a1', lastBalance: 0 }];
    const res = await request(server)
      .post('/api/mappings')
      .send(mappings)
      .set('Content-Type', 'application/json');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true });
  });

  it('triggers a pot sync via POST /api/sync', async () => {
    const res = await request(server).post('/api/sync');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ count: 3 });
  });
});
