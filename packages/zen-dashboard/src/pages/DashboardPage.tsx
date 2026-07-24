import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import type { CheckRun, DashboardStats } from "../types.ts";
import { getCheckRuns, getDashboardStats } from "../api/client.ts";
import { StatCard } from "../components/StatCard.tsx";
import { RecentChecksTable } from "../components/RecentChecksTable.tsx";

/**
 * Main dashboard page — stats summary + recent check runs table.
 */
export function DashboardPage(): ReactNode {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [checks, setChecks] = useState<CheckRun[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load(): Promise<void> {
      try {
        const [statsRes, checksRes] = await Promise.all([getDashboardStats(), getCheckRuns()]);
        if (cancelled) return;

        if (statsRes.error !== null) {
          setError(statsRes.error);
          return;
        }
        if (checksRes.error !== null) {
          setError(checksRes.error);
          return;
        }

        setStats(statsRes.data);
        setChecks(checksRes.data);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load dashboard data");
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div>
      <header className="page-header">
        <h1 className="page-header__title">Dashboard</h1>
        <p className="page-header__subtitle">Overview of recent quality check runs across all repositories.</p>
      </header>

      {error !== null && (
        <div className="error-message" role="alert">
          {error}
        </div>
      )}

      {stats !== null && (
        <div className="stats-grid">
          <StatCard label="Total Checks" value={stats.totalChecks} sublabel="All time" />
          <StatCard
            label="Pass Rate"
            value={`${stats.passRate}%`}
            sublabel="Across all checks"
            accent
          />
          <StatCard label="Active Repos" value={stats.activeRepos} sublabel="Configured repos" />
          <StatCard
            label="Failing Checks"
            value={stats.failingChecks}
            sublabel="Requires attention"
          />
          <StatCard
            label="Avg Duration"
            value={`${stats.avgDuration}s`}
            sublabel="Per check run"
          />
        </div>
      )}

      {stats === null && error === null && <div className="loading">Loading dashboard…</div>}

      <h2
        style={{
          fontSize: "var(--text-lg)",
          fontWeight: "var(--font-semibold)",
          marginBottom: "var(--space-md)",
        }}
      >
        Recent Check Runs
      </h2>

      <RecentChecksTable checks={checks} />
    </div>
  );
}
