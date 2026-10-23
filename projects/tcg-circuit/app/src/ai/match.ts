// Headless match runner — the shared core for the test suite AND the balance sim. Plays one full
// duel between two decklists at two skill ratings, deterministically from a seed.

import { createDuel, reduce, Duel } from "../engine/prism";
import { Persona, NEUTRAL_PERSONA } from "../engine/prism/evaluate";
import { rngNext } from "../engine/prism/rng";
import { chooseMove } from "./ai";

export interface MatchOpts {
  deckA: string[];
  deckB: string[];
  skillA: number;
  skillB: number;
  personaA?: Persona;
  personaB?: Persona;
  policyA?: "greedy" | "mcts";
  policyB?: "greedy" | "mcts";
  seed: string;
  firstPlayer?: 0 | 1;
}

export interface MatchResult {
  winner: 0 | 1 | null;
  turns: number;
}

/** Deterministic [0,1) generator closure for AI move-sampling (kept out of the pure engine RNG). */
function makeRng(seedNum: number): () => number {
  let s = seedNum >>> 0;
  return () => {
    const r = rngNext(s);
    s = r.state;
    return r.value;
  };
}

export function playMatch(opts: MatchOpts): MatchResult {
  let d: Duel = createDuel({
    decks: [opts.deckA, opts.deckB],
    seed: opts.seed,
    firstPlayer: opts.firstPlayer ?? 0,
    names: ["A", "B"],
  });
  const aRng = makeRng(hash(opts.seed + "#a"));
  const bRng = makeRng(hash(opts.seed + "#b"));
  let guard = 0;
  while (d.phase !== "over" && guard++ < 4000) {
    const isA = d.active === 0;
    const move = chooseMove(d, {
      skill: isA ? opts.skillA : opts.skillB,
      persona: (isA ? opts.personaA : opts.personaB) ?? NEUTRAL_PERSONA,
      rng: isA ? aRng : bRng,
      policy: isA ? opts.policyA : opts.policyB,
    });
    d = reduce(d, move);
  }
  return { winner: d.winner, turns: d.turn };
}

function hash(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
