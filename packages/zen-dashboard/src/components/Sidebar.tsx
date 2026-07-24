import type { ReactNode } from "react";
import { Link, useRoute } from "../router.tsx";

/**
 * Sidebar navigation for the ZEN dashboard.
 */
export function Sidebar(): ReactNode {
  const route = useRoute();

  return (
    <aside className="sidebar">
      <Link href="" className="sidebar__logo">
        <div className="sidebar__logo-icon">Z</div>
        <span>ZEN</span>
      </Link>

      <nav className="sidebar__nav">
        <Link
          href=""
          className="sidebar__link"
          activeClassName="sidebar__link--active"
          current={route.kind === "dashboard"}
        >
          <span>📊</span>
          <span>Dashboard</span>
        </Link>
        <Link
          href="/repos"
          className="sidebar__link"
          activeClassName="sidebar__link--active"
          current={route.kind === "repos" || route.kind === "repo-checks"}
        >
          <span>📦</span>
          <span>Repositories</span>
        </Link>
        <Link
          href="/checks"
          className="sidebar__link"
          activeClassName="sidebar__link--active"
          current={route.kind === "checks"}
        >
          <span>✅</span>
          <span>Check Runs</span>
        </Link>
      </nav>

      <div className="sidebar__version">v0.1.0</div>
    </aside>
  );
}
