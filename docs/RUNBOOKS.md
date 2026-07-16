# Runbooks

## Development

### Prerequisites

- Node.js 22+
- npm 10+

### Setup

```bash
npm install
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

## Incident Response

### Severity Levels

- **SEV1** — Production outage, all hands.
- **SEV2** — Partial degradation, core team.
- **SEV3** — Minor issue, next business day.

### Response Steps

1. **Acknowledge** — Notify the team and tag the incident.
2. **Assess** — Determine severity, affected users, and root cause.
3. **Mitigate** — Rollback, feature flag, or hotfix. Speed over perfection.
4. **Communicate** — Status updates every 30 minutes for SEV1/SEV2.
5. **Post-mortem** — Within 48 hours. Blameless, focused on process.

## Deployment

Deployments are automated via GitHub Actions on tag push:

```bash
git tag v0.1.0
git push origin v0.1.0
```

See [release.yml](../.github/workflows/release.yml).
