import { describe, expect, it } from "vitest";

import {
  parsePullRequestEvent,
  verifyWebhookSignature,
  WebhookError,
  WebhookSignatureError,
} from "./webhook.js";

import type { PullRequestWebhookPayload } from "./webhook.js";

// ─── Fixtures ────────────────────────────────────────────────────────────────

const openedPayload: PullRequestWebhookPayload = {
  action: "opened",
  pull_request: {
    number: 42,
    head: { sha: "abc123", ref: "feature/awesome" },
    base: { sha: "def456", ref: "main" },
  },
  repository: {
    owner: { login: "my-org" },
    name: "my-repo",
  },
  installation: { id: 98765 },
};

const synchronizePayload: PullRequestWebhookPayload = {
  ...openedPayload,
  action: "synchronize",
};

const nonTriggerPayload: PullRequestWebhookPayload = {
  ...openedPayload,
  action: "labeled",
};

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("parsePullRequestEvent", () => {
  it("should parse an 'opened' event", () => {
    const event = parsePullRequestEvent(openedPayload);

    expect(event).toBeDefined();
    expect(event!.owner).toBe("my-org");
    expect(event!.repo).toBe("my-repo");
    expect(event!.issueNumber).toBe(42);
    expect(event!.headSha).toBe("abc123");
    expect(event!.headBranch).toBe("feature/awesome");
    expect(event!.baseBranch).toBe("main");
    expect(event!.installationId).toBe(98765);
  });

  it("should parse a 'synchronize' event", () => {
    const event = parsePullRequestEvent(synchronizePayload);

    expect(event).toBeDefined();
    expect(event!.headSha).toBe("abc123");
  });

  it("should return undefined for non-trigger actions", () => {
    const event = parsePullRequestEvent(nonTriggerPayload);

    expect(event).toBeUndefined();
  });

  it("should return undefined for 'closed' events", () => {
    const event = parsePullRequestEvent({
      ...openedPayload,
      action: "closed",
    });

    expect(event).toBeUndefined();
  });

  it("should throw if pull_request is missing", () => {
    const { pull_request: _, ...rest } = openedPayload;
    expect(() => parsePullRequestEvent(rest as PullRequestWebhookPayload)).toThrow(
      WebhookError,
    );
  });

  it("should throw if repository is missing", () => {
    const { repository: _, ...rest } = openedPayload;
    expect(() => parsePullRequestEvent(rest as PullRequestWebhookPayload)).toThrow(
      WebhookError,
    );
  });

  it("should handle missing installation gracefully", () => {
    const { installation: _, ...payload } = openedPayload;
    const event = parsePullRequestEvent(payload);

    expect(event).toBeDefined();
    expect(event!.installationId).toBe(0);
  });
});

describe("verifyWebhookSignature", () => {
  it("should return true for a valid signature", () => {
    const secret = "my-webhook-secret";
    const body = '{"action":"opened"}';

    // Compute the expected signature manually
    const { createHmac } = require("node:crypto");
    const expected = createHmac("sha256", secret)
      .update(body)
      .digest("hex");

    const result = verifyWebhookSignature(
      body,
      `sha256=${expected}`,
      secret,
    );

    expect(result).toBe(true);
  });

  it("should throw if signature header is missing", () => {
    expect(() =>
      verifyWebhookSignature("body", undefined, "secret"),
    ).toThrow(WebhookSignatureError);
  });

  it("should throw if signature has wrong format", () => {
    expect(() =>
      verifyWebhookSignature("body", "invalid-format", "secret"),
    ).toThrow(WebhookSignatureError);
  });

  it("should throw if signature does not match", () => {
    expect(() =>
      verifyWebhookSignature(
        '{"action":"opened"}',
        "sha256=0000000000000000000000000000000000000000000000000000000000000000",
        "secret",
      ),
    ).toThrow(WebhookSignatureError);
  });
});

describe("WebhookError", () => {
  it("should have the correct name", () => {
    const error = new WebhookError("test");
    expect(error.name).toBe("WebhookError");
  });
});

describe("WebhookSignatureError", () => {
  it("should have the correct name", () => {
    const error = new WebhookSignatureError("bad sig");
    expect(error.name).toBe("WebhookSignatureError");
  });

  it("should provide a default message", () => {
    const error = new WebhookSignatureError();
    expect(error.message).toBe("Webhook signature verification failed");
  });
});
