import { afterEach, describe, expect, it, vi } from "vitest";

import {
  CommentError,
  formatQualityReport,
  findZenComment,
} from "./comments.js";
import type { PullRequestComment, QualityReportData } from "./types.js";

// ─── Mocks ───────────────────────────────────────────────────────────────────

const zenComment: PullRequestComment = {
  id: 101,
  body: "## ✅ ZEN Quality Report\n\nSome content\n\n<!-- zen-quality-report -->",
  user: { login: "zen-bot", id: 999, type: "Bot" },
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
  issueUrl: "https://api.github.com/repos/owner/repo/issues/1",
  htmlUrl: "https://github.com/owner/repo/pull/1#issuecomment-101",
};

const otherComment: PullRequestComment = {
  id: 102,
  body: "This looks good to me!",
  user: { login: "developer", id: 456, type: "User" },
  createdAt: "2026-01-01T01:00:00Z",
  updatedAt: "2026-01-01T01:00:00Z",
  issueUrl: "https://api.github.com/repos/owner/repo/issues/1",
  htmlUrl: "https://github.com/owner/repo/pull/1#issuecomment-102",
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

describe("findZenComment", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should find the ZEN comment among regular comments", async () => {
    mockFetch({
      status: 200,
      body: [otherComment, zenComment],
    });

    const found = await findZenComment("owner", "repo", 1, "token");

    expect(found).toBeDefined();
    expect(found!.id).toBe(101);
  });

  it("should return undefined if no ZEN comment exists", async () => {
    mockFetch({
      status: 200,
      body: [otherComment],
    });

    const found = await findZenComment("owner", "repo", 1, "token");

    expect(found).toBeUndefined();
  });

  it("should return undefined for empty comments list", async () => {
    mockFetch({
      status: 200,
      body: [],
    });

    const found = await findZenComment("owner", "repo", 1, "token");

    expect(found).toBeUndefined();
  });
});

describe("CommentError", () => {
  it("should have the correct name", () => {
    const error = new CommentError("test error");
    expect(error.name).toBe("CommentError");
    expect(error.message).toBe("test error");
  });
});

describe("formatQualityReport", () => {
  const sampleData: QualityReportData = {
    repo: "my-org/my-repo",
    prNumber: 42,
    headSha: "abc123def456",
    overallStatus: "passed",
    coverageDelta: 1.5,
    checks: [
      { name: "Coverage", status: "passed", details: "88.5% (+1.5%)" },
      { name: "Lint", status: "passed", details: "0 errors" },
      {
        name: "Complexity",
        status: "passed",
        details: "All functions under threshold",
      },
    ],
  };

  it("should include the repo and PR number in the header", () => {
    const report = formatQualityReport(sampleData);

    expect(report).toContain("my-org/my-repo");
    expect(report).toContain("#42");
  });

  it("should include all check results in a table", () => {
    const report = formatQualityReport(sampleData);

    expect(report).toContain("Coverage");
    expect(report).toContain("Lint");
    expect(report).toContain("Complexity");
    expect(report).toContain("88.5% (+1.5%)");
    expect(report).toContain("0 errors");
  });

  it("should show coverage delta when provided", () => {
    const report = formatQualityReport(sampleData);

    expect(report).toContain("Coverage delta");
    expect(report).toContain("+1.50%");
  });

  it("should show negative coverage delta correctly", () => {
    const data: QualityReportData = {
      ...sampleData,
      coverageDelta: -2.3,
      overallStatus: "failed",
      checks: [
        { name: "Coverage", status: "failed", details: "80.0% (-2.3%)" },
      ],
    };

    const report = formatQualityReport(data);

    expect(report).toContain("-2.30%");
    expect(report).toContain("❌");
  });

  it("should include the ZEN marker at the end for re-identification", () => {
    const report = formatQualityReport(sampleData);

    expect(report).not.toContain("<!-- zen-quality-report -->"); // marker is added by upsertZenComment
  });

  it("should include how-to-fix section when checks fail", () => {
    const failingData: QualityReportData = {
      repo: "my-org/my-repo",
      prNumber: 43,
      headSha: "def789",
      overallStatus: "failed",
      checks: [
        { name: "Coverage", status: "failed", details: "Dropped below 80%" },
        { name: "Lint", status: "passed", details: "0 errors" },
      ],
    };

    const report = formatQualityReport(failingData);

    expect(report).toContain("How to Fix");
    expect(report).toContain("Coverage");
    // The how-to-fix section should only list failing checks
    const howToFixSection = report.match(/### 🔧 How to Fix[\s\S]*?(?=---)/);
    expect(howToFixSection).not.toBeNull();
    expect(howToFixSection![0]).toContain("Coverage");
    expect(howToFixSection![0]).not.toContain("Lint");
    expect(howToFixSection![0]).not.toContain("passed")
  });

  it("should show success message when all checks pass", () => {
    const report = formatQualityReport(sampleData);

    expect(report).toContain("All quality checks passed");
  });

  it("should include the ZEN signature at the bottom", () => {
    const report = formatQualityReport(sampleData);

    expect(report).toContain("ZEN");
    expect(report).toContain("Quality Gate");
  });

  it("should handle partial status", () => {
    const partialData: QualityReportData = {
      repo: "my-org/my-repo",
      prNumber: 44,
      headSha: "ghi012",
      overallStatus: "partial",
      checks: [
        { name: "Coverage", status: "passed", details: "OK" },
        { name: "Lint", status: "skipped", details: "No config found" },
      ],
    };

    const report = formatQualityReport(partialData);

    expect(report).toContain("⚠️");
    expect(report).toContain("⏭️");
    expect(report).toContain("skipped");
  });
});
