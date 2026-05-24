// UI/session store. Game state lives in the engine; this just holds the current MatchState and
// routes user intents through the engine's pure applyAction.

import { create } from 'zustand';
import {
  applyAction,
  createMatch,
  type Action,
  type MatchConfig,
  type MatchState,
} from '../engine';

interface GameStore {
  match: MatchState | null;
  newMatch: (config: MatchConfig) => void;
  dispatch: (action: Action) => void;
  draftPick: (racerId: string) => void;
  reveal: (player: number, racerId: string) => void;
  roll: () => void;
  resolvePrompt: (optionId: string) => void;
  nextRace: () => void;
  quit: () => void;
}

export const useGame = create<GameStore>((set, get) => ({
  match: null,
  newMatch: (config) => set({ match: createMatch(config) }),
  dispatch: (action) => {
    const m = get().match;
    if (m) set({ match: applyAction(m, action) });
  },
  draftPick: (racerId) => get().dispatch({ type: 'draftPick', racerId }),
  reveal: (player, racerId) => get().dispatch({ type: 'reveal', player, racerId }),
  roll: () => get().dispatch({ type: 'roll' }),
  resolvePrompt: (optionId) => get().dispatch({ type: 'resolvePrompt', optionId }),
  nextRace: () => get().dispatch({ type: 'nextRace' }),
  quit: () => set({ match: null }),
}));
