/**
 * Check runner — orchestrates all quality checks and aggregates results.
 *
 * @module checks/runner
 */

import type { CheckContext, CheckFunction, CheckResult, CheckStatus } from "../types.js";

/** Aggregated result from running multiple checks */
export interface RunnerResult {
  readonly overallStatus: CheckStatus;
  readonly checkResults: readonly CheckResult[];
  readonly totalChecks: number;
  readonly passed: number;
  readonly failed: number;
  readonly errors: number;
  readonly metrics: Readonly<Record<string, number>>;
}

/**
 * Run a set of checks against the given context.
 *
 * Each check runs independently and failures/errors in one check do
 * not prevent others from running.
 *
 * @param context — Check context with repo config
 * @param checks — Array of check functions to run
 * @returns Aggregated runner result
 */
export async function runChecks(
  context: CheckContext,
  checks: readonly CheckFunction[],
): Promise<RunnerResult> {
  if (checks.length === 0) {
    return {
      overallStatus: "pass",
      checkResults: [],
      totalChecks: 0,
      passed: 0,
      failed: 0,
      errors: 0,
      metrics: {},
    };
  }

  const results = await Promise.allSettled(checks.map((check) => check(context)));

  const checkResults: CheckResult[] = [];
  let passed = 0;
  let failed = 0;
  let errors = 0;

  for (const result of results) {
    if (result.status === "fulfilled") {
      const cr = result.value;
      checkResults.push(cr);
      if (cr.status === "pass") {
        passed++;
      } else if (cr.status === "fail") {
        failed++;
      } else {
        errors++;
      }
    } else {
      // Check threw an unexpected error
      const errorMessage = result.reason?.message ?? "Unknown error";
      checkResults.push({
        checkName: "unknown",
        status: "error",
        summary: `Check threw an unhandled error: ${errorMessage}`,
        details: [errorMessage],
        annotations: [],
        metrics: {},
      });
      errors++;
    }
  }

  // Aggregate all metrics
  const metrics: Record<string, number> = {};
  for (const cr of checkResults) {
    for (const [key, value] of Object.entries(cr.metrics)) {
      metrics[key] = value;
    }
  }

  // Overall status: error if any error, fail if any fail, pass otherwise
  let overallStatus: CheckStatus = "pass";
  if (errors > 0) {
    overallStatus = "error";
  } else if (failed > 0) {
    overallStatus = "fail";
  }

  return {
    overallStatus,
    checkResults,
    totalChecks: checks.length,
    passed,
    failed,
    errors,
    metrics,
  };
}

/**
 * Default set of checks to run.
 *
 * @param context — Check context
 * @returns Runner result from all default checks
 */
export async function runDefaultChecks(context: CheckContext): Promise<RunnerResult> {
  const { coverageCheck } = await import("../coverage/coverage-check.js");
  const { lintCheck } = await import("../lint/lint-check.js");
  const { complexityCheck } = await import("../complexity/complexity-check.js");

  return runChecks(context, [coverageCheck, lintCheck, complexityCheck]);
}
