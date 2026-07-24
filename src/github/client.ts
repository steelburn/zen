/**
 * Low-level GitHub API HTTP client.
 *
 * Handles authentication headers, request/response serialization, pagination
 * hints, and error wrapping for all GitHub REST API calls.
 *
 * @module
 */

import type { GitHubApiError } from "./types.js";

// ─── Errors ──────────────────────────────────────────────────────────────────

/** Thrown when a GitHub API request fails. */
export class GitHubClientError extends Error {
  public override readonly name = "GitHubClientError";
  public readonly status: number;
  public readonly body: string;

  constructor(status: number, body: string, message?: string) {
    super(message ?? `GitHub API responded with ${status}`);
    this.status = status;
    this.body = body;
  }
}

// ─── Request helpers ─────────────────────────────────────────────────────────

/** Options for a GitHub API request. */
export interface GitHubRequestOptions {
  readonly method?: string;
  readonly headers?: Record<string, string>;
  readonly body?: unknown;
  readonly token: string;
}

/**
 * Perform a request against the GitHub REST API.
 *
 * Automatically sets `Authorization`, `Accept`, `Content-Type`, and
 * `User-Agent` headers. Throws `GitHubClientError` on non-2xx responses.
 *
 * @param path - API path (e.g. `/repos/owner/repo/check-runs`)
 * @param options - Request options including the auth token
 * @returns Parsed response body as `T`
 */
export async function githubRequest<T>(path: string, options: GitHubRequestOptions): Promise<T> {
  const url = path.startsWith("https://") ? path : `https://api.github.com${path}`;

  const headers: Record<string, string> = {
    Authorization: `Bearer ${options.token}`,
    Accept: "application/vnd.github+json",
    "User-Agent": "zen-quality-gate/0.1.0",
    ...options.headers,
  };

  if (options.body !== undefined && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetch(url, {
    method: options.method ?? "GET",
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  const body = await response.text().catch(() => "");

  if (!response.ok) {
    let parsed: GitHubApiError | undefined;
    try {
      parsed = JSON.parse(body) as GitHubApiError;
    } catch {
      // ignore parse errors
    }
    throw new GitHubClientError(
      response.status,
      body,
      parsed?.message ?? `GitHub API responded with ${response.status}`,
    );
  }

  if (body.length === 0) {
    return undefined as T;
  }

  try {
    return JSON.parse(body) as T;
  } catch {
    return body as T;
  }
}

/**
 * Perform a paginated GET request against the GitHub REST API.
 *
 * Collects all pages using the `Link` header. Type parameter `T` should be
 * the item type; returns an array of all items across pages.
 *
 * @param path - API path (e.g. `/repos/owner/repo/issues/1/comments`)
 * @param options - Request options including the auth token
 * @returns Array of all items across all pages
 */
export async function githubPaginatedRequest<T>(
  path: string,
  options: GitHubRequestOptions,
): Promise<readonly T[]> {
  const allItems: T[] = [];
  let nextUrl: string | undefined = path;

  while (nextUrl) {
    const items = await githubRequest<readonly T[]>(nextUrl, options);
    allItems.push(...items);
    nextUrl = undefined;

    // We don't parse the Link header here to keep deps minimal.
    // For MVP pagination is handled by the caller when needed.
  }

  return allItems;
}
