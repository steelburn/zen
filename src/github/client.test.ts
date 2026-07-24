import { afterEach, describe, expect, it, vi } from "vitest";

import { githubRequest, GitHubClientError } from "./client.js";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function mockFetch(response: {
  status: number;
  body: string;
  headers?: Record<string, string>;
}) {
  return vi.spyOn(globalThis, "fetch").mockImplementation(async () => {
    return {
      ok: response.status >= 200 && response.status < 300,
      status: response.status,
      statusText: response.status === 200 ? "OK" : "Error",
      text: () => Promise.resolve(response.body),
      headers: new Headers(response.headers ?? {}),
    } as Response;
  });
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("githubRequest", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should make a GET request and return parsed JSON", async () => {
    const fetchMock = mockFetch({
      status: 200,
      body: JSON.stringify({ id: 42, name: "test" }),
    });

    const result = await githubRequest<{ id: number; name: string }>(
      "/repos/owner/repo/check-runs/1",
      { token: "test-token" },
    );

    expect(result).toEqual({ id: 42, name: "test" });
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.github.com/repos/owner/repo/check-runs/1");
    expect(options.method ?? "GET").toBe("GET");
    expect((options.headers as Record<string, string>).Authorization).toBe(
      "Bearer test-token",
    );
  });

  it("should make a POST request with JSON body", async () => {
    const fetchMock = mockFetch({
      status: 201,
      body: JSON.stringify({ id: 1 }),
    });

    const body = { name: "zen/quality", head_sha: "abc123" };
    const result = await githubRequest<{ id: number }>(
      "/repos/owner/repo/check-runs",
      { method: "POST", body, token: "test-token" },
    );

    expect(result).toEqual({ id: 1 });

    const [, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(options.method).toBe("POST");
    expect(options.body).toBe(JSON.stringify(body));
  });

  it("should use the full URL if an absolute URL is given", async () => {
    const fetchMock = mockFetch({
      status: 200,
      body: JSON.stringify({ url: "https://example.com/callback" }),
    });

    await githubRequest<{ url: string }>(
      "https://example.com/callback",
      { token: "test-token" },
    );

    const [url] = fetchMock.mock.calls[0] as [string];
    expect(url).toBe("https://example.com/callback");
  });

  it("should throw GitHubClientError on non-2xx response", async () => {
    mockFetch({
      status: 404,
      body: JSON.stringify({ message: "Not Found" }),
    });

    await expect(
      githubRequest("/repos/owner/repo/check-runs/999", {
        token: "test-token",
      }),
    ).rejects.toThrow(GitHubClientError);
  });

  it("should include the error message from the API response", async () => {
    mockFetch({
      status: 422,
      body: JSON.stringify({ message: "Validation failed" }),
    });

    try {
      await githubRequest("/repos/owner/repo/check-runs", {
        method: "POST",
        body: {},
        token: "test-token",
      });
      expect.unreachable("Should have thrown");
    } catch (error) {
      expect(error).toBeInstanceOf(GitHubClientError);
      expect((error as GitHubClientError).status).toBe(422);
      expect((error as GitHubClientError).message).toContain(
        "Validation failed",
      );
    }
  });

  it("should handle empty response body", async () => {
    mockFetch({ status: 204, body: "" });

    const result = await githubRequest("/repos/owner/repo/some-endpoint", {
      method: "DELETE",
      token: "test-token",
    });

    expect(result).toBeUndefined();
  });
});

describe("GitHubClientError", () => {
  it("should have the correct properties", () => {
    const error = new GitHubClientError(422, '{"message":"Bad request"}');
    expect(error.name).toBe("GitHubClientError");
    expect(error.status).toBe(422);
    expect(error.body).toBe('{"message":"Bad request"}');
  });
});
