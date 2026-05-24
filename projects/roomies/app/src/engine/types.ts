// Game state types. Plain-serializable (no Set/Map) so a game is fully reconstructable
// from { config, seed, action-log } — determinism per the factory stack conventions.
//
// A round has two phases:
//   1. DRAFT  — pick-and-pass: each pick moves a card from the hand in front of you into your
//               personal `pool`; Dalai (rotate hands) / Marty (swap a hand) fire here.
//   2. PLACE  — each player arranges the cards they drafted (their pool) into their rooms.
// After the final round's placement, the game ends and tableaus are scored.

import type { Biome, Card } from "./cards";

export type PlayerId = number;
export type CardId = number;
export type Phase = "draft" | "place" | "ended";

// Who controls a seat. The pure engine ignores this (it's the same rules for everyone);
// the UI driver reads it to auto-play AI seats and to decide when to hide hands.
export type SeatType = "human" | "easy" | "medium" | "hard";

export interface GameConfig {
  players: number; // 2..4
  rounds: number; // default 3
  handSize: number; // default 6
  seats: SeatType[]; // length === players; controls who plays each seat
}

export interface EnvInstance {
  cardId: CardId;
  defId: string;
  ausbau: number; // count of Ausbau attached (+2 Raum each)
  dekoration: boolean;
  extraBiomes: Biome[]; // biome tags added by improvements
  animalIds: CardId[]; // animals placed here
}

export interface PlayerState {
  id: PlayerId;
  pool: CardId[]; // cards drafted this round, awaiting placement
  environments: EnvInstance[];
  discard: CardId[];
}

export type PendingChoice = { type: "martySwap"; cardId: CardId; options: PlayerId[] };

export type Action =
  // draft phase
  | { type: "draftPick"; cardId: CardId }
  | { type: "resolveMarty"; withPlayer: PlayerId | null }
  // place phase
  | { type: "place"; cardId: CardId; targetEnvCardId?: CardId; targetAnimalCardId?: CardId }
  | { type: "discardFromPool"; cardId: CardId }
  | { type: "endPlacement" };

export interface GameState {
  config: GameConfig;
  seed: number;
  cards: Card[]; // registry, index === id
  jokered: CardId[]; // animal cardIds whose type was set to Joker by Verkleidung
  deck: CardId[]; // undealt cards (draw from the front)
  hands: CardId[][]; // hands[seat] = hand currently in front of player at that seat position (draft only)
  players: PlayerState[]; // indexed by PlayerId
  round: number; // 1..rounds
  pick: number; // 0-based pick index within the draft (0..handSize-1)
  turnInPick: number; // 0..players-1 — which seat is acting in the current pick-round
  current: PlayerId; // whose turn (draft: who picks; place: who places)
  passDir: 1 | -1;
  extraRotations: number; // queued extra hand rotations (Dalai), applied at pick-round end
  pendingSwaps: { from: PlayerId; to: PlayerId }[]; // queued Marty swaps, applied at pick-round end
  phase: Phase;
  pending: PendingChoice | null;
  scores: PlayerScore[] | null; // populated when phase === "ended"
  log: Action[];
  message: string | null; // last engine note (e.g. an intercept), for the UI
}

// --- Scoring breakdown ---
export interface AnimalScore {
  cardId: CardId;
  defId: string;
  base: number;
  adjusted: number; // after modifiers + Dekoration clamp
  reasons: string[]; // human-readable modifier explanations
}

export interface EnvScore {
  cardId: CardId;
  defId: string;
  multiplier: number;
  animals: AnimalScore[];
  subtotal: number; // sum of adjusted before multiplier
  total: number; // subtotal * multiplier
}

export interface PlayerScore {
  playerId: PlayerId;
  environments: EnvScore[];
  biomeSets: number; // complete {zuhause,stadt,natur} sets
  biomeBonus: number;
  animalsPlaced: number;
  total: number;
}
