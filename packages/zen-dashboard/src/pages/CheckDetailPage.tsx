import { useCallback, useEffect, useState } from "react";
import type { ReactNode } from "react";
import type { CheckRun, FileResult } from "../types.ts";
import { getCheckRun } from "../api/client.ts";
import { StatusBadge } from "../components/StatusBadge.tsx";
import { navigate } from "../router.tsx";

interface CheckDetailPageProps {
  readonly checkId: string;
}

const CHECK_LABELS: Record<string, string> = {
  coverage: "Coverage",
  lint: "Lint",
  complexity: "Complexity",
};

const CHECK_ICONS: Record<string, string> = {
  coverage: "🎯",
  lint: "🔍",
  complexity: "⚡",
};

/**
 * Detail view for a single check run with per-file result breakdowns.
 *
 * Route: #/checks/:checkId
 */
export function CheckDetailPage({ checkId }: CheckDetailPageProps): ReactNode {
  const [check, setCheck] = useState<CheckRun | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeCheckType, setActiveCheckType] = useState<string>("coverage");

  useEffect(() => {
    let cancelled = false;

    async function load(): Promise<void> {
      try {
        const res = await getCheckRun(checkId);
        if (cancelled) return;

        if (res.error !== null) {
          setError(res.error);
          return;
        }
        if (res.data === null) {
          setError("Check run not found.");
          return;
        }

        setCheck(res.data);

        // Set initial active tab to the first failed check type, or first available
        const failedType = res.data.results.find((r) => r.status === "fail");
        if (failedType !== undefined) {
          setActiveCheckType(failedType.type);
        } else if (Object.keys(res.data.fileResults).length > 0) {
          setActiveCheckType(Object.keys(res.data.fileResults)[0]!);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load check details");
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [checkId]);

  const handleBack = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    navigate("");
  }, []);

  if (error !== null) {
    return (
      <div>
        <header className="page-header">
          <a href="#/" className="back-link" onClick={handleBack}>
            ← Back to Dashboard
          </a>
          <h1 className="page-header__title">Check Run Not Found</h1>
        </header>
        <div className="error-message" role="alert">
          {error}
        </div>
      </div>
    );
  }

  if (check === null) {
    return (
      <div>
        <header className="page-header">
          <a href="#/" className="back-link" onClick={handleBack}>
            ← Back to Dashboard
          </a>
          <h1 className="page-header__title">Loading…</h1>
        </header>
        <div className="loading">Loading check details…</div>
      </div>
    );
  }

  const checkTypes = Object.keys(check.fileResults);

  return (
    <div>
      {/* Breadcrumb */}
      <nav className="breadcrumb">
        <a
          href="#/"
          onClick={(e) => {
            e.preventDefault();
            navigate("");
          }}
        >
          Dashboard
        </a>
        <span className="breadcrumb__separator">/</span>
        <a
          href={`#/repos/${encodeURIComponent(check.repoId)}`}
          onClick={(e) => {
            e.preventDefault();
            navigate(`/repos/${encodeURIComponent(check.repoId)}`);
          }}
        >
          {check.repoName}
        </a>
        <span className="breadcrumb__separator">/</span>
        <span>
          #{check.prNumber}
        </span>
      </nav>

      {/* Header */}
      <header className="page-header">
        <h1 className="page-header__title">
          {check.repoName}/#{check.prNumber} — {check.prTitle}
        </h1>
        <p className="page-header__subtitle">
          Branch: <code>{check.branch}</code> &middot; Commit:{" "}
          <code>{check.commitSha.substring(0, 7)}</code> &middot; Duration:{" "}
          {check.duration.toFixed(1)}s &middot;{" "}
          {new Date(check.timestamp).toLocaleString()}
        </p>
      </header>

      {/* Summary card */}
      <div className="check-detail-summary-card">
        <div className="check-detail-summary-card__status">
          <StatusBadge status={check.status} />
        </div>
        <p className="check-detail-summary-card__text">{check.summary}</p>
      </div>

      {/* Per-check-type tabs */}
      <div className="check-type-tabs">
        {checkTypes.map((type) => {
          const result = check.results.find((r) => r.type === type);
          const fileCount = check.fileResults[type].length;
          return (
            <button
              key={type}
              className={`check-type-tab ${activeCheckType === type ? "check-type-tab--active" : ""}`}
              onClick={() => setActiveCheckType(type)}
            >
              <span className="check-type-tab__icon">{CHECK_ICONS[type]}</span>
              <span className="check-type-tab__label">{CHECK_LABELS[type]}</span>
              {result !== undefined && (
                <>
                  <span className="check-type-tab__score">
                    {result.type === "coverage" ? `${result.score}%` : result.score}
                  </span>
                  <StatusBadge status={result.status} />
                </>
              )}
              <span className="check-type-tab__count">{fileCount} files</span>
            </button>
          );
        })}
      </div>

      {/* Per-file results table */}
      <div className="file-results-section">
        <h2 className="file-results-section__title">
          {CHECK_ICONS[activeCheckType]} {CHECK_LABELS[activeCheckType]} — Per-File Results
        </h2>

        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>File</th>
                <th>Status</th>
                <th>Score</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              {check.fileResults[activeCheckType].length === 0 ? (
                <tr>
                  <td colSpan={4} className="file-results__empty">
                    No file results available yet — check is still running.
                  </td>
                </tr>
              ) : (
                check.fileResults[activeCheckType].map((file: FileResult) => (
                  <tr key={file.path} className="file-result-row">
                    <td className="file-result-row__path">
                      <code>{file.path}</code>
                    </td>
                    <td>
                      <StatusBadge status={file.status} />
                    </td>
                    <td className="file-result-row__score">
                      {file.score}
                      {activeCheckType === "coverage" ? "%" : ""}
                    </td>
                    <td className="file-result-row__details">{file.details}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
