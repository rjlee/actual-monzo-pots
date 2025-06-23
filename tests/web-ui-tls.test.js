const fs = require('fs');
const https = require('https');

// Stub dependencies to avoid real network/file ops
jest.mock('../src/utils', () => ({
  setupMonzo: jest.fn().mockResolvedValue(),
  openBudget: jest.fn().mockResolvedValue(),
}));
jest.mock('../src/monzo-client', () => ({ tokenDir: null, tokenFile: null }));
jest.mock('../src/sync');
jest.mock('@actual-app/api');

const { startWebUi } = require('../src/web-ui');

describe('Web UI TLS support', () => {
  let createServerSpy;
  let server;
  const OLD_ENV = { ...process.env };

  beforeEach(() => {
    // Spy on https.createServer and fs.readFileSync
    // Fake HTTPS server whose listen() returns itself
    const fakeServer = {};
    fakeServer.listen = jest.fn(() => fakeServer);
    createServerSpy = jest.spyOn(https, 'createServer').mockReturnValue(fakeServer);
    jest.spyOn(fs, 'readFileSync').mockImplementation((path) => Buffer.from(path));
    // Disable UI authentication for TLS tests
    process.env.UI_AUTH_ENABLED = 'false';
  });

  afterEach(() => {
    if (server && typeof server.close === 'function') {
      server.close();
    }
    jest.restoreAllMocks();
    process.env = { ...OLD_ENV };
  });

  it('serves over HTTPS when SSL_KEY and SSL_CERT are set', async () => {
    process.env.SSL_KEY = '/fake/key.pem';
    process.env.SSL_CERT = '/fake/cert.pem';
    server = await startWebUi(0, false);
    expect(createServerSpy).toHaveBeenCalledWith(
      { key: Buffer.from('/fake/key.pem'), cert: Buffer.from('/fake/cert.pem') },
      expect.any(Function)
    );
    expect(server.listen).toHaveBeenCalledWith(0, expect.any(Function));
  });

  it('falls back to HTTP when SSL_KEY/SSL_CERT are not set', async () => {
    delete process.env.SSL_KEY;
    delete process.env.SSL_CERT;
    server = await startWebUi(0, false);
    expect(createServerSpy).not.toHaveBeenCalled();
    // HTTP fallback: server.address() should be an object with port info
    expect(typeof server.address()).toBe('object');
  });
});
