import { describe, it, expect } from 'vitest';
import { pointsByPlayer, computeWinners, type MatchState } from '../../src/engine';

// pointsByPlayer / computeWinners only read state.chips, so a minimal partial state suffices.
function withChips(chips: MatchState['chips']): MatchState {
  return { chips } as MatchState;
}

describe('scoring', () => {
  it('sums chip values per player', () => {
    const s = withChips([
      [
        { kind: 'gold', value: 8 },
        { kind: 'bronze', value: 1 },
      ],
      [{ kind: 'silver', value: 3 }],
    ]);
    expect(pointsByPlayer(s)).toEqual([9, 3]);
  });

  it('picks the highest total as the winner', () => {
    const s = withChips([[{ kind: 'gold', value: 5 }], [{ kind: 'silver', value: 3 }]]);
    expect(computeWinners(s)).toEqual([0]);
  });

  it('returns all tied players when totals are equal', () => {
    const s = withChips([[{ kind: 'gold', value: 5 }], [{ kind: 'gold', value: 5 }]]);
    expect(computeWinners(s)).toEqual([0, 1]);
  });
});
