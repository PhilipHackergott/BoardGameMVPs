import { describe, expect, it } from 'vitest';
import { createGame, dicePoolSize, REGION_IDS, REGIONS } from '../../src/engine';

const cfg = { scenario: 'base-2p' as const, fpSeatName: 'A', shadowSeatName: 'B' };

describe('setup', () => {
  it('builds the board from config + seed and is deterministic for the same seed', () => {
    const a = createGame(cfg, 42);
    const b = createGame(cfg, 42);
    expect(JSON.stringify(a)).toEqual(JSON.stringify(b));
    expect(REGION_IDS.length).toBeGreaterThan(30);
  });

  it('different seeds shuffle the decks differently', () => {
    const a = createGame(cfg, 1);
    const b = createGame(cfg, 2);
    expect(a.decks.fpStrategy).not.toEqual(b.decks.fpStrategy);
  });

  it('FP rolls 4 dice and Shadow rolls 7 at the start', () => {
    const g = createGame(cfg, 7);
    expect(dicePoolSize(g, 'fp')).toBe(4);
    expect(dicePoolSize(g, 'shadow')).toBe(7);
  });

  it('starts the Fellowship in Rivendell with 7 companions, 0 corruption, Gandalf as Guide', () => {
    const g = createGame(cfg, 7);
    expect(g.fellowship.lastDeclaredRegion).toBe('rivendell');
    expect(g.fellowship.companions).toHaveLength(7);
    expect(g.fellowship.corruption).toBe(0);
    expect(g.fellowship.guideId).toBe('gandalf_grey');
  });

  it('every region adjacency is symmetric', () => {
    for (const r of Object.values(REGIONS)) {
      for (const n of r.adjacency) {
        expect(REGIONS[n].adjacency).toContain(r.id);
      }
    }
  });
});
