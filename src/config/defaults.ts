/**
 * Default configuration values for {@link .zen.yml}.
 *
 * These are used when the config file is missing or partial.
 *
 * @module
 */

import type {
  ChecksConfig,
  CoverageCheck,
  LintCheck,
  ComplexityCheck,
  ResolvedZenConfig,
} from "./types.js";

/** Default coverage check settings. */
export const DEFAULT_COVERAGE_CHECK: Required<CoverageCheck> = {
  enabled: true,
  threshold: 80,
  strict: true,
  include: ["src/**"],
  exclude: [],
} as const;

/** Default lint check settings. */
export const DEFAULT_LINT_CHECK: Required<LintCheck> = {
  enabled: true,
  maxErrors: 0,
  maxWarnings: 10,
  strict: true,
} as const;

/** Default complexity check settings. */
export const DEFAULT_COMPLEXITY_CHECK: Required<ComplexityCheck> = {
  enabled: true,
  maxComplexity: 10,
  strict: true,
  exclude: ["**/*.test.ts", "**/*.spec.ts", "**/*.e2e-test.ts"],
} as const;

/**
 * Default checks section — matches the shape required by {@link ResolvedZenConfig}.
 */
export const DEFAULT_CHECKS: Required<ChecksConfig> & {
  readonly coverage: Required<CoverageCheck>;
  readonly lint: Required<LintCheck>;
  readonly complexity: Required<ComplexityCheck>;
} = {
  coverage: DEFAULT_COVERAGE_CHECK,
  lint: DEFAULT_LINT_CHECK,
  complexity: DEFAULT_COMPLEXITY_CHECK,
} as const;

/**
 * The full default configuration used when no `.zen.yml` is present.
 *
 * This represents a reasonable "start here" policy that most teams
 * can adopt immediately and tune later.
 */
export const DEFAULT_CONFIG: ResolvedZenConfig = {
  version: "1",
  checks: DEFAULT_CHECKS,
  branches: [],
  environments: [],
  exclude: ["node_modules/**", "dist/**", "coverage/**", ".git/**"],
} as const;
