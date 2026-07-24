import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { RepoCheckHistoryPage } from "./RepoCheckHistoryPage.tsx";

describe("RepoCheckHistoryPage", () => {
  it("shows loading state initially", () => {
    render(<RepoCheckHistoryPage repoId="repo-1" />);
    expect(screen.getByText("Loading repository…")).toBeInTheDocument();
  });

  it("shows error for unknown repo ID", async () => {
    render(<RepoCheckHistoryPage repoId="non-existent" />);

    await waitFor(() => {
      expect(screen.getByText(/Repository "non-existent" not found/)).toBeInTheDocument();
    });
  });

  it("shows back button on error", async () => {
    render(<RepoCheckHistoryPage repoId="non-existent" />);

    await waitFor(() => {
      expect(screen.getByText("← Back to Dashboard")).toBeInTheDocument();
    });
  });

  it("renders repo owner/name in heading after loading", async () => {
    render(<RepoCheckHistoryPage repoId="repo-1" />);

    await waitFor(() => {
      expect(screen.getByText("zen-inc/")).toBeInTheDocument();
    });

    // Repo owner appears in heading; check heading contains "zen"
    const heading = screen.getByRole("heading", { level: 1 });
    expect(heading.textContent).toContain("zen");
  });

  it("renders breadcrumb navigation", async () => {
    render(<RepoCheckHistoryPage repoId="repo-1" />);

    await waitFor(() => {
      expect(screen.getByText("Dashboard")).toBeInTheDocument();
    });
  });

  it("renders stats cards with correct values", async () => {
    render(<RepoCheckHistoryPage repoId="repo-1" />);

    await waitFor(() => {
      expect(screen.getByText("Total Checks")).toBeInTheDocument();
    });

    // repo-1 has 2 check runs (check-1 pass, check-2 fail)
    expect(screen.getByText("2")).toBeInTheDocument(); // total checks
    expect(screen.getByText("50%")).toBeInTheDocument(); // pass rate: 1/2

    // "Passed" and "Failed" cards both show "1" — use getAllByText
    const ones = screen.getAllByText("1");
    expect(ones.length).toBeGreaterThanOrEqual(2);
  });

  it("renders check history table", async () => {
    render(<RepoCheckHistoryPage repoId="repo-1" />);

    await waitFor(() => {
      expect(screen.getByText("Check History")).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getByText("#42")).toBeInTheDocument();
    });

    expect(screen.getByText("#41")).toBeInTheDocument();
    expect(screen.getByText("Add dashboard components")).toBeInTheDocument();
    expect(screen.getByText("Refactor webhook handler")).toBeInTheDocument();
  });

  it("shows empty state for repo with no checks", async () => {
    render(<RepoCheckHistoryPage repoId="repo-4" />);

    await waitFor(() => {
      // "docs" appears in both breadcrumb and heading
      const docsElements = screen.getAllByText("docs");
      expect(docsElements.length).toBeGreaterThanOrEqual(2);
    });

    expect(screen.getByText("No check runs found for this repository.")).toBeInTheDocument();
  });

  it("can select a check run to show detail panel", async () => {
    render(<RepoCheckHistoryPage repoId="repo-1" />);

    await waitFor(() => {
      expect(screen.getByText("#42")).toBeInTheDocument();
    });

    // Click on the first check run row
    const row = screen.getByText("#42").closest("tr")!;
    row.click();

    await waitFor(() => {
      // Detail panel should show PR info
      expect(screen.getByText(/PR #42/)).toBeInTheDocument();
    });

    // Individual check results should be shown
    expect(screen.getByText("coverage")).toBeInTheDocument();
    expect(screen.getByText("lint")).toBeInTheDocument();
    expect(screen.getByText("complexity")).toBeInTheDocument();
  });

  it("renders status badges for checks", async () => {
    render(<RepoCheckHistoryPage repoId="repo-1" />);

    await waitFor(() => {
      expect(screen.getByText("Pass")).toBeInTheDocument();
    });

    expect(screen.getByText("Fail")).toBeInTheDocument();
  });

  it("shows repo URL as a link", async () => {
    render(<RepoCheckHistoryPage repoId="repo-1" />);

    await waitFor(() => {
      expect(screen.getByText("https://github.com/zen-inc/zen")).toBeInTheDocument();
    });
  });

  it("shows active status", async () => {
    render(<RepoCheckHistoryPage repoId="repo-1" />);

    await waitFor(() => {
      expect(screen.getByText("Active")).toBeInTheDocument();
    });
  });

  it("shows inactive status for inactive repos", async () => {
    render(<RepoCheckHistoryPage repoId="repo-4" />);

    await waitFor(() => {
      expect(screen.getByText("Inactive")).toBeInTheDocument();
    });
  });
});
