# Code Standards

## TypeScript

### Style

- Use TypeScript with `strict: true` — no exceptions.
- Prefer `interface` over `type` for object shapes.
- Use `type` for unions, intersections, and primitive aliases.
- Mark all readonly fields with `readonly`.
- Use `as const` for literal constants and enum-like objects.
- Avoid `any` — use `unknown` and narrow with type guards.
- Use `Record<string, T>` instead of `{ [key: string]: T }`.

### Functions

- Every exported function must have an explicit return type annotation.
- Use arrow functions for inline callbacks; named function declarations for
  top-level exports.
- Async functions should use `Promise<void>` return when no value is returned.

### Imports

- Group imports: external → internal → relative, separated by blank line.
- Sort imports alphabetically within each group.
- Prefer named exports over default exports.

### Error Handling

- Use custom error classes extending `Error`.
- Prefer result types (`Success | Failure`) over thrown exceptions for expected
  failure modes.
- Log errors with `console.error` — never `console.log`.

## Testing

### Unit Tests

- Place tests next to the source file: `widget.ts` → `widget.test.ts`.
- Use descriptive test names: `"should return 42 when input is valid"`.
- One `describe` block per function/class.
- Mock external dependencies; test internal logic directly.

### Coverage Targets

- Statements: 80%
- Branches: 75%
- Functions: 80%
- Lines: 80%

## Commits

Use [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <description>

[optional body]
```

Types: `feat`, `fix`, `chore`, `docs`, `refactor`, `test`, `ci`, `perf`.

Scopes: `core`, `infra`, `ci`, `docs`, `deps`, `release`.

Maximum header length: 72 characters.
