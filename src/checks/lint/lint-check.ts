/**
 * Lint check — compares lint errors between base and head branches.
 *
 * Fails if the number of net new lint errors exceeds the configured threshold.
 *
 * @module checks/lint
 */

import type {
  CheckAnnotation,
  CheckContext,
  CheckResult,
  LintError,
  LintReport,
} from "../types.js";

/** Options for the lint check */
export interface LintCheckOptions {
  /** Maximum allowed new lint errors. Default: 0 */
  readonly maxNewErrors: number;
  readonly include?: readonly string[];
  readonly exclude?: readonly string[];
}

/** Default options used when config is not fully specified */
export const DEFAULT_LINT_OPTIONS: LintCheckOptions = {
  maxNewErrors: 0,
} as const;

/**
 * Create a unique key for a lint error (used for deduplication).
 */
function errorKey(error: LintError): string {
  return `${error.filePath}:${error.line}:${error.column}:${error.ruleId}`;
}

/**
 * Parse ESLint JSON output into a normalized LintReport.
 *
 * Expected input format:
 * ```json
 * [
 *   {
 *     "filePath": "src/index.ts",
 *     "messages": [
 *       { "line": 1, "column": 1, "severity": 2, "ruleId": "no-unused-vars", "message": "..." }
 *     ]
 *   }
 * ]
 * ```
 *
 * @param raw — Raw JSON string from ESLint
 * @returns Normalized LintReport
 */
export function parseLintReport(raw: string): LintReport {
  const errors: LintError[] = [];

  try {
    const parsed = JSON.parse(raw);

    if (!Array.isArray(parsed)) {
      return { errors: [], totalErrorCount: 0 };
    }

    for (const file of parsed) {
      if (!file?.filePath || !Array.isArray(file.messages)) {
        continue;
      }

      for (const msg of file.messages) {
        // severity 2 = error, severity 1 = warning
        if (msg.severity !== 1 && msg.severity !== 2) {
          continue;
        }

        errors.push({
          filePath: file.filePath,
          line: msg.line ?? 0,
          column: msg.column ?? 0,
          severity: msg.severity === 2 ? "error" : "warning",
          ruleId: msg.ruleId ?? "unknown",
          message: msg.message ?? "No message",
        });
      }
    }
  } catch {
    // Invalid JSON — return empty report
    return { errors: [], totalErrorCount: 0 };
  }

  return { errors, totalErrorCount: errors.length };
}

/**
 * Compare two lint reports (base vs. head) and identify new errors
 * introduced in the head branch.
 *
 * @param baseReport — Lint report from the base branch
 * @param baseOptions — Options for deduplication / exclusion (unused currently, reserved)
 * @param headReport — Lint report from the head branch
 * @param options — Check configuration
 * @returns CheckResult with annotations for new errors
 */
export function compareLint(
  baseReport: LintReport,
  _baseOptions: unknown,
  headReport: LintReport,
  options: LintCheckOptions,
): CheckResult {
  const baseErrorKeys = new Set(baseReport.errors.map(errorKey));
  const annotations: CheckAnnotation[] = [];
  const details: string[] = [];

  // Find new errors in head that don't exist in base
  const newErrors: LintError[] = [];
  const fixedErrors: LintError[] = [];
  const headErrorKeys = new Set<string>();
  const seenNewKeys = new Set<string>();

  for (const error of headReport.errors) {
    const key = errorKey(error);
    headErrorKeys.add(key);
    if (!baseErrorKeys.has(key) && !seenNewKeys.has(key)) {
      seenNewKeys.add(key);
      newErrors.push(error);
    }
  }

  // Find fixed errors (in base but not in head)
  for (const error of baseReport.errors) {
    const key = errorKey(error);
    if (!headErrorKeys.has(key)) {
      fixedErrors.push(error);
    }
  }

  // Create annotations for new errors
  for (const error of newErrors) {
    annotations.push({
      path: error.filePath,
      startLine: error.line,
      endLine: error.line,
      severity: error.severity,
      message: `[${error.ruleId}] ${error.message}`,
      title: "New lint error",
    });
    details.push(
      `${error.filePath}:${error.line}:${error.column} — ${error.ruleId}: ${error.message}`,
    );
  }

  // Deduplicate annotations by key (if same error appears with slightly different messages)
  const seenKeys = new Set<string>();
  const uniqueAnnotations: CheckAnnotation[] = [];
  for (const ann of annotations) {
    const key = `${ann.path}:${ann.startLine}:${ann.endLine}:${ann.title}`;
    if (!seenKeys.has(key)) {
      seenKeys.add(key);
      uniqueAnnotations.push(ann);
    }
  }

  const netNewErrors = newErrors.length - fixedErrors.length;
  const passed = netNewErrors <= options.maxNewErrors;

  const status = passed ? "pass" : "fail";

  const summaryParts: string[] = [];
  if (newErrors.length > 0) {
    summaryParts.push(`${newErrors.length} new error${newErrors.length !== 1 ? "s" : ""}`);
  }
  if (fixedErrors.length > 0) {
    summaryParts.push(`${fixedErrors.length} fixed error${fixedErrors.length !== 1 ? "s" : ""}`);
  }
  if (summaryParts.length === 0) {
    summaryParts.push("No new lint errors");
  }
  summaryParts.push(`(threshold: ${options.maxNewErrors})`);

  const metrics: Record<string, number> = {
    baseErrors: baseReport.totalErrorCount,
    headErrors: headReport.totalErrorCount,
    newErrors: newErrors.length,
    fixedErrors: fixedErrors.length,
    netNewErrors,
    maxNewErrors: options.maxNewErrors,
  };

  return {
    checkName: "lint",
    status,
    summary: passed
      ? `Lint: ${summaryParts.join("; ")}`
      : `Lint: ${netNewErrors} new error${netNewErrors !== 1 ? "s" : ""} exceeds threshold of ${options.maxNewErrors}`,
    details,
    annotations: uniqueAnnotations,
    metrics,
  };
}

/**
 * Run the lint check against a repository context.
 *
 * @param context — Check context with repo path and config
 * @returns CheckResult with lint findings
 */
export async function lintCheck(context: CheckContext): Promise<CheckResult> {
  const _options: LintCheckOptions = {
    maxNewErrors: context.config.lint?.maxNewErrors ?? DEFAULT_LINT_OPTIONS.maxNewErrors,
    include: context.config.lint?.include,
    exclude: context.config.lint?.exclude,
  };

  // Placeholder until real ESLint integration is built
  return {
    checkName: "lint",
    status: "error",
    summary: "Lint check runner not yet implemented",
    details: [
      "The lint check requires ESLint to be installed and configured in the target repository.",
      "See docs/runbooks/lint-check.md for setup instructions.",
    ],
    annotations: [],
    metrics: {},
  };
}
