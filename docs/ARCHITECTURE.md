# ZEN Architecture

## Overview

ZEN's mission is to increase developed application quality, reduce software
defects and bugs, and ship faster. This repository contains the core platform.

## Principles

1. **Quality first** — Every change must pass automated quality gates before
   reaching production.
2. **Small, safe releases** — Ship incrementally. Each release is a small,
   reversible change.
3. **Observability by default** — All services expose health, metrics, and
   structured logging from day one.
4. **Documentation as code** — Architecture decisions, runbooks, and API docs
   live in the repository alongside the code.

## Technology Stack

| Layer        | Choice          | Rationale                               |
| ------------ | --------------- | --------------------------------------- |
| Language     | TypeScript      | Type safety, broad ecosystem            |
| Runtime      | Node.js 22      | LTS, modern JS features                 |
| Testing      | Vitest          | Fast, native TS, coverage built-in      |
| Linting      | ESLint + Prettier | Consistent code style                 |
| CI/CD        | GitHub Actions  | Tight GitHub integration                |
| Commit style | Conventional Commits | Auto-changelog, semantic releases |

## Repository Structure

```
zen/
├── src/               # Application source code
├── docs/              # Documentation and runbooks
│   ├── adr/           # Architecture Decision Records
│   ├── runbooks/      # Operational runbooks
│   └── ARCHITECTURE.md
├── scripts/           # Build and maintenance scripts
├── .github/workflows/ # CI/CD pipeline definitions
├── package.json
├── tsconfig.json
└── vitest.config.ts
```

## Branching Strategy

We follow **trunk-based development**:

- `main` — always deployable. All changes merge here.
- Feature branches — short-lived (max 2 days), created from and merged into
  `main` via pull requests.
- No `develop` or long-lived release branches. Tags mark releases.

## Quality Gates

Every pull request to `main` must pass:

1. TypeScript type checking (`tsc --noEmit`)
2. ESLint with zero errors
3. Prettier formatting check
4. All unit tests passing (80% coverage minimum)
5. Build succeeds

See [ci.yml](../.github/workflows/ci.yml) for the full pipeline definition.
