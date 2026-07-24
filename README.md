# ZEN

**Increase developed application quality. Reduce software defects and bugs. Ship faster.**

<div align="center">

[![CI](https://github.com/steelburn/zen/actions/workflows/ci.yml/badge.svg)](https://github.com/steelburn/zen/actions/workflows/ci.yml)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue)](https://www.typescriptlang.org/)
[![Node](https://img.shields.io/badge/Node-22-green)](https://nodejs.org/)
[![License](https://img.shields.io/badge/license-MIT-blue)](LICENSE)

</div>

ZEN is a platform that helps development teams ship higher-quality software by
embedding quality checks, automated testing, and observability into the
development workflow.

## Getting Started

```bash
npm install
npm run ci
```

## Required Status Checks

This repository enforces branch protection on the `main` branch. Every pull
request must pass the following required status checks before merging:

| Check | Description |
|---|---|
| **TypeScript type checking** | `tsc --noEmit` — zero type errors |
| **ESLint** | Zero lint errors |
| **Prettier format check** | Consistent code formatting |
| **Commit message lint** | Conventional commits enforced |
| **Git hooks integrity** | Husky hooks verified |
| **Unit tests** | All tests pass with coverage thresholds |
| **Build** | TypeScript compiles successfully |

See [Branch Protection Setup](./docs/RUNBOOKS.md#branch-protection) for details.

## Documentation

- [Architecture](./docs/ARCHITECTURE.md)
- [Code Standards](./docs/CODE_STANDARDS.md)
- [Runbooks](./docs/RUNBOOKS.md)
- [Architecture Decision Records](./docs/adr/)

## Development

See [Runbooks](./docs/RUNBOOKS.md) for setup and workflow instructions.

## License

Private — ZEN Inc.
