// Standalone arena: re-rate all stored checkpoints (rebuilt from disk) against each other and
// the heuristic ladder + random, then rewrite the registry. Run with `npm run arena`. Useful
// after several training runs to put every checkpoint on one Elo scale before matchmaking.

import { it } from "vitest";
import { buildConvModel, buildModel, importWeights, initBackend, toEvaluator } from "./network";
import { runArena } from "./arena";
import type { ArenaParticipant } from "./arena";
import { buildRegistry, listCheckpointIds, loadCheckpoint, saveRegistry } from "./io";
import { HeuristicAgent, MctsAgent, RandomAgent } from "../src/rl/agents";
import { DEFAULT_ARCH } from "./network";
import type { CheckpointMeta } from "../src/rl/checkpoint";

const num = (k: string, d: number): number => Number(process.env[k] ?? d);

it(
  "RL arena: re-rate stored checkpoints + write registry",
  async () => {
    console.log(`arena backend=${await initBackend()}`); // WASM = much faster conv inference than pure-JS CPU
    const ids = listCheckpointIds();
    if (ids.length === 0) {
      console.log("No checkpoints found in rl-checkpoints/. Run `npm run train` first.");
      return;
    }
    const ARENA_GAMES = num("RL_ARENA_GAMES", 8);
    const ARENA_SIMS = num("RL_ARENA_SIMS", 16);

    const cps = ids.map((id) => loadCheckpoint(id));
    const parts: (ArenaParticipant & { id?: string; bc?: number[]; iter?: number; parent?: string | null })[] = [];
    for (const cp of cps) {
      // >12 weight tensors ⇒ conv ResNet (MLP has 12); rebuild the matching architecture.
      const mdl = cp.weights.shapes.length > 12 ? buildConvModel() : buildModel(cp.meta.arch);
      importWeights(mdl, cp.weights);
      parts.push({
        name: cp.meta.id,
        agent: new MctsAgent(toEvaluator(mdl), { sims: ARENA_SIMS }, 0, cp.meta.id),
        id: cp.meta.id,
        bc: cp.meta.bc,
        iter: cp.meta.iter,
        parent: cp.meta.parent,
      });
    }
    parts.push({ name: "random", agent: new RandomAgent() });
    parts.push({ name: "heuristic-low", agent: new HeuristicAgent("low") });
    parts.push({ name: "heuristic-medium", agent: new HeuristicAgent("medium") });
    parts.push({ name: "heuristic-hard", agent: new HeuristicAgent("hard") });

    const arena = runArena(parts, ARENA_GAMES);
    const ranked = arena.names
      .map((name, i) => ({ name, elo: arena.ratings[i], rec: arena.record[i] }))
      .sort((a, b) => b.elo - a.elo);
    console.log("ELO ARENA (1000 = mean):");
    for (const r of ranked) console.log(`  ${r.elo}  ${r.name}  (${r.rec.w}-${r.rec.l}-${r.rec.d})`);

    const metas: CheckpointMeta[] = [];
    parts.forEach((p, i) => {
      if (!p.id) return;
      const cp = cps.find((c) => c.meta.id === p.id)!;
      cp.meta.elo = arena.ratings[i];
      cp.meta.eloGames = (parts.length - 1) * ARENA_GAMES;
      metas.push(cp.meta);
    });
    saveRegistry(buildRegistry(metas, DEFAULT_ARCH));
    console.log(`registry re-rated for ${metas.length} checkpoints.`);
  },
  3_600_000,
);
