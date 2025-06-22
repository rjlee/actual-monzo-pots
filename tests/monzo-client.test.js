// Tests for MonzoClient in src/monzo-client.js
jest.mock('axios');
jest.mock('fs/promises', () => ({
  writeFile: jest.fn(),
  readFile: jest.fn(),
  mkdir: jest.fn(),
}));
jest.mock('uuid', () => ({ v4: jest.fn(() => 'fixed-state') }));

const axios = require('axios');
const fs = require('fs/promises');

// Ensure environment is set before loading module
process.env.CLIENT_ID = 'client-id';
process.env.CLIENT_SECRET = 'client-secret';
process.env.MONZO_AUTH_ENDPOINT = 'https://auth.endpoint';
process.env.MONZO_AUTH_PATH = '/oauth';
process.env.MONZO_TOKEN_PATH = '/token';
process.env.MONZO_API_ENDPOINT = 'https://api.endpoint';
process.env.REDIRECT_URI = 'http://redirect.uri';
process.env.TOKEN_DIRECTORY = '/tmp/token-dir';
process.env.TOKEN_FILE = 'tokenfile';

const monzo = require('../src/monzo-client');

beforeEach(() => {
  // Reset internal state
  monzo.accessToken = null;
  monzo.refreshToken = null;
  monzo.state = null;
  jest.clearAllMocks();
});

describe('init()', () => {
  it('creates token directory and loads existing token when file exists', async () => {
    fs.readFile.mockResolvedValue('old-token');
    axios.post.mockResolvedValue({ data: { access_token: 'at', refresh_token: 'rt' } });
    await monzo.init();
    expect(fs.mkdir).toHaveBeenCalledWith('/tmp/token-dir', { recursive: true });
    expect(fs.readFile).toHaveBeenCalledWith('/tmp/token-dir/tokenfile', 'utf-8');
    expect(axios.post).toHaveBeenCalledWith(
      'https://api.endpoint/token',
      expect.stringContaining('refresh_token=old-token')
    );
    expect(monzo.accessToken).toBe('at');
    expect(monzo.refreshToken).toBe('rt');
  });

  it('skips loading token when readFile fails', async () => {
    fs.readFile.mockRejectedValue(new Error('no file')); // simulate missing file
    await monzo.init();
    expect(fs.readFile).toHaveBeenCalled();
    expect(monzo.accessToken).toBeNull();
    expect(monzo.refreshToken).toBeNull();
  });
});

describe('authorize()', () => {
  it('sets state and redirects to Monzo auth endpoint', () => {
    const res = { redirect: jest.fn() };
    monzo.authorize(res);
    expect(monzo.state).toBe('fixed-state');
    const expectedParams = new URLSearchParams({
      client_id: 'client-id',
      redirect_uri: 'http://redirect.uri',
      response_type: 'code',
      state: 'fixed-state',
    }).toString();
    expect(res.redirect).toHaveBeenCalledWith(`https://auth.endpoint/oauth?${expectedParams}`);
  });
});

describe('handleCallback()', () => {
  it('throws on state mismatch', async () => {
    monzo.state = 'expected-state';
    await expect(monzo.handleCallback('code', 'bad-state')).rejects.toThrow(
      'Monzo OAuth state mismatch'
    );
  });

  it('exchanges code for tokens and validates with whoAmI', async () => {
    monzo.state = 'st';
    monzo.state = 'st';
    axios.post.mockResolvedValue({ data: { access_token: 'a1', refresh_token: 'r1' } });
    const whoSpy = jest.spyOn(monzo, 'whoAmI').mockResolvedValue({ user_id: 'u1' });
    await monzo.handleCallback('the-code', 'st');
    expect(axios.post).toHaveBeenCalledWith(
      'https://api.endpoint/token',
      expect.stringContaining('code=the-code')
    );
    expect(monzo.accessToken).toBe('a1');
    expect(monzo.refreshToken).toBe('r1');
    expect(whoSpy).toHaveBeenCalled();
    whoSpy.mockRestore();
  });
});

describe('refreshAccessToken()', () => {
  it('posts refresh_token and updates tokens', async () => {
    axios.post.mockResolvedValue({ data: { access_token: 'newA', refresh_token: 'newR' } });
    await monzo.refreshAccessToken('oldR');
    expect(axios.post).toHaveBeenCalledWith(
      'https://api.endpoint/token',
      expect.stringContaining('refresh_token=oldR')
    );
    expect(monzo.accessToken).toBe('newA');
    expect(monzo.refreshToken).toBe('newR');
  });
});

describe('storeToken()', () => {
  it('persists refreshToken to disk and updates instance state', async () => {
    await monzo.storeToken('acc123', 'ref456');
    expect(monzo.accessToken).toBe('acc123');
    expect(monzo.refreshToken).toBe('ref456');
    expect(fs.writeFile).toHaveBeenCalledWith('/tmp/token-dir/tokenfile', 'ref456');
  });
});

describe('isAuthenticated()', () => {
  it('returns true only when accessToken is set', () => {
    monzo.accessToken = null;
    expect(monzo.isAuthenticated()).toBe(false);
    monzo.accessToken = 'xyz';
    expect(monzo.isAuthenticated()).toBe(true);
  });
});

describe('listAccounts and listPots', () => {
  it('returns accounts from API', async () => {
    axios.mockResolvedValue({ data: { accounts: ['a'] } });
    monzo.accessToken = 't';
    const accs = await monzo.listAccounts();
    expect(accs).toEqual(['a']);
  });

  it('returns pots for given account', async () => {
    axios.mockResolvedValue({ data: { pots: ['p'] } });
    monzo.accessToken = 't';
    const pots = await monzo.listPots('acc1');
    expect(pots).toEqual(['p']);
  });
});

describe('whoAmI()', () => {
  it('calls whoami endpoint and returns data', async () => {
    axios.get = jest.fn().mockResolvedValue({ data: { user_id: 'usr' } });
    monzo.accessToken = 'tok';
    const ret = await monzo.whoAmI();
    expect(axios.get).toHaveBeenCalledWith('https://api.endpoint/ping/whoami', {
      headers: { Authorization: 'Bearer tok' },
    });
    expect(ret).toEqual({ user_id: 'usr' });
  });
});

describe('request()', () => {
  it('returns response on success', async () => {
    const resp = { status: 200, data: {} };
    axios.mockResolvedValue(resp);
    monzo.accessToken = 'T';
    const out = await monzo.request('get', 'url', { a: 1 });
    expect(out).toBe(resp);
  });

  it('retries once on 401 then succeeds', async () => {
    const err = new Error('fail');
    err.response = { status: 401 };
    axios.mockRejectedValueOnce(err).mockResolvedValue({ status: 200, data: {} });
    monzo.accessToken = 'T';
    monzo.refreshToken = 'R';
    jest.spyOn(monzo, 'refreshAccessToken').mockResolvedValue();
    const out = await monzo.request('get', 'url');
    expect(monzo.refreshAccessToken).toHaveBeenCalledWith('R');
    expect(out).toEqual({ status: 200, data: {} });
  });

  it('throws after retry failure or non-retryable error', async () => {
    const err = new Error('err');
    err.response = { status: 500 };
    axios.mockRejectedValue(err);
    monzo.accessToken = 'T';
    await expect(monzo.request('get', 'url')).rejects.toThrow('err');
  });
});
