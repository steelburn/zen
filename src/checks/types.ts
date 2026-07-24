/**
 * Shared types for the PR Quality Gate check system.
 *
 * These types define the contract between check implementations,
 * the check runner, and the GitHub Check Run API integration.
 *
 * @module checks/types
 */

/** Severity level for check annotations */
export type AnnotationSeverity = "error" | "warning" | "info";

/** Status of an individual check or the overall run */
export type CheckStatus = "pass" | "fail" | "error";

/**
 * An annotation attached to a specific file/line in a check result.
 * These map to GitHub Check Run annotations.
 */
export interface CheckAnnotation {
  /** Path relative to repository root */
  readonly path: string;
  /** 1-indexed start line */
  readonly startLine: number;
  /** 1-indexed end line (inclusive) */
  readonly endLine: number;
  readonly severity: AnnotationSeverity;
  readonly message: string;
  /** Optional annotation title */
  readonly title?: string;
}

/**
 * Result produced by a single check execution.
 */
export interface CheckResult {
  /** Unique name for this check (e.g. "coverage", "lint") */
  readonly checkName: string;
  readonly status: CheckStatus;
  /** Human-readable one-line summary */
  readonly summary: string;
  /** Detailed description of findings */
  readonly details: readonly string[];
  /** Line-level annotations for the GitHub Check Run */
  readonly annotations: readonly CheckAnnotation[];
  /** Numeric metrics reported by this check */
  readonly metrics: Readonly<Record<string, number>>;
}

/**
 * Coverage data for a single file.
 */
export interface FileCoverageData {
  /** Path relative to repository root */
  readonly filePath: string;
  /** Number of covered statements */
  readonly coveredStatements: number;
  /** Total number of statements */
  readonly totalStatements: number;
  /** Calculated coverage percentage (0-100) */
  readonly coveragePercent: number;
}

/**
 * Aggregate coverage report containing all files.
 */
export interface CoverageReport {
  /** Overall coverage percentage */
  readonly totalCoveragePercent: number;
  /** Total covered statements across all files */
  readonly totalCovered: number;
  /** Total statements across all files */
  readonly totalStatements: number;
  /** Per-file breakdowns */
  readonly files: readonly FileCoverageData[];
}

/**
 * A single lint error found in a file.
 */
export interface LintError {
  /** Path relative to repository root */
  readonly filePath: string;
  /** 1-indexed line number */
  readonly line: number;
  /** 1-indexed column number */
  readonly column: number;
  /** Error severity */
  readonly severity: AnnotationSeverity;
  /** ESLint rule identifier (e.g. "no-unused-vars") */
  readonly ruleId: string;
  /** Human-readable error message */
  readonly message: string;
}

/**
 * Aggregate lint report for a branch.
 */
export interface LintReport {
  readonly errors: readonly LintError[];
  readonly totalErrorCount: number;
}

/**
 * Complexity measurement for a single function.
 */
export interface FunctionComplexity {
  /** Path relative to repository root */
  readonly filePath: string;
  /** Function name */
  readonly functionName: string;
  /** 1-indexed start line of the function */
  readonly startLine: number;
  /** 1-indexed end line (inclusive) */
  readonly endLine: number;
  /** Cyclomatic complexity score */
  readonly complexity: number;
}

/**
 * Complexity report for a branch.
 */
export interface ComplexityReport {
  readonly functions: readonly FunctionComplexity[];
  /** The highest complexity value found */
  readonly maxComplexity: number;
  /** Number of functions that exceed any threshold */
  readonly thresholdBreaches: number;
}

/** Configuration for the coverage check */
export interface CoverageConfig {
  /** Minimum acceptable coverage percentage (0-100). Default: 80 */
  readonly threshold: number;
  /** Glob patterns to include */
  readonly include?: readonly string[];
  /** Glob patterns to exclude */
  readonly exclude?: readonly string[];
}

/** Configuration for the lint check */
export interface LintConfig {
  /** Maximum allowed new lint errors. Default: 0 */
  readonly maxNewErrors: number;
  /** Glob patterns to include */
  readonly include?: readonly string[];
  /** Glob patterns to exclude */
  readonly exclude?: readonly string[];
}

/** Configuration for the complexity check */
export interface ComplexityConfig {
  /** Maximum allowed cyclomatic complexity. Default: 10 */
  readonly maxComplexity: number;
  /** Glob patterns to include */
  readonly include?: readonly string[];
  /** Glob patterns to exclude */
  readonly exclude?: readonly string[];
}

/** Full ZEN configuration */
export interface ZenConfig {
  readonly coverage?: CoverageConfig;
  readonly lint?: LintConfig;
  readonly complexity?: ComplexityConfig;
  /** Repo-level exclude patterns applied to all checks */
  readonly exclude?: readonly string[];
}

/** Context provided to each check at runtime */
export interface CheckContext {
  /** SHA of the base branch */
  readonly baseSha: string;
  /** SHA of the head (PR) branch */
  readonly headSha: string;
  /** Absolute path to the cloned repository */
  readonly repoPath: string;
  /** Resolved ZEN configuration */
  readonly config: ZenConfig;
}

/** Default configuration values */
export const DEFAULT_CONFIG: ZenConfig = {
  coverage: {
    threshold: 80,
  },
  lint: {
    maxNewErrors: 0,
  },
  complexity: {
    maxComplexity: 10,
  },
} as const;

/** Signature for any check function */
export type CheckFunction = (context: CheckContext) => Promise<CheckResult>;
