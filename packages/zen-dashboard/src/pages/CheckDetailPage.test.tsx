import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CheckDetailPage } from "./CheckDetailPage.tsx";

// Mock the router module
vi.mock("../router.tsx", () => ({
  navigate: vi.fn(),
  navigateToCheck: vi.fn(),
  navigateToRepo: vi.fn(),
}));

describe("CheckDetailPage", () => {
  it("shows loading state initially", () => {
    render(<CheckDetailPage checkId="check-1" />);
    expect(screen.getByText("Loading check details…")).toBeInTheDocument();
  });

  it("renders check details after loading", async () => {
    render(<CheckDetailPage checkId="check-1" />);

    await waitFor(() => {
      expect(screen.getByText("zen/#42 — Add dashboard components")).toBeInTheDocument();
    });

    // Summary
    expect(screen.getByText("All quality checks passed.")).toBeInTheDocument();

    // Check type tabs
    expect(screen.getByText("Coverage")).toBeInTheDocument();
    expect(screen.getByText("Lint")).toBeInTheDocument();
    expect(screen.getByText("Complexity")).toBeInTheDocument();

    // File results for the active tab (coverage)
    await waitFor(() => {
      expect(screen.getByText("src/components/DashboardPage.tsx")).toBeInTheDocument();
    });
  });

  it("shows error for non-existent check", async () => {
    render(<CheckDetailPage checkId="non-existent" />);

    await waitFor(() => {
      expect(screen.getByText("Check run not found.")).toBeInTheDocument();
    });
  });

  it("switches tabs and shows file results for each check type", async () => {
    render(<CheckDetailPage checkId="check-1" />);

    await waitFor(() => {
      // Heading includes emoji prefix: "🎯 Coverage — Per-File Results"
      expect(screen.getByText(/Per-File Results/)).toBeInTheDocument();
    });

    // Click Lint tab
    const lintTab = screen.getByText("Lint");
    lintTab.click();

    await waitFor(() => {
      expect(screen.getByText(/Lint — Per-File Results/)).toBeInTheDocument();
    });
  });

  it("shows branch and commit info", async () => {
    render(<CheckDetailPage checkId="check-1" />);

    await waitFor(() => {
      expect(screen.getByText(/feat\/dashboard/)).toBeInTheDocument();
      expect(screen.getByText(/a1b2c3d/)).toBeInTheDocument();
    });
  });

  it("renders breadcrumb with navigation links", async () => {
    render(<CheckDetailPage checkId="check-1" />);

    await waitFor(() => {
      expect(screen.getByText("Dashboard")).toBeInTheDocument();
    });
  });
});
