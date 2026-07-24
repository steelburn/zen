import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { CheckRun } from "../types.ts";
import { RecentChecksTable } from "./RecentChecksTable.tsx";

// Mock router navigation
vi.mock("../router.tsx", () => ({
  navigate: vi.fn(),
  navigateToCheck: vi.fn(),
  navigateToRepo: vi.fn(),
  Link: ({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) =>
    vi.fn(() => <a href={href} className={className}>{children}</a>)(),
}));

const MOCK_CHECKS: CheckRun[] = [
  {
    id: "c1",
    repoId: "r1",
    repoName: "zen",
    prNumber: 42,
    prTitle: "Add dashboard",
    commitSha: "abc",
    branch: "main",
    status: "pass",
    results: [],
    summary: "All checks passed.",
    timestamp: "2026-07-16T09:00:00Z",
    duration: 18.2,
  },
  {
    id: "c2",
    repoId: "r2",
    repoName: "api-gateway",
    prNumber: 128,
    prTitle: "Rate limiting",
    commitSha: "def",
    branch: "feat/rate-limit",
    status: "fail",
    results: [],
    summary: "Coverage check failed.",
    timestamp: "2026-07-15T14:30:00Z",
    duration: 22.5,
  },
];

describe("RecentChecksTable", () => {
  it("renders check runs", () => {
    render(<RecentChecksTable checks={MOCK_CHECKS} />);
    expect(screen.getByText("#42")).toBeInTheDocument();
    expect(screen.getByText("#128")).toBeInTheDocument();
    expect(screen.getByText("zen")).toBeInTheDocument();
    expect(screen.getByText("api-gateway")).toBeInTheDocument();
    expect(screen.getByText("Add dashboard")).toBeInTheDocument();
    expect(screen.getByText("Rate limiting")).toBeInTheDocument();
  });

  it("renders status badges for each check", () => {
    render(<RecentChecksTable checks={MOCK_CHECKS} />);
    expect(screen.getByText("Pass")).toBeInTheDocument();
    expect(screen.getByText("Fail")).toBeInTheDocument();
  });

  it("renders duration values", () => {
    render(<RecentChecksTable checks={MOCK_CHECKS} />);
    expect(screen.getByText("18.2s")).toBeInTheDocument();
    expect(screen.getByText("22.5s")).toBeInTheDocument();
  });

  it("shows empty state when no checks", () => {
    render(<RecentChecksTable checks={[]} />);
    expect(screen.getByText("No check runs found.")).toBeInTheDocument();
  });

  it("renders repo names as clickable links", () => {
    render(<RecentChecksTable checks={MOCK_CHECKS} />);
    const zenLink = screen.getByText("zen");
    expect(zenLink.closest("a")).toBeInTheDocument();

    const apiLink = screen.getByText("api-gateway");
    expect(apiLink.closest("a")).toBeInTheDocument();
  });
});
