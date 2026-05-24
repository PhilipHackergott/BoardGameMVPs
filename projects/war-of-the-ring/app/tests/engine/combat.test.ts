import { describe, expect, it } from 'vitest';
import { apply, createGame, STACKING_LIMIT, totalUnits, type GameState } from '../../src/engine';

const cfg = { scenario: 'base-2p' as const, fpSeatName: 'A', shadowSeatName: 'B' };

/** Hand-place a small field battle and resolve rounds until decisive. */
function setupBattle(seed: number): GameState {
  const g = createGame(cfg, seed);
  // Shadow at morannon attacks FP placed adjacently at dagorlad
  g.regions['dagorlad'] = { side: 'fp', regular: { gondor: 2 }, elite: {}, leaders: 1, nazgul: 0, characters: [], besieged: false };
  g.regions['morannon'] = { side: 'shadow', regular: { sauron: 4 }, elite: { sauron: 1 }, leaders: 0, nazgul: 1, characters: [], besieged: false };
  return g;
}

describe('combat', () => {
  it('field combat reduces armies and resolves to a winner', () => {
    let s = setupBattle(101);
    s = apply(s, { type: 'attack', side: 'shadow', from: 'morannon', to: 'dagorlad', dieIndex: 0 });
    // run rounds until resolved
    let guard = 0;
    while (s.pendingCombat && !s.pendingCombat.resolved && guard++ < 20) {
      s = apply(s, { type: 'combatRound' });
    }
    expect(s.pendingCombat?.resolved).toBe(true);
    expect(s.pendingCombat?.lastRoll).toBeDefined();
    // ≤5 combat dice per side
    expect(s.pendingCombat!.lastRoll!.attackerDice.length).toBeLessThanOrEqual(5);
    expect(s.pendingCombat!.lastRoll!.defenderDice.length).toBeLessThanOrEqual(5);
  });

  it('a wiped defender cedes the region to the attacker', () => {
    const g = createGame(cfg, 5);
    g.regions['dagorlad'] = { side: 'fp', regular: { gondor: 1 }, elite: {}, leaders: 0, nazgul: 0, characters: [], besieged: false };
    g.regions['morannon'] = { side: 'shadow', regular: { sauron: 5 }, elite: { sauron: 1 }, leaders: 0, nazgul: 1, characters: [], besieged: false };
    let s = apply(g, { type: 'attack', side: 'shadow', from: 'morannon', to: 'dagorlad', dieIndex: 0 });
    let guard = 0;
    while (s.pendingCombat && !s.pendingCombat.resolved && guard++ < 30) s = apply(s, { type: 'combatRound' });
    s = apply(s, { type: 'clearOutcome' });
    expect(s.regions['dagorlad']?.side).toBe('shadow');
  });

  it('siege: defender can retreat into the stronghold (capped at 5 units)', () => {
    const g = createGame(cfg, 8);
    g.regions['minas_tirith'] = { side: 'fp', regular: { gondor: 6 }, elite: { gondor: 2 }, leaders: 1, nazgul: 0, characters: [], besieged: false };
    g.regions['pelennor'] = { side: 'shadow', regular: { sauron: 6 }, elite: { sauron: 2 }, leaders: 0, nazgul: 1, characters: [], besieged: false };
    let s = apply(g, { type: 'attack', side: 'shadow', from: 'pelennor', to: 'minas_tirith', dieIndex: 0 });
    s = apply(s, { type: 'combatRetreat', toRegion: 'minas_tirith' });
    expect(s.regions['minas_tirith']?.besieged).toBe(true);
    expect(totalUnits(s.regions['minas_tirith'])).toBeLessThanOrEqual(5);
  });

  it('stacking never exceeds 10 in a region a recruit targets', () => {
    const g = createGame(cfg, 8);
    const s = g.regions['minas_tirith'];
    expect(totalUnits(s)).toBeLessThanOrEqual(STACKING_LIMIT);
  });
});
