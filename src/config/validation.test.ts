import { describe, expect, it } from "vitest";

import { validateConfig } from "./validation.js";

describe("validateConfig", () => {
  // -----------------------------------------------------------------------
  // Root-level validation
  // -----------------------------------------------------------------------

  it("should reject non-object input", () => {
    const result = validateConfig("hello");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toContain("root config must be an object");
    }
  });

  it("should reject null input", () => {
    const result = validateConfig(null);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toContain("root config must be an object");
    }
  });

  it("should reject array input", () => {
    const result = validateConfig([]);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toContain("root config must be an object");
    }
  });

  // -----------------------------------------------------------------------
  // Version validation
  // -----------------------------------------------------------------------

  it("should accept version 1", () => {
    const result = validateConfig({ version: "1" });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.version).toBe("1");
    }
  });

  it("should default version to 1 when omitted", () => {
    const result = validateConfig({});
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.version).toBeUndefined();
    }
  });

  it("should reject unsupported versions", () => {
    const result = validateConfig({ version: "2" });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.join(" ")).toContain("unsupported version");
    }
  });

  it("should reject non-string version", () => {
    const result = validateConfig({ version: 1 });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.join(" ")).toContain("version must be a string");
    }
  });

  // -----------------------------------------------------------------------
  // Coverage check validation
  // -----------------------------------------------------------------------

  it("should accept valid coverage config", () => {
    const result = validateConfig({
      checks: {
        coverage: {
          enabled: true,
          threshold: 85,
          strict: true,
          include: ["src/**"],
          exclude: ["src/generated/**"],
        },
      },
    });
    expect(result.ok).toBe(true);
  });

  it("should reject coverage threshold > 100", () => {
    const result = validateConfig({
      checks: {
        coverage: {
          threshold: 101,
        },
      },
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.join(" ")).toContain("must be between 0 and 100");
    }
  });

  it("should reject coverage threshold < 0", () => {
    const result = validateConfig({
      checks: {
        coverage: {
          threshold: -1,
        },
      },
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.join(" ")).toContain("must be between 0 and 100");
    }
  });

  it("should reject coverage as non-object", () => {
    const result = validateConfig({
      checks: {
        coverage: "enabled",
      },
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.join(" ")).toContain("must be an object");
    }
  });

  it("should reject non-boolean coverage.enabled", () => {
    const result = validateConfig({
      checks: {
        coverage: {
          enabled: "yes",
        },
      },
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.join(" ")).toContain("must be a boolean");
    }
  });

  // -----------------------------------------------------------------------
  // Lint check validation
  // -----------------------------------------------------------------------

  it("should accept valid lint config", () => {
    const result = validateConfig({
      checks: {
        lint: {
          enabled: true,
          maxErrors: 5,
          maxWarnings: 20,
          strict: false,
        },
      },
    });
    expect(result.ok).toBe(true);
  });

  it("should reject negative maxErrors", () => {
    const result = validateConfig({
      checks: {
        lint: {
          maxErrors: -1,
        },
      },
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.join(" ")).toContain("must be non-negative");
    }
  });

  it("should reject float maxErrors", () => {
    const result = validateConfig({
      checks: {
        lint: {
          maxErrors: 1.5,
        },
      },
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.join(" ")).toContain("must be an integer");
    }
  });

  // -----------------------------------------------------------------------
  // Complexity check validation
  // -----------------------------------------------------------------------

  it("should accept valid complexity config", () => {
    const result = validateConfig({
      checks: {
        complexity: {
          enabled: true,
          maxComplexity: 15,
          strict: false,
          exclude: ["**/*.generated.ts"],
        },
      },
    });
    expect(result.ok).toBe(true);
  });

  it("should reject maxComplexity < 1", () => {
    const result = validateConfig({
      checks: {
        complexity: {
          maxComplexity: 0,
        },
      },
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.join(" ")).toContain("must be at least 1");
    }
  });

  it("should reject float maxComplexity", () => {
    const result = validateConfig({
      checks: {
        complexity: {
          maxComplexity: 5.5,
        },
      },
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.join(" ")).toContain("must be an integer");
    }
  });

  // -----------------------------------------------------------------------
  // Branches validation
  // -----------------------------------------------------------------------

  it("should accept valid branch overrides", () => {
    const result = validateConfig({
      branches: [
        {
          pattern: "feature/*",
          config: {
            checks: {
              coverage: { threshold: 70 },
            },
          },
        },
      ],
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.branches).toHaveLength(1);
      expect(result.value.branches![0]!.pattern).toBe("feature/*");
    }
  });

  it("should reject branches with missing pattern", () => {
    const result = validateConfig({
      branches: [
        {
          config: {
            checks: { coverage: { threshold: 70 } },
          },
        },
      ],
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.join(" ")).toContain("pattern");
    }
  });

  it("should reject branches with missing config", () => {
    const result = validateConfig({
      branches: [
        {
          pattern: "feature/*",
        },
      ],
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.join(" ")).toContain("config");
    }
  });

  it("should reject non-array branches", () => {
    const result = validateConfig({
      branches: "not-an-array",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.join(" ")).toContain("branches must be an array");
    }
  });

  // -----------------------------------------------------------------------
  // Environments validation
  // -----------------------------------------------------------------------

  it("should accept valid environment overrides", () => {
    const result = validateConfig({
      environments: [
        {
          name: "production",
          config: {
            checks: {
              coverage: { threshold: 90 },
            },
          },
        },
      ],
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.environments).toHaveLength(1);
      expect(result.value.environments![0]!.name).toBe("production");
    }
  });

  it("should reject environments with missing name", () => {
    const result = validateConfig({
      environments: [
        {
          config: {
            checks: { coverage: { threshold: 90 } },
          },
        },
      ],
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.join(" ")).toContain("name");
    }
  });

  // -----------------------------------------------------------------------
  // Exclude validation
  // -----------------------------------------------------------------------

  it("should accept exclude patterns", () => {
    const result = validateConfig({
      exclude: ["vendor/**", "tmp/**"],
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.exclude).toEqual(["vendor/**", "tmp/**"]);
    }
  });

  it("should reject non-array exclude", () => {
    const result = validateConfig({
      exclude: "vendor/**",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.join(" ")).toContain("must be an array");
    }
  });

  it("should reject empty patterns in exclude", () => {
    const result = validateConfig({
      exclude: [""],
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.join(" ")).toContain("must not be empty");
    }
  });

  // -----------------------------------------------------------------------
  // Complete valid config
  // -----------------------------------------------------------------------

  it("should accept a full valid config", () => {
    const result = validateConfig({
      version: "1",
      checks: {
        coverage: {
          enabled: true,
          threshold: 85,
          strict: true,
          include: ["src/**", "lib/**"],
          exclude: ["src/generated/**"],
        },
        lint: {
          enabled: true,
          maxErrors: 0,
          maxWarnings: 5,
          strict: true,
        },
        complexity: {
          enabled: true,
          maxComplexity: 12,
          strict: false,
          exclude: ["**/*.test.ts"],
        },
      },
      branches: [
        {
          pattern: "dependabot/**",
          config: {
            checks: {
              coverage: { enabled: false },
            },
          },
        },
      ],
      environments: [
        {
          name: "production",
          config: {
            checks: {
              coverage: { threshold: 90, strict: true },
            },
          },
        },
      ],
      exclude: ["vendor/**"],
    });
    expect(result.ok).toBe(true);
  });

  it("should accept empty config (all defaults)", () => {
    const result = validateConfig({});
    expect(result.ok).toBe(true);
  });
});
