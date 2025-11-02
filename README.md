# actual-monzo-pots

An application to sync Monzo Pot balances to Actual Budget accounts.

## Features

- OAuth2 authentication flow for Monzo to list pots.
- Sync Monzo pot balances to corresponding Actual Budget accounts via transactions.
- Web UI to map pots to Actual Budget accounts and trigger sync manually.
- Cron-based daemon mode for automated syncing.
- Docker build and GitHub Actions workflows for CI, release, and Docker image publishing.

## Quick Start

_Before you begin, please review the [Security Considerations](#security-considerations) section below._

1. Register a new OAuth client on the Monzo Developer Portal (https://developers.monzo.com/) to obtain Monzo credentials:
   - Give your client a Name (displayed during the authorization prompt).
   - Set Redirect URL to `http://localhost:3000/auth/callback` (_or_ `http://<your_host>:${HTTP_PORT}/auth/callback` if you override `HTTP_PORT`).
   - Set Confidentiality to "Confidential".
     After submission, note the Client ID and Client Secret values, then set `REDIRECT_URI` to your callback URL (e.g. `http://localhost:3000/auth/callback`).
2. Copy `.env.example` to `.env` and fill in your Monzo credentials (`CLIENT_ID`, `CLIENT_SECRET`, `REDIRECT_URI`,
   `MONZO_SCOPES`) and your Actual Budget settings (`ACTUAL_SERVER_URL`, `ACTUAL_SYNC_ID`,
   `ACTUAL_BUDGET_ENCRYPTION_PASSWORD` if your budget file is encrypted).
   Optionally, set `DATA_DIR` and `BUDGET_DIR` to control where mappings and budget files are stored
   (defaults to `data/` and `data/budget/`).

Session-based UI authentication is enabled by default. A signed session cookie is used (`cookie-session` with a shared secret).
The signing key comes from `SESSION_SECRET` (falling back to `ACTUAL_PASSWORD` if unset).

Set your password and session secret:

```bash
ACTUAL_PASSWORD=yourBudgetPassword
SESSION_SECRET=someLongRandomString
# To disable login form (allow open access):
UI_AUTH_ENABLED=false
```

# Optionally enable HTTPS for the Web UI:

SSL_KEY=/path/to/privkey.pem # path to SSL private key
SSL_CERT=/path/to/fullchain.pem # path to SSL certificate chain

````

3. Copy `config.example.yaml` to `config.yaml` if you need to override defaults (schedule, HTTP_PORT, DATA_DIR, BUDGET_DIR).
4. Build and run with Docker Compose:

```bash
docker-compose up --build -d
````

_or_ run locally:

_The `data/` and `data/budget/` directories are included in the repo (with `.gitkeep` to preserve them)._

```bash
npm install
npm run daemon -- --ui [--verbose]
```

5. Open your browser to <http://localhost:3000> (or your configured HTTP_PORT), click **Authenticate Monzo** to
   complete OAuth, map pots to Actual accounts, and click **Sync Now**.

> **Note:** To force a fresh Monzo OAuth token (e.g. after changing MONZO_SCOPES), delete
> `data/monzo_refresh_token.txt`.

# Security Considerations

> **Web UI security:** The Web UI displays your Monzo pots and Actual Budget account details in your browser.

- **Session-based UI authentication** (enabled by default): requires a signed session cookie (`cookie-session` with `SESSION_SECRET`).
  To disable the login form (open access), set `UI_AUTH_ENABLED=false`.

```bash
ACTUAL_PASSWORD=yourBudgetPassword
SESSION_SECRET=someLongRandomString
# To disable login form:
UI_AUTH_ENABLED=false
```

- **Monzo refresh token storage:** the Monzo refresh token is persisted unencrypted to the path defined by
  `TOKEN_DIRECTORY` and `TOKEN_FILE` (default `./data/monzo_refresh_token.txt`). Protect this directory
  with appropriate filesystem permissions and physical security to prevent unauthorized access.

- **TLS/HTTPS:** to serve the UI over HTTPS (strongly recommended in production), set:

  ```bash
  SSL_KEY=/path/to/privkey.pem    # path to SSL private key
  SSL_CERT=/path/to/fullchain.pem # path to SSL certificate chain
  ```

- **Disable Web UI:** once configuration is complete, you can turn off the Web UI entirely:
  - **Locally:** omit the `--ui` flag and remove any `http-port` setting from your `config.yaml` or `.env`,
    or use one-shot sync (`npm run sync`).
  - **Docker Compose:** remove or comment out the `ports:` mapping or web service definition in `docker-compose.yml`.

## Configuration

See `.env.example` and `config.example.yaml` for available options.

## Releases & Docker

We use GitHub Actions + semantic-release to automate version bumps, changelogs, GitHub releases, and Docker image publishing:

- **CI & Release** (`.github/workflows/release.yml`) runs on push to `main`: lint, format-check, test, and `semantic-release` (updates `CHANGELOG.md` and `package.json`, tags a release, and merges to the `release` branch).
- **Docker Build & Publish** (`.github/workflows/docker.yml`) runs on push to `release` (or after the CI workflow succeeds): builds the Docker image and publishes to GitHub Container Registry (`ghcr.io/<owner>/<repo>:<version>` and `:latest`).

Ensure your repository has the `GITHUB_TOKEN` secret (automatically injected) so that Semantic Release and Docker publishing can push back to GitHub.

## Docker

- Pull latest image: `docker pull ghcr.io/rjlee/actual-monzo-pots:latest`
- Run with env file:
  - `docker run --rm --env-file .env ghcr.io/rjlee/actual-monzo-pots:latest`
- Persist data by mounting `./data` to `/app/data`
- Or via compose: `docker-compose up -d`

## API-Versioned Images

Actual Budget's server and `@actual-app/api` should be compatible. This project publishes API‑specific images so you can pick an image that matches your server:

- Exact pin: `ghcr.io/rjlee/actual-monzo-pots:api-25.2.1`
- Minor alias: `ghcr.io/rjlee/actual-monzo-pots:api-25.2`
- Major alias: `ghcr.io/rjlee/actual-monzo-pots:api-25`

The Dockerfile accepts a build arg `ACTUAL_API_VERSION` and CI publishes images for the latest patch of the last two API majors (stable only, no nightly/rc/edge). Each build also publishes rolling aliases for the minor and major lines. Images include labels:

- `io.actual.api.version` — the `@actual-app/api` version
- `org.opencontainers.image.revision` — git SHA
- `org.opencontainers.image.version` — app version

### Examples

- Run with a specific API line: `docker run --rm --env-file .env ghcr.io/rjlee/actual-monzo-pots:api-25`
- Pin exact API patch: `docker run --rm --env-file .env ghcr.io/rjlee/actual-monzo-pots:api-25.2.1`

## Release Strategy

- **App releases (semantic‑release):**
  - Tags: `<app-version>`, `<major>.<minor>`, `<major>`, `latest`.
- **API matrix images (compatibility):**
  - Scope: latest patch of the last two stable `@actual-app/api` majors.
  - Tags per image: `api-<patch>`, `api-<minor>`, `api-<major>`.

## Choosing an Image Tag

- **You know your server’s API major (recommended):** use `api-<MAJOR>` (e.g. `api-25`).
- **You need a specific API patch:** use `api-<MAJOR.MINOR.PATCH>`.
- **Only care about the app release:** use `<app-version>` or `latest`.

## GitHub Actions

This project includes workflows for CI, release, and Docker publishing in `.github/workflows`.

## Development

We use ESLint, Prettier, Husky (Git hooks), lint-staged, and Jest to enforce code quality.

Install dependencies and enable Git hooks:

```bash
npm install
# Husky installs hooks defined in package.json (pre-commit, pre-push)
npm run prepare
```

Lint and format checks:

```bash
npm run lint           # run ESLint and EJS template linting
npm run lint:ejs       # check EJS templates for syntax errors
npm run format         # auto-format code with Prettier
npm run format:check   # verify code is formatted
```

Testing:

```bash
npm test               # run unit tests with Jest
```

Husky hooks:

- **pre-commit**: auto-fix staged files with ESLint & Prettier (via lint-staged)
- **pre-push**: run `npm run lint && npm test` before pushing commits

Release process:

```bash
npm run prerelease     # lint, format-check, and test before releasing
npm run release        # create a new release with semantic-release
```

> **Disclaimer:** Users run this software at their own risk; no warranties are provided, and the authors are not liable for any data loss or unintended side effects.
