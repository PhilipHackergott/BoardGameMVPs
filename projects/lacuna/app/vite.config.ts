/// <reference types="vitest/config" />
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

// Dev-only endpoint: the WebGPU browser trainer (train.html) POSTs its progress/Elo lines here
// so they're durable on disk (rl-webgpu-progress.log) and tail-able from outside the browser.
function rlLogPlugin() {
  const logPath = resolve(process.cwd(), "rl-webgpu-progress.log");
  const ctrlPath = resolve(process.cwd(), "rl-control.json");
  return {
    name: "rl-log",
    configureServer(server: any) {
      server.middlewares.use("/rl-log", (req: any, res: any) => {
        if (req.method !== "POST") {
          res.statusCode = 405;
          res.end();
          return;
        }
        let body = "";
        req.on("data", (c: any) => (body += c));
        req.on("end", () => {
          try {
            appendFileSync(logPath, body.endsWith("\n") ? body : body + "\n");
          } catch {
            /* ignore */
          }
          res.statusCode = 204;
          res.end();
        });
      });
      // Persist the best checkpoint to disk (rl-checkpoints/webgpu-best.json) so it can be
      // rated with the full-MCTS arena without a manual browser download.
      server.middlewares.use("/rl-save", (req: any, res: any) => {
        if (req.method !== "POST") {
          res.statusCode = 405;
          res.end();
          return;
        }
        const chunks: Buffer[] = [];
        req.on("data", (c: Buffer) => chunks.push(c));
        req.on("end", () => {
          try {
            const dir = resolve(process.cwd(), "rl-checkpoints");
            mkdirSync(dir, { recursive: true });
            writeFileSync(resolve(dir, "webgpu-best.json"), Buffer.concat(chunks));
          } catch {
            /* ignore */
          }
          res.statusCode = 204;
          res.end();
        });
      });
      // Live training knobs the trainer polls each generation (edit rl-control.json to retune
      // concurrent/sims/batch/steps/replay/reportEvery WITHOUT relaunching the browser).
      server.middlewares.use("/rl-control", (_req: any, res: any) => {
        res.setHeader("content-type", "application/json");
        try {
          res.end(existsSync(ctrlPath) ? readFileSync(ctrlPath, "utf8") : "{}");
        } catch {
          res.end("{}");
        }
      });
    },
  };
}

export default defineConfig({
  base: "./",
  plugins: [react(), rlLogPlugin()],
  test: {
    environment: "node",
    // Unit tests only. The heavy AI-vs-AI balance sweep lives in tests/sim and runs
    // via its own config (`npm run sim`) so it doesn't slow the normal test run.
    include: ["tests/engine/**/*.test.ts"],
  },
});
