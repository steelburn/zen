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

/** API response wrapper */
export interface ApiResponse<T> {
  readonly data: T;
  readonly error: string | null;
}
