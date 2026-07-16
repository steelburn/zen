# ZEN First Product Milestone — PR Quality Gate

> **Status:** Proposal — awaiting CEO confirmation
> **Author:** Founding Engineer
> **Date:** 2026-07-16
> **Issue:** [ZEN-3](/ZEN/issues/ZEN-3)

---

## Executive Summary

ZEN's first product is a **PR Quality Gate** — a lightweight GitHub App that automatically checks pull requests for code quality regressions before they merge. It answers one question: *"Is this PR making our codebase better or worse?"*

The MVP ships as a GitHub App that:
1. Runs on every PR in a configured repository
2. Checks test coverage delta, lint error count, and code complexity
3. Reports results as GitHub Check Runs (pass/fail/pending)
4. Blocks merges when configured thresholds are violated
5. Provides a clear, actionable quality report on every PR

---

## Why This Product?

ZEN's mission is to *increase developed application quality, reduce software defects and bugs, and ship faster.* The PR Quality Gate directly serves this mission by:

| Problem | How ZEN solves it |
|---|---|
| Developers merge code without knowing if quality regressed | Automatic quality checks on every PR, before merge |
| Quality standards vary across teams and repos | Configurable, consistent quality policies per repo |
| Quality feedback is slow (CI pipeline takes 15min+) | Fast, focused quality checks that run in <30s |
| No visibility into quality trends | Per-PR reports + trend dashboard |
| Quality culture is hard to establish | Automated gates teach quality norms by enforcement |

---

## Option Analysis

Three product directions were considered before selecting PR Quality Gate:

### Option A: PR Quality Gate ⭐ Recommended
- **What:** GitHub App that checks PRs for quality regressions
- **Who:** Engineering teams using GitHub
- **Value:** Immediate feedback at the merge decision point
- **Risk:** Low — focused MVP, incremental build
- **Time to MVP:** 3-4 weeks

### Option B: Quality Dashboard
- **What:** Web dashboard aggregating quality metrics from multiple repos
- **Who:** Engineering leads / managers
- **Value:** Visibility into trends
- **Risk:** Medium — requires CI integration per repo, heavier backend
- **Time to MVP:** 6-8 weeks

### Option C: CLI Quality Tool (`zen-check`)
- **What:** CLI for local/CI quality checks
- **Who:** Individual developers
- **Value:** Portable, works anywhere
- **Risk:** Low — but harder to enforce gates at merge time
- **Time to MVP:** 2-3 weeks

### Why Option A Wins

1. **Highest impact per unit of effort.** The PR merge is the single most important quality gate in the development workflow. Stopping bad code before it hits `main` prevents defects from reaching production.
2. **Natural monetization path.** Per-repo or per-seat pricing for a GitHub App is well-understood and easy to trial.
3. **Lowest integration friction.** GitHub Checks API is standard. No new dashboard to log into — results appear directly in the PR.
4. **Builds toward the future.** The quality data collected from PR checks feeds directly into a future quality dashboard (Option B), making that a natural v2.

---

## Target User / Customer Profile

### Primary: Senior+ Software Engineers
- Work on teams of 5-50 engineers
- Use GitHub for code hosting
- Have CI/CD set up (GitHub Actions, CircleCI, etc.)
- Care about code quality but find existing tooling slow or noisy
- Want fast, clear, actionable feedback before they merge

### Secondary: Engineering Leads / Tech Leads
- Responsible for codebase health and team standards
- Need visibility into whether their team's quality is improving or degrading
- Configure quality policies for their repos
- Want to establish quality culture without being the "quality police"

### Early Adopter Profile
- Team of 5-20 engineers
- Active GitHub repo with existing tests
- Has some CI but no quality gating
- Experienced a production incident caused by a quality regression in the past 3 months
- 1-2 tech leads who champion quality

---

## Core Problem Being Solved

**Developers merge code without knowing whether it introduces quality regressions.**

Current state:
- Test coverage can drop by 10% with no warning
- Lint errors accumulate silently
- Code complexity increases incrementally, each PR adding a small amount
- No one notices until the codebase becomes hard to maintain
- By then, fixing quality debt is a large, painful project

**ZEN's answer:** Catch quality regressions on every PR, before they merge. Make the developer the hero who *prevents* the next incident, not the one who *causes* it.

---

## MVP Feature Set

### Phase 1 — Core Checks (Weeks 1-2)
- [x] GitHub App installation flow (OAuth + webhook setup)
- [x] Trigger quality check on every PR open/sync
- [x] **Coverage check**: Compare PR branch test coverage vs. base branch
  - Report per-file coverage deltas
  - Fail if total coverage drops below configurable threshold
- [x] **Lint check**: Count lint errors introduced vs. removed
  - Fail if net new lint errors exceed threshold
- [x] **Complexity check**: Detect functions that exceed cyclomatic complexity threshold
- [x] Report results as GitHub Check Run with detailed annotations

### Phase 2 — Configuration & UX (Weeks 3-4)
- [x] YAML configuration file (`.zen.yml`) in repo root
  - Configurable thresholds per check type
  - Per-branch or per-environment overrides
  - Exclude paths/patterns
- [x] Quality report comment on PR with summary table
- [x] Status check integration (required check for branch protection)
- [x] Web dashboard (basic): list of recent checks per repo

### Explicitly Out of Scope for MVP
- Multiple CI provider support (GitHub-only at launch)
- IDE integrations / local CLI
- Test flakiness detection
- Security vulnerability scanning
- Team-level analytics dashboard
- Multi-repo aggregate views

---

## Architecture

```
┌─────────────┐     ┌───────────────┐     ┌──────────────────┐
│   GitHub     │────▶│  ZEN Service  │────▶│  Check Runner    │
│   App        │     │  (API Server) │     │  (Isolated)      │
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
                    │ - Repos       │
                    │ - Checks      │
                    │ - Configs     │
                    │ - Users       │
                    └───────────────┘
```

### Key Design Decisions (v1)
- **Single binary service** written in Go — fast startup, easy deploy, no runtime dependency
- **Postgres** for persistence — standard, well-understood, scalable later
- **Isolated check runners** — each PR check runs in a short-lived container/process for security and parallelism
- **GitHub App** authentication — no user tokens needed, install-per-repo model
- **Configuration file in repo** — `.zen.yml` checked into version control, follows existing developer conventions

---

## Technology Stack

| Layer | Choice | Rationale |
|---|---|---|
| Backend | **Go** | Fast, single binary, excellent HTTP/stdlib, good GitHub API clients |
| Database | **Postgres** | Reliable, well-known, easy to host |
| Runtime | **Docker** containers via **Fly.io** or **Railway** | Simple deploy, scaling, no Kubernetes overhead |
| GitHub Integration | **GitHub App** with Checks API | Native PR checks experience |
| CI | **GitHub Actions** | Co-located with code, free tier available |
| Monitoring | **Sentry** (errors) + **Grafana Cloud** (metrics) | Start free, scale as needed |
| Frontend (basic dashboard) | **React + Vite** | Lightweight, good DX |

---

## Success Criteria

### Launch Criteria (MVP Ready)
1. A team can install the ZEN GitHub App on their repo in <2 minutes
2. Every PR opened on a configured repo gets a quality check result in <30 seconds
3. Quality checks detect coverage drops, lint regressions, and complexity violations
4. PRs that violate thresholds receive a failing check run
5. [Internal] Automated test suite covers >80% of the check runner logic

### Adoption Targets (First 30 Days Post-Launch)
- 5 active repos with checks running
- 100+ PRs checked
- Zero false positives reported by users

### Quality Metrics
- Check failure rate vs. merge rate (are gates catching problems?)
- Average check runtime (target: <30s)
- Installation completion rate (target: >80%)

---

## Rough Timeline

```
Week 1-2: Core checks
  ├── GitHub App setup & auth flow
  ├── Coverage check
  ├── Lint check
  ├── Complexity check
  ├── GitHub Check Run integration
  └── Tests for all checks

Week 3-4: Configuration & polish
  ├── .zen.yml config file parsing
  ├── PR comment with report
  ├── Branch protection status checks
  ├── Basic web dashboard
  ├── Error handling & monitoring setup
  └── Dogfooding on ZEN's own repos

Week 5: Beta launch
  ├── Documentation & runbook
  ├── CI/CD pipeline for ZEN itself
  ├── Invite 3-5 early adopter teams
  ├── Collect feedback
  └── Iterate on top issues

Week 6: Public launch
  ├── Pricing page (free tier + paid)
  ├── Public GitHub Marketplace listing
  ├── Landing page with docs
  └── Launch announcement
```

---

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Coverage tool disagreement (different tools report different numbers) | Medium | Medium | Support configurable coverage tool (we default to `go test -coverprofile` / `lcov`) |
| PR check runtime too slow | Low | High | Checks run in parallel; target <30s; cache git clones between runs |
| Developers dislike being blocked | Medium | Low | Configurable thresholds; PR comment explains what failed and how to fix; easy bypass toggle |
| GitHub API rate limits | Low | Medium | Cache responses; batch requests; use app installation token |
| Multi-language support complexity | Low | Low | Start with Go + Node.js; add languages incrementally based on user demand |

---

## Next Steps

1. ✅ CEO confirms or adjusts the product direction
2. Create implementation plan (detailed tasks with estimates)
3. Set up repository, CI/CD, and project board
4. Begin Phase 1 development
5. Weekly demos to CEO with working software
