/**
 * GitHub webhook handler for pull request events.
 *
 * Processes `pull_request.opened` and `pull_request.synchronize` events to
 * trigger quality checks and report results via Check Runs and PR comments.
 *
 * @module
 */

import { createHmac, timingSafeEqual } from "node:crypto";

import type { PullRequestEvent } from "./types.js";

// ─── Errors ──────────────────────────────────────────────────────────────────

/** Thrown when webhook processing fails. */
export class WebhookError extends Error {
  public override readonly name = "WebhookError";

  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
  }
}

/** Thrown when webhook signature verification fails. */
export class WebhookSignatureError extends WebhookError {
  public override readonly name = "WebhookSignatureError";

  constructor(message?: string) {
    super(message ?? "Webhook signature verification failed");
  }
}

// ─── Signature verification ──────────────────────────────────────────────────

/**
 * Verify a GitHub webhook payload using the HMAC-SHA256 signature.
 *
 * GitHub signs every webhook with the app's webhook secret using HMAC-SHA256.
 * This function verifies that the signature matches.
 *
 * @param body - Raw request body (string or Buffer)
 * @param signatureHeader - Value of the `x-hub-signature-256` header
 * @param secret - Webhook secret configured for the GitHub App
 * @returns `true` if the signature is valid
 * @throws {WebhookSignatureError} If the signature is invalid
 *
 * @example
 * ```ts
 * const body = await request.text();
 * const sig = request.headers["x-hub-signature-256"];
 * verifyWebhookSignature(body, sig, process.env.WEBHOOK_SECRET);
 * ```
 */
export function verifyWebhookSignature(
  body: string | Buffer,
  signatureHeader: string | undefined,
  secret: string,
): boolean {
  if (!signatureHeader) {
    throw new WebhookSignatureError("Missing x-hub-signature-256 header");
  }

  // Expected format: "sha256=<hex>"
  const expectedPrefix = "sha256=";
  if (!signatureHeader.startsWith(expectedPrefix)) {
    throw new WebhookSignatureError(
      `Invalid signature format (expected sha256=...)`,
    );
  }

  const expectedSig = signatureHeader.slice(expectedPrefix.length);
  const computedSig = createHmac("sha256", secret)
    .update(typeof body === "string" ? body : body.toString("utf-8"))
    .digest("hex");

  // Use timing-safe comparison to prevent timing attacks
  const expectedBuf = Buffer.from(expectedSig, "utf-8");
  const computedBuf = Buffer.from(computedSig, "utf-8");

  if (
    expectedBuf.length !== computedBuf.length ||
    !timingSafeEqual(expectedBuf, computedBuf)
  ) {
    throw new WebhookSignatureError("Signature mismatch");
  }

  return true;
}

// ─── Event parsing ───────────────────────────────────────────────────────────

/** Actions that trigger a quality check. */
export type TriggerAction = "opened" | "synchronize" | "reopened";

/** Raw webhook payload for `pull_request` events. */
export interface PullRequestWebhookPayload {
  readonly action: string;
  readonly pull_request: {
    readonly number: number;
    readonly head: {
      readonly sha: string;
      readonly ref: string;
    };
    readonly base: {
      readonly sha: string;
      readonly ref: string;
    };
  };
  readonly repository: {
    readonly owner: {
      readonly login: string;
    };
    readonly name: string;
  };
  readonly installation?: {
    readonly id: number;
  };
}

/**
 * Parse a `pull_request` webhook payload into a standardized event object.
 *
 * Only processes trigger actions (`opened`, `synchronize`, `reopened`).
 * Returns `undefined` for non-trigger actions (e.g., `labeled`, `closed`).
 *
 * @param payload - Parsed webhook payload
 * @returns Parsed event, or `undefined` if the action should be ignored
 * @throws {WebhookError} If the payload is malformed or missing required fields
 */
export function parsePullRequestEvent(
  payload: PullRequestWebhookPayload,
): PullRequestEvent | undefined {
  if (!payload.pull_request) {
    throw new WebhookError("Missing pull_request in webhook payload");
  }

  if (!payload.repository) {
    throw new WebhookError("Missing repository in webhook payload");
  }

  const action = payload.action as string;
  const triggerActions: readonly TriggerAction[] = [
    "opened",
    "synchronize",
    "reopened",
  ];

  if (!triggerActions.includes(action as TriggerAction)) {
    return undefined;
  }

  const owner = payload.repository.owner.login;
  const repo = payload.repository.name;
  const issueNumber = payload.pull_request.number;
  const headSha = payload.pull_request.head.sha;
  const headBranch = payload.pull_request.head.ref;
  const baseBranch = payload.pull_request.base.ref;
  const installationId = payload.installation?.id ?? 0;

  if (!owner || !repo || !headSha || !headBranch || !baseBranch) {
    throw new WebhookError(
      "Incomplete pull_request webhook payload — missing owner, repo, head SHA, or branch info",
    );
  }

  return {
    owner,
    repo,
    issueNumber,
    headSha,
    headBranch,
    baseBranch,
    installationId,
  };
}

/**
 * Extract the event name from the `x-github-event` header.
 *
 * @param header - Value of the `x-github-event` header
 * @returns The event name, or `undefined` if missing
 */
export function getEventName(header: string | undefined): string | undefined {
  return header;
}
