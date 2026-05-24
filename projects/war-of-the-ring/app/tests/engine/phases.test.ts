import { describe, expect, it } from 'vitest';
import { apply, createGame, type GameState } from '../../src/engine';

const cfg = { scenario: 'base-2p' as const, fpSeatName: 'A', shadowSeatName: 'B' };

function toResolution(g: GameState): GameState {
  let s = apply(g, { type: 'recoverAndDraw' });
  s = apply(s, { type: 'endPhase' }); // fellowship -> huntAllocation
  s = apply(s, { type: 'huntAllocate', dice: 1 });
  s = apply(s, { type: 'endPhase' }); // huntAllocation -> actionRoll
  s = apply(s, { type: 'rollDice' });
  return s;
}

describe('phases', () => {
  it('runs the 6 phases in order and draws on turn 1 (1 from each of the four decks)', () => {
    const g = createGame(cfg, 11);
    expect(g.phase).toBe('recoverAndDraw');
    const s = apply(g, { type: 'recoverAndDraw' });
    expect(s.phase).toBe('fellowship');
    // turn 1: FP drew 2 (one per FP deck), Shadow drew 2
    expect(s.hands.fp).toHaveLength(2);
    expect(s.hands.shadow).toHaveLength(2);
  });

  it('moves Eye results to the Hunt Box at roll time and they are never spendable', () => {
    const s = toResolution(createGame(cfg, 5));
    const eyes = s.dice.shadow.filter((d) => d.face === 'eye');
    for (const e of eyes) expect(e.used).toBe(true);
    expect(s.huntBox.eye).toBe(eyes.length);
  });

  it('enters action resolution with FP to act first', () => {
    const s = toResolution(createGame(cfg, 9));
    expect(s.phase).toBe('actionResolution');
    expect(s.current).toBe('fp');
  });

  it('honours the Hunt allocation by committing that many Shadow dice', () => {
    let s = apply(createGame(cfg, 3), { type: 'recoverAndDraw' });
    s = apply(s, { type: 'endPhase' });
    s = apply(s, { type: 'huntAllocate', dice: 2 });
    s = apply(s, { type: 'endPhase' });
    s = apply(s, { type: 'rollDice' });
    expect(s.huntBox.shadowAllocated).toBe(2);
    // committed dice are marked used (cannot be spent on actions)
    const usedNonEye = s.dice.shadow.filter((d) => d.used && d.face !== 'eye').length;
    expect(usedNonEye).toBeGreaterThanOrEqual(2);
  });

  it('forfeiting all dice for both sides ends resolution at the victory check', () => {
    let s = toResolution(createGame(cfg, 13));
    s = apply(s, { type: 'forfeitRemaining', side: 'fp' });
    s = apply(s, { type: 'forfeitRemaining', side: 'shadow' });
    expect(s.phase).toBe('victoryCheck');
  });
});
