import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { App } from "./App.tsx";

describe("App", () => {
  it("renders the sidebar", () => {
    render(<App />);
    expect(screen.getByText("ZEN")).toBeInTheDocument();
    expect(screen.getByText("Dashboard")).toBeInTheDocument();
  });

  it("renders the dashboard page header", () => {
    render(<App />);
    expect(screen.getByText("Dashboard")).toBeInTheDocument();
  });
});
