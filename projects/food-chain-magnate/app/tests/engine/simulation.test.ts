import { describe, it, expect } from 'vitest';
import {
  createGame,
  simulateScriptedGame,
  goods,
  mapSize,
  type GameState,
  type TurnScript,
} from '../../src/engine';

describe('setup (createGame)', () => {
  it('builds the right board size + starting bank per player count', () => {
    expect(mapSize(2)).toEqual({ rows: 3, cols: 3 });
    expect(mapSize(3)).toEqual({ rows: 3, cols: 4 });
    expect(mapSize(4)).toEqual({ rows: 4, cols: 4 });
    for (const players of [2, 3, 4]) {
      const s = createGame({ players, seed: 1 });
      expect(s.bank).toBe(50 * players);
      expect(s.companies).toHaveLength(players);
      expect(s.companies.every((c) => c.restaurants.length === 1)).toBe(true);
      expect(s.map.houses.length).toBeGreaterThan(0);
    }
  });

  it('is deterministic for a given seed', () => {
    const a = createGame({ players: 3, seed: 42 });
    const b = createGame({ players: 3, seed: 42 });
    expect(JSON.stringify(a.map.houses)).toBe(JSON.stringify(b.map.houses));
    expect(a.companies.map((c) => c.restaurants)).toEqual(b.companies.map((c) => c.restaurants));
    // different seed → (very likely) different house layout
    const c = createGame({ players: 3, seed: 43 });
    expect(JSON.stringify(c.map.houses)).not.toBe(JSON.stringify(a.map.houses));
  });
});

// Each turn, company 0 (the only one with stock) sells a big burger order, draining the bank.
const drainScript: TurnScript = (s) => {
  s.map.houses.forEach((h, i) => {
    h.demand = goods(i === 0 ? { burger: 30 } : {});
    if (i === 0) h.garden = false;
  });
  s.companies[0].stock = goods({ burger: 1000 });
};

function snapshot(s: GameState) {
  return { turn: s.turn, bank: s.bank, breaks: s.bankBreaks, winner: s.winner, cash: s.companies.map((c) => c.cash) };
}

describe('scripted sell-loop game', () => {
  it('terminates on the 2nd bank break with a winner', () => {
    const end = simulateScriptedGame(createGame({ players: 2, seed: 5 }), drainScript);
    expect(end.ended).toBe(true);
    expect(end.bankBreaks).toBe(2);
    expect(end.winner).not.toBeNull();
    expect(end.winner).toBe(0); // only company 0 ever sells
    expect(end.turn).toBeLessThan(200); // didn't hit the safety cap
  });

  it('is fully reproducible (no in-play randomness)', () => {
    const a = simulateScriptedGame(createGame({ players: 2, seed: 5 }), drainScript);
    const b = simulateScriptedGame(createGame({ players: 2, seed: 5 }), drainScript);
    expect(snapshot(a)).toEqual(snapshot(b));
  });
});
