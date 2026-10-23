import { defineConfig, devices } from "@playwright/test";

// A separate Playwright config tuned for the deck×stake playtest SWEEP. Different from the main
// e2e config: multiple workers (each is its own Chromium → its own WebGL context budget — no
// sharing), longer timeout per test (full runs take time), no retries (a failed playtest is data).
export default defineConfig({
  testDir: "./tests/playtest",
  outputDir: "./test-results-sweep",
  timeout: 240_000, // 4 min per test (2 runs) — full-search AI needs the headroom
  fullyParallel: true,
  workers: 4, // 4 workers ok on a clean host (chrome zombies from prior sweeps must be reaped first)
  retries: 0,
  // JSON reporter writes a structured file that includes every test's stdout — reliable across
  // parallel workers (the line reporter drops some console.log lines under TTY overwrites).
  reporter: [["json", { outputFile: "test-results-sweep/results.json" }], ["list"]],
  use: {
    baseURL: "http://localhost:4317",
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 1,
    screenshot: "off",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "npm run dev -- --port 4317",
    url: "http://localhost:4317",
    reuseExistingServer: true,
    timeout: 60_000,
  },
});
