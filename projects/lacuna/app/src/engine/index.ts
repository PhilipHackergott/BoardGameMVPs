// Public API of the pure Nightweave (Lacuna) engine.

export * from "./types";
export * from "./powers";
export * from "./effects";
export { makeRng } from "./rng";
export {
  dist,
  pointSegInfo,
  projectOnSegment,
  segmentClear,
  nearestBeacon,
  nearestBeaconOwner,
} from "./geometry";
export { createGame, makeConfig, placementOrder } from "./setup";
export { finalize } from "./scoring";
export {
  beaconsPlacedBy,
  beaconsLeft,
  legalPartners,
  legalMoves,
  hasLegalMove,
  isLegalPlacement,
  snapBeacon,
  applyAction,
  type Legality,
} from "./rules";

import type { GameState, PlayerId } from "./types";

// Running per-color collected counts during play (selector).
export function scoreByColor(state: GameState, player: PlayerId): number[] {
  return state.collected[player];
}
