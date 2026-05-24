// Domain types for the Magical Athlete engine. Pure data only — no React/Pixi/DOM.

export type Side = 'mild' | 'wild';
export type RacerId = string;
export type PlayerId = number;

export interface Racer {
  id: RacerId;
  name: string;
  /** Power identifier (resolved by the powers registry in milestone 2). null = no power yet. */
  powerId: string | null;
}

export interface RacerInPlay {
  racerId: RacerId;
  owner: PlayerId;
  /** 0 = Start space. pos >= track length means the racer has crossed the finish. */
  pos: number;
  finished: boolean;
  /** 1 or 2 once across the finish line; otherwise null. */
  place: number | null;
  /** When true, the racer skips their next main move (then recovers). */
  tripped: boolean;
  eliminated: boolean;
  /** Power this racer copies (Twin/Egg); overrides its own power id when set. */
  copiedPowerId?: string | null;
}

export type ChipKind = 'gold' | 'silver' | 'bronze';
export interface Chip {
  kind: ChipKind;
  value: number;
}

export interface MatchConfig {
  /** 2..4 supported in the MVP. */
  players: number;
  /** Race sides in order (default Mild, Wild, Mild, Wild). */
  schedule: Side[];
  /** true for the 2-player (and optional 3-player) double-racer variant. */
  doubleRacer: boolean;
  seed: number;
}

export interface DraftState {
  /** Remaining shuffled deck to flip new lines from. */
  pool: RacerId[];
  /** Current face-up line players pick from. */
  line: RacerId[];
  /** Cards flipped per line. */
  lineSize: number;
  /** Full precomputed sequence of which player picks at each step. */
  pickOrder: PlayerId[];
  pickIndex: number;
  /** Drafted racers per player. */
  hands: RacerId[][];
  done: boolean;
}

export type Phase = 'draft' | 'reveal' | 'race' | 'afterRace' | 'ended';

export interface RaceResult {
  first: PlayerId | null;
  second: PlayerId | null;
}

export interface PromptOption {
  id: string;
  label: string;
}

/** A pending optional-power decision for the current racer, paused for a human/AI choice. */
export interface Pending {
  player: PlayerId;
  racer: number; // index into race.racers
  /** Decision point: before rolling, after the die is known, or a post-turn reaction. */
  stage: 'preRoll' | 'postRoll' | 'react';
  /** The rolled value, when stage === 'postRoll'. */
  die?: number;
  /** Rerolls already used this turn (for reroll powers like the Magician). */
  rerolls?: number;
  /** True when this reroll choice was granted by a Dicemonger in the race. */
  dicemonger?: boolean;
  /** For 'react' pendings: the reaction kind and the racer it targets. */
  reactKind?: 'suckerfish' | 'duelist';
  target?: number;
  options: PromptOption[];
}

export interface RaceState {
  side: Side;
  length: number;
  racers: RacerInPlay[];
  /** Player-turn order for this race. */
  playerOrder: PlayerId[];
  /** Index into playerOrder for whose player-turn it is. */
  playerPtr: number;
  /** Racer indices to activate during the current player-turn, in order. */
  activations: number[];
  /** Index into activations for the racer currently taking its turn. */
  actPtr: number;
  /** Whether each player has taken their first turn this race (2P double-racer rule). */
  firstTurnTaken: boolean[];
  /** A player scheduled to take the next player-turn (turn-order powers like Skipper). */
  goNext: PlayerId | null;
  /** The current racer's predicted roll (Genius), pending comparison after the roll. */
  geniusPrediction: number | null;
  /** Set when the current racer earned an extra activation (Genius predicted correctly). */
  extraTurn: boolean;
  /** Mastermind's one-time prediction: which racer (by index) it called to win, and who predicted. */
  mastermindPick: { by: number; predicted: number } | null;
  /** Racer positions captured at the start of the current player-turn (for Suckerfish follows). */
  preTurnPos: number[];
  /** Keys of reactions already offered this turn (so they aren't re-offered). */
  reactionsOffered: string[];
  finishedCount: number;
  result: RaceResult;
  /** The most recent die rolled this race (for the UI die), or null before any roll. */
  lastDie: number | null;
  /** Set when the current turn is paused awaiting an optional-power choice. */
  pending: Pending | null;
}

export interface MatchState {
  config: MatchConfig;
  racersById: Record<RacerId, Racer>;
  draft: DraftState;
  /** Reveal sub-phase state for the upcoming/active race (each player reveals 1, or 2 in double-racer). */
  reveal: { needed: PlayerId[]; chosen: Record<PlayerId, RacerId[]> };
  /** Racers already raced (cannot be reused), per player. */
  used: Record<PlayerId, RacerId[]>;
  /** Racer ids that placed 1st in completed races (Twin copies one of these). */
  pastWinners: RacerId[];
  race: RaceState | null;
  /** 0-based index into config.schedule. */
  raceNo: number;
  /** First player for the upcoming race (roll-off for race 0, else farthest-behind). */
  nextFirst: PlayerId;
  /** Point chips collected, per player. */
  chips: Chip[][];
  phase: Phase;
  winners: PlayerId[] | null;
  /** Serialized PRNG state — threads determinism through every action. */
  rngState: number;
  /** Powers that fired automatically during the most recent action (for the trigger modal). */
  events: ActivationEvent[];
  log: Action[];
}

/** A power that fired automatically during turn resolution — surfaced to the player for legibility. */
export interface ActivationEvent {
  /** index (into race.racers) of the racer whose power activated. */
  racer: number;
  /** the power that fired (used for the ability title). */
  powerId: string;
  kind: 'move' | 'trip' | 'warp' | 'eliminate' | 'bronze';
  /** index (into race.racers) of the affected racer. */
  target: number;
  /** signed spaces moved, for kind 'move'. */
  amount?: number;
}

export type Action =
  | { type: 'draftPick'; racerId: RacerId }
  | { type: 'reveal'; player: PlayerId; racerId: RacerId }
  | { type: 'roll' }
  | { type: 'resolvePrompt'; optionId: string }
  | { type: 'nextRace' };
