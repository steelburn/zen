/**
 * Configuration types for {@link .zen.yml} files.
 *
 * @module
 */

/**
 * Supported configuration schema versions.
 */
export type ConfigVersion = "1";

/**
 * Check toggle and threshold configuration.
 */
export interface CoverageCheck {
  /** Enable or disable the coverage check. Default: true */
  readonly enabled?: boolean;
  /** Minimum coverage percentage (0–100). Default: 80 */
  readonly threshold?: number;
  /** Whether a check failure blocks the PR. Default: true */
  readonly strict?: boolean;
  /** Glob patterns for files to include in coverage analysis. */
  readonly include?: readonly string[];
  /** Glob patterns for files to exclude from coverage analysis. */
  readonly exclude?: readonly string[];
}

/**
 * Check toggle and threshold configuration.
 */
export interface LintCheck {
  /** Enable or disable the lint check. Default: true */
  readonly enabled?: boolean;
  /** Maximum number of errors allowed. Default: 0 */
  readonly maxErrors?: number;
  /** Maximum number of warnings allowed. Default: 10 */
  readonly maxWarnings?: number;
  /** Whether a check failure blocks the PR. Default: true */
  readonly strict?: boolean;
}

/**
 * Check toggle and threshold configuration.
 */
export interface ComplexityCheck {
  /** Enable or disable the complexity check. Default: true */
  readonly enabled?: boolean;
  /** Maximum cyclomatic complexity per function. Default: 10 */
  readonly maxComplexity?: number;
  /** Whether a check failure blocks the PR. Default: true */
  readonly strict?: boolean;
  /** Glob patterns for files to exclude. */
  readonly exclude?: readonly string[];
}

/**
 * All quality check configurations.
 */
export interface ChecksConfig {
  readonly coverage?: CoverageCheck;
  readonly lint?: LintCheck;
  readonly complexity?: ComplexityCheck;
}

/**
 * A branch-specific override configuration.
 *
 * The first matching branch pattern wins.
 */
export interface BranchOverride {
  /** Glob pattern to match branch names (e.g. `feature/*`, `release/*`). */
  readonly pattern: string;
  /** Configuration overrides for this branch pattern. */
  readonly config: ZenConfigNested;
}

/**
 * An environment-specific override configuration.
 *
 * Applied based on the deployment target environment.
 */
export interface EnvironmentOverride {
  /** Environment name (e.g. `production`, `staging`, `development`). */
  readonly name: string;
  /** Configuration overrides for this environment. */
  readonly config: ZenConfigNested;
}

/**
 * The full `.zen.yml` configuration shape.
 *
 * This is the top-level interface that corresponds to the YAML file.
 */
export interface ZenConfig {
  /** Schema version. Must be `"1"`. Default: `"1"` */
  readonly version?: ConfigVersion;
  /** Check configurations. */
  readonly checks?: ChecksConfig;
  /** Branch-specific overrides (ordered; first match wins). */
  readonly branches?: readonly BranchOverride[];
  /** Environment-specific overrides. */
  readonly environments?: readonly EnvironmentOverride[];
  /** Glob patterns to exclude from all checks. */
  readonly exclude?: readonly string[];
}

/**
 * A partial config used in branch/environment overrides.
 * Allows overriding only specific fields without requiring the full shape.
 */
export interface ZenConfigNested {
  readonly checks?: ChecksConfig;
  readonly exclude?: readonly string[];
}

/**
 * A fully resolved (post-merge) configuration with all defaults applied.
 *
 * Every field has a concrete value — no `undefined` fields remain.
 */
export interface ResolvedZenConfig {
  readonly version: ConfigVersion;
  readonly checks: Required<ChecksConfig> & {
    readonly coverage: Required<CoverageCheck>;
    readonly lint: Required<LintCheck>;
    readonly complexity: Required<ComplexityCheck>;
  };
  readonly branches: readonly BranchOverride[];
  readonly environments: readonly EnvironmentOverride[];
  readonly exclude: readonly string[];
}
