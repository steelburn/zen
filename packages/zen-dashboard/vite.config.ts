import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  define: {
    "process.env.NODE_ENV": '"development"',
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./src/test-setup.ts"],
    include: ["src/**/*.test.tsx", "src/**/*.test.ts"],
    css: true,
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      thresholds: {
        statements: 80,
        branches: 75,
        functions: 80,
        lines: 80,
      },
    },
  },
});
