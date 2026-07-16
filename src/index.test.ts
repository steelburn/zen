import { describe, expect, it } from "vitest";

import { VERSION } from "./index.js";

describe("VERSION", () => {
  it("should be a string", () => {
    expect(typeof VERSION).toBe("string");
  });

  it("should follow semver", () => {
    expect(VERSION).toMatch(/^\d+\.\d+\.\d+$/);
  });
});
