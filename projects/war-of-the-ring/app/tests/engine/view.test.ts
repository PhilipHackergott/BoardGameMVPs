import { describe, expect, it } from 'vitest';
import { createGame, view } from '../../src/engine';

const cfg = { scenario: 'base-2p' as const, fpSeatName: 'A', shadowSeatName: 'B' };

describe('view (hidden-info firewall)', () => {
  it('the Shadow view never leaks Fellowship Progress, Guide, Companions, or Corruption', () => {
    const g = createGame(cfg, 1);
    g.fellowship.progress = 4;
    g.fellowship.corruption = 5;
    const sv = view(g, 'shadow');
    expect(sv.fellowship.progress).toBeNull();
    expect(sv.fellowship.guideId).toBeNull();
    expect(sv.fellowship.companions).toBeNull();
    expect(sv.fellowship.corruption).toBeNull();
    // serialized Shadow view must not contain the hidden numbers anywhere
    expect(JSON.stringify(sv.fellowship)).not.toContain('"progress":4');
  });

  it('the FP view sees its own Fellowship detail', () => {
    const g = createGame(cfg, 1);
    g.fellowship.progress = 4;
    const fv = view(g, 'fp');
    expect(fv.fellowship.progress).toBe(4);
    expect(fv.fellowship.companions).toHaveLength(7);
  });

  it('each seat sees only its own hand contents (opponent hand is a count)', () => {
    const g = createGame(cfg, 1);
    g.hands.fp = ['fp_strategy_01'];
    g.hands.shadow = ['shadow_strategy_01', 'shadow_strategy_02'];
    const fv = view(g, 'fp');
    expect(Array.isArray(fv.hands.fp)).toBe(true);
    expect(fv.hands.shadow).toBe(2);
  });
});
