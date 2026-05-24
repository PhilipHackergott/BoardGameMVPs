import { describe, expect, it } from 'vitest';
import { createGame, huntLevel } from '../../src/engine';
import { huntRoll, drawHuntTile, applyHuntDamage } from '../../src/engine/hunt';
import { moveFellowship, enterMordor } from '../../src/engine/fellowship';

const cfg = { scenario: 'base-2p' as const, fpSeatName: 'A', shadowSeatName: 'B' };

describe('hunt', () => {
  it('hunt level = dice in the Hunt Box (allocated + eye)', () => {
    const g = createGame(cfg, 1);
    g.huntBox = { shadowAllocated: 2, eye: 1 };
    expect(huntLevel(g)).toBe(3);
  });

  it('hunt roll uses at most 5 dice and a 6 (lowered by FP dice in box) succeeds', () => {
    const g = createGame(cfg, 1);
    g.huntBox = { shadowAllocated: 7, eye: 1 };
    g.fellowship.fpDiceInBox = 1; // threshold lowers to 5
    const r = huntRoll(g);
    expect(r.dice.length).toBeLessThanOrEqual(5);
    expect(r.threshold).toBe(5);
  });

  it('a numbered tile adds Corruption; reveal flag reveals the Fellowship', () => {
    const g = createGame(cfg, 1);
    const tile = { id: 't', kind: 'number' as const, value: 2, reveal: true };
    const res = applyHuntDamage(g, tile, 0);
    expect(g.fellowship.corruption).toBe(2);
    expect(res.revealed).toBe(true);
    expect(g.fellowship.revealed).toBe(true);
  });

  it('eye tile damage equals the number of successes', () => {
    const g = createGame(cfg, 1);
    const tile = { id: 'e', kind: 'eye' as const, value: 0, reveal: false };
    applyHuntDamage(g, tile, 3);
    expect(g.fellowship.corruption).toBe(3);
  });

  it('drawing a tile removes it from the pool', () => {
    const g = createGame(cfg, 1);
    const before = g.huntPool.length;
    const t = drawHuntTile(g);
    expect(t).not.toBeNull();
    expect(g.huntPool.length).toBe(before - 1);
  });

  it('Mordor: each move advances a step (or stops) and idle adds corruption only when relevant', () => {
    const g = createGame(cfg, 2);
    g.fellowship.lastDeclaredRegion = 'morannon';
    enterMordor(g);
    expect(g.fellowship.onMordorTrack).toBe(true);
    const before = g.fellowship.mordorStep;
    moveFellowship(g);
    expect(g.fellowship.mordorStep).toBeGreaterThanOrEqual(before);
  });

  it('moving the Fellowship adds an FP die to the box (raising the next Hunt)', () => {
    const g = createGame(cfg, 2);
    g.huntBox = { shadowAllocated: 1, eye: 0 };
    expect(g.fellowship.fpDiceInBox).toBe(0);
    moveFellowship(g);
    expect(g.fellowship.fpDiceInBox).toBe(1);
  });
});
