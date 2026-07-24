import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App.tsx";
import "./styles/globals.css";

const rootElement = document.getElementById("root");

if (rootElement === null) {
  throw new Error("Root element not found — ensure index.html has <div id=\"root\"></div>");
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
