// Zustand store — holds the engine GameState + ephemeral UI state (selection, handoff). All
// mutations go through engine.apply; the UI never mutates game state directly. The per-seat `view`
// (hidden-info firewall) is derived for the active viewer so the Shadow seat never sees Fellowship
// detail; a blur "pass the device" overlay gates the handoff when control changes side.

import { useMemo } from 'react';
import { create } from 'zustand';
import { apply, createGame, legalActions, view, type Action, type GameState, type GameView, type Side } from '../engine';

export type Screen = 'title' | 'game' | 'end';

function activeViewer(s: GameState): Side {
  // Who should be looking at the screen now.
  if (s.pendingCombat && !s.pendingCombat.resolved) return s.pendingCombat.attacker;
  switch (s.phase) {
    case 'huntAllocation':
      return 'shadow';
    case 'fellowship':
      return 'fp';
    case 'actionResolution':
      return s.current;
    default:
      return s.current;
  }
}

interface StoreState {
  screen: Screen;
  game: GameState | null;
  seed: number;
  fpName: string;
  shadowName: string;
  selected: string | null;
  viewer: Side;
  handoffPending: boolean;
  // derived
  newGame: (seed: number, fpName: string, shadowName: string) => void;
  dispatch: (a: Action) => void;
  select: (id: string | null) => void;
  ackHandoff: () => void;
  legal: () => Action[];
  currentView: () => GameView | null;
}

export const useGame = create<StoreState>((set, get) => ({
  screen: 'title',
  game: null,
  seed: 0,
  fpName: 'Free Peoples',
  shadowName: 'Shadow',
  selected: null,
  viewer: 'fp',
  handoffPending: false,

  newGame: (seed, fpName, shadowName) => {
    const game = createGame({ scenario: 'base-2p', fpSeatName: fpName, shadowSeatName: shadowName }, seed >>> 0);
    set({ game, seed: seed >>> 0, fpName, shadowName, screen: 'game', selected: null, viewer: activeViewer(game), handoffPending: false });
  },

  dispatch: (a) => {
    const cur = get().game;
    if (!cur) return;
    const next = apply(cur, a);
    const nextViewer = activeViewer(next);
    const changedSeat = nextViewer !== get().viewer && !next.outcome && !(next.pendingCombat && !next.pendingCombat.resolved);
    set({
      game: next,
      viewer: nextViewer,
      handoffPending: changedSeat && !next.winner,
      screen: next.winner ? 'end' : 'game',
      selected: a.type === 'declareFellowship' || a.type === 'moveArmy' || a.type === 'attack' ? get().selected : get().selected,
    });
  },

  select: (id) => set({ selected: id }),
  ackHandoff: () => set({ handoffPending: false }),
  legal: () => {
    const g = get().game;
    return g ? legalActions(g) : [];
  },
  currentView: () => {
    const g = get().game;
    return g ? view(g, get().viewer) : null;
  },
}));

// ── memoized hooks: NEVER build fresh objects inside a Zustand selector (that loops re-renders).
// Select the raw refs, then derive view/legal with useMemo keyed on those refs. ──────────────
export function useView(): GameView | null {
  const game = useGame((s) => s.game);
  const viewer = useGame((s) => s.viewer);
  return useMemo(() => (game ? view(game, viewer) : null), [game, viewer]);
}

export function useLegal(): Action[] {
  const game = useGame((s) => s.game);
  return useMemo(() => (game ? legalActions(game) : []), [game]);
}
