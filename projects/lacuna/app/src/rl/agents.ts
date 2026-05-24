// Agent implementations the env can drive. All are pure except for the evaluator they're
// given (which may run a tfjs net): RandomAgent, HeuristicAgent (wraps the existing low/med/
// hard AI), PolicyAgent (one network forward pass, no search — fast & weaker), and MctsAgent
// (full neural search — strongest). Mixing strengths in one game is fine.

import { aiClaim, aiPlace } from "../ai/ai";
import type { Difficulty } from "../ai/ai";
import type { GameState } from "../engine";
import { runMcts, pickFromVisits } from "./mcts";
import type { MctsOptions } from "./mcts";
import type { Agent, Candidate, Evaluator } from "./types";

function pickArgmax(xs: number[]): number {
  let bi = 0;
  for (let i = 1; i < xs.length; i++) if (xs[i] > xs[bi]) bi = i;
  return bi;
}
function sampleFrom(weights: number[], temperature: number): number {
  if (temperature <= 1e-6) return pickArgmax(weights);
  const w = weights.map((v) => Math.pow(Math.max(v, 1e-9), 1 / temperature));
  const sum = w.reduce((a, b) => a + b, 0) || 1;
  let r = Math.random() * sum;
  for (let i = 0; i < w.length; i++) {
    r -= w[i];
    if (r <= 0) return i;
  }
  return w.length - 1;
}

export class RandomAgent implements Agent {
  readonly name = "random";
  act(_g: GameState, cands: Candidate[]): number {
    return Math.floor(Math.random() * cands.length);
  }
}

// Wraps the hand-written AI so the existing low/medium/hard ladder anchors the Elo scale.
export class HeuristicAgent implements Agent {
  readonly name: string;
  constructor(private difficulty: Difficulty) {
    this.name = `heuristic-${difficulty}`;
  }
  act(g: GameState, cands: Candidate[]): number {
    if (cands.length === 1 && cands[0].kind === "pass") return 0;
    if (g.phase === "setup") {
      const id = aiClaim(g, this.difficulty);
      const i = cands.findIndex((c) => c.action.type === "claim" && c.action.starId === id);
      return i >= 0 ? i : 0;
    }
    const mv = aiPlace(g, this.difficulty);
    if (!mv) return 0;
    const i = cands.findIndex(
      (c) => c.action.type === "place" && c.action.aStarId === mv.a && c.action.bStarId === mv.b,
    );
    return i >= 0 ? i : 0;
  }
}

// One forward pass, no search: sample a move from the network's prior. Fast; useful as a
// lower rung of the ladder and for cheap behavioural diversity.
export class PolicyAgent implements Agent {
  readonly name: string;
  constructor(private evaluator: Evaluator, private temperature = 0, label = "policy") {
    this.name = label;
  }
  act(g: GameState, cands: Candidate[]): number {
    const ev = this.evaluator(g, cands);
    return sampleFrom(ev.priors, this.temperature);
  }
}

// Full neural MCTS — the strong agent. Temperature 0 by default (best play for the arena);
// self-play uses temperature + root Dirichlet noise directly via runMcts instead.
export class MctsAgent implements Agent {
  readonly name: string;
  constructor(
    private evaluator: Evaluator,
    private opts: MctsOptions,
    private temperature = 0,
    label?: string,
  ) {
    this.name = label ?? `mcts-${opts.sims}`;
  }
  act(g: GameState, cands: Candidate[]): number {
    if (cands.length <= 1) return 0;
    const res = runMcts(g, this.evaluator, this.opts);
    return pickFromVisits(res.visits, this.temperature);
  }
}
