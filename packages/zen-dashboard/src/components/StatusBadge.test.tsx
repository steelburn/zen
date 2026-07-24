import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { StatusBadge } from "./StatusBadge.tsx";

describe("StatusBadge", () => {
  it("renders 'Pass' for pass status", () => {
    render(<StatusBadge status="pass" />);
    expect(screen.getByText("Pass")).toBeInTheDocument();
  });

  it("renders 'Fail' for fail status", () => {
    render(<StatusBadge status="fail" />);
    expect(screen.getByText("Fail")).toBeInTheDocument();
  });

  it("renders 'Pending' for pending status", () => {
    render(<StatusBadge status="pending" />);
    expect(screen.getByText("Pending")).toBeInTheDocument();
  });

  it("applies the correct CSS class", () => {
    const { container } = render(<StatusBadge status="pass" />);
    expect(container.firstChild).toHaveClass("status-badge--pass");
  });
});
