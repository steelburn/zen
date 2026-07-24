# Test Plan: PR Quality Gate Core Checks

**Author:** AI-QA Engineer  
**Issue:** ZEN-16  
**Date:** 2026-07-24  
**Status:** Active

---

## Scope

This test plan covers the three core quality checks for the ZEN PR Quality Gate:

1. **Coverage Check** — Compares PR branch test coverage vs. base branch
2. **Lint Check** — Counts lint errors introduced vs. removed
3. **Complexity Check** — Detects functions exceeding cyclomatic complexity threshold

Plus the **Check Runner** that orchestrates all checks and the **Configuration** system.

## Test Strategy

**Automation-first.** All checks are validated through automated unit tests and integration tests. Manual testing is limited to exploratory validation of the GitHub App integration.

| Layer | Tool | Location | Coverage Target |
|---|---|---|---|
| Unit tests | Vitest | `src/**/*.test.ts` | 90%+ |
| Integration | Vitest | `src/**/*.integration.test.ts` | Core paths |
| E2E | Vitest (e2e config) | `src/**/*.e2e-test.ts` | Critical paths |

## Test Suites

### 1. Coverage Check (`src/checks/coverage/coverage-check.test.ts`)

Validates the logic that compares code coverage between base and head branches.

#### Test Cases

| ID | Category | Scenario | Expected |
|---|---|---|---|
| COV-001 | Happy path | Coverage unchanged between base and head | Pass, 0% delta |
| COV-002 | Happy path | Coverage increases in head | Pass, positive delta |
| COV-003 | Regression | Coverage drops below threshold | Fail, negative delta |
| COV-004 | Regression | Coverage drops but stays above threshold | Pass |
| COV-005 | Boundary | Coverage exactly at threshold | Pass |
| COV-006 | Boundary | Coverage one point below threshold | Fail |
| COV-007 | Edge | Empty coverage data | Error with clear message |
| COV-008 | Edge | No files changed in PR | Pass, 0 files to compare |
| COV-009 | Edge | Zero total statements in base | Error or graceful handling |
| COV-010 | Per-file | One file drops, others improve | Aggregate pass, annotate dropped file |
| COV-011 | Per-file | New file added with 100% coverage | Pass |
| COV-012 | Per-file | New file added with 0% coverage | Fail if below threshold |
| COV-013 | Config | Threshold set to 0% | Always pass |
| COV-014 | Config | Threshold set to 100% | Fail unless 100% |
| COV-015 | Config | Include/exclude patterns filter files | Only matching files checked |
| COV-016 | Annotations | Drops produce file-level annotations | Annotation per affected file |
| COV-017 | Metrics | Delta, base, head values reported | All metrics present and correct |

### 2. Lint Check (`src/checks/lint/lint-check.test.ts`)

Validates the logic that compares lint errors between base and head branches.

#### Test Cases

| ID | Category | Scenario | Expected |
|---|---|---|---|
| LINT-001 | Happy path | Zero errors in both base and head | Pass |
| LINT-002 | Happy path | Same errors in both | Pass |
| LINT-003 | Regression | Head introduces new errors exceeding threshold | Fail |
| LINT-004 | Regression | Head introduces new errors within threshold | Pass |
| LINT-005 | Improvement | Head removes existing errors | Pass, negative delta |
| LINT-006 | Boundary | New errors exactly at max threshold | Pass |
| LINT-007 | Boundary | New errors one above max threshold | Fail |
| LINT-008 | Edge | Base errors only (removed in head) | Pass, improvement |
| LINT-009 | Edge | Head errors only (added from nothing) | Fail if exceeds threshold |
| LINT-010 | Edge | Empty error reports | Pass |
| LINT-011 | Edge | Duplicate error entries | Deduplicated before counting |
| LINT-012 | Config | maxNewErrors=0 | Zero-tolerance for new errors |
| LINT-013 | Config | maxNewErrors=Infinity/high value | Never fails |
| LINT-014 | Annotations | New errors produce annotations | Annotation per new error |

### 3. Complexity Check (`src/checks/complexity/complexity-check.test.ts`)

Validates the logic that detects functions exceeding cyclomatic complexity.

#### Test Cases

| ID | Category | Scenario | Expected |
|---|---|---|---|
| CPLX-001 | Happy path | No functions exceed max complexity | Pass |
| CPLX-002 | Happy path | Functions in new code only | Pass if within threshold |
| CPLX-003 | Violation | New function exceeds max complexity | Fail |
| CPLX-004 | Violation | Existing complex function unchanged | No violation reported |
| CPLX-005 | Violation | Existing function made more complex | Fail |
| CPLX-006 | Boundary | Function complexity exactly at max | Pass |
| CPLX-007 | Boundary | Function complexity one above max | Fail |
| CPLX-008 | Edge | Empty file / no functions | Pass |
| CPLX-009 | Edge | Maximum values (1000+ complexity) | Handled gracefully |
| CPLX-010 | Edge | Non-code files excluded | Skipped |
| CPLX-011 | Config | maxComplexity=0 | Fail unless zero complexity |
| CPLX-012 | Config | maxComplexity=Infinity | Never fails |
| CPLX-013 | Config | Include/exclude paths respected | Only matching paths analyzed |
| CPLX-014 | Annotations | Violating functions produce annotations | Annotation per function |

### 4. Check Runner (`src/checks/runner/runner.test.ts`)

Validates the orchestration layer that runs all checks and aggregates results.

#### Test Cases

| ID | Category | Scenario | Expected |
|---|---|---|---|
| RUN-001 | Happy path | All checks pass | Overall "pass" status |
| RUN-002 | Mixed | Coverage fails, lint passes, complexity passes | Overall "fail" |
| RUN-003 | Mixed | Lint fails, others pass | Overall "fail" |
| RUN-004 | Mixed | All checks fail | Overall "fail" |
| RUN-005 | Error | One check throws an error | Error reported, other checks run |
| RUN-006 | Error | All checks error | Overall "error" status |
| RUN-007 | Ordering | Checks run in correct order | No ordering dependency |
| RUN-008 | Aggregation | Annotations from all checks combined | All annotations present |
| RUN-009 | Aggregation | Metrics from all checks combined | All metrics present |
| RUN-010 | Empty | No checks configured | Graceful no-op |

### 5. Configuration (`src/config/config.test.ts`)

Validates parsing and validation of `.zen.yml` configuration.

#### Test Cases

| ID | Category | Scenario | Expected |
|---|---|---|---|
| CFG-001 | Parsing | Valid minimal config | Parsed with defaults |
| CFG-002 | Parsing | Full config with all fields | All fields correctly read |
| CFG-003 | Invalid | Empty config | Defaults applied |
| CFG-004 | Invalid | Bad YAML syntax | Error with parse error message |
| CFG-005 | Invalid | Invalid threshold value (<0) | Validation error |
| CFG-006 | Invalid | Invalid threshold value (>100) | Validation error |
| CFG-007 | Invalid | Negative maxNewErrors | Validation error |
| CFG-008 | Invalid | Negative maxComplexity | Validation error |
| CFG-009 | Edge | Non-numeric threshold | Type validation error |
| CFG-010 | Edge | Unknown extra fields | Ignored with warning |
| CFG-011 | Includes | Include patterns filter correctly | Only matching paths analyzed |
| CFG-012 | Excludes | Exclude patterns filter correctly | Excluded paths skipped |

## Risk Assessment

| Risk | Mitigation |
|---|---|
| Coverage tool disagreement | Tests validate against known fixture data; real-world integration tested separately |
| Performance of checks on large PRs | Test suite includes performance benchmarks for large inputs |
| False positives from diff parsing | Tests cover edge cases in diff parsing (renamed files, binary files) |
| Configuration errors silently ignored | Tests verify strict validation and error reporting |

## Quality Gates

Before this test suite ships:
- [x] All unit tests pass
- [ ] Coverage meets 80% threshold
- [ ] No lint errors introduced
- [ ] Test plan reviewed by team

## Out of Scope

- E2E tests against real GitHub API (covered in separate E2E test suite)
- Performance benchmarking (separate effort)
- Flaky test detection
- Third-party tool integration testing (jest, pylint, etc.)

---

*This test plan will be updated as new check types are added.*
