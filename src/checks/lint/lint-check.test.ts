import { describe, expect, it } from "vitest";

import type { LintError, LintReport } from "../types.js";

import { compareLint, parseLintReport } from "./lint-check.js";

// ---------------------------------------------------------------------------
// Fixture helpers
// ---------------------------------------------------------------------------

function makeError(
  filePath: string,
  line: number,
  column: number,
  ruleId: string,
  message: string,
  severity: "error" | "warning" = "error",
): LintError {
  return { filePath, line, column, severity, ruleId, message };
}

function makeReport(errors: LintError[]): LintReport {
  return { errors, totalErrorCount: errors.length };
}

// ---------------------------------------------------------------------------
// parseLintReport
// ---------------------------------------------------------------------------
describe("parseLintReport", () => {
  it("should parse valid ESLint JSON output", () => {
    const raw = JSON.stringify([
      {
        filePath: "src/index.ts",
        messages: [
          {
            line: 10,
            column: 5,
            severity: 2,
            ruleId: "no-unused-vars",
            message: "'x' is defined but never used",
          },
        ],
      },
    ]);

    const report = parseLintReport(raw);

    expect(report.totalErrorCount).toBe(1);
    expect(report.errors[0]!.filePath).toBe("src/index.ts");
    expect(report.errors[0]!.line).toBe(10);
    expect(report.errors[0]!.ruleId).toBe("no-unused-vars");
    expect(report.errors[0]!.severity).toBe("error");
  });

  it("should parse warnings (severity 1) as warnings", () => {
    const raw = JSON.stringify([
      {
        filePath: "src/a.ts",
        messages: [
          { line: 1, column: 1, severity: 1, ruleId: "no-console", message: "Unexpected console" },
        ],
      },
    ]);

    const report = parseLintReport(raw);

    expect(report.totalErrorCount).toBe(1);
    expect(report.errors[0]!.severity).toBe("warning");
  });

  it("should skip messages with unknown severity", () => {
    const raw = JSON.stringify([
      {
        filePath: "src/a.ts",
        messages: [
          { line: 1, column: 1, severity: 0, ruleId: "no-console", message: "off" },
          { line: 2, column: 1, severity: 2, ruleId: "no-unused-vars", message: "error" },
        ],
      },
    ]);

    const report = parseLintReport(raw);

    expect(report.totalErrorCount).toBe(1);
    expect(report.errors[0]!.ruleId).toBe("no-unused-vars");
  });

  it("should handle multiple files with multiple errors", () => {
    const raw = JSON.stringify([
      {
        filePath: "src/a.ts",
        messages: [
          { line: 1, column: 1, severity: 2, ruleId: "e1", message: "err1" },
          { line: 2, column: 1, severity: 2, ruleId: "e2", message: "err2" },
        ],
      },
      {
        filePath: "src/b.ts",
        messages: [{ line: 5, column: 3, severity: 2, ruleId: "e3", message: "err3" }],
      },
    ]);

    const report = parseLintReport(raw);

    expect(report.totalErrorCount).toBe(3);
    expect(report.errors).toHaveLength(3);
  });

  it("should handle empty file list", () => {
    const report = parseLintReport("[]");

    expect(report.totalErrorCount).toBe(0);
    expect(report.errors).toHaveLength(0);
  });

  it("should handle files with no messages", () => {
    const raw = JSON.stringify([{ filePath: "src/a.ts", messages: [] }]);

    const report = parseLintReport(raw);

    expect(report.totalErrorCount).toBe(0);
  });

  it("should handle invalid JSON gracefully", () => {
    const report = parseLintReport("not-json-at-all");

    expect(report.totalErrorCount).toBe(0);
    expect(report.errors).toHaveLength(0);
  });

  it("should handle null/undefined fields gracefully", () => {
    const raw = JSON.stringify([
      {
        filePath: "src/a.ts",
        messages: [{ line: null, column: undefined, severity: 2, ruleId: null, message: "msg" }],
      },
    ]);

    const report = parseLintReport(raw);

    expect(report.totalErrorCount).toBe(1);
    expect(report.errors[0]!.line).toBe(0);
    expect(report.errors[0]!.column).toBe(0);
    expect(report.errors[0]!.ruleId).toBe("unknown");
    expect(report.errors[0]!.message).toBe("msg");
  });

  it("should handle missing messages array", () => {
    const raw = JSON.stringify([{ filePath: "src/a.ts" }]);

    const report = parseLintReport(raw);

    expect(report.totalErrorCount).toBe(0);
  });

  it("should handle top-level non-array input", () => {
    const raw = JSON.stringify({ error: "unexpected" });

    const report = parseLintReport(raw);

    expect(report.totalErrorCount).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// compareLint — basic behavior
// ---------------------------------------------------------------------------
describe("compareLint", () => {
  const defaultOptions = { maxNewErrors: 0 };

  it("should pass when no errors in either branch", () => {
    const empty = makeReport([]);
    const result = compareLint(empty, null, empty, defaultOptions);

    expect(result.status).toBe("pass");
    expect(result.metrics["netNewErrors"]).toBe(0);
  });

  it("should pass when same errors exist in both branches", () => {
    const errors = [makeError("src/a.ts", 1, 1, "no-unused-vars", "unused")];
    const base = makeReport(errors);
    const head = makeReport(errors);

    const result = compareLint(base, null, head, defaultOptions);

    expect(result.status).toBe("pass");
    expect(result.metrics["netNewErrors"]).toBe(0);
    expect(result.metrics["fixedErrors"]).toBe(0);
  });

  it("should fail when head introduces a new error", () => {
    const base = makeReport([]);
    const head = makeReport([makeError("src/a.ts", 1, 1, "no-unused-vars", "unused")]);

    const result = compareLint(base, null, head, defaultOptions);

    expect(result.status).toBe("fail");
    expect(result.metrics["newErrors"]).toBe(1);
    expect(result.metrics["netNewErrors"]).toBe(1);
  });

  it("should pass when new errors are within threshold", () => {
    const base = makeReport([]);
    const head = makeReport([
      makeError("src/a.ts", 1, 1, "no-console", "console"),
      makeError("src/b.ts", 2, 1, "no-eval", "eval"),
    ]);

    const result = compareLint(base, null, head, { maxNewErrors: 2 });

    expect(result.status).toBe("pass");
    expect(result.metrics["netNewErrors"]).toBe(2);
  });

  it("should fail when new errors exceed threshold", () => {
    const base = makeReport([]);
    const head = makeReport([
      makeError("src/a.ts", 1, 1, "no-console", "console"),
      makeError("src/b.ts", 2, 1, "no-eval", "eval"),
      makeError("src/c.ts", 3, 1, "no-unused-vars", "unused"),
    ]);

    const result = compareLint(base, null, head, { maxNewErrors: 2 });

    expect(result.status).toBe("fail");
    expect(result.metrics["netNewErrors"]).toBe(3);
  });

  it("should report fixed errors", () => {
    const base = makeReport([
      makeError("src/a.ts", 1, 1, "no-console", "console"),
      makeError("src/b.ts", 2, 1, "no-eval", "eval"),
    ]);
    const head = makeReport([makeError("src/b.ts", 2, 1, "no-eval", "eval")]);

    const result = compareLint(base, null, head, { maxNewErrors: 0 });

    expect(result.status).toBe("pass");
    expect(result.metrics["fixedErrors"]).toBe(1);
    expect(result.metrics["newErrors"]).toBe(0);
    expect(result.metrics["netNewErrors"]).toBe(-1);
  });

  it("should handle all errors fixed", () => {
    const base = makeReport([makeError("src/a.ts", 1, 1, "no-console", "console")]);
    const head = makeReport([]);

    const result = compareLint(base, null, head, defaultOptions);

    expect(result.status).toBe("pass");
    expect(result.metrics["fixedErrors"]).toBe(1);
    expect(result.metrics["baseErrors"]).toBe(1);
    expect(result.metrics["headErrors"]).toBe(0);
  });

  it("should handle mixed additions and removals", () => {
    const base = makeReport([
      makeError("src/a.ts", 1, 1, "e1", "err1"),
      makeError("src/b.ts", 2, 1, "e2", "err2"),
    ]);
    const head = makeReport([
      makeError("src/a.ts", 1, 1, "e1", "err1"),
      makeError("src/c.ts", 3, 1, "e3", "err3"),
    ]);

    const result = compareLint(base, null, head, { maxNewErrors: 1 });

    // Fixed: e2; New: e3 -> net 0, pass
    expect(result.status).toBe("pass");
    expect(result.metrics["newErrors"]).toBe(1);
    expect(result.metrics["fixedErrors"]).toBe(1);
    expect(result.metrics["netNewErrors"]).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// compareLint — deduplication
// ---------------------------------------------------------------------------
describe("compareLint deduplication", () => {
  it("should deduplicate identical errors by file:line:column:rule", () => {
    const duplicate = makeError("src/a.ts", 10, 5, "no-unused-vars", "unused");
    const base = makeReport([]);
    const head = makeReport([duplicate, duplicate]);

    const result = compareLint(base, null, head, { maxNewErrors: 1 });

    // If not deduplicated, would be 2 new errors > threshold of 1
    expect(result.metrics["newErrors"]).toBe(1);
    expect(result.status).toBe("pass");
  });

  it("should treat same rule on different lines as distinct errors", () => {
    const base = makeReport([]);
    const head = makeReport([
      makeError("src/a.ts", 10, 5, "no-console", "console"),
      makeError("src/a.ts", 20, 5, "no-console", "console"),
    ]);

    const result = compareLint(base, null, head, { maxNewErrors: 1 });

    expect(result.metrics["newErrors"]).toBe(2);
    expect(result.status).toBe("fail");
  });
});

// ---------------------------------------------------------------------------
// compareLint — annotation details
// ---------------------------------------------------------------------------
describe("compareLint annotations", () => {
  it("should create annotation for each new error", () => {
    const base = makeReport([]);
    const head = makeReport([
      makeError("src/a.ts", 10, 5, "no-console", "Unexpected console.log()"),
    ]);

    const result = compareLint(base, null, head, { maxNewErrors: 0 });

    expect(result.annotations).toHaveLength(1);
    expect(result.annotations[0]!.path).toBe("src/a.ts");
    expect(result.annotations[0]!.startLine).toBe(10);
    expect(result.annotations[0]!.endLine).toBe(10);
    expect(result.annotations[0]!.severity).toBe("error");
    expect(result.annotations[0]!.message).toContain("Unexpected console.log()");
    expect(result.annotations[0]!.message).toContain("no-console");
  });

  it("should not create annotations for pre-existing errors", () => {
    const existing = makeError("src/a.ts", 10, 5, "no-console", "console");
    const base = makeReport([existing]);
    const head = makeReport([existing]);

    const result = compareLint(base, null, head, { maxNewErrors: 0 });

    expect(result.annotations).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// compareLint — threshold edge cases
// ---------------------------------------------------------------------------
describe("compareLint thresholds", () => {
  it("should allow zero new errors with maxNewErrors=0", () => {
    const base = makeReport([]);
    const head = makeReport([]);
    const result = compareLint(base, null, head, { maxNewErrors: 0 });

    expect(result.status).toBe("pass");
  });

  it("should fail with exactly 1 new error when maxNewErrors=0", () => {
    const base = makeReport([]);
    const head = makeReport([makeError("src/a.ts", 1, 1, "no-console", "console")]);
    const result = compareLint(base, null, head, { maxNewErrors: 0 });

    expect(result.status).toBe("fail");
  });

  it("should tolerate unlimited errors with maxNewErrors=Infinity", () => {
    const base = makeReport([]);
    const errors = Array.from({ length: 100 }, (_, i) =>
      makeError(`src/${i}.ts`, 1, 1, "no-console", "console"),
    );
    const head = makeReport(errors);

    const result = compareLint(base, null, head, { maxNewErrors: Infinity });

    expect(result.status).toBe("pass");
    expect(result.metrics["newErrors"]).toBe(100);
  });

  it("should handle maxNewErrors=1 correctly", () => {
    const base = makeReport([]);
    const head = makeReport([
      makeError("src/a.ts", 1, 1, "e1", "err1"),
      makeError("src/b.ts", 2, 1, "e2", "err2"),
    ]);

    // 2 new errors > threshold of 1
    const result = compareLint(base, null, head, { maxNewErrors: 1 });
    expect(result.status).toBe("fail");

    // 1 new error <= threshold of 1
    const head2 = makeReport([makeError("src/a.ts", 1, 1, "e1", "err1")]);
    const result2 = compareLint(base, null, head2, { maxNewErrors: 1 });
    expect(result2.status).toBe("pass");
  });
});

// ---------------------------------------------------------------------------
// compareLint — summary / metrics
// ---------------------------------------------------------------------------
describe("compareLint summary and metrics", () => {
  it("should include clear summary for pass", () => {
    const base = makeReport([]);
    const head = makeReport([]);

    const result = compareLint(base, null, head, { maxNewErrors: 0 });

    expect(result.summary).toContain("No new lint errors");
  });

  it("should include clear summary for fail", () => {
    const base = makeReport([]);
    const head = makeReport([makeError("src/a.ts", 1, 1, "no-console", "console")]);

    const result = compareLint(base, null, head, { maxNewErrors: 0 });

    expect(result.summary).toContain("exceeds threshold");
  });

  it("should report all metrics correctly", () => {
    const base = makeReport([
      makeError("src/a.ts", 1, 1, "e1", "err1"),
      makeError("src/b.ts", 2, 1, "e2", "err2"),
    ]);
    const head = makeReport([
      makeError("src/a.ts", 1, 1, "e1", "err1"),
      makeError("src/c.ts", 3, 1, "e3", "err3"),
    ]);

    const result = compareLint(base, null, head, { maxNewErrors: 1 });

    expect(result.metrics["baseErrors"]).toBe(2);
    expect(result.metrics["headErrors"]).toBe(2);
    expect(result.metrics["newErrors"]).toBe(1);
    expect(result.metrics["fixedErrors"]).toBe(1);
    expect(result.metrics["netNewErrors"]).toBe(0);
    expect(result.metrics["maxNewErrors"]).toBe(1);
  });

  it("should include details for each new error", () => {
    const base = makeReport([]);
    const head = makeReport([makeError("src/a.ts", 10, 5, "no-console", "Unexpected console")]);

    const result = compareLint(base, null, head, { maxNewErrors: 1 });

    expect(result.details).toHaveLength(1);
    expect(result.details[0]).toContain("src/a.ts:10:5");
    expect(result.details[0]).toContain("no-console");
  });
});
