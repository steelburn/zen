import type { ReactNode } from "react";

/**
 * Sidebar navigation for the ZEN dashboard.
 */
export function Sidebar(): ReactNode {
  return (
    <aside className="sidebar">
      <div className="sidebar__logo">
        <div className="sidebar__logo-icon">Z</div>
        <span>ZEN</span>
      </div>

      <nav className="sidebar__nav">
        <a className="sidebar__link sidebar__link--active" href="/">
          <span>📊</span>
          <span>Dashboard</span>
        </a>
        <a className="sidebar__link" href="/repos">
          <span>📦</span>
          <span>Repositories</span>
        </a>
        <a className="sidebar__link" href="/checks">
          <span>✅</span>
          <span>Check Runs</span>
        </a>
      </nav>

      <div className="sidebar__version">v0.1.0</div>
    </aside>
  );
}
