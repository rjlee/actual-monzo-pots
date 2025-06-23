const fs = require('fs');
const path = require('path');
const monzo = require('../src/monzo-client');
const api = require('@actual-app/api');
const { runSync } = require('../src/sync');

jest.mock('../src/monzo-client');
jest.mock('@actual-app/api');
// Stub budget-opening helpers to avoid real API calls in tests
jest.mock('../src/utils', () => ({
  setupMonzo: jest.fn(),
  openBudget: jest.fn(),
  closeBudget: jest.fn(),
}));

describe('runSync', () => {
  const mappingFile = path.join(__dirname, 'mapping.json');

  beforeEach(() => {
    process.env.MAPPING_FILE = mappingFile;
    jest.resetAllMocks();
  });

  afterEach(() => {
    delete process.env.MAPPING_FILE;
    try {
      fs.unlinkSync(mappingFile);
    } catch (_) {
      // ignore
    }
  });

  it('posts correct delta based on actual budget balance', async () => {
    // initial mapping with lastBalance=0
    fs.writeFileSync(
      mappingFile,
      JSON.stringify([{ potId: 'p1', accountId: 'a1', lastBalance: 0 }], null, 2)
    );
    // stub Monzo pots
    monzo.listAccounts.mockResolvedValue([{ id: 'acc1' }]);
    monzo.listPots.mockResolvedValue([{ id: 'p1', balance: 200, name: 'TestPot' }]);
    // stub Actual Budget accounts, balance and import
    api.getAccounts.mockResolvedValue([{ id: 'a1' }]);
    api.getAccountBalance.mockResolvedValue(50);
    api.addTransactions.mockResolvedValue();
    // Stub payee lookup/creation
    api.getPayees.mockResolvedValue([]);
    api.createPayee.mockResolvedValue('pid1');

    const count = await runSync({ useLogger: false });
    expect(count).toBe(1);
    expect(api.addTransactions).toHaveBeenCalledWith(
      'a1',
      [
        expect.objectContaining({
          amount: 150,
          payee: 'pid1',
          imported_payee: 'actual-monzo-pots',
        }),
      ],
      { runTransfers: false, learnCategories: false }
    );
    // mapping.json updated to new balance
    const updated = JSON.parse(fs.readFileSync(mappingFile, 'utf8'));
    expect(updated[0].lastBalance).toBe(200);
  });
});
