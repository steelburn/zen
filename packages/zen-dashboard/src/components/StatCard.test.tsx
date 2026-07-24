import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { StatCard } from "./StatCard.tsx";

describe("StatCard", () => {
  it("renders label and value", () => {
    render(<StatCard label="Total Checks" value={42} />);
    expect(screen.getByText("Total Checks")).toBeInTheDocument();
    expect(screen.getByText("42")).toBeInTheDocument();
  });

  it("renders sublabel when provided", () => {
    render(<StatCard label="Pass Rate" value="92%" sublabel="Last 30 days" />);
    expect(screen.getByText("Last 30 days")).toBeInTheDocument();
  });

  it("does not render sublabel when omitted", () => {
    const { container } = render(<StatCard label="Test" value={1} />);
    expect(container.querySelector(".stat-card__sublabel")).toBeNull();
  });

  it("applies accent colour when accent is true", () => {
    render(<StatCard label="Pass Rate" value="92%" accent />);
    const valueEl = screen.getByText("92%");
    expect(valueEl.style.color).toBe("var(--color-accent)");
  });
});
