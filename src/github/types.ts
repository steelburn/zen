/**
 * Type definitions for GitHub API interactions.
 *
 * @module
 */

// ─── Authentication ──────────────────────────────────────────────────────────

/** Configuration for GitHub App authentication. */
export interface GitHubAppConfig {
  /** GitHub App ID (not the slug). */
  readonly appId: string;
  /** Private key in PEM format — contents, not a file path. */
  readonly privateKey: string;
  /** Optional: installation ID if operating as a single installation. */
  readonly installationId?: number;
}

/** A GitHub App installation access token (short-lived). */
export interface InstallationToken {
  readonly token: string;
  readonly expiresAt: string;
  readonly repositorySelection: "all" | "selected";
  readonly permissions: Record<string, string>;
}

// ─── Check Run API ───────────────────────────────────────────────────────────

/** Status of a check run. */
export type CheckRunStatus = "queued" | "in_progress" | "completed";

/** Conclusion of a completed check run. */
export type CheckRunConclusion =
  | "success"
  | "failure"
  | "neutral"
  | "cancelled"
  | "timed_out"
  | "action_required";

/** Annotation level in a check run output. */
export type AnnotationLevel = "notice" | "warning" | "failure";

/** A single annotation attached to a check run. */
export interface CheckAnnotation {
  readonly path: string;
  readonly startLine: number;
  readonly endLine: number;
  readonly annotationLevel: AnnotationLevel;
  readonly message: string;
  readonly title?: string;
  readonly startColumn?: number;
  readonly endColumn?: number;
}

/** Image displayed in the check run output summary. */
export interface CheckRunImage {
  readonly alt: string;
  readonly imageUrl: string;
  readonly caption?: string;
}

/** Output payload for a check run. */
export interface CheckRunOutput {
  readonly title: string;
  readonly summary: string;
  readonly text?: string;
  readonly annotations?: readonly CheckAnnotation[];
  readonly images?: readonly CheckRunImage[];
}

/** Actions a user can take from the check run UI. */
export interface CheckRunAction {
  readonly label: string;
  readonly description: string;
  readonly identifier: string;
}

/** Payload for creating a check run. */
export interface CreateCheckRunParams {
  readonly owner: string;
  readonly repo: string;
  readonly name: string;
  readonly headSha: string;
  readonly status?: CheckRunStatus;
  readonly detailsUrl?: string;
  readonly externalId?: string;
  readonly startedAt?: string;
  readonly output?: CheckRunOutput;
  readonly actions?: readonly CheckRunAction[];
}

/** Payload for updating a check run. */
export interface UpdateCheckRunParams {
  readonly owner: string;
  readonly repo: string;
  readonly checkRunId: number;
  readonly status?: CheckRunStatus;
  readonly conclusion?: CheckRunConclusion;
  readonly completedAt?: string;
  readonly detailsUrl?: string;
  readonly externalId?: string;
  readonly output?: CheckRunOutput;
  readonly actions?: readonly CheckRunAction[];
}

/** GitHub API response for a check run. */
export interface CheckRun {
  readonly id: number;
  readonly name: string;
  readonly headSha: string;
  readonly status: CheckRunStatus;
  readonly conclusion: CheckRunConclusion | null;
  readonly startedAt: string | null;
  readonly completedAt: string | null;
  readonly output: {
    readonly title: string | null;
    readonly summary: string | null;
    readonly text: string | null;
    readonly annotationsCount: number;
  };
  readonly detailsUrl: string | null;
  readonly externalId: string | null;
  readonly url: string;
  readonly htmlUrl: string;
  readonly app: {
    readonly id: number;
    readonly slug: string;
  };
}

// ─── PR Comments API ─────────────────────────────────────────────────────────

/** A pull request review comment (issue comment). */
export interface PullRequestComment {
  readonly id: number;
  readonly body: string;
  readonly user: {
    readonly login: string;
    readonly id: number;
    readonly type: string;
  };
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly issueUrl: string;
  readonly htmlUrl: string;
}

/** Payload for creating a PR comment. */
export interface CreateCommentParams {
  readonly owner: string;
  readonly repo: string;
  readonly issueNumber: number;
  readonly body: string;
}

/** Payload for updating a PR comment. */
export interface UpdateCommentParams {
  readonly owner: string;
  readonly repo: string;
  readonly commentId: number;
  readonly body: string;
}

// ─── Common ──────────────────────────────────────────────────────────────────

/** GitHub API error response shape. */
export interface GitHubApiError {
  readonly message: string;
  readonly documentationUrl?: string;
  readonly status: number;
}

/** Minimal PR event info extracted from a webhook payload. */
export interface PullRequestEvent {
  readonly owner: string;
  readonly repo: string;
  readonly issueNumber: number;
  readonly headSha: string;
  readonly headBranch: string;
  readonly baseBranch: string;
  readonly installationId: number;
}
