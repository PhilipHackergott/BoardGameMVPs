import { describe, it, expect } from 'vitest';
import { buildTrack, resolveTrackMove } from '../../src/engine';

const CAP = 64;
const mild = buildTrack('mild'); // length 24, no features
const wild = buildTrack('wild'); // star@5, arrow@8(+3), rock@11, star@14, arrow@17(-2), rock@20

describe('resolveTrackMove', () => {
  it('plain move on the Mild track', () => {
    expect(resolveTrackMove(mild, 0, 5, CAP)).toEqual({ pos: 5, finished: false, tripped: false, stars: 0 });
  });

  it('crossing the finish line', () => {
    expect(resolveTrackMove(mild, 20, 5, CAP)).toEqual({ pos: 25, finished: true, tripped: false, stars: 0 });
  });

  it('landing on a star grants one bronze (stars=1)', () => {
    expect(resolveTrackMove(wild, 0, 5, CAP)).toEqual({ pos: 5, finished: false, tripped: false, stars: 1 });
  });

  it('landing on a rock trips the racer', () => {
    expect(resolveTrackMove(wild, 6, 5, CAP)).toEqual({ pos: 11, finished: false, tripped: true, stars: 0 });
  });

  it('an arrow chains into the next landing space (8 +3 -> 11 rock -> trip)', () => {
    expect(resolveTrackMove(wild, 3, 5, CAP)).toEqual({ pos: 11, finished: false, tripped: true, stars: 0 });
  });

  it('a backward arrow moves then resolves the new space (17 -2 -> 15 plain)', () => {
    expect(resolveTrackMove(wild, 12, 5, CAP)).toEqual({ pos: 15, finished: false, tripped: false, stars: 0 });
  });

  it('never lands behind the Start space', () => {
    const res = resolveTrackMove(wild, 18, -1, CAP); // 17 arrow -2 -> 15
    expect(res.pos).toBeGreaterThanOrEqual(0);
  });
});
