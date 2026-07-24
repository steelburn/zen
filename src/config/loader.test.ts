import { mkdtempSync, writeFileSync, realpathSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { loadConfig, loadConfigFromString, matchBranchPattern, ZenConfigError } from "./loader.js";

describe("matchBranchPattern", () => {
  it("should match exact branch names", () => {
    expect(matchBranchPattern("main", "main")).toBe(true);
    expect(matchBranchPattern("main", "master")).toBe(false);
  });

  it("should match wildcard patterns", () => {
    expect(matchBranchPattern("feature/*", "feature/login")).toBe(true);
    expect(matchBranchPattern("feature/*", "feature/login/extra")).toBe(false);
    expect(matchBranchPattern("feature/*", "main")).toBe(false);
  });

  it("should match double-star patterns", () => {
    expect(matchBranchPattern("dependabot/**", "dependabot/npm-and-yarn")).toBe(true);
    expect(matchBranchPattern("dependabot/**", "dependabot/npm-and-yarn/lodash-4.17.21")).toBe(
      true,
    );
    expect(matchBranchPattern("dependabot/**", "main")).toBe(false);
  });

  it("should match release branch patterns", () => {
    expect(matchBranchPattern("release/*", "release/v1")).toBe(true);
    expect(matchBranchPattern("release/*", "release/v2.0.1")).toBe(true);
  });

  it("should handle trailing ** wildcard", () => {
    expect(matchBranchPattern("hotfix/**", "hotfix/1.0.1-critical-bug")).toBe(true);
    expect(matchBranchPattern("hotfix/**", "hotfix/1.0.1/sub/fix")).toBe(true);
  });
});

describe("loadConfigFromString", () => {
  it("should return defaults for empty YAML", () => {
    const result = loadConfigFromString("");
    expect(result.fileFound).toBe(true);
    expect(result.config.version).toBe("1");
    expect(result.config.checks.coverage.threshold).toBe(80);
  });

  it("should return defaults for whitespace-only YAML", () => {
    const result = loadConfigFromString("   \n  ");
    expect(result.fileFound).toBe(true);
    expect(result.config.version).toBe("1");
  });

  it("should return defaults for null YAML", () => {
    const result = loadConfigFromString("~");
    expect(result.fileFound).toBe(true);
    expect(result.config.version).toBe("1");
  });

  it("should parse a valid config with overrides", () => {
    const yaml = `
version: "1"
checks:
  coverage:
    threshold: 90
    strict: true
  lint:
    maxErrors: 5
  complexity:
    enabled: false
exclude:
  - vendor/**
`;
    const result = loadConfigFromString(yaml);
    expect(result.config.version).toBe("1");
    expect(result.config.checks.coverage.threshold).toBe(90);
    expect(result.config.checks.coverage.strict).toBe(true);
    expect(result.config.checks.lint.maxErrors).toBe(5);
    expect(result.config.checks.complexity.enabled).toBe(false);
    expect(result.config.exclude).toContain("vendor/**");
    // Defaults still apply
    expect(result.config.checks.lint.maxWarnings).toBe(10);
    expect(result.config.checks.coverage.include).toEqual(["src/**"]);
  });

  it("should throw ZenConfigError for invalid YAML content", () => {
    const yaml = `
checks:
  coverage:
    threshold: "not-a-number"
`;
    expect(() => loadConfigFromString(yaml)).toThrow(ZenConfigError);
  });

  it("should throw descriptive error messages", () => {
    const yaml = `
checks:
  coverage:
    threshold: 101
`;
    expect(() => loadConfigFromString(yaml)).toThrow(/must be between 0 and 100/);
  });

  it("should accept complete config with branches and environments", () => {
    const yaml = `
version: "1"
checks:
  coverage:
    threshold: 85
branches:
  - pattern: feature/*
    config:
      checks:
        coverage:
          threshold: 70
environments:
  - name: production
    config:
      checks:
        coverage:
          threshold: 90
`;
    const result = loadConfigFromString(yaml);
    expect(result.config.branches).toHaveLength(1);
    expect(result.config.branches[0]!.pattern).toBe("feature/*");
    expect(result.config.environments).toHaveLength(1);
    expect(result.config.environments[0]!.name).toBe("production");
  });

  // -----------------------------------------------------------------------
  // Branch override resolution
  // -----------------------------------------------------------------------

  it("should apply branch overrides when branchName matches", () => {
    const yaml = `
version: "1"
checks:
  coverage:
    threshold: 80
branches:
  - pattern: feature/*
    config:
      checks:
        coverage:
          threshold: 70
`;
    const result = loadConfigFromString(yaml, undefined, {
      branchName: "feature/login",
    });
    expect(result.config.checks.coverage.threshold).toBe(70);
  });

  it("should not apply branch overrides when branchName does not match", () => {
    const yaml = `
version: "1"
checks:
  coverage:
    threshold: 80
branches:
  - pattern: feature/*
    config:
      checks:
        coverage:
          threshold: 70
`;
    const result = loadConfigFromString(yaml, undefined, {
      branchName: "main",
    });
    expect(result.config.checks.coverage.threshold).toBe(80);
  });

  it("should apply first matching branch override", () => {
    const yaml = `
version: "1"
branches:
  - pattern: feature/*
    config:
      checks:
        coverage:
          threshold: 70
  - pattern: feature/login
    config:
      checks:
        coverage:
          threshold: 60
`;
    const result = loadConfigFromString(yaml, undefined, {
      branchName: "feature/login",
    });
    // First pattern matches "feature/login" via glob, so threshold is 70
    expect(result.config.checks.coverage.threshold).toBe(70);
  });

  // -----------------------------------------------------------------------
  // Environment override resolution
  // -----------------------------------------------------------------------

  it("should apply environment overrides when environment matches", () => {
    const yaml = `
version: "1"
environments:
  - name: production
    config:
      checks:
        coverage:
          threshold: 95
`;
    const result = loadConfigFromString(yaml, undefined, {
      environmentName: "production",
    });
    expect(result.config.checks.coverage.threshold).toBe(95);
  });

  it("should not apply environment overrides when no match", () => {
    const yaml = `
version: "1"
checks:
  coverage:
    threshold: 80
environments:
  - name: production
    config:
      checks:
        coverage:
          threshold: 95
`;
    const result = loadConfigFromString(yaml, undefined, {
      environmentName: "staging",
    });
    expect(result.config.checks.coverage.threshold).toBe(80);
  });

  it("should apply both branch and environment overrides together", () => {
    const yaml = `
version: "1"
checks:
  coverage:
    threshold: 80
branches:
  - pattern: feature/*
    config:
      checks:
        coverage:
          threshold: 70
environments:
  - name: production
    config:
      checks:
        coverage:
          threshold: 90
`;
    // Feature branch + production = branch override applied first, then env
    const result = loadConfigFromString(yaml, undefined, {
      branchName: "feature/login",
      environmentName: "production",
    });
    // branch applied first (80->70), then env (70 -> 90 because env override
    // re-merges with current config)
    expect(result.config.checks.coverage.threshold).toBe(90);
  });
});

describe("loadConfig (filesystem)", () => {
  it("should return defaults when .zen.yml does not exist", () => {
    const tmpDir = mkdtempSync(join(realpathSync(tmpdir()), "zen-config-test-"));
    const result = loadConfig(tmpDir);
    expect(result.fileFound).toBe(false);
    expect(result.sourcePath).toBeNull();
    expect(result.config.version).toBe("1");
  });

  it("should load and parse .zen.yml when present", () => {
    const tmpDir = mkdtempSync(join(realpathSync(tmpdir()), "zen-config-test-"));
    writeFileSync(
      join(tmpDir, ".zen.yml"),
      `version: "1"
checks:
  coverage:
    threshold: 75
`,
      "utf-8",
    );
    const result = loadConfig(tmpDir);
    expect(result.fileFound).toBe(true);
    expect(result.sourcePath).toBe(join(tmpDir, ".zen.yml"));
    expect(result.config.checks.coverage.threshold).toBe(75);
  });

  it("should throw ZenConfigError for invalid .zen.yml file", () => {
    const tmpDir = mkdtempSync(join(realpathSync(tmpdir()), "zen-config-test-"));
    writeFileSync(
      join(tmpDir, ".zen.yml"),
      `checks:
  coverage:
    threshold: "bad"
`,
      "utf-8",
    );
    expect(() => loadConfig(tmpDir)).toThrow(ZenConfigError);
  });

  it("should apply branch overrides when loading from filesystem", () => {
    const tmpDir = mkdtempSync(join(realpathSync(tmpdir()), "zen-config-test-"));
    writeFileSync(
      join(tmpDir, ".zen.yml"),
      `version: "1"
checks:
  coverage:
    threshold: 80
branches:
  - pattern: feature/*
    config:
      checks:
        coverage:
          threshold: 65
`,
      "utf-8",
    );
    const result = loadConfig(tmpDir, { branchName: "feature/awesome" });
    expect(result.config.checks.coverage.threshold).toBe(65);
  });
});
