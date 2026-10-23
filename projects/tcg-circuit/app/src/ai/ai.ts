// PRISM AI — ONE continuous skill dial, not fixed tiers (tcg-design §4.2). A single shared
// evaluate() drives every opponent; `skill ∈ [0,1]` interpolates knobs MONOTONICALLY:
//   • softmax move-selection, temperature T = f(1−skill)   (the core knob: loose → near-optimal)
//   • planning budget: a HORIZON of greedy turn-rollouts (0 turns at the bottom → 2 at the top), so
//     time-delayed value (Momentum growth, ramp paying off, a lethal two turns out) emerges from
//     simulation instead of the static eval — the general fix for "understanding minor powers".
//   • a blunder floor that decays toward 0 with skill
// The AI plays ONLY through the real legalMoves/reduce (no cheating) → it is also the balance instrument.
// (A learned self-play value/policy net — AlphaZero-lite — is feasible here and reserved for the very
//  top band; see projects/tcg-circuit/build-report.md §"AI approach". The pure engine is RL-ready.)

import { Action, Duel } from "../engine/prism/types";
import { legalMoves } from "../engine/prism/legalMoves";
import { reduce } from "../engine/prism/reduce";
import { evaluate, Persona, NEUTRAL_PERSONA } from "../engine/prism/evaluate";
import { mctsChoose } from "./mcts";

export interface MoveOpts {
  skill: number; // 0..1
  persona?: Persona;
  rng?: () => number; // injectable for reproducible sims
  policy?: "greedy" | "mcts"; // force a policy (tests/benchmarks); default = skill-gated
}

/** The top of the skill scale (>= this) plays by determinized MCTS; below, greedy + 1-ply lookahead. */
export const MCTS_SKILL = 0.8;

/** Named bands — UX labels over points on the continuous scale (tcg-design §4.2). */
export const SKILL_BANDS: { name: string; skill: number }[] = [
  { name: "Beginner", skill: 0.06 },
  { name: "Kitchen-table", skill: 0.2 },
  { name: "FNM regular", skill: 0.36 },
  { name: "Shop ace", skill: 0.52 },
  { name: "City champ", skill: 0.66 },
  { name: "Regional", skill: 0.78 },
  { name: "National", skill: 0.88 },
  { name: "Worlds-class", skill: 0.96 },
];

export function bandFor(skill: number): string {
  let best = SKILL_BANDS[0];
  for (const b of SKILL_BANDS) if (Math.abs(b.skill - skill) < Math.abs(best.skill - skill)) best = b;
  return best.name;
}

/** Greedily play out a full turn for `who` (argmax each step), bounded — used for the rollout. */
function playOutTurn(duel: Duel, who: 0 | 1, persona: Persona): Duel {
  let d = duel;
  for (let i = 0; i < 16; i++) {
    if (d.phase === "over" || d.active !== who) break;
    const moves = legalMoves(d);
    if (moves.length === 0) break;
    let best = moves[0];
    let bestScore = -Infinity;
    for (const m of moves) {
      const s = evaluate(reduce(d, m), who, persona);
      if (s > bestScore) {
        bestScore = s;
        best = m;
      }
    }
    d = reduce(d, best);
    if (best.type === "endTurn") break;
  }
  return d;
}

/** Roll `turns` full greedy turns forward (alternating players) and score from me's view. Lets the
 * chooser SEE delayed value: a Momentum unit is bigger, a ramp deck has more Light, lethal lands. */
function rolloutTurns(duel: Duel, me: 0 | 1, persona: Persona, turns: number): number {
  let d = duel;
  for (let i = 0; i < turns && d.phase !== "over"; i++) d = playOutTurn(d, d.active, persona);
  return evaluate(d, me, persona);
}

function scoreMove(duel: Duel, move: Action, me: 0 | 1, persona: Persona, horizon: number): number {
  const next = reduce(duel, move);
  if (next.phase === "over") return evaluate(next, me, persona);
  // The big branch is whether to END the turn; look `horizon` whole turns ahead from there.
  if (horizon > 0 && move.type === "endTurn") return rolloutTurns(next, me, persona, horizon);
  return evaluate(next, me, persona);
}

/** Choose ONE action for the active player. Call repeatedly until it returns endTurn / phase over. */
export function chooseMove(duel: Duel, opts: MoveOpts): Action {
  const skill = Math.max(0, Math.min(1, opts.skill));
  const persona = opts.persona ?? NEUTRAL_PERSONA;
  const rng = opts.rng ?? Math.random;
  const me = duel.active;
  const moves = legalMoves(duel);
  if (moves.length === 0) return { type: "endTurn" };
  if (moves.length === 1) return moves[0];

  // Blunder floor — a small chance to play a random legal move, decaying with skill.
  const blunder = 0.28 * (1 - skill) * (1 - skill);
  if (rng() < blunder) return moves[Math.floor(rng() * moves.length)];

  // Top of the scale: determinized MCTS (explores + averages over hidden hands). Iterations scale with
  // skill so it's still a monotone dial. Below the threshold, the cheaper greedy+lookahead below.
  const useMcts = opts.policy === "mcts" || (opts.policy !== "greedy" && skill >= MCTS_SKILL);
  if (useMcts) {
    return mctsChoose(duel, { determinizations: 2, iterations: Math.round(40 + skill * 150), rng, persona });
  }

  // Planning horizon: myopic at the bottom, a 1-turn opponent-reply lookahead above. (A 2-turn greedy
  // rollout was tried and REGRESSED the ladder — a biased greedy rollout policy makes deeper search
  // worse, not better; genuinely deeper play needs MCTS/RL. See build-report.md §"AI approach".)
  const horizon = skill < 0.45 ? 0 : 1;
  const scores = moves.map((m) => scoreMove(duel, m, me, persona, horizon));

  // Softmax over scores with temperature T = f(1−skill): high T (low skill) ≈ uniform; T→0 ≈ argmax.
  const T = 0.5 + (1 - skill) * 7; // 7.5 at skill 0 → 0.5 at skill 1
  const max = Math.max(...scores);
  const weights = scores.map((s) => Math.exp((s - max) / (T * 3)));
  const total = weights.reduce((a, b) => a + b, 0);
  let r = rng() * total;
  for (let i = 0; i < moves.length; i++) {
    r -= weights[i];
    if (r <= 0) return moves[i];
  }
  return moves[moves.length - 1];
}

/** Convenience: play an entire turn for the active player, returning the resulting duel. */
export function playAiTurn(duel: Duel, opts: MoveOpts): Duel {
  let d = duel;
  for (let i = 0; i < 24; i++) {
    if (d.phase === "over") break;
    const move = chooseMove(d, opts);
    d = reduce(d, move);
    if (move.type === "endTurn") break;
  }
  return d;
}
