import { defineConfig, devices } from "@playwright/test";

// WebGL-heavy (the duel mat is a Pixi app). Single worker + a retry absorbs GL-context churn
// and teardown-timing flake — see knowledge/patterns/build-gotchas.md (CtC Pixi UI kit).
export default defineConfig({
  testDir: "tests/e2e",
  workers: 1,
  retries: 1,
  timeout: 60_000,
  use: { ...devices["Desktop Chrome"], baseURL: "http://localhost:5173" },
  webServer: {
    command: "npm run dev",
    url: "http://localhost:5173",
    reuseExistingServer: true,
    timeout: 60_000,
  },
});
