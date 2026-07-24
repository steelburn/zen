import type { ReactNode } from "react";
import type { TrendDataPoint } from "../types.ts";

interface TrendChartProps {
  readonly data: readonly TrendDataPoint[];
  readonly title: string;
  readonly subtitle?: string;
  readonly accent?: boolean;
  readonly yLabel?: string;
}

const CHART_WIDTH = 320;
const CHART_HEIGHT = 160;
const PADDING = { top: 16, right: 16, bottom: 28, left: 36 };
const PLOT_WIDTH = CHART_WIDTH - PADDING.left - PADDING.right;
const PLOT_HEIGHT = CHART_HEIGHT - PADDING.top - PADDING.bottom;

/**
 * An inline SVG line chart showing a trend over time.
 * Renders a filled area + line for the primary value and an optional
 * dashed line for a secondary value (e.g. rolling average or baseline).
 */
export function TrendChart({ data, title, subtitle, accent = false, yLabel }: TrendChartProps): ReactNode {
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

  const values = data.map((d) => d.value);
  const secondaryValues = data.some((d) => d.secondary !== undefined)
    ? data.map((d) => d.secondary ?? 0)
    : null;

  const minVal = Math.min(
    ...values,
    secondaryValues !== null ? Math.min(...secondaryValues) : Infinity,
  );
  const maxVal = Math.max(
    ...values,
    secondaryValues !== null ? Math.max(...secondaryValues) : -Infinity,
  );
  const valRange = maxVal - minVal || 1;
  const paddingRatio = 0.1;
  const yMin = minVal - valRange * paddingRatio;
  const yMax = maxVal + valRange * paddingRatio;
  const yRange = yMax - yMin || 1;

  const xScale = (_i: number): number => {
    const i = Math.min(_i, data.length - 1);
    return PADDING.left + (i / Math.max(data.length - 1, 1)) * PLOT_WIDTH;
  };

  const yScale = (v: number): number => {
    return PADDING.top + PLOT_HEIGHT - ((v - yMin) / yRange) * PLOT_HEIGHT;
  };

  // Build path strings
  const linePath = data
    .map((d, i) => `${i === 0 ? "M" : "L"}${xScale(i).toFixed(1)},${yScale(d.value).toFixed(1)}`)
    .join(" ");

  // Area fill path (line + bottom closing)
  const areaPath = `${linePath} L${xScale(data.length - 1).toFixed(1)},${yScale(yMin).toFixed(1)} L${xScale(0).toFixed(1)},${yScale(yMin).toFixed(1)} Z`;

  // Secondary dashed line
  let secondaryPath: string | null = null;
  if (secondaryValues !== null) {
    secondaryPath = data
      .map(
        (d, i) =>
          `${i === 0 ? "M" : "L"}${xScale(i).toFixed(1)},${yScale(d.secondary ?? 0).toFixed(1)}`,
      )
      .join(" ");
  }

  // Y-axis ticks
  const yTicks = 4;
  const yTickValues = Array.from({ length: yTicks + 1 }, (_, i) => yMin + (yRange / yTicks) * i);

  const accentColor = "var(--color-accent)";
  const secondaryColor = "var(--color-text-muted)";
  const fillColor = accent
    ? "rgba(108, 92, 231, 0.1)"
    : "rgba(0, 206, 201, 0.08)";
  const strokeColor = accent ? accentColor : "var(--color-success)";

  return (
    <div className="chart-card">
      <div className="chart-card__header">
        <span className="chart-card__title">{title}</span>
        {subtitle !== undefined && <span className="chart-card__subtitle">{subtitle}</span>}
      </div>
      <svg
        viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
        className="trend-chart"
        role="img"
        aria-label={`${title} chart`}
      >
        {/* Y-axis grid lines */}
        {yTickValues.map((v, i) => (
          <g key={`grid-${i}`}>
            <line
              x1={PADDING.left}
              y1={yScale(v)}
              x2={CHART_WIDTH - PADDING.right}
              y2={yScale(v)}
              stroke="var(--color-border)"
              strokeWidth={0.5}
            />
            <text
              x={PADDING.left - 6}
              y={yScale(v) + 3}
              textAnchor="end"
              fill="var(--color-text-muted)"
              fontSize={9}
            >
              {Math.round(v)}
            </text>
          </g>
        ))}

        {/* X-axis labels */}
        {data.map((d, i) => {
          // Show every label or at most 5 evenly spaced
          const step = Math.max(1, Math.floor(data.length / 5));
          if (i % step !== 0 && i !== data.length - 1) return null;
          return (
            <text
              key={`xlabel-${i}`}
              x={xScale(i)}
              y={CHART_HEIGHT - 4}
              textAnchor="middle"
              fill="var(--color-text-muted)"
              fontSize={9}
            >
              {d.label}
            </text>
          );
        })}

        {/* Y-axis label */}
        {yLabel !== undefined && (
          <text
            x={8}
            y={PADDING.top + PLOT_HEIGHT / 2}
            textAnchor="middle"
            fill="var(--color-text-muted)"
            fontSize={8}
            transform={`rotate(-90, 8, ${PADDING.top + PLOT_HEIGHT / 2})`}
          >
            {yLabel}
          </text>
        )}

        {/* Area fill */}
        <path d={areaPath} fill={fillColor} />

        {/* Secondary line (dashed) */}
        {secondaryPath !== null && (
          <path
            d={secondaryPath}
            fill="none"
            stroke={secondaryColor}
            strokeWidth={1.2}
            strokeDasharray="4 3"
          />
        )}

        {/* Primary line */}
        <path d={linePath} fill="none" stroke={strokeColor} strokeWidth={2} />

        {/* Data points */}
        {data.map((d, i) => (
          <circle
            key={`point-${i}`}
            cx={xScale(i)}
            cy={yScale(d.value)}
            r={3}
            fill={strokeColor}
            stroke="var(--color-surface)"
            strokeWidth={1.5}
          />
        ))}
      </svg>
      <div className="chart-card__footer">
        <span className="chart-card__stat">
          Latest: <strong>{data[data.length - 1]?.value ?? "—"}</strong>
        </span>
        {data.length > 1 && (
          <span className="chart-card__stat">
            Change:{" "}
            <strong
              style={{
                color:
                  data[data.length - 1]!.value >= data[0]!.value
                    ? "var(--color-success)"
                    : "var(--color-danger)",
              }}
            >
              {data[data.length - 1]!.value >= data[0]!.value ? "+" : ""}
              {Math.round(((data[data.length - 1]!.value - data[0]!.value) / data[0]!.value) * 100)}
              %
            </strong>
          </span>
        )}
      </div>
    </div>
  );
}
