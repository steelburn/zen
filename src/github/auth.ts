/**
 * GitHub App authentication helpers.
 *
 * Generates time-limited JWTs signed with the app's private key and exchanges
 * them for installation access tokens.
 *
 * @module
 */

import { createPrivateKey, sign } from "node:crypto";
import type { GitHubAppConfig, InstallationToken } from "./types.js";

// ─── Errors ──────────────────────────────────────────────────────────────────

/** Thrown when authentication with GitHub fails. */
export class GitHubAuthError extends Error {
  public override readonly name = "GitHubAuthError";

  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
  }
}

// ─── JWT Generation ──────────────────────────────────────────────────────────

/**
 * Generate a signed JWT for GitHub App authentication.
 *
 * The JWT is valid for a maximum of 10 minutes. GitHub requires the `iss`
 * (app ID) and `iat`/`exp` claims.
 *
 * @param config - GitHub App configuration (app ID + private key)
 * @returns A signed JWT string
 */
export function generateAppJwt(config: GitHubAppConfig): string {
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: config.appId,
    iat: now - 60, // 60s clock skew tolerance
    exp: now + 600, // 10 minutes max
  };

  const header = { alg: "RS256", typ: "JWT" };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signingInput = `${encodedHeader}.${encodedPayload}`;

  const key = createPrivateKey(config.privateKey);
  const signature = sign(null, Buffer.from(signingInput, "utf-8"), key);
  const encodedSignature = base64UrlEncodeBuffer(signature);

  return `${signingInput}.${encodedSignature}`;
}

// ─── Installation Token Exchange ─────────────────────────────────────────────

/**
 * Exchange an app JWT for an installation access token.
 *
 * Installation tokens are valid for 1 hour and scoped to the installation's
 * repositories.
 *
 * @param jwt - A valid app JWT (from `generateAppJwt`)
 * @param installationId - GitHub App installation ID
 * @returns An installation access token
 * @throws {GitHubAuthError} If the token exchange fails
 */
export async function getInstallationToken(
  jwt: string,
  installationId: number,
): Promise<InstallationToken> {
  const url = `https://api.github.com/app/installations/${installationId}/access_tokens`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${jwt}`,
      Accept: "application/vnd.github+json",
      "User-Agent": "zen-quality-gate/0.1.0",
    },
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "(no body)");
    throw new GitHubAuthError(
      `Failed to get installation token: ${response.status} ${response.statusText} — ${body}`,
    );
  }

  const data = (await response.json()) as InstallationToken;
  return data;
}

// ─── High-level helper ───────────────────────────────────────────────────────

/**
 * Obtain an authenticated token for a GitHub App installation.
 *
 * Convenience wrapper around JWT generation + token exchange.
 *
 * @param config - Full app configuration
 * @param installationId - Optional override; falls back to config.installationId
 * @returns Installation access token string
 */
export async function getAuthenticatedToken(
  config: GitHubAppConfig,
  installationId?: number,
): Promise<string> {
  const id = installationId ?? config.installationId;
  if (id === undefined) {
    throw new GitHubAuthError(
      "An installation ID is required — provide one in config or as a parameter",
    );
  }
  const jwt = generateAppJwt(config);
  const token = await getInstallationToken(jwt, id);
  return token.token;
}

// ─── Encoding helpers ────────────────────────────────────────────────────────

function base64UrlEncode(data: string): string {
  return Buffer.from(data, "utf-8")
    .toString("base64url");
}

function base64UrlEncodeBuffer(data: Buffer): string {
  return data.toString("base64url");
}
