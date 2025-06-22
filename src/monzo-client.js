require('dotenv').config();
const axios = require('axios');
const { writeFile, readFile, mkdir } = require('fs/promises');
const { v4: uuidv4 } = require('uuid');
const logger = require('./logger');

class MonzoClient {
  constructor() {
    this.clientId = process.env.CLIENT_ID;
    this.clientSecret = process.env.CLIENT_SECRET;
    this.authEndpoint = process.env.MONZO_AUTH_ENDPOINT;
    // OAuth2 authorization path (relative to auth endpoint), leave blank to use root '/'
    this.authPath = process.env.MONZO_AUTH_PATH || '';
    this.tokenPath = process.env.MONZO_TOKEN_PATH;
    this.apiEndpoint = process.env.MONZO_API_ENDPOINT;
    this.redirectUri = process.env.REDIRECT_URI;
    this.tokenDir = process.env.TOKEN_DIRECTORY;
    this.tokenFile = process.env.TOKEN_FILE;
    this.state = null;
    this.accessToken = null;
    this.refreshToken = null;
  }

  async init() {
    if (this.tokenDir) await mkdir(this.tokenDir, { recursive: true });
    if (this.tokenFile && this.tokenDir) {
      try {
        const data = await readFile(`${this.tokenDir}/${this.tokenFile}`, 'utf-8');
        if (data) {
          this.refreshToken = data;
          logger.debug('Loaded existing Monzo refresh token from disk');
          // Refresh access token on startup using stored refresh token
          await this.refreshAccessToken(this.refreshToken);
        }
      } catch (err) {
        logger.debug({ err }, 'No existing Monzo refresh token to load');
      }
    }
  }

  authorize(res) {
    this.state = uuidv4();
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      response_type: 'code',
      state: this.state,
    });
    // Only request explicit scopes if configured (otherwise use dev-portal defaults)
    if (process.env.MONZO_SCOPES) params.append('scope', process.env.MONZO_SCOPES);
    // Redirect user to Monzo authorization endpoint
    const sep = this.authPath ? '?' : '/?';
    const url = `${this.authEndpoint}${this.authPath}${sep}${params.toString()}`;
    res.redirect(url);
  }

  async handleCallback(code, state) {
    logger.info({ state }, 'Monzo OAuth callback received');
    if (state !== this.state) {
      throw new Error('Monzo OAuth state mismatch');
    }
    const params = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: this.clientId,
      client_secret: this.clientSecret,
      redirect_uri: this.redirectUri,
      code,
    }).toString();
    logger.debug({ params }, 'Exchanging code for tokens');
    const response = await axios.post(`${this.apiEndpoint}${this.tokenPath}`, params);
    const { access_token, refresh_token } = response.data;
    await this.storeToken(access_token, refresh_token);
    logger.info('Monzo access & refresh tokens stored');
    // Validate the access token immediately
    await this.whoAmI();
    logger.info('Monzo access token validated via whoAmI');
  }

  async refreshAccessToken(refreshToken) {
    const params = new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: this.clientId,
      client_secret: this.clientSecret,
      refresh_token: refreshToken,
    }).toString();
    logger.debug('Refreshing Monzo access token');
    const response = await axios.post(`${this.apiEndpoint}${this.tokenPath}`, params);
    const { access_token, refresh_token } = response.data;
    await this.storeToken(access_token, refresh_token);
    logger.info('Monzo access token refreshed');
  }

  async storeToken(accessToken, refreshToken) {
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;
    if (this.tokenFile && this.tokenDir) {
      logger.debug('Persisting Monzo refresh token to disk');
      await writeFile(`${this.tokenDir}/${this.tokenFile}`, refreshToken);
      logger.info('Monzo refresh token written to file');
    }
  }

  /**
   * @returns {boolean} true if an access token is loaded (user has authenticated)
   */
  isAuthenticated() {
    return Boolean(this.accessToken);
  }

  async listAccounts() {
    const resp = await this.request('get', `${this.apiEndpoint}/accounts/`);
    return resp.data.accounts;
  }

  async listPots(accountId) {
    const url = `${this.apiEndpoint}/pots?current_account_id=${accountId}`;
    const resp = await this.request('get', url);
    return resp.data.pots;
  }

  /** Validate the current access token by calling Monzo whoami endpoint */
  async whoAmI() {
    logger.debug('Calling Monzo /ping/whoami to validate token');
    const response = await axios.get(`${this.apiEndpoint}/ping/whoami`, {
      headers: { Authorization: `Bearer ${this.accessToken}` },
    });
    logger.info({ user: response.data.user_id }, 'Monzo whoami success');
    return response.data;
  }

  async request(method, url, data, retry) {
    logger.debug({ method, url, data }, 'Monzo API request');
    try {
      const response = await axios({
        method,
        url,
        data,
        headers: { Authorization: `Bearer ${this.accessToken}` },
      });
      logger.debug({ status: response.status, data: response.data }, 'Monzo API response');
      return response;
    } catch (err) {
      logger.error({ err, status: err.response?.status }, 'Monzo API request failed');
      // If unauthorized or forbidden and we have a stored refresh token, retry once after refreshing
      if (
        this.refreshToken &&
        (err.response?.status === 401 || err.response?.status === 403) &&
        !retry
      ) {
        await this.refreshAccessToken(this.refreshToken);
        return this.request(method, url, data, true);
      }
      throw err;
    }
  }
}

module.exports = new MonzoClient();
