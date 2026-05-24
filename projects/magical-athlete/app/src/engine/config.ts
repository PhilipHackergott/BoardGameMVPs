// Tunable constants. Values marked CONFIRM are NOT stated in the rulebook text and must be
// verified against the physical components / CMYK assets before the build gate. The engine
// reads everything from here so corrections are one line.

import type { Side } from './types';

/** CONFIRM: exact space counts per track side. Start = space 0; pos >= length = crossed finish. */
export const TRACK_LENGTH: Record<Side, number> = {
  mild: 24,
  wild: 24,
};

export type FeatureKind = 'arrow' | 'rock' | 'star';
export interface FeatureDef {
  index: number;
  kind: FeatureKind;
  /** For arrows: signed spaces to move when stopping here (a separate move, not the main move). */
  delta?: number;
}

/** CONFIRM: feature layout of the Wild Wilds side. Placeholder positions. */
export const WILD_FEATURES: FeatureDef[] = [
  { index: 5, kind: 'star' },
  { index: 8, kind: 'arrow', delta: 3 },
  { index: 11, kind: 'rock' },
  { index: 14, kind: 'star' },
  { index: 17, kind: 'arrow', delta: -2 },
  { index: 20, kind: 'rock' },
];

/** CONFIRM: printed point values of gold/silver chips (ascending — later races worth more). */
export const GOLD_VALUES = [5, 6, 7, 8]; // indexed by raceNo (0..3)
export const SILVER_VALUES = [3, 4, 5, 6];
export const BRONZE = { one: 1, three: 3 } as const;

export const DEFAULT_SCHEDULE: Side[] = ['mild', 'wild', 'mild', 'wild'];
export const RACE_COUNT = DEFAULT_SCHEDULE.length;

/** Hard safety cap for feature/power resolution chains (loop-break). */
export const RESOLVE_STEP_CAP = 64;

/** CONFIRM: Blimp's "second corner" threshold + its early/late main-move modifiers. The rulebook
 *  text was ambiguous on the early bonus magnitude; confirm against the physical board/cards. */
export const SECOND_CORNER = 12;
export const BLIMP_EARLY = 3;
export const BLIMP_LATE = -1;
