import { defineConfig, devices } from "@playwright/test";

// Stage 5 (test/iterate) visual playtest. Runs against the dev server so the
// dev-only test seam (window.__nightweave) is available to drive canvas clicks.
export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: false,
  use: {
    baseURL: "http://localhost:5173",
    ...devices["Desktop Chrome"],
  },
  webServer: {
    command: "npm run dev -- --port 5173 --strictPort",
    url: "http://localhost:5173",
    reuseExistingServer: true,
    timeout: 60000,
  },
});
