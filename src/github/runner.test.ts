import { afterEach, describe, expect, it, vi } from "vitest";

import { runAndReport } from "./runner.js";
import type { PullRequestEvent } from "./types.js";

// ─── Mocks ───────────────────────────────────────────────────────────────────

const mockEvent: PullRequestEvent = {
  owner: "my-org",
  repo: "my-repo",
  issueNumber: 42,
  headSha: "abc123def456",
  headBranch: "feature/test",
  baseBranch: "main",
  installationId: 98765,
};

// Track the order of GitHub API calls
const apiCalls: { url: string; method?: string }[] = [];

function buildResponse(url: string) {
  // Comment listing endpoints should return an array
  if (url.includes("/issues/") && url.includes("/comments")) {
    return {
      ok: true,
      status: 200,
      text: () => Promise.resolve("[]"),
      headers: new Headers(),
    } as Response;
  }

  // Default single-object response for check runs, comment create etc.
  return {
    ok: true,
    status: 200,
    text: () =>
      Promise.resolve(
        JSON.stringify({
          id: apiCalls.length,
          name: "zen/quality",
          headSha: "abc123def456",
          status: "completed",
          conclusion: "success",
          startedAt: "2026-01-01T00:00:00Z",
          completedAt: "2026-01-01T00:00:10Z",
          output: {
            title: "ZEN Check",
            summary: "All good",
            text: null,
            annotationsCount: 0,
          },
          detailsUrl: null,
          externalId: null,
          url: `https://api.github.com/repos/owner/repo/check-runs/${apiCalls.length}`,
          htmlUrl: `https://github.com/owner/repo/runs/${apiCalls.length}`,
          app: { id: 123, slug: "zen-quality" },
        }),
      ),
    headers: new Headers(),
  } as Response;
}

function mockGitHubApi() {
  return vi
    .spyOn(globalThis, "fetch")
    .mockImplementation(async (input: string | URL | Request, init?: RequestInit) => {
      const url = typeof input === "string" ? input : "toString" in input ? String(input) : "";
      apiCalls.push({
        url,
        method: (init?.method as string) ?? "GET",
      });

      return buildResponse(url);
    });
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("runAndReport", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    apiCalls.length = 0;
  });

  it("should return 'success' when all checks pass", async () => {
    mockGitHubApi();

    const conclusion = await runAndReport(
      [
        async () => ({
          checkName: "coverage",
          status: "pass" as const,
          summary: "Coverage: 85%",
          details: ["All files above threshold"],
          annotations: [],
          metrics: { coverage: 85 },
        }),
        async () => ({
          checkName: "lint",
          status: "pass" as const,
          summary: "0 errors",
          details: ["Clean lint"],
          annotations: [],
          metrics: { errors: 0 },
        }),
      ],
      {
        checkRunName: "zen/quality",
        event: mockEvent,
        token: "test-token",
      },
    );

    expect(conclusion).toBe("success");
  });

  it("should return 'failure' when some checks fail", async () => {
    mockGitHubApi();

    const conclusion = await runAndReport(
      [
        async () => ({
          checkName: "coverage",
          status: "pass" as const,
          summary: "Coverage: 85%",
          details: [],
          annotations: [],
          metrics: {},
        }),
        async () => ({
          checkName: "lint",
          status: "fail" as const,
          summary: "2 new lint errors",
          details: ["src/index.ts:10: unused variable"],
          annotations: [
            {
              path: "src/index.ts",
              startLine: 10,
              endLine: 10,
              severity: "error" as const,
              message: "Unused variable 'x'",
              title: "no-unused-vars",
            },
          ],
          metrics: { errors: 2 },
        }),
      ],
      {
        checkRunName: "zen/quality",
        event: mockEvent,
        token: "test-token",
      },
    );

    expect(conclusion).toBe("failure");
  });

  it("should return 'action_required' when a check throws", async () => {
    mockGitHubApi();

    const conclusion = await runAndReport(
      [
        async () => ({
          checkName: "coverage",
          status: "pass" as const,
          summary: "Coverage: 85%",
          details: [],
          annotations: [],
          metrics: {},
        }),
        async () => {
          throw new Error("Coverage tool not found");
        },
      ],
      {
        checkRunName: "zen/quality",
        event: mockEvent,
        token: "test-token",
      },
    );

    expect(conclusion).toBe("action_required");
  });

  it("should make GitHub API calls in the right order", async () => {
    mockGitHubApi();

    await runAndReport(
      [
        async () => ({
          checkName: "test-check",
          status: "pass" as const,
          summary: "OK",
          details: [],
          annotations: [],
          metrics: {},
        }),
      ],
      {
        checkRunName: "zen/quality",
        event: mockEvent,
        token: "test-token",
      },
    );

    // Should have called check-runs create, update, and then issue comments
    const checkRunCalls = apiCalls.filter((c) => c.url.includes("check-runs"));
    const commentCalls = apiCalls.filter((c) => c.url.includes("comments"));

    expect(checkRunCalls.length).toBeGreaterThanOrEqual(2);
    expect(commentCalls.length).toBeGreaterThanOrEqual(1);
  });
});
