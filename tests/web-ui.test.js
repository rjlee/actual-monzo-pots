const request = require('supertest');
const monzo = require('../src/monzo-client');
const api = require('@actual-app/api');
const { startWebUi } = require('../src/web-ui');

jest.mock('@actual-app/api');
jest.mock('../src/monzo-client');

describe('GET /api/data', () => {
  let server;
  beforeAll(async () => {
    // Stub Monzo and Actual API responses
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
    server = await startWebUi(0, false);
  });
  afterAll(() => server.close());

  it('should respond with monoAccounts, pots and accounts', async () => {
    const res = await request(server).get('/api/data');
    expect(res.status).toBe(200);
    expect(res.body.monoAccounts).toHaveLength(1);
    expect(res.body.pots).toHaveLength(1);
    expect(res.body.accounts).toHaveLength(1);
    expect(res.body.authenticated).toBe(true);
  });
});
