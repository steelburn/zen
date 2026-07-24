import type { ReactNode } from "react";
import type { CheckStatus } from "../types.ts";

interface StatusBadgeProps {
  readonly status: CheckStatus;
}

const LABELS: Record<CheckStatus, string> = {
  pass: "Pass",
  fail: "Fail",
  pending: "Pending",
};

/**
 * Coloured pill badge for check run status.
 */
export function StatusBadge({ status }: StatusBadgeProps): ReactNode {
  return <span className={`status-badge status-badge--${status}`}>{LABELS[status]}</span>;
}
