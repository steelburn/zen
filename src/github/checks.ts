/**
 * GitHub Check Run API operations.
 *
 * Check Runs are the primary mechanism for reporting quality check results
 * directly in the GitHub PR UI. This module supports creating, updating, and
 * annotating check runs.
 *
 * @module
 */

import { githubRequest } from "./client.js";
import type {
  CheckAnnotation,
  CheckRun,
  CheckRunConclusion,
  CheckRunOutput,
  CheckRunStatus,
  CreateCheckRunParams,
  UpdateCheckRunParams,
} from "./types.js";

// ─── Errors ──────────────────────────────────────────────────────────────────

/** Thrown when a check run operation fails. */
export class CheckRunError extends Error {
  public override readonly name = "CheckRunError";

  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
  }
}

// ─── Create ──────────────────────────────────────────────────────────────────

/**
 * Create a new check run on a commit.
 *
 * Typically called with `status: "in_progress"` when a quality check starts,
 * then updated with a conclusion when it finishes.
 *
 * @param params - Check run creation parameters
 * @param token - GitHub installation access token
 * @returns The created check run
 * @throws {CheckRunError} If creation fails
 *
 * @example
 * ```ts
 * const check = await createCheckRun({
 *   owner: "my-org",
 *   repo: "my-repo",
 *   name: "zen/quality",
 *   headSha: "abc123",
 *   status: "in_progress",
 * }, token);
 * ```
 */
export async function createCheckRun(
  params: CreateCheckRunParams,
  token: string,
): Promise<CheckRun> {
  const { owner, repo, ...rest } = params;

  const body: Record<string, unknown> = {
    name: rest.name,
    head_sha: rest.headSha,
    status: rest.status ?? "queued",
  };

  if (rest.detailsUrl) body.details_url = rest.detailsUrl;
  if (rest.externalId) body.external_id = rest.externalId;
  if (rest.startedAt) body.started_at = rest.startedAt;
  if (rest.actions) body.actions = rest.actions;
  if (rest.output) body.output = serializeOutput(rest.output);

  try {
    return await githubRequest<CheckRun>(
      `/repos/${owner}/${repo}/check-runs`,
      { method: "POST", body, token },
    );
  } catch (cause) {
    throw new CheckRunError(
      `Failed to create check run "${rest.name}": ${(cause as Error).message}`,
      { cause },
    );
  }
}

// ─── Update ──────────────────────────────────────────────────────────────────

/**
 * Update an existing check run — typically to mark it as completed with a
 * conclusion and attach the quality report output.
 *
 * @param params - Check run update parameters
 * @param token - GitHub installation access token
 * @returns The updated check run
 * @throws {CheckRunError} If update fails
 *
 * @example
 * ```ts
 * await updateCheckRun({
 *   owner: "my-org",
 *   repo: "my-repo",
 *   checkRunId: 12345,
 *   status: "completed",
 *   conclusion: "success",
 *   output: {
 *     title: "ZEN Quality Check",
 *     summary: "All checks passed",
 *     annotations: [...],
 *   },
 * }, token);
 * ```
 */
export async function updateCheckRun(
  params: UpdateCheckRunParams,
  token: string,
): Promise<CheckRun> {
  const { owner, repo, checkRunId, ...rest } = params;

  const body: Record<string, unknown> = {};

  if (rest.status) body.status = rest.status;
  if (rest.conclusion) body.conclusion = rest.conclusion;
  if (rest.completedAt) body.completed_at = rest.completedAt;
  if (rest.detailsUrl) body.details_url = rest.detailsUrl;
  if (rest.externalId) body.external_id = rest.externalId;
  if (rest.actions) body.actions = rest.actions;
  if (rest.output) body.output = serializeOutput(rest.output);

  try {
    return await githubRequest<CheckRun>(
      `/repos/${owner}/${repo}/check-runs/${checkRunId}`,
      { method: "PATCH", body, token },
    );
  } catch (cause) {
    throw new CheckRunError(
      `Failed to update check run #${checkRunId}: ${(cause as Error).message}`,
      { cause },
    );
  }
}

// ─── Get ─────────────────────────────────────────────────────────────────────

/**
 * Retrieve a single check run by ID.
 *
 * @param owner - Repository owner
 * @param repo - Repository name
 * @param checkRunId - Check run ID
 * @param token - GitHub installation access token
 * @returns The check run
 */
export async function getCheckRun(
  owner: string,
  repo: string,
  checkRunId: number,
  token: string,
): Promise<CheckRun> {
  return githubRequest<CheckRun>(
    `/repos/${owner}/${repo}/check-runs/${checkRunId}`,
    { token },
  );
}

// ─── Convenience: full lifecycle ─────────────────────────────────────────────

/**
 * Convenience function to complete a check run with output and annotations.
 *
 * Combines creating the check run and immediately updating it with a completed
 * status. Use this when the quality check result is already known at creation
 * time (e.g., synchronous check runners).
 *
 * @param params - Creation parameters (conclusion and output go in here)
 * @param token - GitHub installation access token
 * @returns The completed check run
 */
export async function reportCheckRun(
  params: CreateCheckRunParams & {
    readonly conclusion: CheckRunConclusion;
    readonly completedAt?: string;
  },
  token: string,
): Promise<CheckRun> {
  const created = await createCheckRun(
    { ...params, status: "in_progress" },
    token,
  );

  return updateCheckRun(
    {
      owner: params.owner,
      repo: params.repo,
      checkRunId: created.id,
      status: "completed",
      conclusion: params.conclusion,
      completedAt: params.completedAt ?? new Date().toISOString(),
      output: params.output,
    },
    token,
  );
}

// ─── Annotations helper ──────────────────────────────────────────────────────

/**
 * Build a check run output from annotations and summary text.
 *
 * Annotations are file-level or line-level messages displayed inline in the PR
 * Files Changed tab. GitHub limits annotations to 50 per check run for the
 * free tier; this function enforces that limit and logs a warning if exceeded.
 *
 * @param title - Check run output title
 * @param summary - Markdown summary shown in the check run overview
 * @param annotations - Line-level annotations
 * @param text - Optional extended markdown text
 * @returns A `CheckRunOutput` ready to pass to `createCheckRun` or `updateCheckRun`
 */
export function buildCheckOutput(
  title: string,
  summary: string,
  annotations: readonly CheckAnnotation[] = [],
  text?: string,
): CheckRunOutput {
  const MAX_ANNOTATIONS = 50;
  const truncated =
    annotations.length > MAX_ANNOTATIONS
      ? annotations.slice(0, MAX_ANNOTATIONS)
      : annotations;

  if (annotations.length > MAX_ANNOTATIONS) {
    console.warn(
      `[zen] Truncated ${annotations.length - MAX_ANNOTATIONS} annotations (max ${MAX_ANNOTATIONS})`,
    );
  }

  return {
    title,
    summary,
    text,
    annotations: truncated,
  };
}

// ─── Serialization ──────────────────────────────────────────────────────────

function serializeOutput(output: CheckRunOutput): Record<string, unknown> {
  const serialized: Record<string, unknown> = {
    title: output.title,
    summary: output.summary,
  };

  if (output.text) serialized.text = output.text;
  if (output.images && output.images.length > 0) serialized.images = output.images;

  if (output.annotations && output.annotations.length > 0) {
    serialized.annotations = output.annotations.map((a) => ({
      path: a.path,
      start_line: a.startLine,
      end_line: a.endLine,
      annotation_level: a.annotationLevel,
      message: a.message,
      title: a.title,
      start_column: a.startColumn,
      end_column: a.endColumn,
    }));
  }

  return serialized;
}
