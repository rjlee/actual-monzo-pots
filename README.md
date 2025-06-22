# actual-monzo-pots

A daemon application to sync Monzo Pot balances to Actual Budget accounts.

## Features

- OAuth2 authentication flow for Monzo to list pots.
- Sync Monzo pot balances to corresponding Actual Budget accounts via transactions.
- Web UI to map pots to Actual Budget accounts and trigger sync manually.
- Cron-based daemon mode for automated syncing.
- Docker build and GitHub Actions workflows for CI, release, and Docker image publishing.

## Quick Start

1. Copy `.env.example` to `.env` and configure your Monzo credentials (CLIENT_ID, CLIENT_SECRET, REDIRECT_URI,
   MONZO_AUTH_PATH, MONZO_SCOPES) and Actual Budget settings (ACTUAL_SERVER_URL, ACTUAL_PASSWORD, ACTUAL_BUDGET_ID).
2. Copy `config.example.yaml` to `config.yaml` if you need to override defaults (schedule, HTTP_PORT, MAPPING_FILE).
3. Build and run with Docker Compose:

   ```bash
   docker-compose up --build -d
   ```

   _or_ run locally:

```bash
npm install
mkdir -p data/monzo_cache data/budget
npm run daemon -- --ui [--verbose]
```

4. Open your browser to <http://localhost:3000> (or your configured HTTP_PORT), click **Authenticate Monzo** to
   complete OAuth, map pots to Actual accounts, and click **Sync Now**.

> **Note:** To force a fresh Monzo OAuth token (e.g. after changing MONZO_SCOPES or MONZO_AUTH_PATH), delete
> `data/monzo_refresh_token.txt`.

## Configuration

See `.env.example` and `config.example.yaml` for available options.

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
