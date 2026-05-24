// Pure domain types for the Nightweave (Lacuna) engine. No framework, no I/O.

import type { PowerId } from "./powers";

export type ColorId = number; // 0..colors-1
export type PlayerId = number; // 0..players-1

// A line barrier raised by the Intercept power: rivals can't place on/across it.
export interface Barrier {
  owner: PlayerId;
  ax: number;
  ay: number;
  bx: number;
  by: number;
}

export interface Star {
  id: number;
  color: ColorId;
  x: number;
  y: number;
}

export interface Beacon {
  id: number;
  owner: PlayerId;
  x: number;
  y: number;
  phantom?: boolean; // Catalyst: collects normally but is excluded from territory
}

export interface GameConfig {
  players: number; // 2..4
  colors: number; // number of distinct colors (7)
  perColor: number; // stars per color (7)
  beaconsPerPlayer: number; // beacons each player places (12 / players)
  fieldR: number; // play-field radius (engine units, field centered at origin)
  starR: number; // star radius — also the line-clearance radius for stars
  beaconR: number; // beacon radius — also the line-clearance radius for beacons
  edgeInset: number; // keep star centers this far inside the field edge
  minCenterDist: number; // minimum distance between star centers at setup
}

export type Result = PlayerId | "draw"; // winning player index, or a tie

// End-game attribution: which pawn (beacon) claimed each leftover flower. owner is
// null when the flower was equidistant between rivals and therefore discarded.
export interface TerritoryClaim {
  starId: number;
  color: ColorId;
  x: number;
  y: number;
  owner: PlayerId | null;
  beaconX: number | null;
  beaconY: number | null;
}

export type Action =
  | { type: "claim"; starId: number } // setup: first player takes one bonus flower
  | { type: "place"; aStarId: number; bStarId: number; x: number; y: number }
  | { type: "freePick"; starId: number } // resolve a pending free pick (collect or remove)
  | { type: "repel"; x: number; y: number } // Repeller: choose the cone direction (toward x,y)
  | { type: "nomadPickup"; beaconId: number } // Nomad: reclaim one of your beacons to redeploy
  | { type: "duskSteal"; colorId: number } // Dusk affinity: steal 1 of a colour from its leader
  | { type: "abyssVoid"; starId: number } // Abyss affinity: banish one flower from the game
  | { type: "abyssSkip" } // Abyss affinity: decline the optional banish
  | { type: "flexPass" } // Flexible: skip now, keep the pawn for later
  | { type: "flexExtra" } // Flexible: take an extra turn now
  | { type: "pass" };

// A queued free-flower action created by a power, resolved by the player clicking a flower.
export type FreePick = "collect" | "remove";

export interface GameState {
  config: GameConfig;
  seed: number;
  stars: Star[]; // stars still on the field
  beacons: Beacon[];
  collected: number[][]; // [player][color] collected during play
  current: PlayerId;
  order: PlayerId[]; // full placement sequence (snake / alternation), length 12
  turnIndex: number; // position in `order`
  passesInARow: number;
  phase: "setup" | "play" | "ended";
  log: Action[];
  // Special-powers mode (empty / default = base game):
  powers: PowerId[][]; // drafted powers per player
  barriers: Barrier[]; // Intercept lines
  flexPassUsed: boolean[]; // Flexible: free pass spent
  flexExtraUsed: boolean[]; // Flexible: extra turn spent
  patronUsed: boolean[]; // Patron: bonus pickup already triggered
  freePicks: FreePick[]; // queued free flower picks (collect/remove) for the current player
  lastPlace: { owner: PlayerId; color: ColorId } | null; // most recent placement (Shadow Follow)
  catalystUsed: boolean[]; // Catalyst: phantom placement already granted
  phantomNext: boolean[]; // Catalyst: the player's next placed beacon is a phantom
  nomadUsed: boolean[]; // Nomad: beacon redeploy already spent
  repelOrigin: { x: number; y: number } | null; // Repeller: awaiting a cone direction from here
  affinity: (ColorId | null)[]; // each player's drafted colour affinity (null = none)
  frozenStars: number[]; // Frost affinity: star ids immune to any displacement
  duskPending: boolean; // Dusk affinity: current player must choose a colour to steal
  abyssPending: boolean; // Abyss affinity: current player may banish a flower (optional)
  bonusBeacons: number[]; // Flexible: extra pawns granted beyond beaconsPerPlayer
  momentumColor: (ColorId | null)[]; // Momentum: the colour each player collected last placement
  momentumStreak: number[]; // Momentum: consecutive same-colour placements
  // populated only when phase === "ended":
  finalByColor: number[][] | null; // [player][color] = collected + territory
  colorWinners: (PlayerId | null)[] | null; // per color: winner or null (tie)
  discarded: number; // stars discarded at end by equidistant ties
  result: Result | null;
  territory: TerritoryClaim[] | null; // per leftover flower: who claimed it
}

export const DEFAULT_CONFIG: GameConfig = {
  players: 2,
  colors: 7,
  perColor: 7,
  beaconsPerPlayer: 6,
  fieldR: 300,
  starR: 12,
  beaconR: 9,
  edgeInset: 18,
  minCenterDist: 44,
};
