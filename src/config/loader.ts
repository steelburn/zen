/**
 * Configuration loader — reads, parses, validates, and resolves `.zen.yml`.
 *
 * @module
 */

import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

import { load as parseYaml, YAMLException } from "js-yaml";

import {
  DEFAULT_COMPLEXITY_CHECK,
  DEFAULT_CONFIG,
  DEFAULT_COVERAGE_CHECK,
  DEFAULT_LINT_CHECK,
} from "./defaults.js";
import type {
  BranchOverride,
  ChecksConfig,
  ComplexityCheck,
  CoverageCheck,
  EnvironmentOverride,
  LintCheck,
  ResolvedZenConfig,
} from "./types.js";
import { validateConfig } from "./validation.js";

// ---------------------------------------------------------------------------
// Deep-merge helpers (user partial → defaults, safely)
// ---------------------------------------------------------------------------

function mergeCoverageCheck(user: CoverageCheck | undefined): Required<CoverageCheck> {
  return {
    ...DEFAULT_COVERAGE_CHECK,
    ...user,
  };
}

function mergeLintCheck(user: LintCheck | undefined): Required<LintCheck> {
  return {
    ...DEFAULT_LINT_CHECK,
    ...user,
  };
}

function mergeComplexityCheck(user: ComplexityCheck | undefined): Required<ComplexityCheck> {
  return {
    ...DEFAULT_COMPLEXITY_CHECK,
    ...user,
  };
}

/**
 * Internal full checks type matching what ResolvedZenConfig expects.
 */
type ResolvedChecks = Required<ChecksConfig> & {
  readonly coverage: Required<CoverageCheck>;
  readonly lint: Required<LintCheck>;
  readonly complexity: Required<ComplexityCheck>;
};

function mergeChecksConfig(user: ChecksConfig | undefined): ResolvedChecks {
  return {
    coverage: mergeCoverageCheck(user?.coverage),
    lint: mergeLintCheck(user?.lint),
    complexity: mergeComplexityCheck(user?.complexity),
  };
}

// ---------------------------------------------------------------------------
// Branch / environment matching
// ---------------------------------------------------------------------------

/**
 * Simple glob-to-string matcher.
 *
 * Supports `*` (matches anything except `/`) and `**` (matches anything
 * including `/`). This is intentionally minimal — we use picomatch or
 * minimatch for production; for the MVP a simple implementation suffices.
 */
export function matchBranchPattern(pattern: string, branchName: string): boolean {
  // Escape regex-special chars except * and **
  let regexStr = "";
  let i = 0;
  while (i < pattern.length) {
    const ch = pattern[i]!;
    if (ch === "*" && pattern[i + 1] === "*" && pattern[i + 2] === "/") {
      // **/ matches any depth
      regexStr += "(?:.+/)?";
      i += 3;
    } else if (ch === "*" && pattern[i + 1] === "*" && i + 2 >= pattern.length) {
      // trailing ** matches anything
      regexStr += ".*";
      i += 2;
    } else if (ch === "*") {
      // single * matches anything except /
      regexStr += "[^/]*";
      i += 1;
    } else {
      regexStr += ch.replace(/[.+^${}()|[\]\\]/g, "\\$&");
      i += 1;
    }
  }

  const re = new RegExp(`^${regexStr}$`);
  return re.test(branchName);
}

/**
 * Merges branch-specific overrides on top of a base config.
 *
 * The first matching branch (if any) wins. No cascade — only one
 * branch override is applied.
 *
 * @param config - The base resolved config.
 * @param branchName - The current git branch name.
 * @returns A config with branch overrides applied (if matched).
 */
export function applyBranchOverrides(
  config: ResolvedZenConfig,
  branchName: string,
): ResolvedZenConfig {
  for (const override of config.branches) {
    if (matchBranchPattern(override.pattern, branchName)) {
      return applyNestedOverride(config, override);
    }
  }
  return config;
}

/**
 * Merges environment-specific overrides on top of a base config.
 *
 * @param config - The base resolved config.
 * @param environmentName - The deployment environment name.
 * @returns A config with environment overrides applied (if matched).
 */
export function applyEnvironmentOverrides(
  config: ResolvedZenConfig,
  environmentName: string,
): ResolvedZenConfig {
  for (const override of config.environments) {
    if (override.name === environmentName) {
      return applyNestedOverride(config, override);
    }
  }
  return config;
}

function applyNestedOverride(
  config: ResolvedZenConfig,
  override: BranchOverride | EnvironmentOverride,
): ResolvedZenConfig {
  const mergedChecks: ResolvedChecks = override.config.checks
    ? {
        coverage: {
          ...config.checks.coverage,
          ...override.config.checks.coverage,
        } as Required<CoverageCheck>,
        lint: {
          ...config.checks.lint,
          ...override.config.checks.lint,
        } as Required<LintCheck>,
        complexity: {
          ...config.checks.complexity,
          ...override.config.checks.complexity,
        } as Required<ComplexityCheck>,
      }
    : config.checks;

  const mergedExclude =
    override.config.exclude !== undefined
      ? [...config.exclude, ...override.config.exclude]
      : config.exclude;

  return {
    ...config,
    checks: mergedChecks,
    exclude: mergedExclude,
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Options for loading the configuration.
 */
export interface LoadConfigOptions {
  /**
   * The current git branch name (for branch overrides).
   * If omitted, branch overrides are skipped.
   */
  readonly branchName?: string;

  /**
   * The deployment environment name (for environment overrides).
   * If omitted, environment overrides are skipped.
   */
  readonly environmentName?: string;
}

/**
 * Result of loading and resolving a configuration.
 */
export interface LoadConfigResult {
  /** The resolved configuration with all defaults applied. */
  readonly config: ResolvedZenConfig;
  /** The path the config was loaded from, if a file was found. */
  readonly sourcePath: string | null;
  /** Whether the config file existed. */
  readonly fileFound: boolean;
}

/**
 * Loads `.zen.yml` from the given directory, validates it, and returns a
 * fully resolved configuration with defaults applied.
 *
 * If the file does not exist, returns the default configuration.
 *
 * @param directory - The directory to search for `.zen.yml` (default: cwd).
 * @param options - Loading options (branch, environment).
 * @returns A resolved config result.
 */
export function loadConfig(directory?: string, options?: LoadConfigOptions): LoadConfigResult {
  const dir = directory ?? process.cwd();
  const configPath = join(dir, ".zen.yml");

  if (!existsSync(configPath)) {
    return {
      config: DEFAULT_CONFIG,
      sourcePath: null,
      fileFound: false,
    };
  }

  const raw = readFileSync(configPath, "utf-8");
  return loadConfigFromString(raw, configPath, options);
}

/**
 * Same as {@link loadConfig} but accepts raw YAML content directly.
 *
 * Useful for testing or when the file content is fetched from elsewhere
 * (e.g., GitHub API).
 *
 * @param yamlContent - The YAML string to parse.
 * @param sourcePath - Optional source path for error reporting.
 * @param options - Loading options (branch, environment).
 * @returns A resolved config result.
 */
export function loadConfigFromString(
  yamlContent: string,
  sourcePath?: string,
  options?: LoadConfigOptions,
): LoadConfigResult {
  // js-yaml throws on empty/whitespace-only input; treat as defaults.
  let parsed: unknown;
  try {
    parsed = parseYaml(yamlContent);
  } catch (err: unknown) {
    if (err instanceof YAMLException && err.message.includes("empty")) {
      return {
        config: DEFAULT_CONFIG,
        sourcePath: sourcePath ?? null,
        fileFound: true,
      };
    }
    throw err;
  }

  // null/undefined YAML (e.g. ~) → defaults
  if (parsed === undefined || parsed === null) {
    return {
      config: DEFAULT_CONFIG,
      sourcePath: sourcePath ?? null,
      fileFound: true,
    };
  }

  const validation = validateConfig(parsed);

  if (!validation.ok) {
    throw new ZenConfigError(
      `Invalid .zen.yml${sourcePath ? ` (${sourcePath})` : ""}:\n${validation.errors.map((e) => `  - ${e}`).join("\n")}`,
    );
  }

  // Merge user config with defaults
  let resolved: ResolvedZenConfig = {
    version: validation.value.version ?? DEFAULT_CONFIG.version,
    checks: mergeChecksConfig(validation.value.checks),
    branches: validation.value.branches ?? [],
    environments: validation.value.environments ?? [],
    exclude: validation.value.exclude ?? DEFAULT_CONFIG.exclude,
  };

  // Apply branch overrides
  if (options?.branchName) {
    resolved = applyBranchOverrides(resolved, options.branchName);
  }

  // Apply environment overrides
  if (options?.environmentName) {
    resolved = applyEnvironmentOverrides(resolved, options.environmentName);
  }

  return {
    config: resolved,
    sourcePath: sourcePath ?? null,
    fileFound: true,
  };
}

// ---------------------------------------------------------------------------
// Error type
// ---------------------------------------------------------------------------

/**
 * Error thrown when the `.zen.yml` configuration is invalid.
 */
export class ZenConfigError extends Error {
  override readonly name = "ZenConfigError" as const;

  constructor(message: string) {
    super(message);
  }
}
