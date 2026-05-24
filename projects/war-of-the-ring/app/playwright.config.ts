import { defineConfig, devices } from '@playwright/test';

// E2E scaffold (happy path + visual smoke). The screenshot-driven visual playtest belongs to
// Stage 5; this proves the real web build runs without runtime errors and captures the RegionStack
// density screenshot the build plan calls for. Runs against the dev server on 3005.
export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30000,
  fullyParallel: false,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:3005',
    trace: 'off',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3005',
    reuseExistingServer: true,
    timeout: 60000,
  },
});
