import type { ReactNode } from "react";
import type { DistributionBucket } from "../types.ts";

interface DistributionChartProps {
  readonly data: readonly DistributionBucket[];
  readonly title: string;
  readonly subtitle?: string;
}

const CHART_WIDTH = 320;
const CHART_HEIGHT = 160;
const PADDING = { top: 8, right: 16, bottom: 4, left: 80 };
const BAR_WIDTH = 28;
const BAR_GAP = 12;
const PLOT_HEIGHT = CHART_HEIGHT - PADDING.top - PADDING.bottom;

/**
 * An inline SVG horizontal bar chart for distribution/comparison data.
 * Each bar represents a bucket value, sorted by value descending.
 */
export function DistributionChart({ data, title, subtitle }: DistributionChartProps): ReactNode {
  if (data.length === 0) {
    return (
      <div className="chart-card">
        <div className="chart-card__header">
          <span className="chart-card__title">{title}</span>
          {subtitle !== undefined && <span className="chart-card__subtitle">{subtitle}</span>}
        </div>
        <div className="chart-card__empty">No data available</div>
      </div>
    );
  }

  // Sort by value descending
  const sorted = [...data].sort((a, b) => b.value - a.value);
  const maxValue = Math.max(...sorted.map((d) => d.value), 1);

  const barColors = ["var(--color-accent)", "var(--color-success)", "var(--color-warning)", "var(--color-danger)"];

  return (
    <div className="chart-card">
      <div className="chart-card__header">
        <span className="chart-card__title">{title}</span>
        {subtitle !== undefined && <span className="chart-card__subtitle">{subtitle}</span>}
      </div>
      <div className="distribution-chart__container">
        <svg
          viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
          className="distribution-chart"
          role="img"
          aria-label={`${title} chart`}
        >
          {sorted.map((bucket, i) => {
            const barLength = (bucket.value / maxValue) * (CHART_WIDTH - PADDING.left - PADDING.right - 36);
            const y = PADDING.top + i * (BAR_WIDTH + BAR_GAP) + 4;
            const color = bucket.color ?? barColors[i % barColors.length];

            return (
              <g key={`bar-${i}`}>
                {/* Label */}
                <text
                  x={PADDING.left - 8}
                  y={y + BAR_WIDTH / 2 + 4}
                  textAnchor="end"
                  fill="var(--color-text-secondary)"
                  fontSize={11}
                >
                  {bucket.label}
                </text>

                {/* Bar */}
                <rect
                  x={PADDING.left}
                  y={y}
                  width={Math.max(barLength, 4)}
                  height={BAR_WIDTH}
                  rx={4}
                  ry={4}
                  fill={color}
                  opacity={0.85}
                />

                {/* Value */}
                <text
                  x={PADDING.left + barLength + 6}
                  y={y + BAR_WIDTH / 2 + 4}
                  fill="var(--color-text-primary)"
                  fontSize={11}
                  fontWeight={600}
                >
                  {bucket.value}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
