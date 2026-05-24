// Domain types for the War of the Ring engine. Pure data — no React/Pixi/DOM. The whole game
// state is a plain serializable object so it can be saved, replayed, and view-filtered for the
// hidden-information firewall.

export type Side = 'fp' | 'shadow';

export type FpNation = 'north' | 'rohan' | 'gondor' | 'elves' | 'dwarves';
export type ShadowNation = 'sauron' | 'isengard' | 'southrons';
export type Nation = FpNation | ShadowNation;

export const FP_NATIONS: FpNation[] = ['north', 'rohan', 'gondor', 'elves', 'dwarves'];
export const SHADOW_NATIONS: ShadowNation[] = ['sauron', 'isengard', 'southrons'];

export function sideOfNation(n: Nation): Side {
  return (SHADOW_NATIONS as string[]).includes(n) ? 'shadow' : 'fp';
}

export type Terrain = 'plains' | 'hills' | 'mountains' | 'forest' | 'wasteland' | 'sea';
export type Settlement = 'none' | 'town' | 'city' | 'stronghold';

export interface Region {
  id: string;
  name: string;
  nation: Nation | null; // null = unaligned wilderness / sea
  terrain: Terrain;
  settlement: Settlement;
  vp: number; // city 1, stronghold 2, else 0
  coastal: boolean;
  adjacency: string[];
}

export type UnitKind = 'regular' | 'elite';

/** A single-side army occupying a region. Units are stored as per-nation counts. */
export interface Stack {
  side: Side;
  regular: Partial<Record<Nation, number>>;
  elite: Partial<Record<Nation, number>>;
  leaders: number; // FP leaders (each leadership 1)
  nazgul: number; // Shadow Nazgul (each leadership 1)
  characters: string[]; // character ids physically present in this region (not in the Fellowship)
  besieged: boolean; // defenders have retreated into the stronghold
}

// Action-die faces. FP has two Character faces and a Will of the West; Shadow has an Eye.
export type Die =
  | 'character'
  | 'army'
  | 'muster'
  | 'armyMuster'
  | 'event'
  | 'will'
  | 'eye';

export interface RolledDie {
  face: Die;
  used: boolean;
}

export interface PoliticalState {
  active: boolean; // active (face up) vs passive
  step: number; // 0 = farthest from war; higher = closer
  atWar: boolean;
}

export interface Fellowship {
  progress: number; // hidden distance from lastDeclaredRegion (HIDDEN from Shadow)
  guideId: string;
  companions: string[]; // companion ids currently travelling (HIDDEN detail from Shadow)
  corruption: number; // 0..12 (HIDDEN from Shadow)
  revealed: boolean;
  onMordorTrack: boolean;
  mordorStep: number; // 0..5
  lastDeclaredRegion: string;
  fpDiceInBox: number; // FP dice added to Hunt Box by Fellowship moves THIS turn
  actedThisTurn: boolean; // moved or hid this turn (Mordor idle-corruption check)
}

export type HuntTileKind = 'number' | 'eye';
export interface HuntTile {
  id: string;
  kind: HuntTileKind;
  value: number; // damage for number tiles; eye tiles use #successes
  reveal: boolean;
  special?: 'fp' | 'shadow'; // blue/red specials (enter via events only)
}

export type CardDeck = 'fpCharacter' | 'fpStrategy' | 'shadowCharacter' | 'shadowStrategy';
export type CardId = string;

/** The small scripted-hook vocabulary the engine mechanically automates. Cards without a hook
 *  carry their real text and are resolved by hand (scripted:false) — never fabricated automation. */
export type CardHook =
  | { kind: 'drawCards'; deck: 'strategy' | 'character' | 'choice'; count: number }
  | { kind: 'healCorruption'; amount: number }
  | { kind: 'addCorruption'; amount: number }
  | { kind: 'advancePolitical'; nation: Nation | 'choice'; steps: number }
  | { kind: 'activateNation'; nation: Nation | 'choice' }
  | { kind: 'addHuntLevel'; amount: number }
  | { kind: 'eyeToHuntBox'; max: number };

export interface Card {
  id: CardId;
  side: Side;
  deck: CardDeck;
  dieToPlay: 'character' | 'army' | 'muster' | 'armyMuster' | 'event';
  title: string;
  event: string; // full sourced event text
  combat: string; // full sourced battle/combat text ('' if none)
  combatTitle: string;
  /** true = the engine mechanically automates this card's event effect via `hook`.
   *  false = real text is shown and the players resolve it by hand (no fabricated automation). */
  scripted: boolean;
  hook?: CardHook;
}

export interface Reinforcements {
  // available units NOT yet on the map, by nation
  regular: Partial<Record<Nation, number>>;
  elite: Partial<Record<Nation, number>>;
  leaders: Partial<Record<FpNation, number>>;
  nazgul: number;
}

export interface CharacterDef {
  id: string;
  name: string;
  side: Side;
  level: number; // 0 = Ring-bearers / Gollum guide level handled separately
  leadership: number;
  diceBonus: number; // +N action dice when in play (Aragorn, Gandalf White, the three Minions)
  startsInFellowship: boolean;
  ability: string;
}

export type CharacterLocation =
  | { where: 'fellowship' }
  | { where: 'region'; regionId: string }
  | { where: 'available' } // can be brought into play (Minions / upgrades)
  | { where: 'reserve' } // upgrade not yet unlocked (Aragorn-Heir, Gandalf White)
  | { where: 'dead' };

export interface CharacterState {
  id: string;
  location: CharacterLocation;
  inPlay: boolean;
}

export type Phase =
  | 'recoverAndDraw'
  | 'fellowship'
  | 'huntAllocation'
  | 'actionRoll'
  | 'actionResolution'
  | 'victoryCheck';

export interface HuntBox {
  shadowAllocated: number; // dice the Shadow placed for hunting (phase 3)
  eye: number; // Eye results moved here in phase 4
}

export interface CombatState {
  attackerRegion: string;
  defenderRegion: string;
  attacker: Side;
  siege: boolean;
  round: number;
  log: string[];
  // last round results for the UI
  lastRoll?: {
    attackerDice: number[];
    defenderDice: number[];
    attackerHits: number;
    defenderHits: number;
    attackerRerolls: number[];
    defenderRerolls: number[];
  };
  resolved: boolean;
}

/** Deferred outcome banner — "beats not cuts": the engine records what changed and the UI gates
 *  on a Continue before applying the visual jump. */
export interface Outcome {
  kind: 'combat' | 'hunt' | 'political' | 'capture' | 'card' | 'info';
  title: string;
  detail: string;
}

export interface Config {
  scenario: 'base-2p';
  fpSeatName: string;
  shadowSeatName: string;
}

export interface GameState {
  config: Config;
  seed: number;
  rngState: number;
  turn: number;
  phase: Phase;
  current: Side; // whose turn to act in resolution
  // who has finished spending dice this resolution
  passed: { fp: boolean; shadow: boolean };
  dice: { fp: RolledDie[]; shadow: RolledDie[] };
  huntBox: HuntBox;
  regions: Record<string, Stack | undefined>;
  control: Record<string, Side>; // settlement control (for VP)
  fellowship: Fellowship;
  politics: Record<Nation, PoliticalState>;
  reinforcements: { fp: Reinforcements; shadow: Reinforcements };
  characters: Record<string, CharacterState>;
  hands: { fp: CardId[]; shadow: CardId[] };
  decks: Record<CardDeck, CardId[]>;
  discards: Record<CardDeck, CardId[]>;
  cardsOnTable: { fp: CardId[]; shadow: CardId[] };
  huntPool: HuntTile[]; // remaining standard tiles
  huntReserve: HuntTile[]; // special tiles set aside until events add them
  drawnThisTurn: { fp: number; shadow: number };
  vp: { fp: number; shadow: number };
  winner: null | { side: Side; path: string };
  pendingCombat: CombatState | null;
  outcome: Outcome | null;
  log: LogEntry[];
}

export interface LogEntry {
  turn: number;
  phase: Phase;
  side: Side | 'system';
  text: string;
}

// ── Actions (discriminated union) — the only way to mutate state, all via `apply`. ─────────────
export type Action =
  | { type: 'recoverAndDraw' }
  | { type: 'declareFellowship'; regionId: string }
  | { type: 'changeGuide'; characterId: string }
  | { type: 'huntAllocate'; dice: number }
  | { type: 'rollDice' }
  | { type: 'endPhase' }
  | { type: 'passDie'; side: Side }
  | { type: 'forfeitRemaining'; side: Side }
  // die-spending actions (each consumes one die of a matching face):
  | { type: 'moveArmy'; side: Side; from: string; to: string; dieIndex: number }
  | { type: 'attack'; side: Side; from: string; to: string; dieIndex: number }
  | { type: 'moveFellowship'; dieIndex: number }
  | { type: 'hideFellowship'; dieIndex: number }
  | { type: 'muster'; side: Side; nation: Nation; regionId: string; kind: UnitKind; dieIndex: number }
  | { type: 'advancePolitical'; side: Side; nation: Nation; dieIndex: number }
  | { type: 'bringCharacter'; side: Side; characterId: string; regionId: string; dieIndex: number }
  | { type: 'drawCard'; side: Side; deck: CardDeck; dieIndex: number }
  | { type: 'playCard'; side: Side; cardId: CardId; dieIndex: number }
  | { type: 'upgradeAragorn'; dieIndex: number }
  | { type: 'upgradeGandalf'; dieIndex: number }
  // combat sub-resolver:
  | { type: 'combatRound' }
  | { type: 'combatRetreat'; toRegion: string }
  | { type: 'combatCease' }
  | { type: 'combatPressSiege' } // reduce an elite to extend a siege
  | { type: 'clearOutcome' };
