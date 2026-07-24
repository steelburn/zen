import type { ReactNode } from "react";
import { Sidebar } from "./components/Sidebar.tsx";
import { DashboardPage } from "./pages/DashboardPage.tsx";

/**
 * Root application component.
 */
export function App(): ReactNode {
  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        <DashboardPage />
      </main>
    </div>
  );
}
