import { describe, expect, it } from "vitest";

import type { ComplexityReport, FunctionComplexity } from "../types.js";

import {
  compareComplexity,
  DEFAULT_COMPLEXITY_OPTIONS,
  parseComplexityReport,
} from "./complexity-check.js";

// ---------------------------------------------------------------------------
// Fixture helpers
// ---------------------------------------------------------------------------

function makeFunction(
  path: string,
  name: string,
  startLine: number,
  endLine: number,
  complexity: number,
): FunctionComplexity {
  return {
    filePath: path,
    functionName: name,
    startLine,
    endLine,
    complexity,
  };
}

function makeReport(fns: FunctionComplexity[]): ComplexityReport {
  let maxComplexity = 0;
  for (const fn of fns) {
    if (fn.complexity > maxComplexity) maxComplexity = fn.complexity;
  }
  return {
    functions: fns,
    maxComplexity,
    thresholdBreaches: 0,
  };
}

// ---------------------------------------------------------------------------
// parseComplexityReport
// ---------------------------------------------------------------------------
describe("parseComplexityReport", () => {
  it("should parse a single function line", () => {
    const raw = "src/index.ts:handleRequest:10:25:5";
    const report = parseComplexityReport(raw);

    expect(report.functions).toHaveLength(1);
    expect(report.functions[0]).toEqual({
      filePath: "src/index.ts",
      functionName: "handleRequest",
      startLine: 10,
      endLine: 25,
      complexity: 5,
    });
    expect(report.maxComplexity).toBe(5);
  });

  it("should parse multiple function lines", () => {
    const raw = ["src/a.ts:foo:1:10:3", "src/b.ts:bar:5:20:8"].join("\n");
    const report = parseComplexityReport(raw);

    expect(report.functions).toHaveLength(2);
    expect(report.maxComplexity).toBe(8);
  });

  it("should skip blank lines and comments", () => {
    const raw = [
      "src/a.ts:foo:1:10:3",
      "",
      "# This is a comment",
      "  ",
      "src/b.ts:bar:5:20:8",
    ].join("\n");
    const report = parseComplexityReport(raw);

    expect(report.functions).toHaveLength(2);
  });

  it("should skip malformed lines", () => {
    const raw = [
      "src/a.ts:foo:1:10:3",
      "not-valid-format",
      "src/b.ts::5:20:8", // missing function name
      "src/c.ts:baz:abc:20:8", // non-numeric line
    ].join("\n");
    const report = parseComplexityReport(raw);

    expect(report.functions).toHaveLength(1);
  });

  it("should handle empty input", () => {
    const report = parseComplexityReport("");

    expect(report.functions).toHaveLength(0);
    expect(report.maxComplexity).toBe(0);
  });

  it("should handle 0 complexity (not a branch/loop)", () => {
    const raw = "src/utils.ts:identity:1:1:0";
    const report = parseComplexityReport(raw);

    expect(report.functions).toHaveLength(1);
    expect(report.functions[0]!.complexity).toBe(0);
  });

  it("should handle very large complexity values", () => {
    const raw = "src/godzilla.ts:godFunction:1:1000:150";
    const report = parseComplexityReport(raw);

    expect(report.functions).toHaveLength(1);
    expect(report.functions[0]!.complexity).toBe(150);
    expect(report.maxComplexity).toBe(150);
  });

  it("should parse function names with special characters", () => {
    const raw = "src/app.ts:$onInit:10:20:4";
    const report = parseComplexityReport(raw);

    expect(report.functions).toHaveLength(1);
    expect(report.functions[0]!.functionName).toBe("$onInit");
  });

  it("should parse deeply nested file paths", () => {
    const raw = "src/deeply/nested/dir/file.ts:myFunc:5:15:3";
    const report = parseComplexityReport(raw);

    expect(report.functions).toHaveLength(1);
    expect(report.functions[0]!.filePath).toBe("src/deeply/nested/dir/file.ts");
  });
});

// ---------------------------------------------------------------------------
// compareComplexity — happy path
// ---------------------------------------------------------------------------
describe("compareComplexity", () => {
  const defaultOptions = { maxComplexity: 10 };

  it("should pass when no functions exceed max complexity (CPLX-001)", () => {
    const base = makeReport([makeFunction("src/a.ts", "foo", 1, 10, 5)]);
    const head = makeReport([makeFunction("src/a.ts", "foo", 1, 10, 5)]);

    const result = compareComplexity(base, head, defaultOptions);

    expect(result.status).toBe("pass");
  });

  it("should pass when new functions are within threshold (CPLX-002)", () => {
    const base = makeReport([]);
    const head = makeReport([makeFunction("src/new.ts", "bar", 1, 10, 8)]);

    const result = compareComplexity(base, head, defaultOptions);

    expect(result.status).toBe("pass");
    expect(result.metrics["newViolations"]).toBe(0);
  });

  it("should pass when no functions at all", () => {
    const base = makeReport([]);
    const head = makeReport([]);

    const result = compareComplexity(base, head, defaultOptions);

    expect(result.status).toBe("pass");
    expect(result.metrics["headFunctions"]).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// compareComplexity — violations
// ---------------------------------------------------------------------------
describe("compareComplexity violations", () => {
  const defaultOptions = { maxComplexity: 10 };

  it("should fail when a new function exceeds max complexity (CPLX-003)", () => {
    const base = makeReport([]);
    const head = makeReport([makeFunction("src/complex.ts", "godMode", 1, 50, 15)]);

    const result = compareComplexity(base, head, defaultOptions);

    expect(result.status).toBe("fail");
    expect(result.metrics["newViolations"]).toBe(1);
    expect(result.annotations).toHaveLength(1);
    expect(result.annotations[0]!.message).toContain("15");
    expect(result.annotations[0]!.message).toContain("godMode");
  });

  it("should not flag existing complex function that is unchanged (CPLX-004)", () => {
    const base = makeReport([makeFunction("src/legacy.ts", "oldMonster", 1, 100, 25)]);
    const head = makeReport([makeFunction("src/legacy.ts", "oldMonster", 1, 100, 25)]);

    const result = compareComplexity(base, head, defaultOptions);

    // Existing complex function unchanged — no violation reported as new/worsened
    expect(result.status).toBe("pass");
    expect(result.metrics["newViolations"]).toBe(0);
    expect(result.metrics["worsenedFunctions"]).toBe(0);
    // But it's tracked as unchangedAboveThreshold
    expect(result.metrics["unchangedAboveThreshold"]).toBe(1);
  });

  it("should fail when an existing function becomes more complex (CPLX-005)", () => {
    const base = makeReport([makeFunction("src/a.ts", "foo", 1, 10, 5)]);
    const head = makeReport([makeFunction("src/a.ts", "foo", 1, 10, 12)]);

    const result = compareComplexity(base, head, defaultOptions);

    expect(result.status).toBe("fail");
    expect(result.metrics["worsenedFunctions"]).toBe(1);
    expect(result.annotations).toHaveLength(1);
    expect(result.annotations[0]!.message).toContain("increased by 7");
  });

  it("should fail when existing function becomes more complex and exceeds threshold", () => {
    const base = makeReport([makeFunction("src/a.ts", "foo", 1, 10, 8)]);
    const head = makeReport([makeFunction("src/a.ts", "foo", 1, 10, 12)]);

    const result = compareComplexity(base, head, defaultOptions);

    expect(result.status).toBe("fail");
    expect(result.metrics["worsenedFunctions"]).toBe(1);
    // 8 → 12, increased by 4, now exceeds threshold
    expect(result.annotations[0]!.message).toContain("increased by 4");
  });

  it("should not flag complexity increase that stays within threshold", () => {
    const base = makeReport([makeFunction("src/a.ts", "foo", 1, 10, 3)]);
    const head = makeReport([makeFunction("src/a.ts", "foo", 1, 10, 8)]);

    const result = compareComplexity(base, head, defaultOptions);

    // Increased but still within threshold (8 <= 10)
    expect(result.status).toBe("pass");
    expect(result.metrics["worsenedFunctions"]).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// compareComplexity — boundary
// ---------------------------------------------------------------------------
describe("compareComplexity boundaries", () => {
  it("should pass when complexity exactly at max (CPLX-006)", () => {
    const base = makeReport([]);
    const head = makeReport([makeFunction("src/a.ts", "foo", 1, 10, 10)]);

    const result = compareComplexity(base, head, { maxComplexity: 10 });

    expect(result.status).toBe("pass");
    expect(result.metrics["newViolations"]).toBe(0);
  });

  it("should fail when complexity is one above max (CPLX-007)", () => {
    const base = makeReport([]);
    const head = makeReport([makeFunction("src/a.ts", "foo", 1, 10, 11)]);

    const result = compareComplexity(base, head, { maxComplexity: 10 });

    expect(result.status).toBe("fail");
    expect(result.metrics["newViolations"]).toBe(1);
  });

  it("should fail with maxComplexity=0 if any function has positive complexity (CPLX-011)", () => {
    const base = makeReport([]);
    const head = makeReport([makeFunction("src/a.ts", "foo", 1, 10, 1)]);

    const result = compareComplexity(base, head, { maxComplexity: 0 });

    expect(result.status).toBe("fail");
    expect(result.metrics["newViolations"]).toBe(1);
  });

  it("should pass with maxComplexity=0 if all functions have 0 complexity", () => {
    const base = makeReport([]);
    const head = makeReport([makeFunction("src/a.ts", "foo", 1, 1, 0)]);

    const result = compareComplexity(base, head, { maxComplexity: 0 });

    expect(result.status).toBe("pass");
  });

  it("should pass with very high maxComplexity (CPLX-012)", () => {
    const base = makeReport([]);
    const head = makeReport([makeFunction("src/a.ts", "monster", 1, 100, 999)]);

    const result = compareComplexity(base, head, { maxComplexity: 1000 });

    expect(result.status).toBe("pass");
  });
});

// ---------------------------------------------------------------------------
// compareComplexity — edge cases
// ---------------------------------------------------------------------------
describe("compareComplexity edge cases", () => {
  const defaultOptions = { maxComplexity: 10 };

  it("should handle empty files (CPLX-008)", () => {
    const base = makeReport([]);
    const head = makeReport([]);

    const result = compareComplexity(base, head, defaultOptions);

    expect(result.status).toBe("pass");
    expect(result.metrics["headFunctions"]).toBe(0);
    expect(result.metrics["baseFunctions"]).toBe(0);
  });

  it("should handle very large complexity values (CPLX-009)", () => {
    const base = makeReport([]);
    const head = makeReport([makeFunction("src/huge.ts", "hugeFunc", 1, 5000, 5000)]);

    const result = compareComplexity(base, head, defaultOptions);

    expect(result.status).toBe("fail");
    expect(result.metrics["newViolations"]).toBe(1);
    expect(result.metrics["maxComplexitySeen"]).toBe(5000);
  });

  it("should handle files removed between base and head", () => {
    const base = makeReport([makeFunction("src/removed.ts", "oldFunc", 1, 10, 8)]);
    const head = makeReport([]);

    const result = compareComplexity(base, head, defaultOptions);

    expect(result.status).toBe("pass");
    // Should not blow up or report violations for removed functions
    expect(result.metrics["headFunctions"]).toBe(0);
  });

  it("should handle renamed functions (no match = new + removed)", () => {
    const base = makeReport([makeFunction("src/a.ts", "oldName", 1, 10, 8)]);
    const head = makeReport([makeFunction("src/a.ts", "newName", 1, 10, 8)]);

    const result = compareComplexity(base, head, defaultOptions);

    // oldName removed, newName added — both within threshold
    expect(result.status).toBe("pass");
    expect(result.metrics["headFunctions"]).toBe(1);
    expect(result.metrics["baseFunctions"]).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// compareComplexity — annotations
// ---------------------------------------------------------------------------
describe("compareComplexity annotations (CPLX-014)", () => {
  const defaultOptions = { maxComplexity: 10 };

  it("should create annotation for each violating function", () => {
    const base = makeReport([]);
    const head = makeReport([
      makeFunction("src/a.ts", "foo", 1, 10, 12),
      makeFunction("src/b.ts", "bar", 5, 20, 15),
    ]);

    const result = compareComplexity(base, head, defaultOptions);

    expect(result.annotations).toHaveLength(2);
    expect(result.annotations[0]!.path).toBe("src/a.ts");
    expect(result.annotations[0]!.startLine).toBe(1);
    expect(result.annotations[0]!.endLine).toBe(10);
    expect(result.annotations[0]!.severity).toBe("error");
    expect(result.annotations[1]!.path).toBe("src/b.ts");
  });

  it("should include function name and complexity in annotation message", () => {
    const base = makeReport([]);
    const head = makeReport([makeFunction("src/a.ts", "complexFunc", 5, 30, 15)]);

    const result = compareComplexity(base, head, defaultOptions);

    expect(result.annotations[0]!.message).toContain("complexFunc");
    expect(result.annotations[0]!.message).toContain("15");
    expect(result.annotations[0]!.message).toContain("10");
  });

  it("should provide useful details for pass result", () => {
    const base = makeReport([]);
    const head = makeReport([]);

    const result = compareComplexity(base, head, defaultOptions);

    expect(result.summary).toContain("All functions within complexity threshold");
    expect(result.details).toEqual([]);
  });

  it("should provide useful summary for fail result", () => {
    const base = makeReport([]);
    const head = makeReport([makeFunction("src/a.ts", "bad", 1, 10, 15)]);

    const result = compareComplexity(base, head, defaultOptions);

    expect(result.summary).toContain("violation");
    expect(result.summary).toContain("10");
  });
});

// ---------------------------------------------------------------------------
// compareComplexity — metrics
// ---------------------------------------------------------------------------
describe("compareComplexity metrics", () => {
  const defaultOptions = { maxComplexity: 10 };

  it("should report all metrics correctly", () => {
    const base = makeReport([
      makeFunction("src/a.ts", "foo", 1, 10, 5),
      makeFunction("src/b.ts", "existingComplex", 5, 30, 12),
    ]);
    const head = makeReport([
      makeFunction("src/a.ts", "foo", 1, 10, 5),
      makeFunction("src/b.ts", "existingComplex", 5, 30, 14), // worsened
      makeFunction("src/c.ts", "newComplex", 1, 20, 15), // new violation
      makeFunction("src/d.ts", "simple", 1, 5, 3), // fine
    ]);

    const result = compareComplexity(base, head, defaultOptions);

    expect(result.metrics["headFunctions"]).toBe(4);
    expect(result.metrics["baseFunctions"]).toBe(2);
    expect(result.metrics["newViolations"]).toBe(1);
    expect(result.metrics["worsenedFunctions"]).toBe(1);
    expect(result.metrics["improvedFunctions"]).toBe(0);
    expect(result.metrics["totalViolations"]).toBe(2);
    expect(result.metrics["maxComplexitySeen"]).toBe(15);
    expect(result.metrics["maxAllowedComplexity"]).toBe(10);
  });

  it("should track improved functions", () => {
    const base = makeReport([makeFunction("src/a.ts", "foo", 1, 10, 12)]);
    const head = makeReport([makeFunction("src/a.ts", "foo", 1, 10, 5)]);

    const result = compareComplexity(base, head, defaultOptions);

    expect(result.metrics["improvedFunctions"]).toBe(1);
    expect(result.metrics["worsenedFunctions"]).toBe(0);
    expect(result.metrics["newViolations"]).toBe(0);
    expect(result.status).toBe("pass");
  });

  it("should track unchanged functions above threshold", () => {
    const base = makeReport([makeFunction("src/a.ts", "foo", 1, 10, 15)]);
    const head = makeReport([makeFunction("src/a.ts", "foo", 1, 10, 15)]);

    const result = compareComplexity(base, head, defaultOptions);

    expect(result.metrics["unchangedAboveThreshold"]).toBe(1);
    expect(result.status).toBe("pass");
  });
});

// ---------------------------------------------------------------------------
// Default options
// ---------------------------------------------------------------------------
describe("DEFAULT_COMPLEXITY_OPTIONS", () => {
  it("should have maxComplexity of 10", () => {
    expect(DEFAULT_COMPLEXITY_OPTIONS.maxComplexity).toBe(10);
  });
});
