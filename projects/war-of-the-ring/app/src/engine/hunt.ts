// The Hunt. Hunt Level = Shadow dice in the Hunt Box (allocated + Eye). Roll min(level,5) combat
// dice; success on 6, +1 per FP die already in the box this turn (so a 2nd Fellowship move succeeds
// on 5–6, etc.). Re-roll one failed die for each of {Shadow Stronghold, Shadow Army, Nazgul} in the
// Fellowship figure's region. On ≥1 success, draw a Hunt tile. Eye tiles deal damage = successes.

import type { GameState, HuntTile } from './types';
import { makeRng, rollDice } from './rng';
import { region } from './data/map';
import { totalUnits } from './army';

export function huntLevel(state: GameState): number {
  return state.huntBox.shadowAllocated + state.huntBox.eye;
}

export interface HuntRollResult {
  dice: number[];
  successes: number;
  threshold: number;
  rerolls: number[];
}

/** Count region re-roll sources at the Fellowship figure's (last-declared) region. */
function regionRerolls(state: GameState): number {
  const r = state.fellowship.lastDeclaredRegion;
  const stack = state.regions[r];
  let n = 0;
  if (region(r).settlement === 'stronghold' && (state.control[r] === 'shadow' || region(r).nation && ['sauron', 'isengard', 'southrons'].includes(region(r).nation as string))) n++;
  if (stack && stack.side === 'shadow' && totalUnits(stack) > 0) n++;
  if (stack && stack.side === 'shadow' && stack.nazgul > 0) n++;
  return n;
}

export function huntRoll(state: GameState): HuntRollResult {
  const rng = makeRng(state.rngState);
  const level = Math.min(huntLevel(state), 5);
  const threshold = Math.max(2, 6 - state.fellowship.fpDiceInBox); // +1 per prior FP die in box
  const dice = rollDice(rng, level);
  let successes = dice.filter((d) => d >= threshold).length;

  const sources = Math.min(regionRerolls(state), 5);
  const failed = dice.filter((d) => d < threshold).length;
  const rerolls = rollDice(rng, Math.min(sources, failed));
  successes += rerolls.filter((d) => d >= threshold).length;

  state.rngState = rng.state();
  return { dice, successes, threshold, rerolls };
}

/** Draw one tile from the standard pool (random via seeded rng). Returns null if empty. */
export function drawHuntTile(state: GameState): HuntTile | null {
  if (state.huntPool.length === 0) return null;
  const rng = makeRng(state.rngState);
  const i = rng.int(state.huntPool.length);
  const tile = state.huntPool[i];
  state.huntPool = state.huntPool.filter((_, k) => k !== i);
  state.rngState = rng.state();
  return tile;
}

/** Apply a drawn tile's damage to the Fellowship. Eye tile damage = successes. Reveal flags reveal.
 *  Companions/Guide absorption is left to the FP player (card text) — MVP applies raw Corruption. */
export function applyHuntDamage(state: GameState, tile: HuntTile, successes: number): { damage: number; revealed: boolean } {
  const damage = tile.kind === 'eye' ? successes : tile.value;
  state.fellowship.corruption = Math.min(12, state.fellowship.corruption + damage);
  let revealed = false;
  if (tile.reveal) {
    state.fellowship.revealed = true;
    revealed = true;
  }
  return { damage, revealed };
}
