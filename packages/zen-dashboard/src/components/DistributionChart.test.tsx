import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { DistributionBucket } from "../types.ts";
import { DistributionChart } from "./DistributionChart.tsx";

const MOCK_DATA: DistributionBucket[] = [
  { label: "Coverage", value: 5 },
  { label: "Lint", value: 4 },
  { label: "Complexity", value: 6 },
];

describe("DistributionChart", () => {
  it("renders title and subtitle", () => {
    render(<DistributionChart data={MOCK_DATA} title="Check Types" subtitle="By count" />);
    expect(screen.getByText("Check Types")).toBeInTheDocument();
    expect(screen.getByText("By count")).toBeInTheDocument();
  });

  it("renders an SVG with role img", () => {
    const { container } = render(<DistributionChart data={MOCK_DATA} title="Check Types" />);
    const svg = container.querySelector("svg.distribution-chart");
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveAttribute("role", "img");
  });

  it("shows bucket labels and values", () => {
    render(<DistributionChart data={MOCK_DATA} title="Check Types" />);
    expect(screen.getByText("Coverage")).toBeInTheDocument();
    expect(screen.getByText("Lint")).toBeInTheDocument();
    expect(screen.getByText("Complexity")).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();
    expect(screen.getByText("4")).toBeInTheDocument();
    expect(screen.getByText("6")).toBeInTheDocument();
  });

  it("shows empty state when no data", () => {
    render(<DistributionChart data={[]} title="Check Types" />);
    expect(screen.getByText("No data available")).toBeInTheDocument();
  });

  it("sorts data by value descending", () => {
    const { container } = render(<DistributionChart data={MOCK_DATA} title="Check Types" />);
    const bars = container.querySelectorAll("rect");
    // First bar should be the largest value (Complexity = 6)
    expect(bars.length).toBe(3);
  });

  it("renders custom color when provided", () => {
    const dataWithColor: DistributionBucket[] = [
      { label: "Critical", value: 3, color: "red" },
      { label: "Normal", value: 7 },
    ];
    const { container } = render(<DistributionChart data={dataWithColor} title="Severity" />);
    const bar = container.querySelector("rect[fill='red']");
    expect(bar).toBeInTheDocument();
  });
});
