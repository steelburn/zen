import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { generateAppJwt, GitHubAuthError } from "./auth.js";

// Load a real RSA test key generated for unit tests.
// This key is used ONLY for testing and is never deployed.
const TEST_PRIVATE_KEY = readFileSync(
  new URL("../../test/fixtures/test-github-key.pem", import.meta.url),
  "utf-8",
);

describe("generateAppJwt", () => {
  it("should return a string with three base64url-encoded segments", () => {
    const jwt = generateAppJwt({
      appId: "12345",
      privateKey: TEST_PRIVATE_KEY,
    });

    expect(typeof jwt).toBe("string");
    const parts = jwt.split(".");
    expect(parts).toHaveLength(3);

    // Each part should be base64url-encoded (no + / or trailing =)
    for (const part of parts) {
      expect(part).toMatch(/^[A-Za-z0-9_-]+$/);
    }
  });

  it("should have the correct header algorithm (RS256)", () => {
    const jwt = generateAppJwt({
      appId: "12345",
      privateKey: TEST_PRIVATE_KEY,
    });

    const [headerBase64] = jwt.split(".");
    const header = JSON.parse(Buffer.from(headerBase64!, "base64url").toString("utf-8"));

    expect(header).toEqual({ alg: "RS256", typ: "JWT" });
  });

  it("should include the app ID in the iss claim", () => {
    const jwt = generateAppJwt({
      appId: "67890",
      privateKey: TEST_PRIVATE_KEY,
    });

    const [, payloadBase64] = jwt.split(".");
    const payload = JSON.parse(Buffer.from(payloadBase64!, "base64url").toString("utf-8"));

    expect(payload.iss).toBe("67890");
  });

  it("should have reasonable iat and exp timestamps", () => {
    const jwt = generateAppJwt({
      appId: "12345",
      privateKey: TEST_PRIVATE_KEY,
    });

    const [, payloadBase64] = jwt.split(".");
    const payload = JSON.parse(Buffer.from(payloadBase64!, "base64url").toString("utf-8"));

    const now = Math.floor(Date.now() / 1000);
    expect(payload.iat).toBeLessThanOrEqual(now);
    expect(payload.iat).toBeGreaterThan(now - 120); // within 2 minutes
    expect(payload.exp).toBeGreaterThan(now + 500); // ~10 minutes
    expect(payload.exp).toBeLessThan(now + 700);
  });

  it("should throw if the private key is invalid", () => {
    expect(() =>
      generateAppJwt({
        appId: "12345",
        privateKey: "not-a-valid-key",
      }),
    ).toThrow();
  });
});

describe("GitHubAuthError", () => {
  it("should have the correct name", () => {
    const error = new GitHubAuthError("test error");
    expect(error.name).toBe("GitHubAuthError");
    expect(error.message).toBe("test error");
  });
});
