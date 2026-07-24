/**
 * Lightweight hash-based router for the ZEN dashboard.
 *
 * Routes:
 *   #/                    → Dashboard
 *   #/repos/:repoId       → Per-repo check history
 *   #/repos               → Repository list (placeholder)
 *   #/checks              → All check runs (placeholder)
 *   #/checks/:checkId     → Single check detail with per-file results
 */

import { useCallback, useEffect, useState } from "react";
import type { ReactNode } from "react";

// ---------------------------------------------------------------------------
// Route map
// ---------------------------------------------------------------------------

export interface RouteDashboard {
  readonly kind: "dashboard";
}

export interface RouteRepos {
  readonly kind: "repos";
}

export interface RouteRepoChecks {
  readonly kind: "repo-checks";
  readonly repoId: string;
}

export interface RouteChecks {
  readonly kind: "checks";
}

export interface RouteCheckDetail {
  readonly kind: "check-detail";
  readonly checkId: string;
}

export type Route = RouteDashboard | RouteRepos | RouteRepoChecks | RouteChecks | RouteCheckDetail;

// ---------------------------------------------------------------------------
// Parsing
// ---------------------------------------------------------------------------

/**
 * Parse a hash fragment into a Route.
 * Defaults to the dashboard route when hash is empty or unrecognised.
 */
export function parseHash(hash: string): Route {
  const h = hash.replace(/^#/, "") || "/";

  // /repos/:repoId
  const repoMatch = h.match(/^\/repos\/([^/]+)$/);
  if (repoMatch !== null) {
    return { kind: "repo-checks", repoId: decodeURIComponent(repoMatch[1]!) };
  }

  // /checks/:checkId
  const checkDetailMatch = h.match(/^\/checks\/([^/]+)$/);
  if (checkDetailMatch !== null) {
    return { kind: "check-detail", checkId: decodeURIComponent(checkDetailMatch[1]!) };
  }

  switch (h) {
    case "/repos":
      return { kind: "repos" };
    case "/checks":
      return { kind: "checks" };
    default:
      return { kind: "dashboard" };
  }
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

let _listenerAttached = false;

/**
 * Subscribe to hash changes and return the current Route.
 */
export function useRoute(): Route {
  const [route, setRoute] = useState<Route>(() => parseHash(window.location.hash));

  useEffect(() => {
    function onHashChange(): void {
      setRoute(parseHash(window.location.hash));
    }

    // Only attach the global listener once
    if (!_listenerAttached) {
      window.addEventListener("hashchange", onHashChange);
      _listenerAttached = true;
    }

    return () => {
      // Cleanup on unmount of the last consumer
    };
  }, []);

  return route;
}

// ---------------------------------------------------------------------------
// Navigation helper
// ---------------------------------------------------------------------------

/**
 * Navigate to a route by setting the hash.
 */
export function navigate(hash: string): void {
  window.location.hash = hash;
}

/**
 * Navigate to a repo's check history page.
 */
export function navigateToRepo(repoId: string): void {
  navigate(`/repos/${encodeURIComponent(repoId)}`);
}

/**
 * Navigate to a specific check run's detail page.
 */
export function navigateToCheck(checkId: string): void {
  navigate(`/checks/${encodeURIComponent(checkId)}`);
}

// ---------------------------------------------------------------------------
// Link component
// ---------------------------------------------------------------------------

interface LinkProps {
  readonly href: string;
  readonly children: ReactNode;
  readonly className?: string;
  readonly activeClassName?: string;
  readonly current?: boolean;
  /** Additional click handler callled after navigation. */
  readonly onClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void;
}

/**
 * An anchor element that uses hash-based navigation.
 */
export function Link({ href, children, className, activeClassName, current, onClick }: LinkProps): ReactNode {
  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>) => {
      e.preventDefault();
      navigate(href);
      onClick?.(e);
    },
    [href, onClick],
  );

  const resolvedClass =
    current && activeClassName ? `${className ?? ""} ${activeClassName}`.trim() : className;

  return (
    <a href={`#${href}`} onClick={handleClick} className={resolvedClass}>
      {children}
    </a>
  );
}
