import type { ReactNode } from "react";

interface StatCardProps {
  readonly label: string;
  readonly value: string | number;
  readonly sublabel?: string;
  readonly accent?: boolean;
}

/**
 * A single stat card shown in the dashboard stats grid.
 */
export function StatCard({ label, value, sublabel, accent = false }: StatCardProps): ReactNode {
  return (
    <div className="stat-card">
      <div className="stat-card__label">{label}</div>
      <div
        className="stat-card__value"
        style={accent ? { color: "var(--color-accent)" } : undefined}
      >
        {value}
      </div>
      {sublabel !== undefined && <div className="stat-card__sublabel">{sublabel}</div>}
    </div>
  );
}
