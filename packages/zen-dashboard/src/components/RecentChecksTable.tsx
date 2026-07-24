import { useCallback } from "react";
import type { ReactNode } from "react";
import type { CheckRun } from "../types.ts";
import { Link, navigateToCheck } from "../router.tsx";
import { StatusBadge } from "./StatusBadge.tsx";

interface RecentChecksTableProps {
  readonly checks: readonly CheckRun[];
}

/**
 * Table displaying recent check runs with PR, repo, status, and summary.
 *
 * - Clicking a row navigates to the full check detail view.
 * - Repo names link to their per-repo check history page.
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
            <CheckRow key={check.id} check={check} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

interface CheckRowProps {
  readonly check: CheckRun;
}

function CheckRow({ check }: CheckRowProps): ReactNode {
  const handleClick = useCallback(() => {
    navigateToCheck(check.id);
  }, [check.id]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        navigateToCheck(check.id);
      }
    },
    [check.id],
  );

  return (
    <tr
      className="check-row clickable-row"
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="button"
      aria-label={`View details for PR #${check.prNumber}: ${check.prTitle}`}
    >
      <td>
        <span className="pr-link">#{check.prNumber}</span>
      </td>
      <td>
        <a
          href={`#/repos/${encodeURIComponent(check.repoId)}`}
          className="repo-link"
          onClick={(e) => e.stopPropagation()}
        >
          {check.repoName}
        </a>
      </td>
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
  );
}
