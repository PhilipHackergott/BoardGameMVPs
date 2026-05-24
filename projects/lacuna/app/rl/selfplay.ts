// Self-play game generation: run MCTS (with root Dirichlet noise + a temperature schedule) to
// pick moves, recording at each real decision the position, the search-visit policy, and the
// seat to move. Once the game ends, label every recorded sample with the perspective-relative
// outcome. Seats can be driven by different population members (cross-play) for diversity.

import { createGame, makeConfig } from "../src/engine";
import type { GameState } from "../src/engine";
import { POLICY_SIZE, candidatePolicyIndex, encodeState } from "../src/rl/features";
import { legalCandidates, outcomeOf, settle, step } from "../src/rl/env";
import { pickFromVisits, runMcts } from "../src/rl/mcts";
import { MAX_PLAYERS } from "../src/rl/types";
import type { Evaluator, SelfPlaySample } from "../src/rl/types";

export type { SelfPlaySample };

export interface PlayOpts {
  sims: number;
  cPuct?: number;
  dirichletAlpha?: number;
  dirichletFrac?: number;
  tempMoves?: number; // plies of high-temperature (exploratory) sampling before going greedy-ish
}

const emptyPowers = (n: number): never[][] => Array.from({ length: n }, () => []);
const nullAff = (n: number): null[] => Array.from({ length: n }, () => null);

// Play one base-game self-play match; `seatModel[seat]` indexes into `evals`.
export function playSelfPlayGame(
  seed: number,
  players: number,
  evals: Evaluator[],
  seatModel: number[],
  opts: PlayOpts,
): { samples: SelfPlaySample[]; final: GameState } {
  let g = settle(createGame(seed, makeConfig(players), true, emptyPowers(players), nullAff(players)));
  const pending: SelfPlaySample[] = [];
  const tempMoves = opts.tempMoves ?? 6;
  let guard = 0;
  let ply = 0;
  while (g.phase !== "ended" && guard++ < 4000) {
    const cands = legalCandidates(g);
    if (cands.length <= 1) {
      g = step(g, cands[0]);
      continue;
    }
    const model = seatModel[g.current] ?? 0;
    const res = runMcts(g, evals[model], {
      sims: opts.sims,
      cPuct: opts.cPuct,
      dirichletAlpha: opts.dirichletAlpha,
      dirichletFrac: opts.dirichletFrac,
    });

    const fieldR = g.config.fieldR;
    const policy = new Float32Array(POLICY_SIZE);
    let tot = 0;
    for (let i = 0; i < res.cands.length; i++) {
      policy[candidatePolicyIndex(res.cands[i].kind, res.cands[i].x, res.cands[i].y, fieldR)] += res.visits[i];
      tot += res.visits[i];
    }
    if (tot > 0) for (let k = 0; k < policy.length; k++) policy[k] /= tot;

    const feats = encodeState(g, g.current);
    pending.push({
      grid: feats.grid,
      scalars: feats.scalars,
      policy,
      players,
      current: g.current,
      valueRel: new Float32Array(MAX_PLAYERS),
      model,
    });

    const temp = ply < tempMoves ? 1.0 : 0.2;
    g = step(g, res.cands[pickFromVisits(res.visits, temp)]);
    ply++;
  }

  const oc = outcomeOf(g);
  for (const s of pending) {
    for (let k = 0; k < players; k++) s.valueRel[k] = oc.values[(s.current + k) % players];
    for (let k = players; k < MAX_PLAYERS; k++) s.valueRel[k] = 0.5;
  }
  return { samples: pending, final: g };
}
