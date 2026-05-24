// Initial game state from { config, seed }. Deterministic: the shuffle is the only
// randomness, so a game replays exactly from { config, seed, action-log }.

import { buildCardRegistry } from "./cards";
import { mulberry32, shuffle } from "./rng";
import type { GameConfig, GameState, PlayerState } from "./types";

export const DEFAULT_CONFIG: GameConfig = {
  players: 3,
  rounds: 3,
  handSize: 6,
  seats: ["human", "medium", "medium"],
};

export function createGame(partial?: Partial<GameConfig>, seed?: number): GameState {
  const merged = { ...DEFAULT_CONFIG, ...partial };
  // Keep players and seats consistent: if seats given, they win; else size seats to players.
  const playerCount = partial?.seats ? partial.seats.length : merged.players;
  const seats = partial?.seats ?? Array.from({ length: playerCount }, (_, i) => merged.seats[i] ?? "human");
  const config: GameConfig = { rounds: merged.rounds, handSize: merged.handSize, players: playerCount, seats };
  const realSeed = seed ?? Math.floor(Math.random() * 2 ** 31);
  const rng = mulberry32(realSeed);

  const registry = buildCardRegistry();
  const shuffled = shuffle(registry.map((c) => c.id), rng);

  const players: PlayerState[] = Array.from({ length: config.players }, (_, id) => ({
    id,
    pool: [],
    environments: [],
    discard: [],
  }));

  const state: GameState = {
    config,
    seed: realSeed,
    cards: registry,
    jokered: [],
    deck: shuffled,
    hands: Array.from({ length: config.players }, () => []),
    players,
    round: 0, // dealRound() bumps to 1
    pick: 0,
    turnInPick: 0,
    current: 0,
    passDir: 1,
    extraRotations: 0,
    pendingSwaps: [],
    phase: "draft",
    pending: null,
    scores: null,
    log: [],
    message: null,
  };

  dealRound(state);
  return state;
}

/** Begin a new round: deal a fresh hand to each player and enter the DRAFT phase. */
export function dealRound(state: GameState): void {
  state.round += 1;
  state.pick = 0;
  state.turnInPick = 0;
  state.current = 0;
  state.extraRotations = 0;
  state.pendingSwaps = [];
  state.phase = "draft";
  state.pending = null;
  for (const p of state.players) p.pool = [];
  state.hands = state.players.map(() => state.deck.splice(0, state.config.handSize));
}
