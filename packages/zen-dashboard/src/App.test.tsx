import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { App } from "./App.tsx";

describe("App", () => {
  it("renders the sidebar", () => {
    render(<App />);
    expect(screen.getByText("ZEN")).toBeInTheDocument();
    // Dashboard text appears in sidebar nav link and page header — both are valid
    expect(screen.getAllByText("Dashboard").length).toBeGreaterThanOrEqual(2);
  });

  it("renders the dashboard page header by default", () => {
    render(<App />);
    expect(screen.getByText("Overview of recent quality check runs across all repositories.")).toBeInTheDocument();
  });

  it("has a link to repositories in the sidebar", () => {
    render(<App />);
    expect(screen.getByText("Repositories")).toBeInTheDocument();
  });

  it("has a link to check runs in the sidebar", () => {
    render(<App />);
    expect(screen.getByText("Check Runs")).toBeInTheDocument();
  });
});
