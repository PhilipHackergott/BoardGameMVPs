// Dice engine: pool sizes (with character bonuses), rolling from the seeded RNG, and the
// Eye→Hunt-Box move. Pure over a draft state's rng (state threaded back by the caller).

import type { GameState, RolledDie, Side } from './types';
import { makeRng } from './rng';
import {
  FP_BASE_DICE,
  FP_DIE_FACES,
  FP_MAX_DICE,
  SHADOW_BASE_DICE,
  SHADOW_DIE_FACES,
  SHADOW_MAX_DICE,
} from './data/dice';
import { CHAR_BY_ID } from './data/characters';

/** How many action dice a side rolls this turn, after character dice-bonuses (capped). */
export function dicePoolSize(state: GameState, side: Side): number {
  let n = side === 'fp' ? FP_BASE_DICE : SHADOW_BASE_DICE;
  for (const c of Object.values(state.characters)) {
    if (!c.inPlay) continue;
    const def = CHAR_BY_ID[c.id];
    if (def && def.side === side) n += def.diceBonus;
  }
  return Math.min(n, side === 'fp' ? FP_MAX_DICE : SHADOW_MAX_DICE);
}

/** Roll both pools. Shadow Eye faces are immediately moved to the Hunt Box (not spendable).
 *  Mutates the draft; returns nothing (rng state advanced on the draft). */
export function rollActionDice(state: GameState): void {
  const rng = makeRng(state.rngState);
  const faces = { fp: FP_DIE_FACES, shadow: SHADOW_DIE_FACES } as const;
  for (const side of ['fp', 'shadow'] as Side[]) {
    const count = dicePoolSize(state, side);
    const rolled: RolledDie[] = [];
    for (let i = 0; i < count; i++) {
      const face = faces[side][rng.int(6)];
      rolled.push({ face, used: false });
    }
    state.dice[side] = rolled;
  }
  // Shadow Eyes → Hunt Box
  let eyes = 0;
  for (const d of state.dice.shadow) {
    if (d.face === 'eye') {
      d.used = true; // can never be spent
      eyes++;
    }
  }
  state.huntBox.eye += eyes;
  state.rngState = rng.state();
}

export function unusedDice(state: GameState, side: Side): number[] {
  const idx: number[] = [];
  state.dice[side].forEach((d, i) => {
    if (!d.used) idx.push(i);
  });
  return idx;
}

export function hasUnusedDice(state: GameState, side: Side): boolean {
  return state.dice[side].some((d) => !d.used);
}
