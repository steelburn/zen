/**
 * Configuration system for ZEN's `.zen.yml` file.
 *
 * Provides types, defaults, validation, and loading for the project-level
 * quality gate configuration.
 *
 * ## Usage
 *
 * ```ts
 * import { loadConfig } from "./config/index.js";
 *
 * const { config } = loadConfig("/path/to/repo");
 * console.log(config.checks.coverage.threshold); // 80 (or whatever is configured)
 * ```
 *
 * @module
 */

export type {
  BranchOverride,
  ChecksConfig,
  ComplexityCheck,
  ConfigVersion,
  CoverageCheck,
  EnvironmentOverride,
  LintCheck,
  ResolvedZenConfig,
  ZenConfig,
  ZenConfigNested,
} from "./types.js";

export {
  DEFAULT_CHECKS,
  DEFAULT_COMPLEXITY_CHECK,
  DEFAULT_CONFIG,
  DEFAULT_COVERAGE_CHECK,
  DEFAULT_LINT_CHECK,
} from "./defaults.js";

export {
  validateConfig,
} from "./validation.js";
export type { ValidationResult } from "./validation.js";

export {
  loadConfig,
  loadConfigFromString,
  applyBranchOverrides,
  applyEnvironmentOverrides,
  matchBranchPattern,
  ZenConfigError,
} from "./loader.js";
export type { LoadConfigOptions, LoadConfigResult } from "./loader.js";
