import type { ApiResponse, CheckRun, DashboardStats, Repo } from "../types.ts";

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
