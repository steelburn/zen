# ADR 0002: Go Backend for ZEN Service

**Status:** Accepted  
**Date:** 2026-07-24  
**Author:** Founding Engineer  
**Deciders:** Founding Engineer, CEO

## Context

ZEN's first product is a PR Quality Gate — a GitHub App. We need a backend
service that can:
- Receive and validate GitHub webhooks
- Authenticate with the GitHub API using GitHub App JWT auth
- Run quality checks (coverage, lint, complexity) as isolated processes
- Store results in a database
- Report check results via the GitHub Checks API

The existing project scaffold (ADR 0001) established TypeScript/Node.js for the
frontend dashboard and tooling. The backend has different requirements.

## Decision

We will build the backend service in **Go**.

### Rationale

1. **Single binary deployment.** Go compiles to a static binary with no runtime
   dependency. This simplifies Docker images and deployment.

2. **Fast startup time.** Go services start in milliseconds, critical for
   short-lived check runners and auto-scaling.

3. **Excellent HTTP/stdlib.** Go's standard library has first-class HTTP support,
   making it easy to build webhook receivers and API servers without heavy
   frameworks.

4. **Strong GitHub ecosystem.** The `google/go-github` library and
   `golang-jwt/jwt` provide mature, well-maintained integrations.

5. **Concurrency model.** Goroutines map naturally to running multiple quality
   checks in parallel per PR.

6. **Type safety without a build step.** Go's compiler catches type errors at
   compile time, and there's no build tooling overhead for tests.

### Project Structure

The Go service lives in the `backend/` directory at the repository root:

```
backend/
├── cmd/
│   └── zen-server/        # Main binary entry point
├── internal/
│   ├── config/            # Environment-based configuration
│   ├── db/                # Database connection and migrations
│   ├── auth/              # GitHub App JWT authentication
│   ├── github/            # GitHub API client
│   └── handler/           # HTTP handlers (health, webhook)
├── Dockerfile             # Multi-stage build
├── go.mod                 # Module definition
└── .env.example           # Configuration template
```

## Consequences

### Positive

- Backend starts and responds to requests in <10ms
- Docker image is ~15MB (scratch-based, no runtime dependencies)
- Tests run in milliseconds, not seconds
- Clear separation between frontend (TypeScript) and backend (Go) concerns

### Negative

- Developers must know both TypeScript and Go
- CI needs both Node.js and Go runtimes
- Shared types between frontend and backend must be duplicated or code-generated

### Neutral

- Go's error handling is more verbose than TypeScript's try/catch
- No dynamic dispatch or reflection-heavy patterns in the codebase
