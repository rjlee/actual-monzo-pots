# actual-monzo-pots

An application to sync Monzo Pot balances to Actual Budget accounts.

## Features

- OAuth2 authentication flow for Monzo to list pots.
- Sync Monzo pot balances to corresponding Actual Budget accounts via transactions.
- Web UI to map pots to Actual Budget accounts and trigger sync manually.
- Cron-based daemon mode for automated syncing.
- Docker build and GitHub Actions workflows for CI, release, and Docker image publishing.

## Quick Start

1. Register a new OAuth client on the Monzo Developer Portal (https://developers.monzo.com/) to obtain Monzo credentials:
   - Give your client a Name (displayed during the authorization prompt).
   - Set Redirect URL to `http://localhost:3000/auth/callback` (_or_ `http://<your_host>:${HTTP_PORT}/auth/callback` if you override `HTTP_PORT`).
   - Set Confidentiality to "Confidential".
     After submission, note the Client ID and Client Secret values, then set `REDIRECT_URI` to your callback URL (e.g. `http://localhost:3000/auth/callback`).
2. Copy `.env.example` to `.env` and fill in your Monzo credentials (CLIENT_ID, CLIENT_SECRET, REDIRECT_URI,
   MONZO_SCOPES) and your Actual Budget settings (ACTUAL_SERVER_URL, ACTUAL_PASSWORD, ACTUAL_BUDGET_ID,
   ACTUAL_BUDGET_ENCRYPTION_PASSWORD if your budget file is encrypted).
3. Copy `config.example.yaml` to `config.yaml` if you need to override defaults (schedule, HTTP_PORT, MAPPING_FILE).
4. Build and run with Docker Compose:

   ```bash
   docker-compose up --build -d
   ```

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

> **Security note:** The web UI displays your Monzo pots and Actual Budget account details in your browser.
> It only starts if you pass `--ui` or explicitly define an HTTP port (via `--http-port`, `config.yaml`/`config.yml`,
> or `HTTP_PORT` in your environment).
> To protect it with a password, define `UI_USER` and `UI_PASSWORD` in your `.env` or `config.yaml`:
>
> ```bash
> UI_USER=admin          # Basic‑Auth user (default: admin)
> UI_PASSWORD=yourSecret # password to access the UI
> ```
>
> Restart the service; your browser will prompt for credentials before showing the UI. To remove password
> protection, unset or clear `UI_PASSWORD`. To disable the Web UI entirely, omit any HTTP port setting and
> do not pass the `--ui` flag (or remove the `ports:` mapping in `docker-compose.yml`).

## Configuration

See `.env.example` and `config.example.yaml` for available options.

## Releases & Docker

We use GitHub Actions + semantic-release to automate version bumps, changelogs, GitHub releases, and Docker image publishing:

- **CI & Release** (`.github/workflows/release.yml`) runs on push to `main`: lint, format-check, test, and `semantic-release` (updates `CHANGELOG.md` and `package.json`, tags a release, and merges to the `release` branch).
- **Docker Build & Publish** (`.github/workflows/docker.yml`) runs on push to `release` (or after the CI workflow succeeds): builds the Docker image and publishes to GitHub Container Registry (`ghcr.io/<owner>/<repo>:<version>` and `:latest`).

Ensure your repository has the `GITHUB_TOKEN` secret (automatically injected) so that Semantic Release and Docker publishing can push back to GitHub.

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
