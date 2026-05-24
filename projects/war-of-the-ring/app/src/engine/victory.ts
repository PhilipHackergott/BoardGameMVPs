// Victory. Ring victories trigger IMMEDIATELY when reached (checked after any Corruption/Mordor
// change). Military victory is checked in phase 6 and takes precedence in the race:
//   Shadow wins controlling FP Cities/Strongholds worth ≥ 10 VP.
//   Free Peoples win controlling Shadow Cities/Strongholds worth ≥ 4 VP.

import type { GameState } from './types';

export const SHADOW_VP_TARGET = 10;
export const FP_VP_TARGET = 4;
export const CORRUPTION_MAX = 12;
export const MORDOR_FINAL_STEP = 5;

function win(state: GameState, side: 'fp' | 'shadow', path: string): void {
  if (state.winner) return;
  state.winner = { side, path };
  state.log.push({ turn: state.turn, phase: state.phase, side: 'system', text: `${side === 'fp' ? 'Free Peoples' : 'Shadow'} win — ${path}.` });
}

/** Immediate Ring checks — call after any Corruption or Mordor-step change. */
export function checkVictory(state: GameState): void {
  if (state.winner) return;
  const f = state.fellowship;
  if (f.corruption >= CORRUPTION_MAX) {
    win(state, 'shadow', 'the Ring claims its Bearer (Corruption 12)');
    return;
  }
  if (f.onMordorTrack && f.mordorStep >= MORDOR_FINAL_STEP && f.corruption < CORRUPTION_MAX) {
    win(state, 'fp', 'the Ring is unmade at the Crack of Doom');
  }
}

/** Military check — call in phase 6. */
export function checkMilitary(state: GameState): void {
  if (state.winner) return;
  if (state.vp.shadow >= SHADOW_VP_TARGET) {
    win(state, 'shadow', `${state.vp.shadow} VP of Free Peoples settlements seized`);
    return;
  }
  if (state.vp.fp >= FP_VP_TARGET) {
    win(state, 'fp', `${state.vp.fp} VP of Shadow settlements liberated`);
  }
}
