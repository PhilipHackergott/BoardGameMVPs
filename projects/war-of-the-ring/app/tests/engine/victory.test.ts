import { describe, expect, it } from 'vitest';
import { createGame } from '../../src/engine';
import { checkMilitary, checkVictory } from '../../src/engine/victory';

const cfg = { scenario: 'base-2p' as const, fpSeatName: 'A', shadowSeatName: 'B' };

describe('victory', () => {
  it('Shadow wins on ≥10 VP of Free Peoples settlements (military)', () => {
    const g = createGame(cfg, 1);
    g.vp = { fp: 0, shadow: 10 };
    checkMilitary(g);
    expect(g.winner).toEqual({ side: 'shadow', path: expect.stringContaining('VP') });
  });

  it('Free Peoples win on ≥4 VP of Shadow settlements (military)', () => {
    const g = createGame(cfg, 1);
    g.vp = { fp: 4, shadow: 0 };
    checkMilitary(g);
    expect(g.winner?.side).toBe('fp');
  });

  it('below the thresholds, no military winner', () => {
    const g = createGame(cfg, 1);
    g.vp = { fp: 3, shadow: 9 };
    checkMilitary(g);
    expect(g.winner).toBeNull();
  });

  it('Corruption 12 ⇒ Shadow wins immediately (Ring)', () => {
    const g = createGame(cfg, 1);
    g.fellowship.corruption = 12;
    checkVictory(g);
    expect(g.winner?.side).toBe('shadow');
  });

  it('Crack of Doom (Mordor step 5) with Corruption < 12 ⇒ Free Peoples win', () => {
    const g = createGame(cfg, 1);
    g.fellowship.onMordorTrack = true;
    g.fellowship.mordorStep = 5;
    g.fellowship.corruption = 7;
    checkVictory(g);
    expect(g.winner?.side).toBe('fp');
  });
});
