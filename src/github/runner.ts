/**
 * Quality check runner — orchestrates check execution, Check Run reporting,
 * and PR comment posting.
 *
 * This is the main integration point between the quality check system and the
 * GitHub API. It:
 *
 * 1. Runs all configured checks (coverage, lint, complexity)
 * 2. Creates/updates a GitHub Check Run with results and annotations
 * 3. Posts or updates a PR comment with a formatted quality summary
 *
 * @module
 */

import type { CheckResult, CheckStatus } from "../checks/types.js";
import { reportCheckRun, buildCheckOutput } from "./checks.js";
import { upsertZenComment, formatQualityReport } from "./comments.js";
import type {
  AnnotationLevel,
  CheckAnnotation as GitHubCheckAnnotation,
  CheckRunConclusion,
  PullRequestEvent,
} from "./types.js";

// ─── Run ─────────────────────────────────────────────────────────────────────

/** A function that performs a quality check and returns a result. */
export type CheckRunner = () => Promise<CheckResult>;

/** Options for running and reporting checks. */
export interface RunOptions {
  /** Name for the check run (e.g. "zen/quality"). */
  readonly checkRunName: string;
  /** PR event context from the webhook payload. */
  readonly event: PullRequestEvent;
  /** Installation access token for API calls. */
  readonly token: string;
}

/**
 * Run all quality checks and report results to GitHub.
 *
 * Creates a Check Run, runs each check function, updates the Check Run with
 * annotations and output, and posts a PR comment with a quality summary.
 *
 * @param runners - Array of check runner functions to execute
 * @param options - Run options (check run name, event context, token)
 * @returns The aggregate conclusion
 */
export async function runAndReport(
  runners: readonly CheckRunner[],
  options: RunOptions,
): Promise<CheckRunConclusion> {
  const { checkRunName, event, token } = options;

  // 1. Create the check run in "in_progress" state
  const checkRun = await reportCheckRun(
    {
      owner: event.owner,
      repo: event.repo,
      name: checkRunName,
      headSha: event.headSha,
      status: "in_progress",
      startedAt: new Date().toISOString(),
    },
    token,
  );

  // 2. Run all checks in parallel
  const results = await Promise.allSettled(runners.map((r) => r()));

  // 3. Process results into annotations and aggregate conclusion
  const successfulResults: CheckResult[] = [];
  const errors: string[] = [];

  for (const result of results) {
    if (result.status === "fulfilled") {
      successfulResults.push(result.value);
    } else {
      errors.push(result.reason?.message ?? String(result.reason));
    }
  }

  // 4. Build check output
  const { conclusion, annotations, summary, detailText } =
    buildAggregateOutput(successfulResults, errors);

  // 5. Update the check run with results
  const output = buildCheckOutput(
    `${checkRunName} — ${conclusionToLabel(conclusion)}`,
    summary,
    annotations,
    detailText,
  );

  await reportCheckRun(
    {
      owner: event.owner,
      repo: event.repo,
      name: checkRunName,
      headSha: event.headSha,
      status: "completed",
      conclusion,
      completedAt: new Date().toISOString(),
      output,
    },
    token,
  );

  // 6. Post/update the PR quality report comment
  await upsertZenComment(
    {
      owner: event.owner,
      repo: event.repo,
      issueNumber: event.issueNumber,
      body: formatQualityReport({
        repo: `${event.owner}/${event.repo}`,
        prNumber: event.issueNumber,
        headSha: event.headSha,
        overallStatus: aggregateOverallStatus(successfulResults, errors),
        checks: aggregateCheckSummaries(successfulResults, errors),
      }),
    },
    token,
  );

  return conclusion;
}

// ─── Aggregation ─────────────────────────────────────────────────────────────

function buildAggregateOutput(
  results: readonly CheckResult[],
  errors: readonly string[],
): {
  conclusion: CheckRunConclusion;
  annotations: readonly GitHubCheckAnnotation[];
  summary: string;
  detailText: string;
} {
  const annotations: GitHubCheckAnnotation[] = [];
  const details: string[] = [];
  let hasFailure = false;
  let hasError = false;

  for (const result of results) {
    // Map check annotations to GitHub annotations
    for (const ann of result.annotations) {
      annotations.push({
        path: ann.path,
        startLine: ann.startLine,
        endLine: ann.endLine,
        annotationLevel: mapSeverity(ann.severity),
        message: ann.message,
        title: ann.title,
      });
    }

    details.push(`## ${result.checkName}: ${result.status}`);
    details.push(result.summary);
    details.push("");

    if (result.details.length > 0) {
      details.push(...result.details.map((d) => `- ${d}`));
      details.push("");
    }

    if (result.status === "fail") hasFailure = true;
    if (result.status === "error") hasError = true;
  }

  if (errors.length > 0) {
    details.push("## Check Runner Errors");
    for (const err of errors) {
      details.push(`- ${err}`);
    }
    hasError = true;
  }

  const conclusion: CheckRunConclusion =
    hasError ? "action_required"
      : hasFailure ? "failure"
      : "success";

  const summary = buildSummaryLine(results, errors);

  return {
    conclusion,
    annotations,
    summary,
    detailText: details.join("\n"),
  };
}

function buildSummaryLine(
  results: readonly CheckResult[],
  errors: readonly string[],
): string {
  const passed = results.filter((r) => r.status === "pass").length;
  const failed = results.filter((r) => r.status === "fail").length;
  const checkErrors = results.filter((r) => r.status === "error").length;
  const totalErrors = checkErrors + errors.length;

  const parts: string[] = [];
  if (passed > 0) parts.push(`${passed} passed`);
  if (failed > 0) parts.push(`${failed} failed`);
  if (totalErrors > 0) parts.push(`${totalErrors} error(s)`);

  return parts.length > 0
    ? `Checks: ${parts.join(", ")}.`
    : "No checks were run.";
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function mapSeverity(severity: "error" | "warning" | "info"): AnnotationLevel {
  switch (severity) {
    case "error":
      return "failure";
    case "warning":
      return "warning";
    case "info":
      return "notice";
  }
}

function conclusionToLabel(conclusion: CheckRunConclusion): string {
  switch (conclusion) {
    case "success":
      return "All checks passed";
    case "failure":
      return "Some checks failed";
    case "action_required":
      return "Errors encountered";
    case "neutral":
      return "No conclusion";
    case "cancelled":
      return "Cancelled";
    case "timed_out":
      return "Timed out";
  }
}

function aggregateOverallStatus(
  results: readonly CheckResult[],
  errors: readonly string[],
): "passed" | "failed" | "partial" {
  if (errors.length > 0) return "partial";
  const hasFail = results.some((r) => r.status === "fail");
  const hasPass = results.some((r) => r.status === "pass");
  if (hasFail) return "failed";
  if (hasPass) return "passed";
  return "partial";
}

function aggregateCheckSummaries(
  results: readonly CheckResult[],
  errors: readonly string[],
): Array<{ name: string; status: "passed" | "failed" | "skipped"; details: string }> {
  const summaries: Array<{
    name: string;
    status: "passed" | "failed" | "skipped";
    details: string;
  }> = [];

  for (const result of results) {
    summaries.push({
      name: result.checkName,
      status: result.status === "pass" ? "passed" : "failed",
      details: result.summary,
    });
  }

  for (const err of errors) {
    summaries.push({
      name: "runner",
      status: "skipped",
      details: err,
    });
  }

  return summaries;
}
