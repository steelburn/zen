import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import type { CheckRun, CheckResult, FileResult, Repo } from "../types.ts";
import { getCheckRun, getCheckRuns, getRepos } from "../api/client.ts";
import { StatusBadge } from "../components/StatusBadge.tsx";
import { navigate, navigateToCheck } from "../router.tsx";

interface RepoCheckHistoryPageProps {
  readonly repoId: string;
}

/**
 * Per-repo check history page.
 *
 * Shows repository metadata, summary stats, and the full list of check runs
 * filtered to the given repository.
 */
export function RepoCheckHistoryPage({ repoId }: RepoCheckHistoryPageProps): ReactNode {
  const [repo, setRepo] = useState<Repo | null>(null);
  const [checks, setChecks] = useState<CheckRun[]>([]);
  const [selectedCheck, setSelectedCheck] = useState<CheckRun | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load(): Promise<void> {
      try {
        const [reposRes, checksRes] = await Promise.all([getRepos(), getCheckRuns(repoId)]);

        if (cancelled) return;

        if (reposRes.error !== null) {
          setError(reposRes.error);
          return;
        }
        if (checksRes.error !== null) {
          setError(checksRes.error);
          return;
        }

        const found = reposRes.data.find((r) => r.id === repoId) ?? null;
        if (found === null) {
          setError(`Repository "${repoId}" not found.`);
          return;
        }

        setRepo(found);
        setChecks(checksRes.data);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load repository data");
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [repoId]);

  // Reset selected check when repo changes
  useEffect(() => {
    setSelectedCheck(null);
  }, [repoId]);

  // Compute stats
  const totalChecks = checks.length;
  const passed = checks.filter((c) => c.status === "pass").length;
  const failed = checks.filter((c) => c.status === "fail").length;
  const pending = checks.filter((c) => c.status === "pending").length;
  const passRate = totalChecks > 0 ? Math.round((passed / totalChecks) * 100) : 0;
  const avgDuration =
    totalChecks > 0
      ? checks.reduce((sum, c) => sum + c.duration, 0) / totalChecks
      : 0;

  if (error !== null) {
    return (
      <div>
        <header className="page-header">
          <h1 className="page-header__title">Repository</h1>
        </header>
        <div className="error-message" role="alert">
          <span>{error}</span>
        </div>
        <button
          className="btn btn--secondary"
          onClick={() => navigate("")}
          style={{ marginTop: "var(--space-md)" }}
        >
          ← Back to Dashboard
        </button>
      </div>
    );
  }

  if (repo === null) {
    return <div className="loading">Loading repository…</div>;
  }

  return (
    <div>
      {/* Breadcrumb navigation */}
      <nav className="breadcrumb">
        <a
          href="#"
          onClick={(e) => {
            e.preventDefault();
            navigate("");
          }}
        >
          Dashboard
        </a>
        <span className="breadcrumb__separator">/</span>
        <span>{repo.name}</span>
      </nav>

      {/* Repo header */}
      <header className="page-header">
        <h1 className="page-header__title">
          <span className="repo-header__owner">{repo.owner}/</span>
          {repo.name}
        </h1>
        <p className="page-header__subtitle">
          <a href={repo.url} target="_blank" rel="noopener noreferrer">
            {repo.url}
          </a>
          {" · "}
          default branch: <code>{repo.defaultBranch}</code>
          {" · "}
          <span className={repo.active ? "text-success" : "text-muted"}>
            {repo.active ? "Active" : "Inactive"}
          </span>
        </p>
      </header>

      {/* Stats summary */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-card__label">Total Checks</div>
          <div className="stat-card__value">{totalChecks}</div>
          <div className="stat-card__sublabel">All time</div>
        </div>
        <div className="stat-card">
          <div className="stat-card__label">Pass Rate</div>
          <div className="stat-card__value" style={{ color: "var(--color-accent)" }}>
            {passRate}%
          </div>
          <div className="stat-card__sublabel">
            {passed} passed · {failed} failed · {pending} pending
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card__label">Passed</div>
          <div className="stat-card__value" style={{ color: "var(--color-success)" }}>
            {passed}
          </div>
          <div className="stat-card__sublabel">Checks passing</div>
        </div>
        <div className="stat-card">
          <div className="stat-card__label">Failed</div>
          <div className="stat-card__value" style={{ color: "var(--color-danger)" }}>
            {failed}
          </div>
          <div className="stat-card__sublabel">Requires attention</div>
        </div>
        <div className="stat-card">
          <div className="stat-card__label">Avg Duration</div>
          <div className="stat-card__value">{avgDuration.toFixed(1)}s</div>
          <div className="stat-card__sublabel">Per check run</div>
        </div>
      </div>

      {/* Check runs */}
      <h2
        style={{
          fontSize: "var(--text-lg)",
          fontWeight: "var(--font-semibold)",
          marginBottom: "var(--space-md)",
        }}
      >
        Check History
      </h2>

      {checks.length === 0 ? (
        <div className="table-container">
          <div className="loading">No check runs found for this repository.</div>
        </div>
      ) : (
        <div className="check-history-layout">
          {/* Check runs table */}
          <div className="check-history-table">
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>PR</th>
                    <th>Title</th>
                    <th>Branch</th>
                    <th>Status</th>
                    <th>Duration</th>
                    <th>Date</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {checks.map((check) => (
                    <tr
                      key={check.id}
                      className={
                        selectedCheck?.id === check.id ? "row--selected" : undefined
                      }
                      onClick={() => setSelectedCheck(check)}
                      style={{ cursor: "pointer" }}
                    >
                      <td>
                        <span className="pr-link">#{check.prNumber}</span>
                      </td>
                      <td>
                        <span className="pr-title">{check.prTitle}</span>
                      </td>
                      <td>
                        <code className="branch-name">{check.branch}</code>
                      </td>
                      <td>
                        <StatusBadge status={check.status} />
                      </td>
                      <td>{check.duration.toFixed(1)}s</td>
                      <td className="text-muted">
                        {formatDate(check.timestamp)}
                      </td>
                      <td>
                        <span className="chevron">
                          {selectedCheck?.id === check.id ? "▼" : "▶"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Selected check detail panel */}
          {selectedCheck !== null && (
            <div className="check-detail-panel">
              <CheckDetail check={selectedCheck} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Check detail sub-component
// ---------------------------------------------------------------------------

interface CheckDetailProps {
  readonly check: CheckRun;
}

function CheckDetail({ check }: CheckDetailProps): ReactNode {
  const hasFileResults = Object.values(check.fileResults).some(
    (files) => files.length > 0,
  );

  return (
    <div>
      <div className="check-detail-header">
        <h3 className="check-detail-title">
          PR #{check.prNumber} — {check.prTitle}
        </h3>
        <StatusBadge status={check.status} />
      </div>

      <div className="check-detail-meta">
        <div className="check-detail-meta-item">
          <span className="check-detail-meta-label">Commit</span>
          <code className="check-detail-meta-value">{check.commitSha.slice(0, 7)}</code>
        </div>
        <div className="check-detail-meta-item">
          <span className="check-detail-meta-label">Branch</span>
          <code className="check-detail-meta-value">{check.branch}</code>
        </div>
        <div className="check-detail-meta-item">
          <span className="check-detail-meta-label">Duration</span>
          <span className="check-detail-meta-value">{check.duration.toFixed(1)}s</span>
        </div>
        <div className="check-detail-meta-item">
          <span className="check-detail-meta-label">Date</span>
          <span className="check-detail-meta-value">{formatDate(check.timestamp)}</span>
        </div>
      </div>

      <p className="check-detail-summary">{check.summary}</p>

      <h4 className="check-detail-results-title">Individual Checks</h4>

      <div className="check-results">
        {check.results.map((result) => (
          <CheckResultCard key={result.type} result={result} />
        ))}
      </div>

      {/* Per-file results summary */}
      {hasFileResults && (
        <div className="check-detail-file-summary">
          <h4 className="check-detail-results-title">Per-File Results</h4>
          <div className="file-results-preview">
            {check.results.map((result) => {
              const files = check.fileResults[result.type] ?? [];
              if (files.length === 0) return null;

              const failedFiles = files.filter((f) => f.status === "fail");
              const label = result.type.charAt(0).toUpperCase() + result.type.slice(1);

              return (
                <div key={result.type} className="file-results-preview__group">
                  <span className="file-results-preview__label">{label}:</span>
                  <span className="file-results-preview__count">
                    {files.length} file{files.length !== 1 ? "s" : ""}
                  </span>
                  {failedFiles.length > 0 && (
                    <span className="file-results-preview__failures">
                      {failedFiles.length} failing
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Link to full detail page */}
      <div className="check-detail-actions">
        <button
          className="btn btn--secondary"
          onClick={() => navigateToCheck(check.id)}
        >
          View Full Details →
        </button>
      </div>
    </div>
  );
}

interface CheckResultCardProps {
  readonly result: CheckResult;
}

function CheckResultCard({ result }: CheckResultCardProps): ReactNode {
  const statusClass = `check-result-card check-result-card--${result.status}`;

  return (
    <div className={statusClass}>
      <div className="check-result-card__header">
        <StatusBadge status={result.status} />
        <span className="check-result-card__label">{result.type}</span>
      </div>
      <div className="check-result-card__score">
        {result.type === "coverage"
          ? `${result.score}%`
          : result.score.toLocaleString()}{" "}
        <span className="check-result-card__threshold">
          / {result.threshold}{result.type === "coverage" ? "%" : ""}
        </span>
      </div>
      <div className="check-result-card__details">{result.details}</div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(timestamp: string): string {
  const date = new Date(timestamp);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
