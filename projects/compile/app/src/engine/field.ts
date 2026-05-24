// Pure read-only queries over the field. No mutation, no randomness — safe for the AI to call
// freely while evaluating hypothetical states. The rulebook's notions of "value", "uncovered",
// "control", and "compilable" all live here so the rest of the engine agrees on one definition.

import {
  CardInstance,
  COMPILE_THRESHOLD,
  FACE_DOWN_VALUE,
  GameState,
  PlayerState,
  Side,
} from "./types";
import { getDef } from "./cards";

/** Value a single instance contributes to its line. Face-down is always FACE_DOWN_VALUE; face-up
 *  is the printed value plus any self valueBonus from its persistent passive. */
export function cardValue(ci: CardInstance): number {
  if (!ci.faceUp) return FACE_DOWN_VALUE;
  const def = getDef(ci.defId);
  return def.value + (def.passive?.valueBonus ?? 0);
}

/** Total value of one player's stack in a line. */
export function lineValue(p: PlayerState, line: number): number {
  return p.stacks[line].reduce((sum, ci) => sum + cardValue(ci), 0);
}

/** The uncovered (top) card of a player's stack in a line, or null if empty. */
export function uncovered(p: PlayerState, line: number): CardInstance | null {
  const stack = p.stacks[line];
  return stack.length ? stack[stack.length - 1] : null;
}

export function opponent(side: Side): Side {
  return side === 0 ? 1 : 0;
}

/** How many of the three lines `side` strictly leads in value. */
export function linesLed(state: GameState, side: Side): number {
  const me = state.players[side];
  const them = state.players[opponent(side)];
  let n = 0;
  for (let line = 0; line < 3; line++) {
    if (lineValue(me, line) > lineValue(them, line)) n++;
  }
  return n;
}

/** Lines `side` is forced to compile this turn: own value >= 10 AND strictly greater than the
 *  opponent's value in that same line. (The protocol need not already be uncompiled — recompiling
 *  is legal and handled at resolution time.) */
export function compilableLines(state: GameState, side: Side): number[] {
  const me = state.players[side];
  const them = state.players[opponent(side)];
  const out: number[] = [];
  for (let line = 0; line < 3; line++) {
    const v = lineValue(me, line);
    if (v >= COMPILE_THRESHOLD && v > lineValue(them, line)) out.push(line);
  }
  return out;
}

export function hasWon(p: PlayerState): boolean {
  return p.protocols.every((slot) => slot.compiled);
}

/** All uncovered cards on the field that match a side filter — the normal universe of targets. */
export function uncoveredTargets(
  state: GameState,
  filter: { side?: "self" | "opp" | "any"; self: Side; faceUp?: boolean; faceDown?: boolean; excludeUid?: string },
): CardInstance[] {
  const out: CardInstance[] = [];
  const sides: Side[] =
    filter.side === "self"
      ? [filter.self]
      : filter.side === "opp"
        ? [opponent(filter.self)]
        : [0, 1];
  for (const s of sides) {
    for (let line = 0; line < 3; line++) {
      const c = uncovered(state.players[s], line);
      if (!c) continue;
      if (filter.excludeUid && c.uid === filter.excludeUid) continue;
      if (filter.faceUp && !c.faceUp) continue;
      if (filter.faceDown && c.faceUp) continue;
      out.push(c);
    }
  }
  return out;
}

/** Find which side + line a card instance currently sits in (field only). */
export function locate(state: GameState, uid: string): { side: Side; line: number; index: number } | null {
  for (let s: Side = 0; s <= 1; s = (s + 1) as Side) {
    for (let line = 0; line < 3; line++) {
      const idx = state.players[s].stacks[line].findIndex((c) => c.uid === uid);
      if (idx >= 0) return { side: s, line, index: idx };
    }
    if (s === 1) break;
  }
  return null;
}
