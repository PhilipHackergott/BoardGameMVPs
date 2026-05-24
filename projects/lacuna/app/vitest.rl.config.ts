/// <reference types="vitest/config" />
import { defineConfig } from "vitest/config";

// Runner for the RL training / arena entry points (the excluded top-level `rl/` directory,
// which uses @tensorflow/tfjs + node:fs). Kept separate from unit tests and the balance sweep.
// Run via `npm run train` and `npm run arena`. Like tests/sim, these are vitest specs only so
// we reuse the existing TS-via-esbuild runner without adding ts-node/tsx.
export default defineConfig({
  test: {
    environment: "node",
    include: ["rl/**/*.test.ts"],
    testTimeout: 3_600_000,
    hookTimeout: 3_600_000,
    disableConsoleIntercept: true, // stream training logs live (don't buffer test stdout)
  },
});
