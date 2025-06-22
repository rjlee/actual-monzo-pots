# actual-monzo-pots

A daemon application to sync Monzo Pot balances to Actual Budget accounts.

## Features

- OAuth2 authentication flow for Monzo to list pots.
- Sync Monzo pot balances to corresponding Actual Budget accounts via transactions.
- Web UI to map pots to Actual Budget accounts and trigger sync manually.
- Cron-based daemon mode for automated syncing.
- Docker build and GitHub Actions workflows for CI, release, and Docker image publishing.

## Quick Start

1. Copy `.env.example` to `.env`, and fill in your Monzo credentials (CLIENT_ID, CLIENT_SECRET, REDIRECT_URI), the OAuth2 settings (MONZO_AUTH_PATH — leave blank for default Monzo flow or set to `/oauth2/authorize` if required). Optionally set `MONZO_SCOPES` if you need non-default scopes (otherwise your client’s default scopes from the Monzo developer portal will be used), and your Actual Budget credentials.
2. Copy `config.example.yaml` to `config.yaml` and adjust scheduling, HTTP port, and mapping settings.
3. Build and run with Docker Compose:

```bash
docker-compose up --build -d
```

4. In your browser, visit `/auth` on your HTTP_PORT to authorize Monzo:

```text
http://localhost:8082/auth
```

5. Once Monzo auth succeeds, return to `/` to configure mappings and trigger sync.

Alternatively, run locally:

```bash
npm install
# Launch daemon with web UI (add --verbose for debug request logs)
npm run daemon -- --ui [--verbose]
    # The daemon auto-refreshes using any existing refresh token on disk
    # so restarting will also mark you authenticated if your refresh token is valid.
```

Open your browser to the configured HTTP port to map pots and trigger sync. For example, if `HTTP_PORT=8082`, visit:

```text
http://localhost:8082/
```

Use the **Authenticate Monzo** button to log in (the status badge will indicate success or failure after OAuth). Once authenticated, click **Refresh Pots** to load your Pot list before saving mappings or syncing.

> **Note:** If you previously authenticated before setting MONZO_SCOPES or MONZO_AUTH_PATH, delete the saved refresh token (default: `data/monzo_refresh_token.txt`) so that a new token with the updated scopes and auth path can be issued.

## Configuration

See `.env.example` and `config.example.yaml` for available options.

## Quick start with Docker

Copy `.env.example` to `.env` and fill in your Monzo credentials and Actual Budget settings:

```bash
# Monzo OAuth settings: register a Monzo developer application at https://developers.monzo.com
# and configure your redirect URI (e.g. http://localhost:3000/auth/callback)
CLIENT_ID=...
CLIENT_SECRET=...
REDIRECT_URI=http://localhost:3000/auth/callback
MONZO_AUTH_PATH=/oauth2/authorize       # only if required by your Monzo app
MONZO_SCOPES=pot:read pot:write         # optional additional scopes

# Actual Budget settings:
ACTUAL_SERVER_URL=http://localhost:5006
ACTUAL_PASSWORD=yourpassword
ACTUAL_BUDGET_ID=yourbudgetid

# (Optional) override mapping file, HTTP_PORT, cron schedule, etc in config.yaml
```

Build and run via Docker:

```bash
# Build the Docker image
docker build -t actual-monzo-pots .

# Prepare host dirs for token & budget cache, and mapping data
mkdir -p data/monzo_cache data/budget
touch data/mapping.json

# Run the container (mount volumes to persist state)
docker run --rm --env-file .env \
  -v "$(pwd)/data:/app/data" \
  actual-monzo-pots
```

Authenticate Monzo and access the web UI:

```text
# Open Monzo OAuth flow:
http://localhost:3000/auth

# After successful OAuth callback, visit:
http://localhost:3000/
```

## GitHub Actions

This project includes workflows for CI, release, and Docker publishing in `.github/workflows`.

## Development

We use ESLint, Prettier, Husky, lint-staged, and Jest to enforce code quality.

Install dependencies:

```bash
npm install
```

Lint and format checks:

```bash
npm run lint           # run ESLint
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
