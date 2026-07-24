import { describe, expect, it, vi } from "vitest";

import type { CheckContext, CheckFunction, CheckResult } from "../types.js";
import {
  DEFAULT_CONFIG,
} from "../types.js";


import { runChecks } from "./runner.js";

// ---------------------------------------------------------------------------
// Fixture helpers
// ---------------------------------------------------------------------------

function makeContext(overrides?: Partial<CheckContext>): CheckContext {
  return {
    baseSha: "abc123",
    headSha: "def456",
    repoPath: "/tmp/test-repo",
    config: DEFAULT_CONFIG,
    ...overrides,
  };
}

function makeResult(overrides?: Partial<CheckResult>): CheckResult {
  return {
    checkName: "test-check",
    status: "pass",
    summary: "All good",
    details: [],
    annotations: [],
    metrics: {},
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// runChecks — happy path
// ---------------------------------------------------------------------------
describe("runChecks", () => {
  it("should return pass with zero checks configured", async () => {
    const context = makeContext();
    const result = await runChecks(context, []);

    expect(result.overallStatus).toBe("pass");
    expect(result.totalChecks).toBe(0);
    expect(result.checkResults).toHaveLength(0);
  });

  it("should pass when all checks pass", async () => {
    const context = makeContext();
    const checks: CheckFunction[] = [
      vi.fn().mockResolvedValue(makeResult({ checkName: "coverage", status: "pass" })),
      vi.fn().mockResolvedValue(makeResult({ checkName: "lint", status: "pass" })),
    ];

    const result = await runChecks(context, checks);

    expect(result.overallStatus).toBe("pass");
    expect(result.totalChecks).toBe(2);
    expect(result.passed).toBe(2);
    expect(result.failed).toBe(0);
    expect(result.errors).toBe(0);
  });

  it("should return fail when any check fails", async () => {
    const context = makeContext();
    const checks: CheckFunction[] = [
      vi.fn().mockResolvedValue(makeResult({ checkName: "coverage", status: "pass" })),
      vi.fn().mockResolvedValue(makeResult({ checkName: "lint", status: "fail" })),
      vi.fn().mockResolvedValue(makeResult({ checkName: "complexity", status: "pass" })),
    ];

    const result = await runChecks(context, checks);

    expect(result.overallStatus).toBe("fail");
    expect(result.passed).toBe(2);
    expect(result.failed).toBe(1);
    expect(result.errors).toBe(0);
  });

  it("should return error when any check errors", async () => {
    const context = makeContext();
    const checks: CheckFunction[] = [
      vi.fn().mockResolvedValue(makeResult({ checkName: "coverage", status: "pass" })),
      vi.fn().mockResolvedValue(makeResult({ checkName: "lint", status: "error" })),
    ];

    const result = await runChecks(context, checks);

    expect(result.overallStatus).toBe("error");
    expect(result.passed).toBe(1);
    expect(result.failed).toBe(0);
    expect(result.errors).toBe(1);
  });

  it("should treat error status higher priority than fail", async () => {
    const context = makeContext();
    const checks: CheckFunction[] = [
      vi.fn().mockResolvedValue(makeResult({ checkName: "coverage", status: "fail" })),
      vi.fn().mockResolvedValue(makeResult({ checkName: "lint", status: "error" })),
    ];

    const result = await runChecks(context, checks);

    // Error takes precedence over fail
    expect(result.overallStatus).toBe("error");
  });
});

// ---------------------------------------------------------------------------
// runChecks — error handling
// ---------------------------------------------------------------------------
describe("runChecks error handling", () => {
  it("should handle a check that throws an exception", async () => {
    const context = makeContext();
    const checks: CheckFunction[] = [
      vi.fn().mockResolvedValue(makeResult({ checkName: "coverage", status: "pass" })),
      vi.fn().mockRejectedValue(new Error("Something went wrong")),
    ];

    const result = await runChecks(context, checks);

    expect(result.errors).toBe(1);
    expect(result.passed).toBe(1);
    expect(result.overallStatus).toBe("error");
    expect(result.checkResults[1]!.status).toBe("error");
    expect(result.checkResults[1]!.summary).toContain("Something went wrong");
  });

  it("should handle a check that throws a non-Error value", async () => {
    const context = makeContext();
    const checks: CheckFunction[] = [vi.fn().mockRejectedValue("string error")];

    const result = await runChecks(context, checks);

    expect(result.errors).toBe(1);
    expect(result.checkResults[0]!.summary).toContain("Unknown error");
  });

  it("should continue running remaining checks after one fails", async () => {
    const context = makeContext();
    const coverageCheck = vi
      .fn()
      .mockResolvedValue(makeResult({ checkName: "coverage", status: "fail" }));
    const lintCheck = vi.fn().mockResolvedValue(makeResult({ checkName: "lint", status: "pass" }));

    const result = await runChecks(context, [coverageCheck, lintCheck]);

    expect(result.totalChecks).toBe(2);
    expect(result.failed).toBe(1);
    expect(result.passed).toBe(1);
    // Both checks should have been called
    expect(coverageCheck).toHaveBeenCalledOnce();
    expect(lintCheck).toHaveBeenCalledOnce();
  });

  it("should handle all checks erroring", async () => {
    const context = makeContext();
    const checks: CheckFunction[] = [
      vi.fn().mockResolvedValue(makeResult({ checkName: "c1", status: "error" })),
      vi.fn().mockResolvedValue(makeResult({ checkName: "c2", status: "error" })),
    ];

    const result = await runChecks(context, checks);

    expect(result.overallStatus).toBe("error");
    expect(result.errors).toBe(2);
    expect(result.passed).toBe(0);
    expect(result.failed).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// runChecks — aggregation
// ---------------------------------------------------------------------------
describe("runChecks aggregation", () => {
  it("should collect check results in order", async () => {
    const context = makeContext();
    const checks: CheckFunction[] = [
      vi.fn().mockResolvedValue(makeResult({ checkName: "first" })),
      vi.fn().mockResolvedValue(makeResult({ checkName: "second" })),
      vi.fn().mockResolvedValue(makeResult({ checkName: "third" })),
    ];

    const result = await runChecks(context, checks);

    expect(result.checkResults).toHaveLength(3);
    expect(result.checkResults[0]!.checkName).toBe("first");
    expect(result.checkResults[1]!.checkName).toBe("second");
    expect(result.checkResults[2]!.checkName).toBe("third");
  });

  it("should aggregate metrics from all checks", async () => {
    const context = makeContext();
    const checks: CheckFunction[] = [
      vi.fn().mockResolvedValue(
        makeResult({
          checkName: "coverage",
          metrics: { coveragePercent: 85, filesChecked: 10 },
        }),
      ),
      vi.fn().mockResolvedValue(
        makeResult({
          checkName: "lint",
          metrics: { newErrors: 0, totalErrors: 5 },
        }),
      ),
    ];

    const result = await runChecks(context, checks);

    expect(result.metrics["coveragePercent"]).toBe(85);
    expect(result.metrics["filesChecked"]).toBe(10);
    expect(result.metrics["newErrors"]).toBe(0);
    expect(result.metrics["totalErrors"]).toBe(5);
  });

  it("should aggregate annotations from all checks", async () => {
    const context = makeContext();
    const checks: CheckFunction[] = [
      vi.fn().mockResolvedValue(
        makeResult({
          checkName: "coverage",
          annotations: [
            {
              path: "src/a.ts",
              startLine: 1,
              endLine: 1,
              severity: "warning",
              message: "coverage drop",
            },
          ],
        }),
      ),
      vi.fn().mockResolvedValue(
        makeResult({
          checkName: "lint",
          annotations: [
            { path: "src/b.ts", startLine: 5, endLine: 5, severity: "error", message: "new lint" },
          ],
        }),
      ),
    ];

    const result = await runChecks(context, checks);

    const allAnnotations = result.checkResults.flatMap((cr) => cr.annotations);
    expect(allAnnotations).toHaveLength(2);
    expect(allAnnotations[0]!.message).toBe("coverage drop");
    expect(allAnnotations[1]!.message).toBe("new lint");
  });
});

// ---------------------------------------------------------------------------
// runChecks — context and invocation
// ---------------------------------------------------------------------------
describe("runChecks context and invocation", () => {
  it("should pass the context to each check", async () => {
    const context = makeContext({ repoPath: "/custom/path" });
    const checkFn = vi.fn().mockResolvedValue(makeResult());
    await runChecks(context, [checkFn]);

    expect(checkFn).toHaveBeenCalledWith(context);
  });

  it("should run checks concurrently", async () => {
    const context = makeContext();
    let concurrentCalls = 0;
    let maxConcurrent = 0;

    const createCheck = (delay: number): CheckFunction => {
      return vi.fn().mockImplementation(async () => {
        concurrentCalls++;
        maxConcurrent = Math.max(maxConcurrent, concurrentCalls);
        await new Promise((resolve) => setTimeout(resolve, delay));
        concurrentCalls--;
        return makeResult();
      });
    };

    const checks = [createCheck(50), createCheck(50), createCheck(50)];
    await runChecks(context, checks);

    expect(maxConcurrent).toBeGreaterThan(1);
  });
});

// ---------------------------------------------------------------------------
// runChecks — edge cases
// ---------------------------------------------------------------------------
describe("runChecks edge cases", () => {
  it("should handle a single check", async () => {
    const context = makeContext();
    const result = await runChecks(context, [
      vi.fn().mockResolvedValue(makeResult({ checkName: "single" })),
    ]);

    expect(result.totalChecks).toBe(1);
    expect(result.passed).toBe(1);
    expect(result.overallStatus).toBe("pass");
  });

  it("should handle many checks without issue", async () => {
    const context = makeContext();
    const manyChecks = Array.from({ length: 50 }, (_, i) =>
      vi.fn().mockResolvedValue(makeResult({ checkName: `check-${i}` })),
    );

    const result = await runChecks(context, manyChecks);

    expect(result.totalChecks).toBe(50);
    expect(result.passed).toBe(50);
    expect(result.overallStatus).toBe("pass");
  });

  it("should handle all checks passing with annotations", async () => {
    const context = makeContext();
    const checks: CheckFunction[] = [
      vi.fn().mockResolvedValue(makeResult({ checkName: "good" })),
      vi.fn().mockResolvedValue(makeResult({ checkName: "also-good" })),
    ];

    const result = await runChecks(context, checks);
    expect(result.totalChecks).toBe(2);
    expect(result.passed).toBe(2);
  });
});
