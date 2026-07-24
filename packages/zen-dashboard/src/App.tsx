import type { ReactNode } from "react";
import { Sidebar } from "./components/Sidebar.tsx";
import { DashboardPage } from "./pages/DashboardPage.tsx";
import { RepoCheckHistoryPage } from "./pages/RepoCheckHistoryPage.tsx";
import { CheckDetailPage } from "./pages/CheckDetailPage.tsx";
import { useRoute } from "./router.tsx";

/**
 * Root application component.
 *
 * Uses hash-based routing to switch between dashboard, per-repo pages, and
 * per-check detail views.
 */
export function App(): ReactNode {
  const route = useRoute();

  const mainContent = (() => {
    switch (route.kind) {
      case "check-detail":
        return <CheckDetailPage checkId={route.checkId} />;
      case "repo-checks":
        return <RepoCheckHistoryPage repoId={route.repoId} />;
      default:
        return <DashboardPage />;
    }
  })();

  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">{mainContent}</main>
    </div>
  );
}
