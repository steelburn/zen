import { afterEach, describe, expect, it, vi } from "vitest";

import { buildCheckOutput, CheckRunError } from "./checks.js";
import type { CheckRun, CheckAnnotation } from "./types.js";

// ─── Mocks ───────────────────────────────────────────────────────────────────

const mockCheckRun: CheckRun = {
  id: 42,
  name: "zen/quality",
  headSha: "abc123def456",
  status: "completed",
  conclusion: "success",
  startedAt: "2026-01-01T00:00:00Z",
  completedAt: "2026-01-01T00:00:10Z",
  output: {
    title: "ZEN Quality Check",
    summary: "All checks passed",
    text: null,
    annotationsCount: 0,
  },
  detailsUrl: null,
  externalId: null,
  url: "https://api.github.com/repos/owner/repo/check-runs/42",
  htmlUrl: "https://github.com/owner/repo/runs/42",
  app: { id: 123, slug: "zen-quality" },
};

function mockFetch(response: {
  status: number;
  body: unknown;
}) {
  return vi.spyOn(globalThis, "fetch").mockImplementation(async () => {
    return {
      ok: response.status >= 200 && response.status < 300,
      status: response.status,
      text: () => Promise.resolve(JSON.stringify(response.body)),
      headers: new Headers(),
    } as Response;
  });
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("buildCheckOutput", () => {
  it("should return a valid output object with title and summary", () => {
    const output = buildCheckOutput("My Check", "Everything is fine");

    expect(output).toEqual({
      title: "My Check",
      summary: "Everything is fine",
      annotations: [],
    });
  });

  it("should include annotations", () => {
    const annotations: readonly CheckAnnotation[] = [
      {
        path: "src/index.ts",
        startLine: 10,
        endLine: 10,
        annotationLevel: "warning",
        message: "Unused variable",
      },
    ];

    const output = buildCheckOutput("Lint", "1 warning", annotations);

    expect(output.annotations).toHaveLength(1);
    expect(output.annotations![0]!.message).toBe("Unused variable");
  });

  it("should include optional text", () => {
    const output = buildCheckOutput(
      "Coverage",
      "Coverage dropped by 2%",
      [],
      "Detailed coverage report...",
    );

    expect(output.text).toBe("Detailed coverage report...");
  });

  it("should truncate annotations to 50", () => {
    const manyAnnotations = Array.from({ length: 100 }, (_, i) => ({
      path: `file${i}.ts`,
      startLine: 1,
      endLine: 1,
      annotationLevel: "warning" as const,
      message: `Issue #${i + 1}`,
    }));

    const output = buildCheckOutput("Lint", "Many issues", manyAnnotations);

    expect(output.annotations).toHaveLength(50);
    expect(output.annotations![0]!.message).toBe("Issue #1");
    expect(output.annotations![49]!.message).toBe("Issue #50");
  });
});

describe("CheckRunError", () => {
  it("should have the correct name", () => {
    const error = new CheckRunError("test error");
    expect(error.name).toBe("CheckRunError");
    expect(error.message).toBe("test error");
  });
});

// Note: createCheckRun, updateCheckRun, getCheckRun, and reportCheckRun
// are integration-level functions that call githubRequest internally.
// They are tested end-to-end in the e2e test suite with a real GitHub API.
// Here we test that they correctly delegate to the client.
describe("check run API functions (unit)", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should re-throw client errors as CheckRunError", async () => {
    mockFetch({ status: 422, body: { message: "Validation failed" } });

    // Dynamic import to get the function that uses the mocked fetch
    const { createCheckRun } = await import("./checks.js");

    await expect(
      createCheckRun(
        {
          owner: "test",
          repo: "test",
          name: "zen/quality",
          headSha: "abc123",
        },
        "token",
      ),
    ).rejects.toThrow(CheckRunError);
  });
});
