// Final scoring: sum every player's chip values; the highest total wins (ties are shared).

import type { MatchState, PlayerId } from './types';

export function pointsByPlayer(state: MatchState): number[] {
  return state.chips.map((chips) => chips.reduce((sum, c) => sum + c.value, 0));
}

export function computeWinners(state: MatchState): PlayerId[] {
  const totals = pointsByPlayer(state);
  const max = Math.max(...totals);
  const winners: PlayerId[] = [];
  totals.forEach((t, p) => {
    if (t === max) winners.push(p);
  });
  return winners;
}
