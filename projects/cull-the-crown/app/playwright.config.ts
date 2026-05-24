import { defineConfig, devices } from "@playwright/test";

// E2E / visual verification. Boots the real Vite build and drives the app in Chromium so we can
// screenshot the PixiJS look (canvas pixels are captured). Used to prove the game-ready aesthetic.

export default defineConfig({
  testDir: "./tests/e2e",
  outputDir: "./test-results",
  timeout: 60_000,
  fullyParallel: false,
  retries: 0,
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
