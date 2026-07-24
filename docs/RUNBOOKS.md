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

## Deployment

Deployments are automated via GitHub Actions on tag push:

```bash
git tag v0.1.0
git push origin v0.1.0
```

See [release.yml](../.github/workflows/release.yml).
