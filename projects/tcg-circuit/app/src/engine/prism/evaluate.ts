// One static evaluation, shared by the whole AI ladder, the sim, and lethal detection. The board is
// small + low-randomness by design (tcg-design §4), so a clean heuristic is strong — but a *static*
// eval is blind to time-delayed value (a 1/1 Momentum unit, a Vengeance death-trigger). The fix is a
// KEYWORD-AWARE unit valuation: each minor power contributes its strategic worth, so the AI both plays
// AND removes keyworded threats generically (no per-card hacks). The lookahead in ai/ai.ts then lets
// multi-turn value (growth paying off, lethal sequencing) emerge from simulation rather than the eval.
//   evaluate = wNexus·nexusDiff + wOppLow·pressure + wClose·closing + board(Σ unitValue) + lane + hand
// Persona weights tilt *what* a deck values (aggro/control) without changing how well it plays.

import { Duel, START_NEXUS, UnitInstance } from "./types";

export interface Persona {
  name: string;
  aggression: number; // >1 = values pushing the opponent's Nexus + board pressure
  control: number; // >1 = values card advantage + lane stall
}

export const NEUTRAL_PERSONA: Persona = { name: "balanced", aggression: 1, control: 1 };

/** Strategic worth of a unit = current board presence + the value of its keywords. This is what makes
 * the AI understand "minor powers": a small Momentum body or a Vengeance trader is worth more than its
 * printed power, so opponents prioritise removing it and pilots value deploying it. Tuned vs the sim. */
export function unitValue(u: UnitInstance): number {
  let v = Math.max(0, u.power - u.dmgTaken); // current power = board presence
  v += u.shield * 0.8; // shield ≈ extra effective health
  for (const k of u.keywords) {
    const n = k.n ?? 0;
    switch (k.kw) {
      case "momentum": v += n * 4.5; break; // grows every turn — a high-priority removal target
      case "vengeance": v += n * 1.1; break; // guaranteed reach when it trades/dies
      case "guard": v += 1.5; break; // anchors the board / taxes attacks
      case "pierce": v += 1.0; break; // evasive offense
      case "drain": v += 1.0; break; // life swing
      case "haste": v += 0.4; break; // tempo (mostly its first turn)
      // lifegain is realised on deploy; refractplus / volatile ≈ 0 here
    }
  }
  return v;
}

function side(d: Duel, s: 0 | 1) {
  const p = d.players[s];
  let power = 0;
  let lanes = 0;
  for (const slot of p.lanes) {
    if (slot.unit) {
      power += unitValue(slot.unit);
      lanes += 1;
    }
  }
  return { nexus: p.nexus, power, lanes, hand: p.hand.length };
}

/** Score the position from `me`'s perspective. Higher = better for `me`. */
export function evaluate(d: Duel, me: 0 | 1, persona: Persona = NEUTRAL_PERSONA): number {
  const opp = (me === 0 ? 1 : 0) as 0 | 1;
  if (d.winner != null) return d.winner === me ? 100000 : -100000;

  const M = side(d, me);
  const O = side(d, opp);
  const agg = persona.aggression;
  const ctl = persona.control;

  const nexusDiff = M.nexus - O.nexus;
  const oppPressure = (START_NEXUS - O.nexus) * agg; // reward bringing the opponent low
  // Closing bonus: near lethal the win matters more than the board — commit instead of hoarding.
  const closing = O.nexus > 0 && O.nexus <= 6 ? (7 - O.nexus) * 3.5 * agg : 0;
  const survival = M.nexus <= 6 ? (7 - M.nexus) * -2.5 : 0; // value not dying
  const board = (M.power - O.power) * (1.0 * agg);
  const lane = (M.lanes - O.lanes) * 0.6;
  const hand = (M.hand - O.hand) * (1.2 * ctl);

  return 1.0 * nexusDiff + 1.4 * oppPressure + closing + survival + board + lane + hand;
}
