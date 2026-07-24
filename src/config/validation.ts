/**
 * Configuration validation.
 *
 * Provides runtime validation for user-supplied `.zen.yml` files.
 * Ensures values are in-range and types are correct before the config
 * is merged with defaults.
 *
 * @module
 */

import type {
  BranchOverride,
  ChecksConfig,
  ComplexityCheck,
  ConfigVersion,
  CoverageCheck,
  EnvironmentOverride,
  LintCheck,
  ZenConfig,
  ZenConfigNested,
} from "./types.js";

// ---------------------------------------------------------------------------
// Result type — avoids exception-based validation
// ---------------------------------------------------------------------------

/**
 * The outcome of a validation step.
 */
export type ValidationResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly errors: readonly string[] };

function ok<T>(value: T): ValidationResult<T> {
  return { ok: true, value };
}

function fail(...errors: string[]): ValidationResult<never> {
  return { ok: false, errors };
}

// ---------------------------------------------------------------------------
// Individual validators
// ---------------------------------------------------------------------------

const KNOWN_VERSIONS: readonly ConfigVersion[] = ["1"];

function validateVersion(value: unknown): ValidationResult<ConfigVersion> {
  if (value === undefined || value === null) {
    return ok("1");
  }
  if (typeof value !== "string") {
    return fail("version must be a string");
  }
  if (!KNOWN_VERSIONS.includes(value as ConfigVersion)) {
    return fail(
      `unsupported version "${value}". Supported versions: ${KNOWN_VERSIONS.join(", ")}`,
    );
  }
  return ok(value as ConfigVersion);
}

function validatePercentage(value: unknown, label: string): ValidationResult<number> {
  if (value === undefined || value === null) {
    return ok(80);
  }
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fail(`${label} must be a finite number`);
  }
  if (value < 0 || value > 100) {
    return fail(`${label} must be between 0 and 100, got ${value}`);
  }
  return ok(value);
}

function validateNonNegativeInteger(
  value: unknown,
  label: string,
): ValidationResult<number> {
  if (value === undefined || value === null) {
    return ok(0);
  }
  if (typeof value !== "number" || !Number.isInteger(value) || !Number.isFinite(value)) {
    return fail(`${label} must be an integer`);
  }
  if (value < 0) {
    return fail(`${label} must be non-negative, got ${value}`);
  }
  return ok(value);
}

function validatePositiveInteger(
  value: unknown,
  label: string,
): ValidationResult<number> {
  if (value === undefined || value === null) {
    return ok(10);
  }
  if (typeof value !== "number" || !Number.isInteger(value) || !Number.isFinite(value)) {
    return fail(`${label} must be an integer`);
  }
  if (value < 1) {
    return fail(`${label} must be at least 1, got ${value}`);
  }
  return ok(value);
}

function validateBoolean(value: unknown, label: string): ValidationResult<boolean> {
  if (value === undefined || value === null) {
    return ok(true);
  }
  if (typeof value !== "boolean") {
    return fail(`${label} must be a boolean`);
  }
  return ok(value);
}

function validateGlobPatterns(
  value: unknown,
  label: string,
): ValidationResult<readonly string[]> {
  if (value === undefined || value === null) {
    return ok([]);
  }
  if (!Array.isArray(value)) {
    return fail(`${label} must be an array of glob strings`);
  }
  const errors: string[] = [];
  const patterns: string[] = [];
  for (let i = 0; i < value.length; i++) {
    const item = value[i];
    if (typeof item !== "string") {
      errors.push(`${label}[${i}] must be a string, got ${typeof item}`);
    } else if (item.trim().length === 0) {
      errors.push(`${label}[${i}] must not be empty`);
    } else {
      patterns.push(item);
    }
  }
  if (errors.length > 0) {
    return fail(...errors);
  }
  return ok(patterns);
}

/**
 * Helper: validates an unknown object against a record of per-key validators
 * and returns a {@link ValidationResult} with only the keys that were present
 * in the input. Keys not present in the input are omitted from the result
 * (so callers can merge with defaults).
 */
type ValidatorMap = Record<string, (value: unknown) => ValidationResult<unknown>>;

function validateObjectShape(
  value: unknown,
  validators: ValidatorMap,
  label: string,
): ValidationResult<Record<string, unknown>> {
  if (value === undefined || value === null) {
    return ok({});
  }
  if (typeof value !== "object" || Array.isArray(value)) {
    return fail(`${label} must be an object`);
  }
  const obj = value as Record<string, unknown>;
  const errors: string[] = [];
  const result: Record<string, unknown> = {};

  for (const [key, validator] of Object.entries(validators)) {
    if (key in obj) {
      const vResult = validator(obj[key]);
      if (vResult.ok) {
        result[key] = vResult.value;
      } else {
        errors.push(...vResult.errors);
      }
    }
  }

  if (errors.length > 0) return fail(...errors);
  return ok(result);
}

// ---------------------------------------------------------------------------
// Check validators
// ---------------------------------------------------------------------------

function validateCoverageCheck(value: unknown): ValidationResult<CoverageCheck> {
  const result = validateObjectShape(value, {
    enabled: (v) => validateBoolean(v, "checks.coverage.enabled"),
    threshold: (v) => validatePercentage(v, "checks.coverage.threshold"),
    strict: (v) => validateBoolean(v, "checks.coverage.strict"),
    include: (v) => validateGlobPatterns(v, "checks.coverage.include"),
    exclude: (v) => validateGlobPatterns(v, "checks.coverage.exclude"),
  }, "checks.coverage");

  if (!result.ok) return result;
  return ok(result.value as unknown as CoverageCheck);
}

function validateLintCheck(value: unknown): ValidationResult<LintCheck> {
  const result = validateObjectShape(value, {
    enabled: (v) => validateBoolean(v, "checks.lint.enabled"),
    maxErrors: (v) => validateNonNegativeInteger(v, "checks.lint.maxErrors"),
    maxWarnings: (v) => validateNonNegativeInteger(v, "checks.lint.maxWarnings"),
    strict: (v) => validateBoolean(v, "checks.lint.strict"),
  }, "checks.lint");

  if (!result.ok) return result;
  return ok(result.value as unknown as LintCheck);
}

function validateComplexityCheck(value: unknown): ValidationResult<ComplexityCheck> {
  const result = validateObjectShape(value, {
    enabled: (v) => validateBoolean(v, "checks.complexity.enabled"),
    maxComplexity: (v) => validatePositiveInteger(v, "checks.complexity.maxComplexity"),
    strict: (v) => validateBoolean(v, "checks.complexity.strict"),
    exclude: (v) => validateGlobPatterns(v, "checks.complexity.exclude"),
  }, "checks.complexity");

  if (!result.ok) return result;
  return ok(result.value as unknown as ComplexityCheck);
}

function validateChecksConfig(value: unknown): ValidationResult<ChecksConfig> {
  const result = validateObjectShape(value, {
    coverage: (v) => validateCoverageCheck(v),
    lint: (v) => validateLintCheck(v),
    complexity: (v) => validateComplexityCheck(v),
  }, "checks");

  if (!result.ok) return result;
  return ok(result.value as unknown as ChecksConfig);
}

function validateZenConfigNested(value: unknown): ValidationResult<ZenConfigNested> {
  const result = validateObjectShape(value, {
    checks: (v) => validateChecksConfig(v),
    exclude: (v) => validateGlobPatterns(v, "exclude"),
  }, "nested config");

  if (!result.ok) return result;
  return ok(result.value as unknown as ZenConfigNested);
}

// ---------------------------------------------------------------------------
// Branch / environment validators
// ---------------------------------------------------------------------------

function validateBranchOverride(value: unknown): ValidationResult<BranchOverride> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return fail("branch override must be an object");
  }

  const obj = value as Record<string, unknown>;
  const errors: string[] = [];

  if (typeof obj["pattern"] !== "string" || (obj["pattern"] as string).trim().length === 0) {
    errors.push("branch override pattern must be a non-empty string");
  }

  if (typeof obj["config"] !== "object" || obj["config"] === null || Array.isArray(obj["config"])) {
    errors.push("branch override config must be an object");
  }

  if (errors.length > 0) return fail(...errors);

  const configResult = validateZenConfigNested(obj["config"]);
  if (!configResult.ok) {
    errors.push(...configResult.errors);
  }

  if (errors.length > 0 || !configResult.ok) {
    if (!configResult.ok) errors.push(...configResult.errors);
    return fail(...errors);
  }

  return ok({
    pattern: obj["pattern"] as string,
    config: configResult.value,
  });
}

function validateEnvironmentOverride(value: unknown): ValidationResult<EnvironmentOverride> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return fail("environment override must be an object");
  }

  const obj = value as Record<string, unknown>;
  const errors: string[] = [];

  if (typeof obj["name"] !== "string" || (obj["name"] as string).trim().length === 0) {
    errors.push("environment override name must be a non-empty string");
  }

  if (typeof obj["config"] !== "object" || obj["config"] === null || Array.isArray(obj["config"])) {
    errors.push("environment override config must be an object");
  }

  if (errors.length > 0) return fail(...errors);

  const configResult = validateZenConfigNested(obj["config"]);
  if (!configResult.ok) {
    errors.push(...configResult.errors);
  }

  if (errors.length > 0 || !configResult.ok) {
    if (!configResult.ok) errors.push(...configResult.errors);
    return fail(...errors);
  }

  return ok({
    name: obj["name"] as string,
    config: configResult.value,
  });
}

// ---------------------------------------------------------------------------
// Public validator
// ---------------------------------------------------------------------------

/**
 * Validates a raw (parsed-from-YAML) config object against the schema.
 *
 * Returns either the validated (but unresolved) config or a list of
 * human-readable errors.
 *
 * @param input - The raw parsed YAML value (usually `unknown` from `js-yaml`).
 * @returns A validation result with the typed config or error messages.
 */
export function validateConfig(input: unknown): ValidationResult<ZenConfig> {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    return fail("root config must be an object");
  }

  const obj = input as Record<string, unknown>;
  const errors: string[] = [];

  const version = validateVersion(obj["version"]);
  if (!version.ok) errors.push(...version.errors);

  const checks = validateChecksConfig(obj["checks"]);
  if (!checks.ok) errors.push(...checks.errors);

  // Validate branches
  const branches: BranchOverride[] = [];
  if (obj["branches"] !== undefined) {
    if (!Array.isArray(obj["branches"])) {
      errors.push("branches must be an array");
    } else {
      const arr = obj["branches"] as unknown[];
      for (let i = 0; i < arr.length; i++) {
        const result = validateBranchOverride(arr[i]);
        if (result.ok) {
          branches.push(result.value);
        } else {
          errors.push(`branches[${i}]: ${result.errors.join("; ")}`);
        }
      }
    }
  }

  // Validate environments
  const environments: EnvironmentOverride[] = [];
  if (obj["environments"] !== undefined) {
    if (!Array.isArray(obj["environments"])) {
      errors.push("environments must be an array");
    } else {
      const arr = obj["environments"] as unknown[];
      for (let i = 0; i < arr.length; i++) {
        const result = validateEnvironmentOverride(arr[i]);
        if (result.ok) {
          environments.push(result.value);
        } else {
          errors.push(`environments[${i}]: ${result.errors.join("; ")}`);
        }
      }
    }
  }

  const exclude = validateGlobPatterns(obj["exclude"], "exclude");
  if (!exclude.ok) errors.push(...exclude.errors);

  if (errors.length > 0) return fail(...errors);

  // Build result — only include fields that were present in the input.
  // We use non-null assertions because validation passed (all errors
  // would have been caught above).
  const result: Record<string, unknown> = {};
  if (obj["version"] !== undefined) result["version"] = version.value!;
  if (obj["checks"] !== undefined) result["checks"] = checks.value!;
  if (obj["branches"] !== undefined) result["branches"] = branches;
  if (obj["environments"] !== undefined) result["environments"] = environments;
  if (obj["exclude"] !== undefined) result["exclude"] = exclude.value!;
  return ok(result as ZenConfig);
}
