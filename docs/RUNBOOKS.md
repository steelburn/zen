# Runbooks

## Development

### Prerequisites

- Node.js 22+
- npm 10+
- Go 1.22+ (for backend development)
- Docker & Docker Compose (for full-stack local dev)

### Setup

```bash
# Install frontend dependencies.
npm install

# (Optional) Install backend Go dependencies.
cd backend && go mod tidy && cd ..
```

### Commands

| Command               | Description                        |
| --------------------- | ---------------------------------- |
| `npm run build`       | Compile TypeScript to `dist/`      |
| `npm run test`        | Run unit tests                     |
| `npm run test:coverage` | Run tests with coverage report   |
| `npm run lint`        | Check code style                   |
| `npm run lint:fix`    | Auto-fix lint issues               |
| `npm run format`      | Check formatting                   |
| `npm run format:fix`  | Auto-format code                   |
| `npm run typecheck`   | TypeScript type checking           |
| `npm run ci`          | Full CI pipeline locally           |

### Running the full stack locally

```bash
# Start Postgres + backend.
docker compose up -d

# The API is now available at http://localhost:8080.
# Health check: http://localhost:8080/healthz
# Metrics:      http://localhost:8080/metrics
# Debug vars:   http://localhost:8080/debug/vars

# Stop everything.
docker compose down

# Wipe data and start fresh.
docker compose down -v && docker compose up -d
```

### Making Changes

1. Create a branch from `main`:
   ```bash
   git checkout -b feat/my-change
   ```
2. Make your changes. Keep commits small and use
   [Conventional Commits](https://www.conventionalcommits.org/):
   ```
   feat(core): add widget validation
   fix(infra): correct timeout in health check
   docs: update architecture diagram
   ```
3. Run the full CI pipeline locally:
   ```bash
   npm run ci
   ```
4. Push and open a pull request.

---

## Monitoring & Observability

### Endpoints

| Endpoint             | Description                                      |
| -------------------- | ------------------------------------------------ |
| `GET /healthz`       | Health check (service + database status)         |
| `GET /metrics`       | Application metrics in JSON format               |
| `GET /debug/vars`    | Go runtime metrics (expvar)                      |

### Metrics (`GET /metrics`)

The `/metrics` endpoint returns a JSON object with the following fields:

| Field                | Type    | Description                              |
| -------------------- | ------- | ---------------------------------------- |
| `requests_total`     | int64   | Total HTTP requests handled              |
| `requests_active`    | int64   | Currently in-flight requests             |
| `requests_avg_ms`    | int64   | Average request duration (milliseconds)  |
| `webhooks_received`  | int64   | GitHub webhooks received                 |
| `checks_run`         | int64   | Quality checks executed                  |
| `checks_failed`      | int64   | Quality checks that failed               |
| `errors_total`       | int64   | Total application errors                 |
| `uptime_seconds`     | int64   | Service uptime in seconds                |
| `last_request_time`  | string  | Timestamp of the last request            |
| `status_counts`      | map     | Response status code distribution        |
| `go_goroutines`      | int     | Current number of goroutines             |
| `go_cgo_calls`       | int64   | Total number of cgo calls                |
| `go_mem_alloc_bytes` | uint64  | Current heap memory allocation           |

### Health Check (`GET /healthz`)

Returns service status including database connectivity:

```json
{
  "status": "ok",
  "version": "0.1.0",
  "database": "ok",
  "uptime": "1h23m45s"
}
```

Possible status values:
- `ok` — everything healthy
- `degraded` — one or more dependencies are unhealthy (e.g. database down)
- `error` — critical failure

### Error Tracking (Sentry)

ZEN uses Sentry for error tracking and performance monitoring.

**Setup:**

1. Create a Sentry account at https://sentry.io
2. Create a new project (select "Go")
3. Copy the DSN and set it as `SENTRY_DSN` in your environment

**Configuration:**

| Variable              | Default       | Description                          |
| --------------------- | ------------- | ------------------------------------ |
| `SENTRY_DSN`          | (empty)       | Sentry project DSN (empty = disabled)|
| `SENTRY_ENVIRONMENT`  | `development` | Environment tag (`development`, `staging`, `production`) |
| `SENTRY_SAMPLE_RATE`  | `1.0`         | Transaction sampling rate (0.0–1.0)  |

**What is tracked:**
- Unhandled panics (with HTTP request context)
- 5xx errors reported via `monitoring.GlobalMetrics.ObserveError()`
- Manual error reporting using `sentry.CaptureException()`

---

## Deployment

### Release Process

Deployments are fully automated via GitHub Actions. Pushing a semantic version
tag triggers the release pipeline.

```bash
# 1. Ensure main branch is up to date.
git checkout main
git pull

# 2. Create and push a version tag.
git tag v0.1.0
git push origin v0.1.0
```

The [release.yml](../.github/workflows/release.yml) workflow will:

1. **Frontend:** Type check, lint, test, build
2. **Backend:** Format check, vet, test, build, push Docker image to GitHub Container Registry (ghcr.io)
3. **Release:** Create a GitHub Release with release notes and frontend artifacts

### Docker Images

Images are published to `ghcr.io/<owner>/<repo>` with the following tags:

| Tag pattern    | Example          | Description                         |
| -------------- | ---------------- | ----------------------------------- |
| `vX.Y.Z`       | `v0.1.0`         | Exact version (from git tag)        |
| `X.Y`          | `0.1`            | Major.minor (latest patch)          |
| `X`            | `0`              | Major (latest minor)                |
| `sha-<hash>`   | `sha-abc1234`    | Git SHA (for dev/preview deploys)   |

### Deploying to production (manual steps)

1. Push a version tag (see above)
2. Wait for the release workflow to complete (check [Actions](https://github.com/steelburn/zen/actions))
3. Pull the image:
   ```bash
   docker pull ghcr.io/steelburn/zen:v0.1.0
   ```
4. Run with required environment variables:
   ```bash
   docker run -d \
     --name zen \
     -p 8080:8080 \
     -e DATABASE_DSN="postgres://..." \
     -e GITHUB_APP_ID="..." \
     -e GITHUB_APP_PRIVATE_KEY="..." \
     -e GITHUB_WEBHOOK_SECRET="..." \
     -e SENTRY_DSN="..." \
     -e SENTRY_ENVIRONMENT=production \
     ghcr.io/steelburn/zen:v0.1.0
   ```

### Required Environment Variables

| Variable                    | Description                        |
| --------------------------- | ---------------------------------- |
| `DATABASE_DSN`              | Postgres connection string         |
| `GITHUB_APP_ID`             | GitHub App ID                      |
| `GITHUB_APP_PRIVATE_KEY`    | GitHub App private key (PEM)       |
| `GITHUB_WEBHOOK_SECRET`     | GitHub webhook secret              |

### Optional Environment Variables

| Variable                    | Default       | Description                  |
| --------------------------- | ------------- | ---------------------------- |
| `PORT`                      | `8080`        | HTTP listen port             |
| `LOG_LEVEL`                 | `info`        | Log level (debug/info/warn/error) |
| `SENTRY_DSN`                | (empty)       | Sentry DSN for error tracking |
| `SENTRY_ENVIRONMENT`        | `development` | Deployment environment       |
| `SENTRY_SAMPLE_RATE`        | `1.0`         | Sentry trace sample rate     |

---

## Incident Response

### Severity Levels

- **SEV1** — Production outage, all hands.
- **SEV2** — Partial degradation, core team.
- **SEV3** — Minor issue, next business day.

### Response Steps

1. **Acknowledge** — Notify the team and tag the incident.
2. **Assess** — Determine severity, affected users, and root cause.
   - Check Sentry for recent errors
   - Check `/healthz` for service status
   - Check `/metrics` for anomaly detection
3. **Mitigate** — Rollback, feature flag, or hotfix. Speed over perfection.
   - Rollback by redeploying the previous Docker image tag
4. **Communicate** — Status updates every 30 minutes for SEV1/SEV2.
5. **Post-mortem** — Within 48 hours. Blameless, focused on process.

### Common Procedures

#### Service is not responding
```bash
# Check if the container is running.
docker ps | grep zen

# Check logs.
docker logs zen --tail 50

# Check health endpoint.
curl http://localhost:8080/healthz

# Restart if needed.
docker restart zen
```

#### Database connection errors
```bash
# Check database container.
docker ps | grep zen-db

# Check database logs.
docker logs zen-db --tail 50

# Verify connectivity from backend container.
docker exec zen curl -s http://localhost:8080/healthz | jq .
```

#### High error rate in Sentry
1. Check Sentry dashboard for the most frequent error
2. Check the related HTTP endpoint and request parameters
3. Check logs: `docker logs zen --tail 200`
4. If a recent deploy introduced the regression, rollback

---

## Branch Protection

ZEN's repository uses GitHub branch protection to enforce quality gates on the
`main` branch. The following status checks are required before merging:

| Check | Description |
|---|---|
| `CI / TypeScript type checking` | `tsc --noEmit` — zero type errors |
| `CI / ESLint` | `eslint` — zero lint errors |
| `CI / Prettier format check` | `prettier --check` — consistent formatting |
| `CI / Commit message lint` | `commitlint` — conventional commits |
| `CI / Git hooks integrity` | Verifies `.husky/` hooks are present |
| `CI / Unit tests` | `vitest run --coverage` — all tests pass |
| `CI / Build` | `tsc` — compiles successfully |
| `Backend CI / Quality Gates` | Go vet, gofmt, tests w/ >80% coverage |

### Setup on a new repo

To enable branch protection on a new ZEN repository:

```bash
./scripts/setup-branch-protection.sh owner/repo
```

This configures:
- Required status checks (all CI checks listed above)
- Strict mode (branches must be up to date)
- Required pull request review (1 approval)
- Dismiss stale reviews
- Require conversation resolution
- Block force pushes and deletions
- Enforce for admins

### Status Check Names

Each job in `.github/workflows/ci.yml` produces a separate GitHub check run
with the name `CI / <job-name>`. This allows branch protection to require each
check individually. The naming convention follows GitHub's default format:
`<workflow-name> / <job-name>`.

### Adding a New Required Check

1. Add a new job to `.github/workflows/ci.yml`
2. If the build should depend on it, add the job name to `build.needs`
3. Update the `contexts` array in `scripts/setup-branch-protection.sh`
4. Re-run the script to apply changes

## Secrets Management

All secrets are managed via GitHub Actions secrets:

| Secret                        | Used By               | Description                      |
| ----------------------------- | --------------------- | -------------------------------- |
| (None yet — env vars passed directly) | Release workflow | Set at deployment time |

For local development, copy `backend/.env.example` to `backend/.env` and fill
in values. The `.env` file is gitignored.
