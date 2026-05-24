// Political track: activation triggers, advancing toward "At War", and the At-War gating of
// muster/free-movement. A Passive nation can advance but is capped one step short of At War until
// it is activated.

import type { GameState, Nation } from './types';
import { AT_WAR_STEP } from './data/nations';

export function isAtWar(state: GameState, nation: Nation): boolean {
  return state.politics[nation].atWar;
}

function recompute(state: GameState, nation: Nation): void {
  const p = state.politics[nation];
  // passive nations cannot reach At War
  if (!p.active && p.step >= AT_WAR_STEP) p.step = AT_WAR_STEP - 1;
  p.atWar = p.active && p.step >= AT_WAR_STEP;
}

export function activate(state: GameState, nation: Nation, reason: string): void {
  const p = state.politics[nation];
  if (!p.active) {
    p.active = true;
    state.log.push({ turn: state.turn, phase: state.phase, side: 'system', text: `${nation} activated (${reason}).` });
  }
  recompute(state, nation);
}

export function advance(state: GameState, nation: Nation, steps: number, reason: string): void {
  const p = state.politics[nation];
  p.step = Math.min(AT_WAR_STEP, p.step + steps);
  recompute(state, nation);
  state.log.push({
    turn: state.turn,
    phase: state.phase,
    side: 'system',
    text: `${nation} advances ${steps} on the Political Track${p.atWar ? ' — now At War' : ''} (${reason}).`,
  });
}

export function setAtWar(state: GameState, nation: Nation, reason: string): void {
  const p = state.politics[nation];
  p.active = true;
  p.step = AT_WAR_STEP;
  recompute(state, nation);
  state.log.push({ turn: state.turn, phase: state.phase, side: 'system', text: `${nation} marches to War (${reason}).` });
}
