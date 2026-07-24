/** Check run status as reported by ZEN quality gates */
export type CheckStatus = "pass" | "fail" | "pending";

/** Supported quality check types */
export type CheckType = "coverage" | "lint" | "complexity";

/** Repository configuration for ZEN */
export interface Repo {
  readonly id: string;
  readonly name: string;
  readonly owner: string;
  readonly defaultBranch: string;
  readonly url: string;
  readonly active: boolean;
}

/** Individual quality check result */
export interface CheckResult {
  readonly type: CheckType;
  readonly status: CheckStatus;
  readonly score: number;
  readonly threshold: number;
  readonly details: string;
}

/** Per-file result within a quality check. */
export interface FileResult {
  /** Path relative to repository root */
  readonly path: string;
  readonly status: CheckStatus;
  /** Numeric score for this file (e.g. coverage percentage, complexity) */
  readonly score: number;
  readonly details: string;
}

/** A complete check run for a pull request */
export interface CheckRun {
  readonly id: string;
  readonly repoId: string;
  readonly repoName: string;
  readonly prNumber: number;
  readonly prTitle: string;
  readonly commitSha: string;
  readonly branch: string;
  readonly status: CheckStatus;
  readonly results: readonly CheckResult[];
  /** Per-file breakdowns for each check type */
  readonly fileResults: Readonly<Record<CheckType, readonly FileResult[]>>;
  readonly summary: string;
  readonly timestamp: string;
  readonly duration: number;
}

/** Dashboard summary statistics */
export interface DashboardStats {
  readonly totalChecks: number;
  readonly passRate: number;
  readonly activeRepos: number;
  readonly failingChecks: number;
  readonly avgDuration: number;
}

/** A single data point for trend charts (e.g. pass rate over time) */
export interface TrendDataPoint {
  readonly label: string;
  readonly value: number;
  readonly secondary?: number;
}

/** Distribution bucket for bar/visualisation charts */
export interface DistributionBucket {
  readonly label: string;
  readonly value: number;
  readonly color?: string;
}

/** Trend data returned by the API for charting */
export interface TrendData {
  readonly passRateTrend: readonly TrendDataPoint[];
  readonly durationTrend: readonly TrendDataPoint[];
  readonly checkTypeDistribution: readonly DistributionBucket[];
  readonly repoDistribution: readonly DistributionBucket[];
}

/** API response wrapper */
export interface ApiResponse<T> {
  readonly data: T;
  readonly error: string | null;
}
