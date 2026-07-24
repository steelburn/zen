import { describe, expect, it } from "vitest";
import { getCheckRun, getCheckRuns, getDashboardStats, getRepos } from "./client.ts";

describe("API client (mock mode)", () => {
  it("getRepos returns repository list", async () => {
    const res = await getRepos();
    expect(res.error).toBeNull();
    expect(res.data.length).toBeGreaterThanOrEqual(3);
    expect(res.data[0]).toHaveProperty("id");
    expect(res.data[0]).toHaveProperty("name");
  });

  it("getCheckRuns returns check runs", async () => {
    const res = await getCheckRuns();
    expect(res.error).toBeNull();
    expect(res.data.length).toBeGreaterThanOrEqual(5);
    expect(res.data[0]).toHaveProperty("status");
    expect(res.data[0]).toHaveProperty("prNumber");
  });

  it("getCheckRuns filters by repoId", async () => {
    const res = await getCheckRuns("repo-1");
    expect(res.error).toBeNull();
    expect(res.data.every((r) => r.repoId === "repo-1")).toBe(true);
  });

  it("getCheckRun returns a single check run", async () => {
    const res = await getCheckRun("check-1");
    expect(res.error).toBeNull();
    expect(res.data).not.toBeNull();
    expect(res.data!.id).toBe("check-1");
  });

  it("getCheckRun returns null for unknown id", async () => {
    const res = await getCheckRun("non-existent");
    expect(res.error).toBeNull();
    expect(res.data).toBeNull();
  });

  it("getDashboardStats computes correct stats", async () => {
    const res = await getDashboardStats();
    expect(res.error).toBeNull();
    expect(res.data.totalChecks).toBeGreaterThanOrEqual(5);
    expect(res.data.passRate).toBeGreaterThanOrEqual(0);
    expect(res.data.passRate).toBeLessThanOrEqual(100);
    expect(res.data.activeRepos).toBeGreaterThanOrEqual(2);
  });
});
