# actual-monzo-pots

Sync Monzo Pot balances into Actual Budget accounts. Authenticate with Monzo via OAuth, map pots to Actual accounts in the web UI, and run scheduled syncs or manual adjustments.

## Features

- OAuth2 flow with secure token storage and session-based UI authentication.
- Web UI for pot/account mapping and on-demand sync.
- Cron-driven daemon with configurable schedule.
- Docker image with health check and persistent data volume.

## Requirements

- Node.js ≥ 20.
- Monzo Developer OAuth client (Client ID, Secret, Redirect URI).
- Actual Budget server connection and credentials.

## Installation

```bash
git clone https://github.com/rjlee/actual-monzo-pots.git
cd actual-monzo-pots
npm install
```

Optional husky hooks:

```bash
npm run prepare
```

### Docker quick start

```bash
cp .env.example .env
docker build -t actual-monzo-pots .
mkdir -p data/budget
docker run -d --env-file .env \
  -p 5008:3000 \
  -v "$(pwd)/data:/app/data" \
  actual-monzo-pots --mode daemon --ui
```

Prebuilt images: `ghcr.io/rjlee/actual-monzo-pots:<tag>`.

## Configuration

- `.env` – Actual credentials, Monzo OAuth credentials, session settings, schedule overrides.
- `config.yaml` / `config.yml` / `config.json` – optional defaults (copy `config.example.yaml`).

Precedence: CLI > env vars > config file.

Key options:

| Setting                                      | Description                      | Default                                 |
| -------------------------------------------- | -------------------------------- | --------------------------------------- |
| `DATA_DIR`                                   | App data (token cache, mappings) | `./data`                                |
| `BUDGET_DIR`                                 | Budget cache                     | `./data/budget`                         |
| `SYNC_CRON` / `SYNC_CRON_TIMEZONE`           | Cron schedule                    | `45 * * * *` / `UTC`                    |
| `DISABLE_CRON_SCHEDULING`                    | Disable cron in daemon           | `false`                                 |
| `HTTP_PORT`                                  | Web UI port                      | `3000`                                  |
| `UI_AUTH_ENABLED`                            | Require login                    | `true`                                  |
| `CLIENT_ID`, `CLIENT_SECRET`, `REDIRECT_URI` | Monzo OAuth credentials          | —                                       |
| `MONZO_SCOPES`                               | OAuth scopes                     | `pots:read accounts:read` (see example) |

## Usage

### Local

```bash
# One-off sync
npm run sync

# Daemon with UI
npm run daemon -- --ui --http-port 3000
```

Visit `http://localhost:3000` (or your configured port) to authenticate with Monzo, map pots, and trigger manual syncs.

### Docker

```bash
docker run --rm --env-file .env \
  -p 5008:3000 \
  -v "$(pwd)/data:/app/data" \
  ghcr.io/rjlee/actual-monzo-pots:latest --mode daemon --ui
```

## Testing & linting

```bash
npm test
npm run lint
npm run lint:fix
npm run format
npm run format:check
```

## Image tags

- `ghcr.io/rjlee/actual-monzo-pots:<semver>` – pinned Actual API version.
- `ghcr.io/rjlee/actual-monzo-pots:latest` – highest supported release.

## Security considerations

- OAuth refresh token is stored in `DATA_DIR` (default `./data/monzo_refresh_token.txt`). Protect this directory.
- UI authentication is on by default; set a unique `SESSION_SECRET`.
- Serve over HTTPS with `SSL_KEY`/`SSL_CERT`, or disable the UI entirely once configuration is finished.

## License

MIT © contributors.
