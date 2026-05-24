import { defineConfig } from '@playwright/test';

// E2E happy-path harness. Serves the static production build (fast + matches the Stage-5 /test setup);
// the full visual playtest (screenshots + multimodal review) is the qa-playtester's job.
export default defineConfig({
  testDir: './tests/e2e',
  timeout: 60_000,
  use: { baseURL: 'http://localhost:4173', headless: true },
  webServer: {
    command: 'npm run build && npm run preview',
    url: 'http://localhost:4173',
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
