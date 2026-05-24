// Public engine API. The UI and any future AI driver consume ONLY this surface.

export * from './types';
export { createGame } from './setup';
export { legalActions, apply } from './rules';
export { view } from './view';
export type { GameView, FellowshipView } from './view';

// selectors / data the UI needs
export { REGIONS, REGION_IDS, REGION_POS, region, adjacent, MORDOR_ENTRY } from './data/map';
export { CARDS, CARD_BY_ID } from './data/cards';
export { CHARACTERS, CHAR_BY_ID } from './data/characters';
export { dicePoolSize } from './dice';
export { huntLevel } from './hunt';
export {
  combatStrength,
  leadership,
  totalUnits,
  regularCount,
  eliteCount,
  STACKING_LIMIT,
} from './army';
export { isAtWar } from './politics';
export { HAND_LIMIT } from './cards';
export {
  SHADOW_VP_TARGET,
  FP_VP_TARGET,
  CORRUPTION_MAX,
  MORDOR_FINAL_STEP,
} from './victory';

import type { Action, GameState, Side } from './types';
import { region } from './data/map';
import { totalUnits } from './army';

/** A flat description of one region's contents for the RegionStack render component. */
export interface StackSummary {
  regionId: string;
  name: string;
  side: Side | null;
  regular: number;
  elite: number;
  leaders: number;
  nazgul: number;
  characters: string[];
  besieged: boolean;
  control: Side | null;
}

export function stackSummary(state: GameState, regionId: string): StackSummary {
  const s = state.regions[regionId];
  const r = region(regionId);
  let regular = 0;
  let elite = 0;
  if (s) {
    for (const v of Object.values(s.regular)) regular += v ?? 0;
    for (const v of Object.values(s.elite)) elite += v ?? 0;
  }
  return {
    regionId,
    name: r.name,
    side: s && totalUnits(s) > 0 ? s.side : null,
    regular,
    elite,
    leaders: s?.leaders ?? 0,
    nazgul: s?.nazgul ?? 0,
    characters: s?.characters ?? [],
    besieged: s?.besieged ?? false,
    control: (state.control[regionId] as Side) ?? null,
  };
}

export type { Action };
