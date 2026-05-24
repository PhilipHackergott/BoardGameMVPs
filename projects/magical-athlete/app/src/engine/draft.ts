// Snake-draft logic. Standard play (3–6 players): two snake passes → 4 racers each. 2-player
// double-racer variant: ABBAABBA over a line of 8, twice (reversed) → 8 racers each.

import type { DraftState, MatchConfig, PlayerId, RacerId } from './types';
import { type Rng, shuffle } from './rng';
import { RACERS } from './racers';

/** One snake pass over `players` players starting at `start`: clockwise then back. */
function snakePass(start: number, players: number): PlayerId[] {
  const cw: PlayerId[] = [];
  for (let i = 0; i < players; i++) cw.push((start + i) % players);
  return [...cw, ...cw.slice().reverse()];
}

export function racersPerPlayer(config: MatchConfig): number {
  return config.doubleRacer ? 8 : 4;
}

/** Cards flipped per face-up line. */
function lineSizeFor(config: MatchConfig): number {
  return config.doubleRacer ? 8 : config.players * 2;
}

/** The full pick sequence for the whole draft. */
function buildPickOrder(config: MatchConfig): PlayerId[] {
  if (config.doubleRacer) {
    // 2-player variant: ABBAABBA, then the reverse order pass (BAABBAAB).
    const a: PlayerId[] = [0, 1, 1, 0, 0, 1, 1, 0];
    const b: PlayerId[] = a.slice().reverse();
    return [...a, ...b];
  }
  // Standard: pass 1 from player 0, pass 2 from the player to the left of the start player.
  return [...snakePass(0, config.players), ...snakePass(1 % config.players, config.players)];
}

export function buildDraft(config: MatchConfig, rng: Rng): DraftState {
  const pool = shuffle(rng, RACERS.map((r) => r.id));
  const lineSize = lineSizeFor(config);
  const line = pool.splice(0, lineSize);
  return {
    pool,
    line,
    lineSize,
    pickOrder: buildPickOrder(config),
    pickIndex: 0,
    hands: Array.from({ length: config.players }, () => [] as RacerId[]),
    done: false,
  };
}

export function currentDrafter(draft: DraftState): PlayerId | null {
  if (draft.done) return null;
  return draft.pickOrder[draft.pickIndex];
}

/** Apply a pick (mutates the given draft — caller works on a cloned state). */
export function applyDraftPick(draft: DraftState, racerId: RacerId): void {
  if (draft.done) throw new Error('draft already complete');
  const picker = draft.pickOrder[draft.pickIndex];
  const at = draft.line.indexOf(racerId);
  if (at < 0) throw new Error(`racer ${racerId} is not in the current line`);
  draft.line.splice(at, 1);
  draft.hands[picker].push(racerId);
  draft.pickIndex += 1;
  if (draft.pickIndex >= draft.pickOrder.length) {
    draft.done = true;
    return;
  }
  if (draft.line.length === 0) {
    draft.line = draft.pool.splice(0, draft.lineSize);
  }
}
