// Proof-of-training entry point. Trains a small POPULATION by self-play (across player counts),
// snapshots checkpoints per iteration, then rates them in an Elo arena against the heuristic
// ladder + random, and writes the checkpoint registry (the matchmaking groundwork). Run with:
//   npm run train            (small, fast defaults)
//   RL_ITERS=20 RL_GAMES=64 RL_SIMS=48 RL_POP=3 RL_PLAYERS=2,3,4 npm run train   (serious run)
//
// Lives in the tsconfig-excluded rl/ dir; executed via vitest/esbuild (see vitest.rl.config.ts).

import { it } from "vitest";
import * as tf from "@tensorflow/tfjs";
import { DEFAULT_ARCH, buildModel, exportWeights, importWeights, toEvaluator, trainOnBatch } from "./network";
import { playSelfPlayGame } from "./selfplay";
import type { SelfPlaySample } from "./selfplay";
import { headToHead, runArena } from "./arena";
import type { ArenaParticipant } from "./arena";
import { buildRegistry, saveCheckpoint, saveRegistry } from "./io";
import { BC_LABELS, BC_SIZE, bcCell } from "../src/rl/behavior";
import { behaviorMetrics } from "../src/rl/behavior";
import { HeuristicAgent, MctsAgent, RandomAgent } from "../src/rl/agents";
import type { CheckpointMeta, SerializedWeights } from "../src/rl/checkpoint";

const num = (k: string, d: number): number => Number(process.env[k] ?? d);

const ITERS = num("RL_ITERS", 3);
const GAMES = num("RL_GAMES", 8); // self-play games per iteration
const SIMS = num("RL_SIMS", 14); // MCTS sims per move during self-play
const POP = num("RL_POP", 2); // population size (lineages -> stylistic diversity)
const BATCH = num("RL_BATCH", 64);
const TRAIN_STEPS = num("RL_TRAIN_STEPS", 24); // gradient steps per model per iteration
const REPLAY_CAP = num("RL_REPLAY", 6000);
const ARENA_GAMES = num("RL_ARENA_GAMES", 6); // per pair
const ARENA_SIMS = num("RL_ARENA_SIMS", 12);
const H2H_GAMES = num("RL_H2H", 24);
const COUNTS = (process.env.RL_PLAYERS ?? "2").split(",").map(Number);

interface Snapshot {
  id: string;
  weights: SerializedWeights;
  iter: number;
  model: number;
  bc: number[];
}

it(
  "RL: self-play training improves play; rate checkpoints + write registry",
  async () => {
    await tf.ready();
    console.log(`tfjs backend=${tf.getBackend()} | pop=${POP} iters=${ITERS} games/iter=${GAMES} sims=${SIMS} counts=${COUNTS}`);

    const models = Array.from({ length: POP }, () => buildModel());
    const evals = models.map((m) => toEvaluator(m));
    const replay: SelfPlaySample[][] = models.map(() => []);
    const bcSum: number[][] = models.map(() => new Array(BC_SIZE).fill(0));
    const bcN: number[] = models.map(() => 0);
    const snapshots: Snapshot[] = [];

    // Snapshot the untrained nets as the bottom rung of the ladder.
    for (let m = 0; m < POP; m++)
      snapshots.push({ id: `m${m}-iter0`, weights: exportWeights(models[m]), iter: 0, model: m, bc: new Array(BC_SIZE).fill(0.5) });

    const t0 = Date.now();
    for (let iter = 1; iter <= ITERS; iter++) {
      for (let gi = 0; gi < GAMES; gi++) {
        const players = COUNTS[(iter * GAMES + gi) % COUNTS.length];
        const seatModel = Array.from({ length: players }, () => Math.floor(Math.random() * POP));
        const seed = (Math.random() * 0xffffffff) >>> 0;
        const { samples, final } = playSelfPlayGame(seed, players, evals, seatModel, {
          sims: SIMS,
          dirichletAlpha: 0.6,
          dirichletFrac: 0.25,
          tempMoves: 6,
        });
        for (const s of samples) replay[s.model].push(s);
        for (let seat = 0; seat < players; seat++) {
          const bc = behaviorMetrics(final, seat);
          const m = seatModel[seat];
          for (let k = 0; k < BC_SIZE; k++) bcSum[m][k] += bc[k];
          bcN[m]++;
        }
      }
      for (let m = 0; m < POP; m++) if (replay[m].length > REPLAY_CAP) replay[m] = replay[m].slice(-REPLAY_CAP);

      for (let m = 0; m < POP; m++) {
        const buf = replay[m];
        if (buf.length < BATCH) continue;
        for (let s = 0; s < TRAIN_STEPS; s++) {
          const batch: SelfPlaySample[] = [];
          for (let b = 0; b < BATCH; b++) batch.push(buf[(Math.random() * buf.length) | 0]);
          await trainOnBatch(models[m], batch);
        }
      }
      for (let m = 0; m < POP; m++) {
        const bc = bcN[m] > 0 ? bcSum[m].map((v) => v / bcN[m]) : new Array(BC_SIZE).fill(0.5);
        snapshots.push({ id: `m${m}-iter${iter}`, weights: exportWeights(models[m]), iter, model: m, bc });
      }
      console.log(`[iter ${iter}/${ITERS}] replay=${replay.map((r) => r.length)} t=${((Date.now() - t0) / 1000) | 0}s`);
    }

    // ── Proof of learning: final lineages vs untrained net, random, and heuristic-low ──
    const finalEvals = models.map((m) => toEvaluator(m));
    const init0 = buildModel();
    importWeights(init0, snapshots[0].weights);
    const initAgent = new MctsAgent(toEvaluator(init0), { sims: ARENA_SIMS }, 0, "untrained-net");
    for (let m = 0; m < POP; m++) {
      const trained = new MctsAgent(finalEvals[m], { sims: ARENA_SIMS }, 0, `trained-m${m}`);
      const vsRandom = headToHead(trained, new RandomAgent(), H2H_GAMES);
      const vsInit = headToHead(trained, initAgent, H2H_GAMES);
      const vsLow = headToHead(trained, new HeuristicAgent("low"), H2H_GAMES);
      const vsMed = headToHead(trained, new HeuristicAgent("medium"), H2H_GAMES);
      const vsHard = headToHead(trained, new HeuristicAgent("hard"), H2H_GAMES);
      console.log(
        `PROOF trained-m${m}: vs random=${(vsRandom * 100).toFixed(0)}%  vs untrained-net=${(vsInit * 100).toFixed(0)}%  ` +
          `vs heuristic-low=${(vsLow * 100).toFixed(0)}%  vs heuristic-medium=${(vsMed * 100).toFixed(0)}%  vs heuristic-HARD=${(vsHard * 100).toFixed(0)}%`,
      );
    }

    // ── Elo arena over the ladder (untrained + final per lineage) + anchors ──
    const selected = snapshots.filter((s) => s.iter === 0 || s.iter === ITERS);
    const arenaModels: tf.LayersModel[] = [];
    const parts: (ArenaParticipant & { snap?: Snapshot })[] = [];
    for (const snap of selected) {
      const mdl = buildModel();
      importWeights(mdl, snap.weights);
      arenaModels.push(mdl);
      parts.push({ name: snap.id, agent: new MctsAgent(toEvaluator(mdl), { sims: ARENA_SIMS }, 0, snap.id), snap });
    }
    parts.push({ name: "random", agent: new RandomAgent() });
    parts.push({ name: "heuristic-low", agent: new HeuristicAgent("low") });
    parts.push({ name: "heuristic-medium", agent: new HeuristicAgent("medium") });

    const arena = runArena(parts, ARENA_GAMES);
    const ranked = arena.names
      .map((name, i) => ({ name, elo: arena.ratings[i], rec: arena.record[i] }))
      .sort((a, b) => b.elo - a.elo);
    console.log("ELO ARENA (1000 = mean):");
    for (const r of ranked) console.log(`  ${r.elo}  ${r.name}  (${r.rec.w}-${r.rec.l}-${r.rec.d})`);
    console.log(`BC axes: ${BC_LABELS.join(", ")}`);

    // ── Persist rated checkpoints + the registry (matchmaking groundwork) ──
    const metas: CheckpointMeta[] = [];
    parts.forEach((p, i) => {
      if (!p.snap) return;
      const meta: CheckpointMeta = {
        id: p.snap.id,
        createdAt: new Date().toISOString(),
        iter: p.snap.iter,
        parent: p.snap.iter > 0 ? `m${p.snap.model}-iter${p.snap.iter - 1}` : null,
        playersTrained: COUNTS,
        arch: DEFAULT_ARCH,
        elo: arena.ratings[i],
        eloGames: (parts.length - 1) * ARENA_GAMES,
        bc: p.snap.bc,
        bcCell: bcCell(p.snap.bc),
        mctsSims: ARENA_SIMS,
        note: `pop=${POP} iters=${ITERS} games/iter=${GAMES} sims=${SIMS}`,
      };
      metas.push(meta);
      saveCheckpoint({ meta, weights: p.snap.weights });
      console.log(`  saved checkpoint ${meta.id}: elo=${meta.elo} bc=[${meta.bc.map((v) => v.toFixed(2)).join(",")}] cell=${meta.bcCell}`);
    });
    saveRegistry(buildRegistry(metas, DEFAULT_ARCH));
    console.log(`registry written with ${metas.length} checkpoints; archive cells populated for matchmaking.`);
  },
  3_600_000,
);
