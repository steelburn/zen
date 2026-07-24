import { describe, expect, it } from "vitest";

import {
  DEFAULT_CHECKS,
  DEFAULT_COMPLEXITY_CHECK,
  DEFAULT_CONFIG,
  DEFAULT_COVERAGE_CHECK,
  DEFAULT_LINT_CHECK,
} from "./defaults.js";

describe("DEFAULT_COVERAGE_CHECK", () => {
  it("should have enabled=true", () => {
    expect(DEFAULT_COVERAGE_CHECK.enabled).toBe(true);
  });

  it("should have threshold=80", () => {
    expect(DEFAULT_COVERAGE_CHECK.threshold).toBe(80);
  });

  it("should have strict=true", () => {
    expect(DEFAULT_COVERAGE_CHECK.strict).toBe(true);
  });

  it("should include src/**", () => {
    expect(DEFAULT_COVERAGE_CHECK.include).toEqual(["src/**"]);
  });

  it("should have empty exclude array", () => {
    expect(DEFAULT_COVERAGE_CHECK.exclude).toEqual([]);
  });
});

describe("DEFAULT_LINT_CHECK", () => {
  it("should have enabled=true", () => {
    expect(DEFAULT_LINT_CHECK.enabled).toBe(true);
  });

  it("should have maxErrors=0", () => {
    expect(DEFAULT_LINT_CHECK.maxErrors).toBe(0);
  });

  it("should have maxWarnings=10", () => {
    expect(DEFAULT_LINT_CHECK.maxWarnings).toBe(10);
  });

  it("should have strict=true", () => {
    expect(DEFAULT_LINT_CHECK.strict).toBe(true);
  });
});

describe("DEFAULT_COMPLEXITY_CHECK", () => {
  it("should have enabled=true", () => {
    expect(DEFAULT_COMPLEXITY_CHECK.enabled).toBe(true);
  });

  it("should have maxComplexity=10", () => {
    expect(DEFAULT_COMPLEXITY_CHECK.maxComplexity).toBe(10);
  });

  it("should have strict=true", () => {
    expect(DEFAULT_COMPLEXITY_CHECK.strict).toBe(true);
  });

  it("should exclude test files", () => {
    expect(DEFAULT_COMPLEXITY_CHECK.exclude).toContain("**/*.test.ts");
    expect(DEFAULT_COMPLEXITY_CHECK.exclude).toContain("**/*.spec.ts");
  });
});

describe("DEFAULT_CHECKS", () => {
  it("should contain all three checks", () => {
    expect(DEFAULT_CHECKS.coverage).toBe(DEFAULT_COVERAGE_CHECK);
    expect(DEFAULT_CHECKS.lint).toBe(DEFAULT_LINT_CHECK);
    expect(DEFAULT_CHECKS.complexity).toBe(DEFAULT_COMPLEXITY_CHECK);
  });
});

describe("DEFAULT_CONFIG", () => {
  it("should have version 1", () => {
    expect(DEFAULT_CONFIG.version).toBe("1");
  });

  it("should have default checks", () => {
    expect(DEFAULT_CONFIG.checks).toBe(DEFAULT_CHECKS);
  });

  it("should have empty branches", () => {
    expect(DEFAULT_CONFIG.branches).toEqual([]);
  });

  it("should have empty environments", () => {
    expect(DEFAULT_CONFIG.environments).toEqual([]);
  });

  it("should exclude common directories", () => {
    expect(DEFAULT_CONFIG.exclude).toContain("node_modules/**");
    expect(DEFAULT_CONFIG.exclude).toContain("dist/**");
    expect(DEFAULT_CONFIG.exclude).toContain("coverage/**");
    expect(DEFAULT_CONFIG.exclude).toContain(".git/**");
  });
});
