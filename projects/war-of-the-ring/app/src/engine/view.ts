// The hidden-information firewall. `view(state, asSide)` returns a state safe to hand to a given
// seat: the Shadow view NEVER includes the Fellowship's true Progress, Guide, hidden Companion
// list, or Corruption. Security-critical for any future online mode — unit-tested from day one.

import type { GameState, Side } from './types';

export interface FellowshipView {
  revealed: boolean;
  onMordorTrack: boolean;
  mordorStep: number;
  lastDeclaredRegion: string;
  // hidden fields (null for the Shadow seat):
  progress: number | null;
  guideId: string | null;
  companions: string[] | null;
  corruption: number | null;
}

export interface GameView extends Omit<GameState, 'fellowship' | 'hands' | 'decks'> {
  fellowship: FellowshipView;
  hands: { fp: number | string[]; shadow: number | string[] };
  decks: Record<string, number>; // only counts are visible
  asSide: Side;
}

export function view(state: GameState, asSide: Side): GameView {
  const f = state.fellowship;
  const seesFellowship = asSide === 'fp';
  const fellowship: FellowshipView = {
    revealed: f.revealed,
    onMordorTrack: f.onMordorTrack,
    mordorStep: f.mordorStep,
    lastDeclaredRegion: f.lastDeclaredRegion,
    progress: seesFellowship || f.revealed ? f.progress : null,
    guideId: seesFellowship ? f.guideId : null,
    companions: seesFellowship ? [...f.companions] : null,
    corruption: seesFellowship ? f.corruption : null,
  };

  const { fellowship: _f, hands: _h, decks: _d, ...rest } = state;
  return {
    ...rest,
    fellowship,
    hands: {
      fp: asSide === 'fp' ? [...state.hands.fp] : state.hands.fp.length,
      shadow: asSide === 'shadow' ? [...state.hands.shadow] : state.hands.shadow.length,
    },
    decks: {
      fpCharacter: state.decks.fpCharacter.length,
      fpStrategy: state.decks.fpStrategy.length,
      shadowCharacter: state.decks.shadowCharacter.length,
      shadowStrategy: state.decks.shadowStrategy.length,
    },
    asSide,
  };
}
