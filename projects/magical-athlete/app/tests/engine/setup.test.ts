import { describe, it, expect } from 'vitest';
import {
  createMatch,
  applyAction,
  legalActions,
  DEFAULT_SCHEDULE,
  type MatchConfig,
  type MatchState,
} from '../../src/engine';

function cfg(players: number, seed = 1, doubleRacer = false): MatchConfig {
  return { players, schedule: DEFAULT_SCHEDULE, doubleRacer, seed };
}

function autoDraft(start: MatchState): MatchState {
  let s = start;
  while (s.phase === 'draft') {
    s = applyAction(s, legalActions(s)[0]);
  }
  return s;
}

describe('draft', () => {
  it('standard 4-player draft gives each player 4 racers', () => {
    let s = createMatch(cfg(4));
    expect(s.draft.pickOrder).toHaveLength(16);
    expect(s.draft.lineSize).toBe(8);
    s = autoDraft(s);
    expect(s.draft.hands.map((h) => h.length)).toEqual([4, 4, 4, 4]);
    expect(s.phase).toBe('reveal');
  });

  it('standard 3-player draft gives each player 4 racers', () => {
    let s = autoDraft(createMatch(cfg(3)));
    expect(s.draft.hands.map((h) => h.length)).toEqual([4, 4, 4]);
  });

  it('2-player double-racer draft gives each player 8 racers', () => {
    let s = createMatch(cfg(2, 1, true));
    expect(s.draft.pickOrder).toHaveLength(16);
    expect(s.draft.lineSize).toBe(8);
    s = autoDraft(s);
    expect(s.draft.hands.map((h) => h.length)).toEqual([8, 8]);
  });

  it('never drafts a racer twice and is deterministic by seed', () => {
    const a = autoDraft(createMatch(cfg(4, 42)));
    const b = autoDraft(createMatch(cfg(4, 42)));
    expect(a.draft.hands).toEqual(b.draft.hands);
    const all = a.draft.hands.flat();
    expect(new Set(all).size).toBe(all.length);
  });
});
