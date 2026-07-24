/**
 * Pull Request comment operations.
 *
 * Posts detailed quality reports as PR comments with a summary table.
 * On re-checks, finds and updates the previous ZEN comment instead of
 * creating a new one (keeps the PR conversation clean).
 *
 * @module
 */

import { githubRequest } from "./client.js";
import type { CreateCommentParams, PullRequestComment, UpdateCommentParams } from "./types.js";

// ─── Constants ───────────────────────────────────────────────────────────────

/** Marker used to identify ZEN's own comments for update-in-place. */
const ZEN_COMMENT_MARKER = "<!-- zen-quality-report -->";

// ─── Errors ──────────────────────────────────────────────────────────────────

/** Thrown when a PR comment operation fails. */
export class CommentError extends Error {
  public override readonly name = "CommentError";

  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
  }
}

// ─── Create ──────────────────────────────────────────────────────────────────

/**
 * Post a new comment on a pull request.
 *
 * @param params - Comment creation parameters
 * @param token - GitHub installation access token
 * @returns The created comment
 */
export async function createComment(
  params: CreateCommentParams,
  token: string,
): Promise<PullRequestComment> {
  const { owner, repo, issueNumber, body } = params;

  try {
    return await githubRequest<PullRequestComment>(
      `/repos/${owner}/${repo}/issues/${issueNumber}/comments`,
      {
        method: "POST",
        body: { body },
        token,
      },
    );
  } catch (cause) {
    throw new CommentError(
      `Failed to create comment on #${issueNumber}: ${(cause as Error).message}`,
      { cause },
    );
  }
}

// ─── Update ──────────────────────────────────────────────────────────────────

/**
 * Update an existing PR comment by ID.
 *
 * @param params - Comment update parameters
 * @param token - GitHub installation access token
 * @returns The updated comment
 */
export async function updateComment(
  params: UpdateCommentParams,
  token: string,
): Promise<PullRequestComment> {
  const { owner, repo, commentId, body } = params;

  try {
    return await githubRequest<PullRequestComment>(
      `/repos/${owner}/${repo}/issues/comments/${commentId}`,
      {
        method: "PATCH",
        body: { body },
        token,
      },
    );
  } catch (cause) {
    throw new CommentError(`Failed to update comment #${commentId}: ${(cause as Error).message}`, {
      cause,
    });
  }
}

// ─── List / find ─────────────────────────────────────────────────────────────

/**
 * List all comments on a pull request (issue comments — not review comments).
 *
 * @param owner - Repository owner
 * @param repo - Repository name
 * @param issueNumber - PR number
 * @param token - GitHub installation access token
 * @returns Array of comments
 */
export async function listComments(
  owner: string,
  repo: string,
  issueNumber: number,
  token: string,
): Promise<readonly PullRequestComment[]> {
  return githubRequest<readonly PullRequestComment[]>(
    `/repos/${owner}/${repo}/issues/${issueNumber}/comments`,
    { token },
  );
}

/**
 * Find ZEN's existing quality report comment on a PR, if one exists.
 *
 * Uses a hidden HTML marker comment to identify the bot's own comments
 * (instead of relying on the author name, which can be impersonated or change
 * across installations).
 *
 * @param owner - Repository owner
 * @param repo - Repository name
 * @param issueNumber - PR number
 * @param token - GitHub installation access token
 * @returns The existing ZEN comment, or `undefined` if none found
 */
export async function findZenComment(
  owner: string,
  repo: string,
  issueNumber: number,
  token: string,
): Promise<PullRequestComment | undefined> {
  const comments = await listComments(owner, repo, issueNumber, token);
  return comments.find((c) => c.body.includes(ZEN_COMMENT_MARKER));
}

// ─── Upsert (create or update) ───────────────────────────────────────────────

/**
 * Post or update the ZEN quality report comment on a PR.
 *
 * If a previous ZEN comment exists, it is updated in-place. Otherwise a new
 * comment is created. The marker comment is appended to the body so subsequent
 * calls can find it.
 *
 * @param params - Comment parameters (the body is the quality report content)
 * @param token - GitHub installation access token
 * @returns The posted/updated comment
 */
export async function upsertZenComment(
  params: CreateCommentParams,
  token: string,
): Promise<PullRequestComment> {
  const { owner, repo, issueNumber, body } = params;

  const existing = await findZenComment(owner, repo, issueNumber, token);

  const bodyWithMarker = `${body}\n\n${ZEN_COMMENT_MARKER}`;

  if (existing) {
    return updateComment({ owner, repo, commentId: existing.id, body: bodyWithMarker }, token);
  }

  return createComment({ owner, repo, issueNumber, body: bodyWithMarker }, token);
}

// ─── Report formatting ───────────────────────────────────────────────────────

/** Summary of a single quality check result. */
export interface CheckSummary {
  readonly name: string;
  readonly status: "passed" | "failed" | "skipped";
  readonly details: string;
}

/** Data for building the quality report comment body. */
export interface QualityReportData {
  readonly repo: string;
  readonly prNumber: number;
  readonly headSha: string;
  readonly checks: readonly CheckSummary[];
  readonly coverageDelta?: number;
  readonly overallStatus: "passed" | "failed" | "partial";
}

/**
 * Build a formatted Markdown quality report body.
 *
 * Creates a clean summary table with check results, coverage delta, and
 * guidance on how to fix failures.
 *
 * @param data - Quality report data
 * @returns Markdown string suitable for a PR comment
 */
export function formatQualityReport(data: QualityReportData): string {
  const statusEmoji = {
    passed: "✅",
    failed: "❌",
    skipped: "⏭️",
  } as const;

  const overallEmoji = {
    passed: "✅",
    failed: "❌",
    partial: "⚠️",
  } as const;

  const lines: string[] = [
    `## ${overallEmoji[data.overallStatus]} ZEN Quality Report`,
    "",
    `**Repository:** ${data.repo} · **PR:** #${data.prNumber} · **Commit:** \`${data.headSha.slice(0, 7)}\``,
    "",
    "### Check Results",
    "",
    "| Check | Status | Details |",
    "|-------|--------|---------|",
  ];

  for (const check of data.checks) {
    lines.push(
      `| ${check.name} | ${statusEmoji[check.status]} ${check.status} | ${check.details} |`,
    );
  }

  if (data.coverageDelta !== undefined) {
    const deltaSign = data.coverageDelta >= 0 ? "+" : "";
    lines.push("", `**Coverage delta:** ${deltaSign}${data.coverageDelta.toFixed(2)}%`);
  }

  const failed = data.checks.filter((c) => c.status === "failed");
  if (failed.length > 0) {
    lines.push("", "### 🔧 How to Fix", "", `The following checks failed:`, "");
    for (const check of failed) {
      lines.push(`- **${check.name}** — ${check.details}`);
    }
    lines.push(
      "",
      "Run the checks locally to reproduce:",
      "",
      "```bash",
      "npm run ci",
      "```",
      "",
      "Need help? Check the [docs](https://zen.dev/docs) for more details.",
    );
  }

  if (data.overallStatus === "passed") {
    lines.push("", "All quality checks passed! The codebase quality is maintained. 🎉");
  }

  lines.push("", "---", "", "<sup>🤖 Generated by [ZEN](https://zen.dev) — Quality Gate</sup>");

  return lines.join("\n");
}
