# ZEN Architecture

## Overview

ZEN's mission is to increase developed application quality, reduce software
defects and bugs, and ship faster. This repository contains the ZEN platform.

ZEN is a **PR Quality Gate** — a GitHub App that automatically checks pull
requests for code quality regressions before they merge.

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

| Layer        | Choice                  | Rationale                                  |
| ------------ | ----------------------- | ------------------------------------------ |
| Backend      | **Go 1.22**             | Single binary, fast startup, great HTTP    |
| Database     | **Postgres 16**         | Reliable, well-understood, scalable        |
| Frontend     | **React + Vite** (TS)   | Lightweight dashboard, good DX             |
| Runtime      | **Docker** containers   | Simple deploy, consistent environments     |
| GitHub       | **GitHub App** + Checks API | Native PR check experience             |
| CI           | **GitHub Actions** (2 workflows) | Frontend + Backend, parallel      |
| Monitoring   | **Sentry** + **Grafana Cloud** | Error tracking + metrics (planned)  |

## Repository Structure

```
zen/
├── backend/                      # Go backend service
│   ├── cmd/
│   │   └── zen-server/           # Main binary entry point
│   ├── internal/
│   │   ├── config/               # Environment-based configuration
│   │   ├── db/                   # Database connection + migrations
│   │   ├── auth/                 # GitHub App JWT authentication
│   │   ├── github/               # GitHub API client
│   │   └── handler/              # HTTP handlers (health, webhook)
│   ├── migrations/               # SQL migration files
│   ├── Dockerfile                # Multi-stage scratch build
│   └── go.mod
├── src/                          # Frontend dashboard (TypeScript)
├── docs/                         # Documentation and runbooks
│   ├── adr/                      # Architecture Decision Records
│   └── ARCHITECTURE.md
├── scripts/                      # Build and maintenance scripts
├── .github/workflows/            # CI/CD pipeline definitions
│   ├── ci.yml                    # Frontend CI
│   ├── backend-ci.yml            # Backend CI
│   └── release.yml               # Release pipeline
├── package.json                  # Frontend dependencies
└── tsconfig.json                 # Frontend TypeScript config
```

## Architecture Diagram

```
┌─────────────┐     ┌───────────────┐     ┌──────────────────┐
│   GitHub     │────▶│  ZEN Service  │────▶│  Check Runner    │
│   App        │     │  (Go binary)  │     │  (Isolated)      │
│   Webhooks   │     │               │     │                  │
└─────────────┘     │  - Auth       │     │  - Clone repo    │
                    │  - Config     │     │  - Run coverage  │
                    │  - Webhook    │     │  - Run linter    │
                    │  - Check API  │     │  - Run analysis  │
                    │  - DB         │     │  - Report        │
                    └───────────────┘     └──────────────────┘
                            │
                    ┌───────┴───────┐
                    │   Postgres    │
                    │               │
                    │ - repos       │
                    │ - checks      │
                    │ - configs     │
                    │ - installations│
                    └───────────────┘
```

## Key Design Decisions

- **Single binary Go service** — fast startup, easy deploy, no runtime dependency
- **Postgres** for persistence — standard, well-understood, scalable later
- **Isolated check runners** — each PR check runs in a short-lived container
- **GitHub App** authentication — install-per-repo, no user tokens needed
- **Configuration file in repo** — `.zen.yml` checked into version control

## API Endpoints

| Method | Path              | Description                          |
| ------ | ----------------- | ------------------------------------ |
| GET    | `/healthz`        | Health check (returns status + ver)  |
| POST   | `/webhook`        | GitHub webhook receiver              |
| GET    | `/`               | Root — service info                  |

## Coverage Targets

- **Backend (Go):** >80% statement coverage on all internal packages
- **Frontend (TS):** >80% line coverage (via Vitest)

## Branching Strategy

We follow **trunk-based development**:

- `main` — always deployable. All changes merge here.
- Feature branches — short-lived (max 2 days), created from and merged into
  `main` via pull requests.
- No `develop` or long-lived release branches. Tags mark releases.

## Quality Gates

Every pull request to `main` must pass:

1. **Frontend:** TypeScript type check, ESLint, Prettier, all tests
2. **Backend:** `go vet`, `gofmt`, all tests with >80% coverage
3. Build succeeds for both frontend and backend
