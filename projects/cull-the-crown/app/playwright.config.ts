import { defineConfig, devices } from "@playwright/test";

// E2E / visual verification. Boots the real Vite build and drives the app in Chromium so we can
// screenshot the PixiJS look (canvas pixels are captured). Used to prove the game-ready aesthetic.

export default defineConfig({
  testDir: "./tests/e2e",
  outputDir: "./test-results",
  timeout: 60_000,
  fullyParallel: false,
  // One worker: every screen/modal spins up its own full-window WebGL context, and running files in
  // parallel exhausts the browser's context budget (contexts get lost → flaky renders). Serialize.
  workers: 1,
  retries: 1, // a lone retry absorbs the occasional Pixi teardown-timing flake
  reporter: [["list"]],
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
