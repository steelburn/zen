# ADR 0001: Use TypeScript with Trunk-Based Development

**Status:** Accepted  
**Date:** 2026-07-16  
**Author:** Founding Engineer  
**Deciders:** Founding Engineer, CEO

## Context

ZEN needs a development stack and branching strategy for its first product. As a
new company with a small team, we need maximum velocity without sacrificing
quality.

The key criteria are:
- Strong type safety to prevent common defects (aligns with ZEN's mission)
- Fast iteration cycles for a small team
- Low cognitive overhead from branch management
- Broad ecosystem and hiring pool

## Decision

### Language and Runtime

We will use **TypeScript** on **Node.js 22**.

Rationale:
- TypeScript catches an entire class of bugs at compile time
- Node.js 22 is current LTS with stable ESM support
- The npm ecosystem gives us access to quality tooling (testing, linting,
  formatting) out of the box
- TypeScript developers are widely available

### Branching Strategy

We will use **trunk-based development** with short-lived feature branches.

Rationale:
- No long-running branches means less merge conflict risk
- Main is always deployable — enforces quality gates
- Short-lived branches (max 2 days) encourage small, safe changes
- Easy to revert — each merge is a single commit

### Testing Framework

We will use **Vitest** for testing.

Rationale:
- Native TypeScript support (no Babel/ts-jest needed)
- Fast, watch-mode by default
- Built-in coverage via v8
- Compatible with Jest API — low migration friction

### Code Quality

We will use **ESLint** with `typescript-eslint` strict rules and **Prettier** for
formatting.

Rationale:
- ESLint catches logic errors and style issues
- Prettier eliminates formatting debates entirely
- Combined with lint-staged and husky for pre-commit hooks

## Consequences

### Positive

- Strong type safety reduces production defects
- Fast CI pipeline encourages frequent commits
- New hires can be productive immediately with familiar tooling
- Auto-formatting eliminates style discussions in code review

### Negative

- TypeScript compilation adds a build step (mitigated by Vitest's native TS
  handling in tests)
- Trunk-based development requires discipline — breaking changes must be
  backwards-compatible or behind feature flags

### Neutral

- Team must learn Conventional Commits for changelog automation
- Need to maintain CI pipeline as project grows
