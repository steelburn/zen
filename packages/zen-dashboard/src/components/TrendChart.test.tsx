import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { TrendDataPoint } from "../types.ts";
import { TrendChart } from "./TrendChart.tsx";

const MOCK_DATA: TrendDataPoint[] = [
  { label: "Mon", value: 60 },
  { label: "Tue", value: 75 },
  { label: "Wed", value: 80 },
  { label: "Thu", value: 78 },
  { label: "Fri", value: 85 },
];

describe("TrendChart", () => {
  it("renders title and subtitle", () => {
    render(<TrendChart data={MOCK_DATA} title="Pass Rate" subtitle="Last 5 days" />);
    expect(screen.getByText("Pass Rate")).toBeInTheDocument();
    expect(screen.getByText("Last 5 days")).toBeInTheDocument();
  });

  it("renders an SVG with role img", () => {
    const { container } = render(<TrendChart data={MOCK_DATA} title="Pass Rate" />);
    const svg = container.querySelector("svg.trend-chart");
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveAttribute("role", "img");
  });

  it("shows empty state when no data", () => {
    render(<TrendChart data={[]} title="Pass Rate" />);
    expect(screen.getByText("No data available")).toBeInTheDocument();
  });

  it("renders latest value and change in footer", () => {
    render(<TrendChart data={MOCK_DATA} title="Pass Rate" />);
    expect(screen.getByText("85")).toBeInTheDocument();
    expect(screen.getByText("+42%")).toBeInTheDocument();
  });

  it("accepts accent prop", () => {
    const { container } = render(<TrendChart data={MOCK_DATA} title="Pass Rate" accent />);
    const svg = container.querySelector("svg");
    expect(svg).toBeInTheDocument();
  });

  it("renders secondary dashed line when data includes it", () => {
    const dataWithSecondary: TrendDataPoint[] = MOCK_DATA.map((d) => ({
      ...d,
      secondary: d.value - 10,
    }));
    const { container } = render(<TrendChart data={dataWithSecondary} title="Pass Rate" />);
    // Should have a dashed path (stroke-dasharray)
    const dashedPaths = container.querySelectorAll("path[stroke-dasharray]");
    expect(dashedPaths.length).toBeGreaterThanOrEqual(1);
  });
});
