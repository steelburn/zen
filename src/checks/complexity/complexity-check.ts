/**
 * Complexity check — detects functions whose cyclomatic complexity exceeds
 * the configured threshold, and compares complexity between base and head
 * branches to identify regressions.
 *
 * @module checks/complexity
 */

import type {
  CheckAnnotation,
  CheckContext,
  CheckResult,
  ComplexityReport,
  FunctionComplexity,
} from "../types.js";

/** Options for the complexity check */
export interface ComplexityCheckOptions {
  /** Maximum allowed cyclomatic complexity per function. Default: 10 */
  readonly maxComplexity: number;
  readonly include?: readonly string[];
  readonly exclude?: readonly string[];
}

/** Default options used when config is not fully specified. */
export const DEFAULT_COMPLEXITY_OPTIONS: ComplexityCheckOptions = {
  maxComplexity: 10,
} as const;

/**
 * Create a unique key for a function (used for comparison across branches).
 */
function functionKey(fn: FunctionComplexity): string {
  return `${fn.filePath}:${fn.functionName}`;
}

/**
 * Parse a raw complexity report into a normalized ComplexityReport.
 *
 * Expected input format (one function per line):
 * ```
 * filePath:functionName:startLine:endLine:complexity
 * ```
 *
 * Lines starting with `#` are treated as comments and ignored.
 * Empty lines are also ignored.
 *
 * @param raw — Raw string with one function per line
 * @returns Normalized ComplexityReport
 */
export function parseComplexityReport(raw: string): ComplexityReport {
  const lines = raw.split("\n").filter((l) => {
    const trimmed = l.trim();
    return trimmed.length > 0 && !trimmed.startsWith("#");
  });

  const functions: FunctionComplexity[] = [];
  let maxComplexity = 0;

  for (const line of lines) {
    const trimmed = line.trim();
    // Format: filePath:functionName:startLine:endLine:complexity
    const match = trimmed.match(/^(.+):([^:]+):(\d+):(\d+):(\d+)$/);
    if (!match) {
      continue;
    }

    const filePath = match[1]!;
    const functionName = match[2]!;
    const startLine = parseInt(match[3]!, 10);
    const endLine = parseInt(match[4]!, 10);
    const complexity = parseInt(match[5]!, 10);

    if (startLine < 1 || endLine < 1 || complexity < 0) {
      // Invalid data — skip
      continue;
    }

    const fn: FunctionComplexity = {
      filePath,
      functionName,
      startLine,
      endLine,
      complexity,
    };

    functions.push(fn);

    if (complexity > maxComplexity) {
      maxComplexity = complexity;
    }
  }

  // thresholdBreaches is computed by compareComplexity using the configured threshold.
  // At parse time we don't know the threshold, so we report 0 here.
  return {
    functions,
    maxComplexity,
    thresholdBreaches: 0,
  };
}

/**
 * Compare two complexity reports (base vs. head) and identify new or
 * worsened functions that exceed the complexity threshold.
 *
 * @param baseReport — Complexity report from the base branch
 * @param headReport — Complexity report from the head branch
 * @param options — Check configuration
 * @returns CheckResult with annotations for offending functions
 */
export function compareComplexity(
  baseReport: ComplexityReport,
  headReport: ComplexityReport,
  options: ComplexityCheckOptions,
): CheckResult {
  const annotations: CheckAnnotation[] = [];
  const details: string[] = [];

  // Build a lookup of base functions by key
  const baseFunctions = new Map<string, FunctionComplexity>();
  for (const fn of baseReport.functions) {
    baseFunctions.set(functionKey(fn), fn);
  }

  // Build a lookup of head functions by key
  const headFunctions = new Map<string, FunctionComplexity>();
  for (const fn of headReport.functions) {
    headFunctions.set(functionKey(fn), fn);
  }

  const newViolations: FunctionComplexity[] = [];
  const worsenedFunctions: FunctionComplexity[] = [];
  const improvedFunctions: FunctionComplexity[] = [];
  const unchangedAboveThreshold: FunctionComplexity[] = [];

  for (const headFn of headReport.functions) {
    const key = functionKey(headFn);
    const baseFn = baseFunctions.get(key);

    if (!baseFn) {
      // New function — check if complexity exceeds threshold
      if (headFn.complexity > options.maxComplexity) {
        newViolations.push(headFn);
      }
    } else {
      // Existing function — check if complexity increased
      const delta = headFn.complexity - baseFn.complexity;
      if (delta > 0 && headFn.complexity > options.maxComplexity) {
        worsenedFunctions.push(headFn);
      } else if (delta < 0 && headFn.complexity <= options.maxComplexity) {
        improvedFunctions.push(headFn);
      } else if (headFn.complexity > options.maxComplexity) {
        unchangedAboveThreshold.push(headFn);
      }
    }
  }

  // Create annotations for new violations
  for (const fn of newViolations) {
    annotations.push({
      path: fn.filePath,
      startLine: fn.startLine,
      endLine: fn.endLine,
      severity: "error",
      message: `New function "${fn.functionName}" has cyclomatic complexity of ${fn.complexity} (max allowed: ${options.maxComplexity})`,
      title: "Complexity violation (new function)",
    });
    details.push(
      `${fn.filePath}:${fn.startLine}: New function "${fn.functionName}" complexity ${fn.complexity} exceeds threshold ${options.maxComplexity}`,
    );
  }

  // Create annotations for worsened functions
  for (const fn of worsenedFunctions) {
    const baseFn = baseFunctions.get(functionKey(fn));
    const delta = fn.complexity - (baseFn?.complexity ?? 0);
    annotations.push({
      path: fn.filePath,
      startLine: fn.startLine,
      endLine: fn.endLine,
      severity: "error",
      message: `Function "${fn.functionName}" complexity increased by ${delta} to ${fn.complexity} (max allowed: ${options.maxComplexity})`,
      title: "Complexity regression",
    });
    details.push(
      `${fn.filePath}:${fn.startLine}: Function "${fn.functionName}" complexity increased by ${delta} to ${fn.complexity} (threshold: ${options.maxComplexity})`,
    );
  }

  // Report improved functions (info only)
  for (const fn of improvedFunctions) {
    const baseFn = baseFunctions.get(functionKey(fn));
    const delta = (baseFn?.complexity ?? 0) - fn.complexity;
    details.push(
      `${fn.filePath}:${fn.startLine}: Function "${fn.functionName}" complexity improved by ${delta} to ${fn.complexity}`,
    );
  }

  // Report unchanged functions still above threshold (info only)
  for (const fn of unchangedAboveThreshold) {
    details.push(
      `${fn.filePath}:${fn.startLine}: Function "${fn.functionName}" remains at complexity ${fn.complexity} (above threshold ${options.maxComplexity})`,
    );
  }

  const hasViolations = newViolations.length > 0 || worsenedFunctions.length > 0;
  const status = hasViolations ? "fail" : "pass";

  const summaryParts: string[] = [];
  if (newViolations.length > 0) {
    summaryParts.push(
      `${newViolations.length} new function${newViolations.length !== 1 ? "s" : ""} exceed${newViolations.length === 1 ? "s" : ""} threshold`,
    );
  }
  if (worsenedFunctions.length > 0) {
    summaryParts.push(
      `${worsenedFunctions.length} function${worsenedFunctions.length !== 1 ? "s" : ""} regressed`,
    );
  }
  if (improvedFunctions.length > 0) {
    summaryParts.push(
      `${improvedFunctions.length} function${improvedFunctions.length !== 1 ? "s" : ""} improved`,
    );
  }
  if (summaryParts.length === 0) {
    summaryParts.push("All functions within complexity threshold");
  }
  summaryParts.push(`(max allowed: ${options.maxComplexity})`);

  const metrics: Record<string, number> = {
    headFunctions: headReport.functions.length,
    baseFunctions: baseReport.functions.length,
    newViolations: newViolations.length,
    worsenedFunctions: worsenedFunctions.length,
    improvedFunctions: improvedFunctions.length,
    unchangedAboveThreshold: unchangedAboveThreshold.length,
    totalViolations: newViolations.length + worsenedFunctions.length,
    maxComplexitySeen: headReport.maxComplexity,
    maxAllowedComplexity: options.maxComplexity,
  };

  return {
    checkName: "complexity",
    status,
    summary:
      status === "pass"
        ? `Complexity: ${summaryParts.join("; ")}`
        : `Complexity: ${newViolations.length + worsenedFunctions.length} violation${newViolations.length + worsenedFunctions.length !== 1 ? "s" : ""} (threshold: ${options.maxComplexity})`,
    details,
    annotations,
    metrics,
  };
}

/**
 * Run the complexity check against a repository context.
 *
 * @param context — Check context with repo path and config
 * @returns CheckResult with complexity findings
 */
export async function complexityCheck(context: CheckContext): Promise<CheckResult> {
  const _options: ComplexityCheckOptions = {
    maxComplexity:
      context.config.complexity?.maxComplexity ?? DEFAULT_COMPLEXITY_OPTIONS.maxComplexity,
    include: context.config.complexity?.include,
    exclude: context.config.complexity?.exclude,
  };

  // In real usage, this would run a complexity analysis tool against the repo.
  // For now, return a placeholder error until the CI integration is built.
  return {
    checkName: "complexity",
    status: "error",
    summary: "Complexity check runner not yet implemented",
    details: [
      "The complexity check requires a code analysis tool (e.g., eslint complexity rule, plato, or custom AST walking) to be installed and configured.",
      "See docs/runbooks/complexity-check.md for setup instructions.",
    ],
    annotations: [],
    metrics: {},
  };
}
