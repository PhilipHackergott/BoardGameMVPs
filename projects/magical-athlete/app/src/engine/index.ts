// Public API of the Magical Athlete engine. UI/render/AI consume only this.

export * from './types';
export { createMatch } from './setup';
export { legalActions, applyAction, currentRacerIndex, peekDie } from './rules';
export { simulateMatch, replay } from './sim';
export { pointsByPlayer, computeWinners } from './scoring';
export { buildTrack, featureAt, type Track, type Space } from './track';
export { resolveTrackMove, type MoveResult } from './movement';
export {
  beginTurn,
  resumeTurn,
  simulateRaceTurn,
  applySuckerfishFollow,
  applyDuel,
  type ChipAward,
  type TurnResult,
} from './resolve';
export { POWERS, type PowerHooks, type PowerApi } from './powers';
export { currentDrafter, racersPerPlayer } from './draft';
export { RACERS, racersById } from './racers';
export {
  TRACK_LENGTH,
  WILD_FEATURES,
  GOLD_VALUES,
  SILVER_VALUES,
  BRONZE,
  DEFAULT_SCHEDULE,
  RACE_COUNT,
  type FeatureDef,
  type FeatureKind,
} from './config';
