import type { ReactNode } from "react";
import type { CheckRun } from "../types.ts";
import { StatusBadge } from "./StatusBadge.tsx";

interface RecentChecksTableProps {
  readonly checks: readonly CheckRun[];
}

/**
 * Table displaying recent check runs with PR, repo, status, and summary.
 */
export function RecentChecksTable({ checks }: RecentChecksTableProps): ReactNode {
  if (checks.length === 0) {
    return (
      <div className="table-container">
        <div className="loading">No check runs found.</div>
      </div>
    );
  }

  return (
    <div className="table-container">
      <table>
        <thead>
          <tr>
            <th>PR</th>
            <th>Repository</th>
            <th>Title</th>
            <th>Status</th>
            <th>Duration</th>
            <th>Summary</th>
          </tr>
        </thead>
        <tbody>
          {checks.map((check) => (
            <tr key={check.id}>
              <td>
                <span className="pr-link">#{check.prNumber}</span>
              </td>
              <td>{check.repoName}</td>
              <td>
                <span className="pr-title">{check.prTitle}</span>
              </td>
              <td>
                <StatusBadge status={check.status} />
              </td>
              <td>{check.duration.toFixed(1)}s</td>
              <td
                style={{
                  color: "var(--color-text-secondary)",
                  fontSize: "var(--text-xs)",
                  maxWidth: 260,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {check.summary}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
