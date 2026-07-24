import type { ApiResponse, CheckRun, CheckType, DashboardStats, DistributionBucket, FileResult, Repo, TrendData, TrendDataPoint } from "../types.ts";

/**
 * ZEN API client.
 *
 * Currently uses mock data. Swap the base URL and fetch calls for a live
 * backend once available.
 */

const BASE_URL = import.meta.env.VITE_ZEN_API_URL ?? "";

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------

const MOCK_REPOS: Repo[] = [
  { id: "repo-1", name: "zen", owner: "zen-inc", defaultBranch: "main", url: "https://github.com/zen-inc/zen", active: true },
  { id: "repo-2", name: "api-gateway", owner: "zen-inc", defaultBranch: "main", url: "https://github.com/zen-inc/api-gateway", active: true },
  { id: "repo-3", name: "web-app", owner: "zen-inc", defaultBranch: "main", url: "https://github.com/zen-inc/web-app", active: true },
  { id: "repo-4", name: "docs", owner: "zen-inc", defaultBranch: "main", url: "https://github.com/zen-inc/docs", active: false },
];

const FILE_RESULTS_PASS: Readonly<Record<CheckType, readonly FileResult[]>> = {
  coverage: [
    { path: "src/components/DashboardPage.tsx", status: "pass", score: 92, details: "Coverage: 92% (+3% vs base)" },
    { path: "src/components/StatCard.tsx", status: "pass", score: 88, details: "Coverage: 88% (+1% vs base)" },
    { path: "src/api/client.ts", status: "pass", score: 85, details: "Coverage: 85% (no change)" },
    { path: "src/components/RecentChecksTable.tsx", status: "pass", score: 90, details: "Coverage: 90% (+2% vs base)" },
    { path: "src/components/StatusBadge.tsx", status: "pass", score: 100, details: "Coverage: 100% (unchanged)" },
    { path: "src/types.ts", status: "pass", score: 100, details: "Coverage: 100% (unchanged)" },
  ],
  lint: [
    { path: "src/components/DashboardPage.tsx", status: "pass", score: 0, details: "0 errors, 0 warnings" },
    { path: "src/components/StatCard.tsx", status: "pass", score: 0, details: "0 errors, 0 warnings" },
    { path: "src/api/client.ts", status: "pass", score: 0, details: "0 errors, 0 warnings" },
    { path: "src/components/RecentChecksTable.tsx", status: "pass", score: 0, details: "0 errors, 0 warnings" },
    { path: "src/types.ts", status: "pass", score: 0, details: "0 errors, 0 warnings" },
  ],
  complexity: [
    { path: "src/components/DashboardPage.tsx", status: "pass", score: 3, details: "3 functions, max complexity: 3" },
    { path: "src/components/StatCard.tsx", status: "pass", score: 1, details: "1 function, complexity: 1" },
    { path: "src/api/client.ts", status: "pass", score: 4, details: "4 functions, max complexity: 4" },
    { path: "src/types.ts", status: "pass", score: 0, details: "No functions" },
  ],
};

const FILE_RESULTS_FAIL_COVERAGE: Readonly<Record<CheckType, readonly FileResult[]>> = {
  coverage: [
    { path: "internal/handler/webhook.go", status: "fail", score: 62, details: "Coverage: 62% (-20% vs base)" },
    { path: "internal/handler/health.go", status: "pass", score: 90, details: "Coverage: 90% (unchanged)" },
    { path: "internal/auth/github.go", status: "fail", score: 71, details: "Coverage: 71% (-10% vs base)" },
    { path: "internal/config/config.go", status: "pass", score: 95, details: "Coverage: 95% (unchanged)" },
    { path: "internal/db/db.go", status: "pass", score: 88, details: "Coverage: 88% (no change)" },
  ],
  lint: [
    { path: "internal/handler/webhook.go", status: "warn", score: 1, details: "1 warning: unused parameter 'ctx'" },
    { path: "internal/auth/github.go", status: "warn", score: 1, details: "1 warning: exported func missing comment" },
    { path: "internal/handler/health.go", status: "pass", score: 0, details: "0 errors" },
    { path: "internal/config/config.go", status: "pass", score: 0, details: "0 errors" },
    { path: "internal/db/db.go", status: "pass", score: 0, details: "0 errors" },
  ],
  complexity: [
    { path: "internal/handler/webhook.go", status: "pass", score: 5, details: "2 functions, max complexity: 5" },
    { path: "internal/auth/github.go", status: "pass", score: 8, details: "3 functions, max complexity: 8" },
    { path: "internal/handler/health.go", status: "pass", score: 2, details: "1 function, complexity: 2" },
    { path: "internal/config/config.go", status: "pass", score: 3, details: "2 functions, max complexity: 3" },
  ],
};

const FILE_RESULTS_PENDING: Readonly<Record<CheckType, readonly FileResult[]>> = {
  coverage: [],
  lint: [],
  complexity: [],
};

const FILE_RESULTS_FAIL_LINT: Readonly<Record<CheckType, readonly FileResult[]>> = {
  coverage: [
    { path: "package.json", status: "pass", score: 100, details: "Coverage: N/A (config file)" },
    { path: "src/index.ts", status: "pass", score: 82, details: "Coverage: 82% (unchanged)" },
    { path: "src/utils/helpers.ts", status: "pass", score: 79, details: "Coverage: 79% (-1% vs base)" },
    { path: "src/components/Button.tsx", status: "pass", score: 95, details: "Coverage: 95% (no change)" },
  ],
  lint: [
    { path: "package.json", status: "pass", score: 0, details: "0 errors" },
    { path: "src/index.ts", status: "fail", score: 5, details: "5 errors: 3x no-unused-vars, 2x no-console" },
    { path: "src/utils/helpers.ts", status: "fail", score: 4, details: "4 errors: 2x no-unused-vars, 2x no-shadow" },
    { path: "src/components/Button.tsx", status: "fail", score: 3, details: "3 errors: 2x no-unused-vars, 1x no-console" },
  ],
  complexity: [
    { path: "src/index.ts", status: "pass", score: 2, details: "1 function, complexity: 2" },
    { path: "src/utils/helpers.ts", status: "pass", score: 6, details: "3 functions, max complexity: 6" },
    { path: "src/components/Button.tsx", status: "pass", score: 3, details: "2 functions, max complexity: 3" },
  ],
};

const FILE_RESULTS_PASS_2: Readonly<Record<CheckType, readonly FileResult[]>> = {
  coverage: [
    { path: "internal/middleware/ratelimit.go", status: "pass", score: 91, details: "Coverage: 91% (+2% vs base)" },
    { path: "internal/middleware/auth.go", status: "pass", score: 87, details: "Coverage: 87% (+1% vs base)" },
    { path: "cmd/zen-server/main.go", status: "pass", score: 72, details: "Coverage: 72% (unchanged)" },
    { path: "internal/config/config.go", status: "pass", score: 95, details: "Coverage: 95% (unchanged)" },
  ],
  lint: [
    { path: "internal/middleware/ratelimit.go", status: "pass", score: 0, details: "0 errors" },
    { path: "internal/middleware/auth.go", status: "pass", score: 0, details: "0 errors" },
    { path: "cmd/zen-server/main.go", status: "pass", score: 0, details: "0 errors" },
    { path: "internal/config/config.go", status: "pass", score: 0, details: "0 errors" },
  ],
  complexity: [
    { path: "internal/middleware/ratelimit.go", status: "pass", score: 4, details: "2 functions, max complexity: 4" },
    { path: "internal/middleware/auth.go", status: "pass", score: 7, details: "3 functions, max complexity: 7" },
    { path: "cmd/zen-server/main.go", status: "pass", score: 3, details: "1 function, complexity: 3" },
  ],
};

const FILE_RESULTS_PASS_3: Readonly<Record<CheckType, readonly FileResult[]>> = {
  coverage: [
    { path: "src/pages/ProfilePage.tsx", status: "pass", score: 93, details: "Coverage: 93% (+5% vs base)" },
    { path: "src/components/Avatar.tsx", status: "pass", score: 100, details: "Coverage: 100% (unchanged)" },
    { path: "src/components/UserCard.tsx", status: "pass", score: 89, details: "Coverage: 89% (+2% vs base)" },
    { path: "src/api/user.ts", status: "pass", score: 78, details: "Coverage: 78% (no change)" },
    { path: "src/hooks/useUser.ts", status: "pass", score: 100, details: "Coverage: 100% (no change)" },
  ],
  lint: [
    { path: "src/pages/ProfilePage.tsx", status: "pass", score: 0, details: "0 errors, 0 warnings" },
    { path: "src/components/Avatar.tsx", status: "pass", score: 0, details: "0 errors, 0 warnings" },
    { path: "src/components/UserCard.tsx", status: "warn", score: 1, details: "1 warning: unused import 'Button'" },
    { path: "src/api/user.ts", status: "pass", score: 0, details: "0 errors" },
    { path: "src/hooks/useUser.ts", status: "pass", score: 0, details: "0 errors" },
  ],
  complexity: [
    { path: "src/pages/ProfilePage.tsx", status: "pass", score: 5, details: "4 functions, max complexity: 5" },
    { path: "src/components/Avatar.tsx", status: "pass", score: 1, details: "1 function, complexity: 1" },
    { path: "src/components/UserCard.tsx", status: "pass", score: 3, details: "2 functions, max complexity: 3" },
    { path: "src/hooks/useUser.ts", status: "pass", score: 7, details: "2 functions, max complexity: 7" },
  ],
};

const MOCK_CHECK_RUNS: CheckRun[] = [
  {
    id: "check-1",
    repoId: "repo-1",
    repoName: "zen",
    prNumber: 42,
    prTitle: "Add dashboard components",
    commitSha: "a1b2c3d",
    branch: "feat/dashboard",
    status: "pass",
    results: [
      { type: "coverage", status: "pass", score: 84, threshold: 80, details: "Coverage increased by 2% across 12 files" },
      { type: "lint", status: "pass", score: 0, threshold: 5, details: "No new lint errors introduced" },
      { type: "complexity", status: "pass", score: 3, threshold: 10, details: "All functions within complexity threshold" },
    ],
    fileResults: FILE_RESULTS_PASS,
    summary: "All quality checks passed.",
    timestamp: "2026-07-16T09:15:00Z",
    duration: 18.2,
  },
  {
    id: "check-2",
    repoId: "repo-1",
    repoName: "zen",
    prNumber: 41,
    prTitle: "Refactor webhook handler",
    commitSha: "e4f5g6h",
    branch: "refactor/webhooks",
    status: "fail",
    results: [
      { type: "coverage", status: "fail", score: 72, threshold: 80, details: "Coverage dropped from 82% to 72% in webhook handler" },
      { type: "lint", status: "pass", score: 2, threshold: 5, details: "2 new lint warnings (non-blocking)" },
      { type: "complexity", status: "pass", score: 8, threshold: 10, details: "Within threshold" },
    ],
    fileResults: FILE_RESULTS_FAIL_COVERAGE,
    summary: "Coverage check failed — coverage dropped 10% in webhook handler.",
    timestamp: "2026-07-15T14:30:00Z",
    duration: 22.5,
  },
  {
    id: "check-3",
    repoId: "repo-2",
    repoName: "api-gateway",
    prNumber: 128,
    prTitle: "Add rate limiting middleware",
    commitSha: "i7j8k9l",
    branch: "feat/rate-limit",
    status: "pending",
    results: [
      { type: "coverage", status: "pending", score: 0, threshold: 80, details: "Running coverage comparison…" },
      { type: "lint", status: "pending", score: 0, threshold: 5, details: "Lint check in progress…" },
      { type: "complexity", status: "pending", score: 0, threshold: 10, details: "Complexity analysis in progress…" },
    ],
    fileResults: FILE_RESULTS_PENDING,
    summary: "Checks are running…",
    timestamp: "2026-07-16T10:00:00Z",
    duration: 5.3,
  },
  {
    id: "check-4",
    repoId: "repo-2",
    repoName: "api-gateway",
    prNumber: 127,
    prTitle: "Fix timeout in auth middleware",
    commitSha: "m0n1o2p",
    branch: "fix/auth-timeout",
    status: "pass",
    results: [
      { type: "coverage", status: "pass", score: 88, threshold: 80, details: "Coverage increased by 1.5%" },
      { type: "lint", status: "pass", score: 0, threshold: 5, details: "No new lint errors" },
      { type: "complexity", status: "pass", score: 4, threshold: 10, details: "All functions within threshold" },
    ],
    fileResults: FILE_RESULTS_PASS_2,
    summary: "All quality checks passed.",
    timestamp: "2026-07-14T11:45:00Z",
    duration: 15.8,
  },
  {
    id: "check-5",
    repoId: "repo-3",
    repoName: "web-app",
    prNumber: 256,
    prTitle: "Update dependency versions",
    commitSha: "q3r4s5t",
    branch: "chore/deps",
    status: "fail",
    results: [
      { type: "coverage", status: "pass", score: 81, threshold: 80, details: "Coverage maintained" },
      { type: "lint", status: "fail", score: 12, threshold: 5, details: "12 new lint errors in dependency updates" },
      { type: "complexity", status: "pass", score: 6, threshold: 10, details: "No complexity changes" },
    ],
    fileResults: FILE_RESULTS_FAIL_LINT,
    summary: "Lint check failed — 12 new lint errors introduced.",
    timestamp: "2026-07-13T08:20:00Z",
    duration: 20.1,
  },
  {
    id: "check-6",
    repoId: "repo-3",
    repoName: "web-app",
    prNumber: 255,
    prTitle: "Add user profile page",
    commitSha: "u6v7w8x",
    branch: "feat/user-profile",
    status: "pass",
    results: [
      { type: "coverage", status: "pass", score: 85, threshold: 80, details: "Coverage increased by 3%" },
      { type: "lint", status: "pass", score: 1, threshold: 5, details: "1 new lint warning (non-blocking)" },
      { type: "complexity", status: "pass", score: 7, threshold: 10, details: "Within threshold" },
    ],
    fileResults: FILE_RESULTS_PASS_3,
    summary: "All quality checks passed.",
    timestamp: "2026-07-12T16:00:00Z",
    duration: 17.4,
  },
];

// ---------------------------------------------------------------------------
// Simulated network delay for mock mode
// ---------------------------------------------------------------------------

const SIMULATED_DELAY_MS = 400;

function delay(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, SIMULATED_DELAY_MS));
}

// ---------------------------------------------------------------------------
// Mock trend data
// ---------------------------------------------------------------------------

const MOCK_PASS_RATE_TREND: TrendDataPoint[] = [
  { label: "Jul 10", value: 75, secondary: 60 },
  { label: "Jul 11", value: 80, secondary: 65 },
  { label: "Jul 12", value: 83, secondary: 70 },
  { label: "Jul 13", value: 67, secondary: 72 },
  { label: "Jul 14", value: 75, secondary: 68 },
  { label: "Jul 15", value: 80, secondary: 74 },
  { label: "Jul 16", value: 86, secondary: 76 },
];

const MOCK_DURATION_TREND: TrendDataPoint[] = [
  { label: "Jul 10", value: 22 },
  { label: "Jul 11", value: 19 },
  { label: "Jul 12", value: 17 },
  { label: "Jul 13", value: 25 },
  { label: "Jul 14", value: 20 },
  { label: "Jul 15", value: 18 },
  { label: "Jul 16", value: 15 },
];

const MOCK_CHECK_TYPE_DISTRIBUTION: DistributionBucket[] = [
  { label: "Coverage", value: 5 },
  { label: "Lint", value: 4 },
  { label: "Complexity", value: 6 },
];

const MOCK_REPO_DISTRIBUTION: DistributionBucket[] = [
  { label: "zen", value: 3 },
  { label: "api-gateway", value: 2 },
  { label: "web-app", value: 2 },
];

// ---------------------------------------------------------------------------
// API methods
// ---------------------------------------------------------------------------

/** Fetch all registered repositories. */
export async function getRepos(): Promise<ApiResponse<Repo[]>> {
  if (BASE_URL) {
    const res = await fetch(`${BASE_URL}/repos`);
    return res.json() as Promise<ApiResponse<Repo[]>>;
  }
  await delay();
  return { data: MOCK_REPOS, error: null };
}

/** Fetch a single repository by ID. */
export async function getRepo(id: string): Promise<ApiResponse<Repo | null>> {
  if (BASE_URL) {
    const res = await fetch(`${BASE_URL}/repos/${id}`);
    return res.json() as Promise<ApiResponse<Repo | null>>;
  }
  await delay();
  const repo = MOCK_REPOS.find((r) => r.id === id) ?? null;
  return { data: repo, error: null };
}

/** Fetch recent check runs, optionally filtered by repo. */
export async function getCheckRuns(repoId?: string): Promise<ApiResponse<CheckRun[]>> {
  if (BASE_URL) {
    const params = repoId ? `?repoId=${repoId}` : "";
    const res = await fetch(`${BASE_URL}/checks${params}`);
    return res.json() as Promise<ApiResponse<CheckRun[]>>;
  }
  await delay();
  const runs = repoId ? MOCK_CHECK_RUNS.filter((r) => r.repoId === repoId) : MOCK_CHECK_RUNS;
  return { data: runs, error: null };
}

/** Fetch a single check run by ID. */
export async function getCheckRun(id: string): Promise<ApiResponse<CheckRun | null>> {
  if (BASE_URL) {
    const res = await fetch(`${BASE_URL}/checks/${id}`);
    return res.json() as Promise<ApiResponse<CheckRun | null>>;
  }
  await delay();
  const run = MOCK_CHECK_RUNS.find((r) => r.id === id) ?? null;
  return { data: run, error: null };
}

/** Fetch trend and distribution data for charts. */
export async function getTrendData(): Promise<ApiResponse<TrendData>> {
  if (BASE_URL) {
    const res = await fetch(`${BASE_URL}/trends`);
    return res.json() as Promise<ApiResponse<TrendData>>;
  }
  await delay();

  return {
    data: {
      passRateTrend: MOCK_PASS_RATE_TREND,
      durationTrend: MOCK_DURATION_TREND,
      checkTypeDistribution: MOCK_CHECK_TYPE_DISTRIBUTION,
      repoDistribution: MOCK_REPO_DISTRIBUTION,
    },
    error: null,
  };
}

/** Compute dashboard stats from check runs. */
export async function getDashboardStats(): Promise<ApiResponse<DashboardStats>> {
  if (BASE_URL) {
    const res = await fetch(`${BASE_URL}/stats`);
    return res.json() as Promise<ApiResponse<DashboardStats>>;
  }
  await delay();

  const activeRepos = MOCK_REPOS.filter((r) => r.active).length;
  const passed = MOCK_CHECK_RUNS.filter((r) => r.status === "pass").length;
  const failed = MOCK_CHECK_RUNS.filter((r) => r.status === "fail").length;
  const avgDuration =
    MOCK_CHECK_RUNS.reduce((sum, r) => sum + r.duration, 0) / MOCK_CHECK_RUNS.length;

  const stats: DashboardStats = {
    totalChecks: MOCK_CHECK_RUNS.length,
    passRate: MOCK_CHECK_RUNS.length > 0 ? Math.round((passed / MOCK_CHECK_RUNS.length) * 100) : 0,
    activeRepos,
    failingChecks: failed,
    avgDuration: Math.round(avgDuration * 10) / 10,
  };

  return { data: stats, error: null };
}
