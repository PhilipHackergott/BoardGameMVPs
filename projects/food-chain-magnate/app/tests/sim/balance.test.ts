// AI-vs-AI balance sweep — `npm run sim`. Verifies full games run end-to-end headlessly, terminate,
// stay legal, are deterministic, and reports the difficulty-ladder win-rates (the tuning signal).

import { describe, it, expect } from 'vitest';
import {
  createGame,
  simulateGame,
  PRODUCTS,
  type GameState,
  type Policies,
} from '../../src/engine';
import { makeAI } from '../../src/ai/ai';
import { PROFILES } from '../../src/ai/profiles';

const PROFILE_IDS = Object.keys(PROFILES);

function policies(tiers: ('low' | 'med' | 'hard')[]): Policies {
  const out: Policies = {};
  tiers.forEach((t, i) => (out[i] = makeAI(t, PROFILE_IDS[i % PROFILE_IDS.length])));
  return out;
}

function assertLegal(s: GameState): void {
  expect(s.ended).toBe(true);
  expect(s.winner).not.toBeNull();
  for (const c of s.companies) {
    expect(PRODUCTS.every((p) => c.stock[p] >= 0)).toBe(true); // never negative stock
    // org-chart: never more than 3 managers at work would be illegal; structure is rebuilt each turn
  }
  expect(s.bankBreaks).toBeGreaterThanOrEqual(0);
}

describe('AI-vs-AI full game', () => {
  it('terminates with a legal winner across player counts and seeds', () => {
    let natural = 0;
    let total = 0;
    for (const players of [2, 3, 4]) {
      for (let seed = 1; seed <= 12; seed++) {
        const tiers = Array(players).fill('med') as ('low' | 'med' | 'hard')[];
        const end = simulateGame(createGame({ players, seed }), policies(tiers));
        assertLegal(end);
        total += 1;
        if (end.bankBreaks === 2) natural += 1;
      }
    }
    // most games should end naturally (2nd bank break) rather than hit the safety turn cap
    expect(natural / total).toBeGreaterThan(0.5);
  });

  it('is fully reproducible (same seed → same winner & final cash)', () => {
    const run = () => {
      const end = simulateGame(createGame({ players: 3, seed: 9 }), policies(['med', 'med', 'med']));
      return { winner: end.winner, turn: end.turn, cash: end.companies.map((c) => c.cash) };
    };
    expect(run()).toEqual(run());
  });

  it('the difficulty ladder climbs (sim-verified, tier isolated on a neutral profile)', () => {
    type T = 'low' | 'med' | 'hard';
    const matchup = (a: T, b: T, N = 50): number => {
      let aWins = 0;
      for (let seed = 1; seed <= N; seed++) {
        const tiers: T[] = seed % 2 === 0 ? [a, b] : [b, a]; // alternate seats
        const pol: Policies = { 0: makeAI(tiers[0], 'old-hubbard'), 1: makeAI(tiers[1], 'old-hubbard') };
        const end = simulateGame(createGame({ players: 2, seed }), pol);
        if (end.winner === tiers.indexOf(a)) aWins += 1;
      }
      return aWins / N;
    };
    const hardVsLow = matchup('hard', 'low');
    const hardVsMed = matchup('hard', 'med');
    const medVsLow = matchup('med', 'low');
    // eslint-disable-next-line no-console
    console.log(`[sim ladder] Hard>Low ${(hardVsLow * 100).toFixed(0)}% · Hard>Med ${(hardVsMed * 100).toFixed(0)}% · Med>Low ${(medVsLow * 100).toFixed(0)}%`);
    // Deterministic sim → these win-rates are exact and reproducible. The Hard tier is now the
    // multi-turn search (src/ai/search.ts); it cleared the 0.70 aspiration that the 1-turn heuristic
    // couldn't reach (≈0.64). Floors sit just under the measured values to absorb future code changes.
    expect(hardVsLow).toBeGreaterThanOrEqual(0.9); // measured ≈1.00
    expect(medVsLow).toBeGreaterThanOrEqual(0.7); // measured ≈0.82
    expect(hardVsMed).toBeGreaterThanOrEqual(0.7); // measured ≈0.76 — search clears the 70%+ ideal
  });
});
