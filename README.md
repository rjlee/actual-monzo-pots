# actual-monzo-pots

Synchronise Monzo Pot balances into Actual Budget accounts. Authenticate via Monzo OAuth, map pots to Actual accounts in the Web UI, and let the daemon keep everything in sync.

## Features

- Guided OAuth2 login with secure token storage; intended to sit behind the shared `actual-auto-auth` forward proxy for UI protection.
- Web UI for pot/account mapping, manual sync, and status.
- Cron-driven daemon with configurable schedule and optional dry-run.
- Docker image with baked-in health check and persistent data volume.

## Requirements

- Node.js ≥ 22.
- Monzo developer OAuth credentials (`CLIENT_ID`, `CLIENT_SECRET`, `REDIRECT_URI`).
- Actual Budget server credentials (`ACTUAL_SERVER_URL`, `ACTUAL_PASSWORD`, `ACTUAL_SYNC_ID`).

## Installation

```bash
git clone https://github.com/rjlee/actual-monzo-pots.git
cd actual-monzo-pots
npm install
```

Optional git hooks:

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

Published images live at `ghcr.io/rjlee/actual-monzo-pots:<tag>` (see [Image tags](#image-tags)).

For Compose deployments you can choose between:

- `docker-compose.yml` – publishes the UI directly on `HTTP_PORT`.
- `docker-compose.with-auth.yml.example` – bundles Traefik plus
  [`actual-auto-auth`](https://github.com/rjlee/actual-auto-auth) so access is
  gated by the shared password prompt. Copy it to `docker-compose.yml`, update
  `AUTH_APP_NAME` / `AUTH_COOKIE_NAME` to taste, and ensure `ACTUAL_PASSWORD`
  is available to the auth proxy.

## Configuration

- `.env` – primary configuration, copy from `.env.example`.
- `config.yaml` / `config.yml` / `config.json` – optional defaults, copy from `config.example.yaml`.

Precedence: CLI flags > environment variables > config file.

| Setting                            | Description                                    | Default                              |
| ---------------------------------- | ---------------------------------------------- | ------------------------------------ |
| `CLIENT_ID` / `CLIENT_SECRET`      | Monzo OAuth credentials                        | required                             |
| `REDIRECT_URI`                     | OAuth redirect URI (absolute URL or relative)  | required                             |
| `MONZO_SCOPES`                     | Space-separated scopes                         | from developer portal                |
| `DATA_DIR`                         | Local storage for tokens + mappings            | `./data`                             |
| `TOKEN_DIRECTORY` / `TOKEN_FILE`   | Refresh token location                         | `./data` / `monzo_refresh_token.txt` |
| `BUDGET_DIR`                       | Budget cache directory                         | `./data/budget`                      |
| `SYNC_CRON` / `SYNC_CRON_TIMEZONE` | Daemon cron schedule                           | `45 * * * *` / `UTC`                 |
| `DISABLE_CRON_SCHEDULING`          | Disable cron while in daemon mode              | `false`                              |
| `HTTP_PORT`                        | Enables Web UI when set or `--ui` passed       | `3000`                               |
| `BASE_PATH`                        | Serve UI under a path prefix (e.g. `/monzo`)   | unset (served at `/`)                |
| `AUTH_COOKIE_NAME`                 | Cookie name forwarded by Traefik for logout UI | `actual-auth`                        |
| `LOG_LEVEL`                        | Pino log level                                 | `info`                               |
| `ENABLE_NODE_VERSION_SHIM`         | Legacy shim for older `@actual-app/api` checks | `false`                              |

## Usage

### CLI modes

- One-off sync: `npm run sync`
- Daemon with UI: `npm run daemon -- --ui --http-port 3000`
- Disable cron in daemon: `DISABLE_CRON_SCHEDULING=true npm run daemon`

Visit `http://localhost:3000` (or your configured port) to connect to Monzo, map pots, and trigger on-demand syncs. When deployed with the stack, expose the UI through Traefik + `actual-auto-auth` and set `REDIRECT_URI` to the externally accessible `/monzo/auth/callback` URL.

### Docker daemon

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

- `ghcr.io/rjlee/actual-monzo-pots:<semver>` – pinned to a specific `@actual-app/api` release.
- `ghcr.io/rjlee/actual-monzo-pots:latest` – highest supported API version.

See [rjlee/actual-auto-ci](https://github.com/rjlee/actual-auto-ci) for tagging policy and automation details.

## License

MIT © contributors.
