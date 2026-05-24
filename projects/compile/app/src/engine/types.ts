// Domain types for COMPILE. The engine is framework-agnostic and pure(ish): all mutation goes
// through the functions in game.ts / effects.ts, and the only nondeterminism is the seeded RNG
// threaded on GameState. The UI consumes this model; it never reaches around it.
//
// Vocabulary mirrors the rulebook: a FIELD has 3 LINES; each line pairs one PROTOCOL from each
// player. A player builds a STACK of cards in their side of each line. The uncovered (top) card is
// the only one normally manipulable. See app/README.md for the rules->code mapping.

export type ProtocolName =
  | "Spirit"
  | "Death"
  | "Fire"
  | "Metal"
  | "Gravity"
  | "Life"
  | "Light"
  | "Plague"
  | "Darkness"
  | "Water"
  | "Psychic"
  | "Speed";

export const PROTOCOLS: ProtocolName[] = [
  "Spirit", "Death", "Fire", "Metal", "Gravity", "Life",
  "Light", "Plague", "Darkness", "Water", "Psychic", "Speed",
];

/** Side of the field. 0 and 1 are the two players. */
export type Side = 0 | 1;

/** The value a face-down card contributes to a line. Rulebook constant (face-down = 2). */
export const FACE_DOWN_VALUE = 2;

/** Value needed in a line (and beating the opponent's same line) to be forced to compile. */
export const COMPILE_THRESHOLD = 10;

/** Hand size after a refresh, and the cache (clear-down) limit. */
export const HAND_SIZE = 5;

// --- Card definitions (the editable card database lives in cards.ts) -------------------------

/** A persistent (top-box) passive descriptor. Active only while the card is face-up — even when
 *  covered. The engine reads a small, documented vocabulary of tags; unknown tags are inert (the
 *  text still shows). Real card data can extend this set. */
export interface Passive {
  /** This side may play face-up cards into ANY line, ignoring protocol matching. (Spirit-style.) */
  playAnyProtocol?: boolean;
  /** Flat bonus added to this card's contributed value while face-up. */
  valueBonus?: number;
}

/** When a triggered (bottom-box) effect fires. MVP supports the two timing windows the rulebook
 *  spells out plus "uncover". A card's bottom effect is only live while the card is face-up AND
 *  uncovered. */
export type Trigger = "start" | "end";

/** An effect is a generator so it can pause for player/AI choices (see effects.ts). */
export type EffectFn = (api: import("./effects").EffectAPI) => EffectGen;
export type EffectGen = Generator<ChoiceRequest, void, ChoiceResponse>;

export interface CardDef {
  /** Stable id, e.g. "Fire-3". */
  id: string;
  protocol: ProtocolName;
  /** Printed value, contributed when the card is face-up. 0..5 in the base set. */
  value: number;
  /** Box texts (shown verbatim on the card). Any may be empty. */
  topText?: string;
  middleText?: string;
  bottomText?: string;
  /** Persistent passive (top box), live while face-up even if covered. */
  passive?: Passive;
  /** Immediate effect (middle box): resolves on play face-up / flip face-up / uncover. */
  middle?: EffectFn;
  /** Auxiliary trigger (bottom box): live only while face-up AND uncovered. */
  trigger?: Trigger;
  triggerEffect?: EffectFn;
  /** True if the card data here is a stand-in pending the real published text. */
  placeholder?: boolean;
}

// --- Card instances on the field / in hand ----------------------------------------------------

let _uid = 0;
export function nextUid(): string {
  _uid += 1;
  return `c${_uid}`;
}

export interface CardInstance {
  uid: string;
  defId: string;
  /** The card's home protocol (from its def) — fixed; used for face-up play matching. */
  protocol: ProtocolName;
  faceUp: boolean;
  /** Original printed owner; can differ from current holder after recompile steals. */
  owner: Side;
}

/** One of the three line positions on the field. Each player owns a protocol header + a stack here. */
export interface ProtocolSlot {
  protocol: ProtocolName;
  compiled: boolean;
}

export interface PlayerState {
  /** Index 0..2 = line positions, left to right. Headers can be rearranged independently of stacks. */
  protocols: [ProtocolSlot, ProtocolSlot, ProtocolSlot];
  /** Stacks per line position. stacks[line][0] is the bottom; the last element is uncovered (top). */
  stacks: [CardInstance[], CardInstance[], CardInstance[]];
  deck: CardInstance[]; // index 0 = top (next draw)
  hand: CardInstance[];
  trash: CardInstance[];
  isAI: boolean;
  aiTier: AITier;
  name: string;
}

export type AITier = "human" | "easy" | "medium" | "hard";

export type ControlPos = -1 | 0 | 1; // -1 = neutral

export type GamePhase =
  | "draft"
  | "turn" // a player's turn is in progress (see TurnStep)
  | "gameover";

export type TurnStep =
  | "start"
  | "control"
  | "compile"
  | "action"
  | "cache"
  | "end";

// --- Choice protocol (effects pause by yielding one of these) ---------------------------------

/** One legal "play" the action step allows. */
export interface PlayOption {
  uid: string;
  faceUp: boolean;
  line: number;
}

export type ChoiceRequest =
  | { kind: "target"; prompt: string; candidates: string[]; optional?: boolean }
  | { kind: "line"; prompt: string; side: Side; candidates: number[] }
  | { kind: "yesno"; prompt: string }
  | { kind: "hand"; prompt: string; side: Side; count: number; candidates: string[]; optional?: boolean }
  | { kind: "compileLine"; prompt: string; candidates: number[] }
  | { kind: "rearrange"; prompt: string }
  | { kind: "action"; prompt: string; canRefresh: boolean };

export type ActionChoice =
  | { type: "play"; uid: string; faceUp: boolean; line: number }
  | { type: "refresh" };

export interface ChoiceResponse {
  cardId?: string;
  cardIds?: string[];
  line?: number;
  yes?: boolean;
  skip?: boolean;
  /** for action requests. */
  action?: ActionChoice;
  /** for rearrange: which side's headers to reorder + the new order of slot indices (length 3). */
  rearrangeSide?: Side;
  order?: number[];
}

export interface PendingChoice {
  request: ChoiceRequest;
  /** Whose decision this is (the side that must answer). */
  decider: Side;
}

export interface DraftState {
  pool: ProtocolName[]; // protocols still available to pick
  /** Draft sequence is fixed: P0 picks 1, P1 picks 2, P0 picks 2, P1 picks 1. */
  order: { side: Side; count: number }[];
  step: number;
  /** How many protocol slots each side has filled so far (next pick goes to this index). */
  assigned: [number, number];
}

export interface GameState {
  phase: GamePhase;
  players: [PlayerState, PlayerState];
  turn: Side; // whose turn it is
  firstPlayer: Side;
  step: TurnStep;
  control: ControlPos;
  /** Whether the control component is in use this game (rulebook: optional for first-timers). */
  useControl: boolean;
  /** Lines (positions) the current player is forced to compile this turn (computed at compile step). */
  compilableLines: number[];
  pending: PendingChoice | null;
  winner: Side | null;
  rngState: number;
  seedLabel: string;
  log: LogEntry[];
  draft: DraftState | null;
  /** Monotonic counter bumped on every visible mutation, so the UI/FX can react to "what changed". */
  rev: number;
  /** Most recent notable events for FX (cleared as the UI consumes them). */
  fx: FxEvent[];
}

export interface LogEntry {
  side: Side | null;
  text: string;
}

export type FxEvent =
  | { kind: "compile"; side: Side; line: number }
  | { kind: "delete"; side: Side; line: number }
  | { kind: "control"; side: ControlPos }
  | { kind: "play"; side: Side; line: number; faceUp: boolean }
  | { kind: "win"; side: Side }
  | { kind: "draw"; side: Side };
