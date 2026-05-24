import { describe, expect, it } from 'vitest';
import { createGame, isAtWar } from '../../src/engine';
import { activate, advance } from '../../src/engine/politics';
import { canRecruitAt } from '../../src/engine/muster';

const cfg = { scenario: 'base-2p' as const, fpSeatName: 'A', shadowSeatName: 'B' };

describe('politics', () => {
  it('FP nations start Passive except the Elves', () => {
    const g = createGame(cfg, 1);
    expect(g.politics.elves.active).toBe(true);
    expect(g.politics.north.active).toBe(false);
    expect(g.politics.rohan.active).toBe(false);
    expect(g.politics.gondor.active).toBe(false);
    expect(g.politics.dwarves.active).toBe(false);
  });

  it('a passive nation can never reach At War until activated', () => {
    const g = createGame(cfg, 1);
    advance(g, 'gondor', 5, 'test'); // push past the cap
    expect(isAtWar(g, 'gondor')).toBe(false);
    activate(g, 'gondor', 'enemy entered');
    advance(g, 'gondor', 5, 'test');
    expect(isAtWar(g, 'gondor')).toBe(true);
  });

  it('only an At-War nation may recruit (muster)', () => {
    const g = createGame(cfg, 1);
    // gondor not at war initially → cannot recruit in Minas Tirith
    expect(canRecruitAt(g, 'fp', 'gondor', 'minas_tirith')).toBe(false);
    activate(g, 'gondor', 'test');
    advance(g, 'gondor', 5, 'test');
    expect(canRecruitAt(g, 'fp', 'gondor', 'minas_tirith')).toBe(true);
  });
});
