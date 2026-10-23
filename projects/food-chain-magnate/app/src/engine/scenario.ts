// Apply a campaign ScenarioDef onto a fresh game (seat config; the spine supports further setup
// overrides — starting cards, pre-seeded market, milestone subsets — as the arc is authored).

import type { ScenarioDef } from './data/scenarios';
import { createGame } from './setup';
import type { GameState } from './types';

export function applyScenario(def: ScenarioDef, seed: number): GameState {
  const seats = [
    { kind: 'human' as const },
    ...def.rivals.map((r) => ({ kind: 'ai' as const, aiProfile: r.profile })),
  ];
  return createGame({ players: def.players, seed, seats });
}

export type Medal = 'gold' | 'silver' | 'bronze' | null;

/** Medal earned for clearing a scenario in `turns` (lower is better). */
export function medalFor(def: ScenarioDef, turns: number): Medal {
  if (turns <= def.medals.gold) return 'gold';
  if (turns <= def.medals.silver) return 'silver';
  if (turns <= def.medals.bronze) return 'bronze';
  return null;
}
