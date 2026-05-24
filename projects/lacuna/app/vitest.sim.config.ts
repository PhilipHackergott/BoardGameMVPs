/// <reference types="vitest/config" />
import { defineConfig } from "vitest/config";

// Config for the heavy AI-vs-AI balance sweep (tests/sim). Kept separate from the
// unit-test config so `npm test` stays fast. Run with `npm run sim` (set SIM_N to
// change games-per-category, default 300). Writes balance-sim.json.
export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/sim/**/*.test.ts"],
    testTimeout: 600_000,
    hookTimeout: 600_000,
  },
});
