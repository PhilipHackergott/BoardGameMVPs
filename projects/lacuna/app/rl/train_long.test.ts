// Long, time-bounded training driver for the scaled pipeline (WASM backend + batched self-play
// + ResNet-lite). Runs for RL_MINUTES, printing a regular ELO UPDATE (the trained net's rating
// + win% vs random/low/medium/HARD) and saving a milestone checkpoint at each report. Designed
// to run for hours and climb toward beating the hard heuristic. Run with:
//   npm run train:long
//   RL_MINUTES=150 RL_FILTERS=64 RL_BLOCKS=6 RL_CONCURRENT=96 RL_SIMS=48 npm run train:long
//
// Lives in the tsconfig-excluded rl/ dir (tfjs + node:fs); executed via vitest/esbuild.

import { it } from "vitest";
import { appendFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { DEFAULT_ARCH, batchEvaluator, buildModel, exportWeights, initBackend, toEvaluator, trainOnBatch } from "./network";
import { runBatchedSelfPlay } from "../src/rl/selfplay_batched";
import type { SelfPlaySample } from "../src/rl/types";
import { headToHead, runArena } from "./arena";
import type { ArenaParticipant } from "./arena";
import { rateVsFixed } from "../src/rl/elo";
import { BC_SIZE, bcCell } from "../src/rl/behavior";
import { HeuristicAgent, MctsAgent, RandomAgent } from "../src/rl/agents";
import { buildRegistry, saveCheckpoint, saveRegistry } from "./io";
import type { CheckpointMeta } from "../src/rl/checkpoint";

const num = (k: string, d: number): number => Number(process.env[k] ?? d);

const MINUTES = num("RL_MINUTES", 120);
const POP = num("RL_POP", 1);
const CONCURRENT = num("RL_CONCURRENT", 80); // games in flight = NN batch size
const SIMS = num("RL_SIMS", 40);
const GAMES_PER_GEN = num("RL_GAMES", CONCURRENT); // self-play games per model per generation
const BATCH = num("RL_BATCH", 256);
const TRAIN_STEPS = num("RL_TRAIN_STEPS", 200);
const REPLAY_CAP = num("RL_REPLAY", 80000);
const LR = num("RL_LR", 2e-3);
const REPORT_MINUTES = num("RL_REPORT_MINUTES", 8);
const ARENA_GAMES = num("RL_ARENA_GAMES", 8); // per anchor, per report
const ARENA_SIMS = num("RL_ARENA_SIMS", Math.min(SIMS, 32));
const COUNTS = (process.env.RL_PLAYERS ?? "2").split(",").map(Number);

it(
  "RL long run: scaled self-play training with periodic Elo reports",
  async () => {
    // Durable progress log (vitest buffers test stdout, so write reports straight to a file).
    const PROGRESS = resolve(process.cwd(), "rl-progress.log");
    writeFileSync(PROGRESS, "");
    const log = (s: string): void => {
      console.log(s);
      appendFileSync(PROGRESS, `${s}\n`);
    };

    const backend = await initBackend();
    const arch = DEFAULT_ARCH;
    log(
      `backend=${backend} | arch: MLP hidden=${arch.hidden} layers=${arch.layers} | pop=${POP} concurrent=${CONCURRENT} sims=${SIMS} batch=${BATCH} steps/gen=${TRAIN_STEPS} | budget=${MINUTES}min`,
    );

    // Fixed anchor ratings (heuristic ladder + random), computed once — they pin the Elo scale
    // so the trained net's rating is comparable across reports.
    const anchorAgents: ArenaParticipant[] = [
      { name: "random", agent: new RandomAgent() },
      { name: "heuristic-low", agent: new HeuristicAgent("low") },
      { name: "heuristic-medium", agent: new HeuristicAgent("medium") },
      { name: "heuristic-hard", agent: new HeuristicAgent("hard") },
    ];
    const anchorArena = runArena(anchorAgents, 60);
    const anchorElo: Record<string, number> = {};
    anchorAgents.forEach((a, i) => (anchorElo[a.name] = anchorArena.ratings[i]));
    log(`anchor Elo: ${anchorAgents.map((a) => `${a.name}=${anchorElo[a.name]}`).join("  ")}`);

    const models = Array.from({ length: POP }, () => buildModel(arch, LR));
    const batchEvals = models.map((m) => batchEvaluator(m));
    const replay: SelfPlaySample[][] = models.map(() => []);
    const bcSum: number[][] = models.map(() => new Array(BC_SIZE).fill(0));
    const bcCnt: number[] = models.map(() => 0);
    const allMetas: CheckpointMeta[] = [];
    const bestElo: number[] = models.map(() => -Infinity);

    const start = Date.now();
    const elapsedMin = (): number => (Date.now() - start) / 60000;
    let gen = 0;
    let lastReport = -Infinity;
    let totalGames = 0;
    let totalSamples = 0;

    const report = async (): Promise<void> => {
      for (let m = 0; m < POP; m++) {
        const agent = new MctsAgent(toEvaluator(models[m]), { sims: ARENA_SIMS }, 0, `m${m}`);
        const opps = anchorAgents.map((a) => ({
          name: a.name,
          score: headToHead(agent, a.agent, ARENA_GAMES),
          elo: anchorElo[a.name],
        }));
        const elo = rateVsFixed(opps.map((o) => ({ elo: o.elo, score: o.score, games: ARENA_GAMES })));
        const winStr = opps.map((o) => `${o.name.replace("heuristic-", "")}=${(o.score * 100).toFixed(0)}%`).join(" ");
        log(`ELO UPDATE  gen=${gen} t=${elapsedMin().toFixed(0)}min  m${m} Elo≈${elo}  | win% ${winStr}`);
        const bc = bcCnt[m] > 0 ? bcSum[m].map((v) => v / bcCnt[m]) : new Array(BC_SIZE).fill(0.5);
        const meta: CheckpointMeta = {
          id: `gen${gen}-m${m}`,
          createdAt: new Date().toISOString(),
          iter: gen,
          parent: null,
          playersTrained: COUNTS,
          arch,
          elo,
          eloGames: ARENA_GAMES * anchorAgents.length,
          bc,
          bcCell: bcCell(bc),
          mctsSims: ARENA_SIMS,
          note: `backend=${backend} hidden=${arch.hidden} layers=${arch.layers}`,
        };
        allMetas.push(meta);
        saveCheckpoint({ meta, weights: exportWeights(models[m]) });
        if (elo > bestElo[m]) {
          bestElo[m] = elo;
          saveCheckpoint({ meta: { ...meta, id: `best-m${m}` }, weights: exportWeights(models[m]) });
        }
      }
      saveRegistry(buildRegistry(allMetas, arch));
    };

    while (elapsedMin() < MINUTES) {
      gen++;
      let genGames = 0;
      let genSamples = 0;
      let lossSum = 0;
      let lossN = 0;
      for (let m = 0; m < POP; m++) {
        const players = COUNTS[gen % COUNTS.length];
        const sp = await runBatchedSelfPlay({
          evaluate: batchEvals[m],
          modelIndex: m,
          players,
          concurrent: CONCURRENT,
          sims: SIMS,
          targetGames: GAMES_PER_GEN,
          dirichletAlpha: 0.5,
          dirichletFrac: 0.25,
          tempMoves: 8,
          seedBase: (Math.random() * 0xffffffff) >>> 0,
        });
        replay[m].push(...sp.samples);
        if (replay[m].length > REPLAY_CAP) replay[m] = replay[m].slice(-REPLAY_CAP);
        for (let k = 0; k < BC_SIZE; k++) bcSum[m][k] += sp.bcSum[k];
        bcCnt[m] += sp.bcCount;
        genGames += sp.games;
        genSamples += sp.samples.length;

        const buf = replay[m];
        if (buf.length >= BATCH) {
          for (let s = 0; s < TRAIN_STEPS; s++) {
            const batch: SelfPlaySample[] = [];
            for (let b = 0; b < BATCH; b++) batch.push(buf[(Math.random() * buf.length) | 0]);
            lossSum += await trainOnBatch(models[m], batch);
            lossN++;
          }
        }
      }
      totalGames += genGames;
      totalSamples += genSamples;
      log(
        `gen ${gen}  t=${elapsedMin().toFixed(1)}min  games=${genGames} (tot ${totalGames})  replay=${replay.map((r) => r.length)}  loss=${lossN ? (lossSum / lossN).toFixed(3) : "n/a"}`,
      );

      if (elapsedMin() - lastReport >= REPORT_MINUTES || gen === 1) {
        await report();
        lastReport = elapsedMin();
      }
    }

    log(`done: ${gen} gens, ${totalGames} games, ${totalSamples} samples in ${elapsedMin().toFixed(1)}min. Final report:`);
    await report();
  },
  3_600_000 * 4,
);
