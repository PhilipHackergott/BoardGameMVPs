import { describe, it, expect } from 'vitest';
import {
  simulateMatch,
  replay,
  pointsByPlayer,
  DEFAULT_SCHEDULE,
  type MatchConfig,
  type MatchState,
} from '../../src/engine';

function cfg(players: number, seed: number): MatchConfig {
  return { players, schedule: DEFAULT_SCHEDULE, doubleRacer: false, seed };
}

function assertValid(s: MatchState): void {
  expect(s.phase).toBe('ended');
  expect(s.winners).not.toBeNull();
  expect(s.winners!.length).toBeGreaterThan(0);
  // each player raced exactly one racer per race, never reused
  for (let p = 0; p < s.config.players; p++) {
    expect(s.used[p].length).toBe(DEFAULT_SCHEDULE.length);
    expect(new Set(s.used[p]).size).toBe(s.used[p].length);
  }
  // points are sane
  expect(pointsByPlayer(s).every((x) => x >= 0)).toBe(true);
}

describe('full match simulation', () => {
  it('terminates and is valid for 3 and 4 players across many seeds', () => {
    for (const players of [3, 4]) {
      for (let seed = 1; seed <= 40; seed++) {
        assertValid(simulateMatch(cfg(players, seed)));
      }
    }
  });

  it('2-player double-racer match terminates and is valid across seeds', () => {
    for (let seed = 1; seed <= 30; seed++) {
      const s = simulateMatch({ players: 2, schedule: DEFAULT_SCHEDULE, doubleRacer: true, seed });
      expect(s.phase).toBe('ended');
      expect(s.winners).not.toBeNull();
      expect(s.winners!.length).toBeGreaterThan(0);
      // each player runs 2 racers per race x 4 races = 8 distinct racers
      for (let p = 0; p < 2; p++) {
        expect(s.used[p].length).toBe(8);
        expect(new Set(s.used[p]).size).toBe(8);
      }
    }
  });

  it('is deterministic (same seed -> identical state) and replayable from the log', () => {
    const c = cfg(4, 7);
    const a = simulateMatch(c);
    const b = simulateMatch(c);
    expect(b).toEqual(a);

    const r = replay(c, a.log);
    expect(pointsByPlayer(r)).toEqual(pointsByPlayer(a));
    expect(r.winners).toEqual(a.winners);
  });
});
