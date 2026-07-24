import { describe, expect, it } from "vitest";
import { parseHash } from "./router.tsx";

describe("parseHash", () => {
  it("parses empty hash as dashboard", () => {
    const route = parseHash("");
    expect(route.kind).toBe("dashboard");
  });

  it("parses root hash as dashboard", () => {
    const route = parseHash("#/");
    expect(route.kind).toBe("dashboard");
  });

  it("parses unknown hash as dashboard", () => {
    const route = parseHash("#/unknown/path");
    expect(route.kind).toBe("dashboard");
  });

  it("parses /repos route", () => {
    const route = parseHash("#/repos");
    expect(route.kind).toBe("repos");
  });

  it("parses /repos/:repoId route", () => {
    const route = parseHash("#/repos/repo-1");
    if (route.kind !== "repo-checks") {
      throw new Error("Expected repo-checks route");
    }
    expect(route.repoId).toBe("repo-1");
  });

  it("parses /repos/:repoId with encoded characters", () => {
    const route = parseHash("#/repos/owner%2Frepo");
    if (route.kind !== "repo-checks") {
      throw new Error("Expected repo-checks route");
    }
    expect(route.repoId).toBe("owner/repo");
  });

  it("parses /checks route", () => {
    const route = parseHash("#/checks");
    expect(route.kind).toBe("checks");
  });

  it("parses hash with leading # only", () => {
    const route = parseHash("#/repos/r-123");
    if (route.kind !== "repo-checks") {
      throw new Error("Expected repo-checks route");
    }
    expect(route.repoId).toBe("r-123");
  });
});
