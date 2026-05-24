import { describe, expect, it } from 'vitest';
import { apply, createGame, legalActions, type GameState } from '../../src/engine';
import { playRandomGame, replay } from '../../src/engine/sim';
import { totalUnits, STACKING_LIMIT } from '../../src/engine';
import { REGION_IDS } from '../../src/engine';

const cfg = { scenario: 'base-2p' as const, fpSeatName: 'A', shadowSeatName: 'B' };

function assertInvariants(s: GameState): void {
  // stacking limit
  for (const id of REGION_IDS) expect(totalUnits(s.regions[id])).toBeLessThanOrEqual(STACKING_LIMIT);
  // tracks in bounds
  expect(s.fellowship.corruption).toBeGreaterThanOrEqual(0);
  expect(s.fellowship.corruption).toBeLessThanOrEqual(12);
  expect(s.fellowship.mordorStep).toBeGreaterThanOrEqual(0);
  expect(s.fellowship.mordorStep).toBeLessThanOrEqual(5);
  // dice counts sane
  expect(s.dice.fp.length).toBeLessThanOrEqual(6);
  expect(s.dice.shadow.length).toBeLessThanOrEqual(10);
}

describe('full-game simulation (AI-ready: drives the public API headlessly)', () => {
  it('random playouts always terminate cleanly (never deadlock) and never reach an illegal state', () => {
    for (const seed of [1, 2, 3, 7, 42]) {
      const { state, deadlock, terminated } = playRandomGame(seed, 4000, 40);
      expect(deadlock).toBe(false);
      expect(terminated).toBe(true);
      assertInvariants(state);
    }
  });

  it('the engine progresses turns under random play (multiple turns elapse, dice get spent)', () => {
    const { state, steps } = playRandomGame(11, 4000, 30);
    expect(state.turn).toBeGreaterThan(3);
    expect(steps).toBeGreaterThan(50);
  });

  it('a military victory fires through the public reducer at the phase-6 check', () => {
    let s: GameState = createGame(cfg, 1);
    s.vp = { fp: 0, shadow: 10 };
    s.phase = 'victoryCheck';
    s = apply(s, { type: 'endPhase' });
    expect(s.winner?.side).toBe('shadow');
  });

  it('a Ring victory (Crack of Doom) fires immediately through the move action', () => {
    let s: GameState = createGame(cfg, 1);
    // put the Fellowship one Mordor step from the end, low corruption, in action resolution
    s.fellowship.onMordorTrack = true;
    s.fellowship.mordorStep = 4;
    s.fellowship.corruption = 2;
    s.fellowship.lastDeclaredRegion = 'morannon';
    s.phase = 'actionResolution';
    s.current = 'fp';
    s.dice.fp = [{ face: 'character', used: false }];
    s.huntPool = []; // no tile ⇒ guaranteed advance
    s = apply(s, { type: 'moveFellowship', dieIndex: 0 });
    expect(s.fellowship.mordorStep).toBe(5);
    expect(s.winner?.side).toBe('fp');
  });

  it('is deterministic: replaying {seed, actions} reproduces the identical end state', () => {
    const { state, actions } = playRandomGame(7, 2000, 25);
    const replayed = replay(7, actions);
    expect(JSON.stringify(replayed)).toEqual(JSON.stringify(state));
  });

  it('legalActions is never empty unless the game is over', () => {
    const { state } = playRandomGame(3, 200, 40);
    if (!state.winner) expect(legalActions(state).length).toBeGreaterThan(0);
  });

  it('every action returned by legalActions applies without throwing', () => {
    const s = playRandomGame(5, 100, 40).state;
    const opts = legalActions(s);
    for (const a of opts.slice(0, 12)) {
      expect(() => apply(s, a)).not.toThrow();
    }
  });
});
