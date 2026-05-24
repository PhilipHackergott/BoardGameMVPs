// Shared, browser-safe RL types. NOTHING in src/rl may import tfjs or node:fs — these
// modules are compiled into the app build and reused for in-browser inference later. The
// heavy tfjs/fs training code lives in the excluded top-level `rl/` directory.

import type { Action, GameState, PlayerId } from "../engine";

export const MAX_PLAYERS = 4;

// One concrete, legal choice the player to move can make right now, expanded so search and
// the policy head can reason about it. `x,y` is the board position used to look the move up
// in the spatial policy map (origin-centred engine coords); `kind` routes non-spatial moves
// (pass / sub-phase) to the policy's scalar "other" logit.
export type CandidateKind = "claim" | "place" | "pass" | "other";
export interface Candidate {
  action: Action;
  x: number;
  y: number;
  kind: CandidateKind;
}

// What the network (or any evaluator) returns for a position: a prior over the legal
// candidates (same order, sums to ~1) and an ABSOLUTE per-seat value estimate in [0,1]
// (index = PlayerId; expected final outcome — win 1 / draw 0.5 / loss 0).
export interface Evaluation {
  priors: number[];
  values: number[]; // length MAX_PLAYERS, absolute seat indexing
}
export type Evaluator = (g: GameState, candidates: Candidate[]) => Evaluation;

// A position to evaluate, and a BATCH evaluator that scores many at once in a single NN
// forward pass — the interface the batched self-play coordinator depends on. Node provides one
// backed by tfjs predictBatch; the browser provides one backed by tfjs-webgpu. Same coordinator.
export interface BatchItem {
  g: GameState;
  cands: Candidate[];
}
// May be sync (Node tfjs: dataSync) or async (browser WebGPU: async GPU→CPU readback). The
// batched coordinator awaits it, so both work.
export type BatchEvaluator = (items: BatchItem[]) => Evaluation[] | Promise<Evaluation[]>;

// An opponent that picks one candidate index to play. Implementations: random, the existing
// heuristic AI, and the neural MCTS agent. `act` applies to claim/place/pass decisions; the
// env resolves any powers/affinity sub-phases itself (they never arise in base-game training).
export interface Agent {
  readonly name: string;
  act(g: GameState, candidates: Candidate[]): number;
  reset?(): void;
}

// One self-play training example: the position (perspective = player to move), the search
// policy over the policy head, and — filled in once the game ends — the value targets in the
// network's perspective-relative ordering (rel[k] = outcome of player (current+k)%players).
export interface Sample {
  grid: Float32Array;
  scalars: Float32Array;
  policy: Float32Array; // length POLICY_SIZE
  players: number;
  current: PlayerId;
  valueRel: Float32Array; // length MAX_PLAYERS, filled at game end
}

// A self-play sample tagged with the population member (model) that produced it.
export interface SelfPlaySample extends Sample {
  model: number;
}

// The result of a finished game: per-seat outcome in [0,1] and the raw colour-win margin.
export interface GameOutcome {
  values: number[]; // length players: win 1 / draw 0.5 / loss 0
  colorsWon: number[]; // per seat
  result: PlayerId | "draw";
  turns: number;
}
