// Domain types for Cull the Crown. The engine is framework-agnostic and pure.

export type Suit = "H" | "D" | "C" | "S";
export const SUITS: Suit[] = ["H", "D", "C", "S"];
export const SUIT_NAME: Record<Suit, string> = {
  H: "Hearts",
  D: "Diamonds",
  C: "Clubs",
  S: "Spades",
};

export type CardKind = "number" | "companion" | "jester";

/** Fighting Styles — the Balatro "Planet card" analog. The style of a play is decided by how many
 *  cards it uses (1→Two-Handed … 5→Mage); "Mounted" is an overlay that also fires when the play
 *  contains an Animal Companion (Ace). Leveling a style scales that play's suit effects (see
 *  resolution.ts STYLE phase). Curve: bigger plays scale harder per level (mirrors Balatro, where
 *  rarer hands gain more per planet). All design detail in FIGHTING-STYLES.md. */
export type FightingStyleId = "twoHanded" | "swordShield" | "spear" | "dualWield" | "mage" | "mounted";
export const FIGHTING_STYLE_IDS: FightingStyleId[] = [
  "twoHanded",
  "swordShield",
  "spear",
  "dualWield",
  "mage",
  "mounted",
];
export const FIGHTING_STYLE_NAME: Record<FightingStyleId, string> = {
  twoHanded: "Two-Handed",
  swordShield: "Sword & Shield",
  spear: "Spear",
  dualWield: "Dual Wielding",
  mage: "Mage",
  mounted: "Mounted",
};
/** Fraction of base added to suit effects PER LEVEL of the style (floored when applied). */
export const FIGHTING_STYLE_PER_LEVEL: Record<FightingStyleId, number> = {
  twoHanded: 1 / 8,
  swordShield: 1 / 4,
  spear: 1 / 3,
  dualWield: 1 / 2,
  mage: 1,
  mounted: 1 / 5,
};

/** Card enhancements ("Sigils"). Bought from Sigil packs / tarots and applied to a card. A card may
 *  carry several. Flat sigils (keen/warded/gilded/runed/honed) add in the SIGIL phase; structural
 *  sigils change how the card is parsed/suited (companion = value-1 pair; extra = a 2nd suit;
 *  wildcard = suit chosen at play time). */
export type SigilId =
  | "keen"
  | "warded"
  | "gilded"
  | "runed"
  | "honed"
  | "companion"
  | "extra"
  | "wildcard"
  // Balatro-enhancement analogs (Tarot rework). Played-time flat effects (held-in-hand variants
  // simplified to play-time for now): steel/glass/minted/charmed/stoneskin. See TAROT-ADAPTATIONS.md.
  | "steel"
  | "glass"
  | "minted"
  | "charmed"
  | "stoneskin";

/** A Seal on a card (Balatro analog, from Spectral cards). One per card, distinct from sigils:
 *  gold = +gold when played; red = "retrigger" (its value counts an extra time); blue = create a
 *  Drill if held when the royal falls; purple = create a Tarot when discarded. */
export type SealId = "gold" | "red" | "blue" | "purple";

/** A joker Edition (Balatro analog, from Spectral cards). At most one per guild member, stored on
 *  RunState.slotEditions by joker id. burnished = +flat damage; haloed = +more flat; prismatic =
 *  ×damage; shadow (Negative) = +1 guild slot. */
export type EditionId = "burnished" | "haloed" | "prismatic" | "shadow";

export interface Card {
  id: string;
  /** null only for jesters */
  suit: Suit | null;
  /** number: 2..10 ; companion: 1 ; jester: 0 */
  value: number;
  kind: CardKind;
  sigils?: SigilId[];
  /** the second suit granted by the "extra" sigil (fires both powers, both immunities apply) */
  extraSuit?: Suit | null;
  /** a Seal (at most one) — gold/red/blue/purple; see SealId. */
  seal?: SealId;
}

export type Tier = "jack" | "queen" | "king";

export interface Enemy {
  tier: Tier;
  suit: Suit; // the suit it is immune to
  maxHealth: number;
  attack: number;
  damageTaken: number;
  shield: number; // accumulated Spade shield this fight
  immunityCancelled: boolean; // set true by an immunity-cancelling relic (e.g. Usurper's Sigil)
  // --- roguelike opponent depth (P1) ---
  /** The royal's special rule for this fight; resolved via content.decreeById. null = none. */
  decreeId?: string | null;
  /** A second, stacked decree (Kings only — the difficulty curve stacks abilities late). */
  decreeId2?: string | null;
  /** Per-enemy parameter some decrees need (e.g. Plague Court's corrupted suit). */
  decreeParam?: Suit | null;
  /** Kings escalate: once damageTaken >= maxHealth*enrageAtPct, attack rises by enrageAttackBonus. */
  enrageAtPct?: number;
  enrageAttackBonus?: number;
}

/** A royal's special rule. Definitions (with their hook functions) live statically in content.ts;
 *  only the `decreeId` string is stored on the (clone-safe) Enemy. Hooks fire at fixed points:
 *  - `resolve`  : mutate the resolution context (runs after base powers, before jokers).
 *  - `forbids`  : reject a play before it commits (anti-strategy). Return a reason, or null to allow.
 *  - `onPlayResolved`   : after a surviving play is applied (e.g. discard a random card).
 *  - `onCounterResolved`: after the player covers a counter-attack (e.g. self-heal).
 *  Plain data: `healthMult` (applied at fight construction), `ignoresShield`, `intentNote`. */
export interface Decree {
  id: string;
  name: string;
  text: string; // shown on the enemy panel
  intentNote?: string; // short telegraph shown in the intent line
  healthMult?: number;
  ignoresShield?: boolean;
  resolve?: (ctx: ResContext, enemy: Enemy) => void;
  forbids?: (combat: CombatState, suits: Suit[]) => string | null;
  onPlayResolved?: (run: RunState) => void;
  onCounterResolved?: (run: RunState, incoming: number) => void;
}

/** What the current royal will do on its next counter-attack — for the UI telegraph (a pure
 *  selector; never stored, so it is always live as shield/HP change). */
export interface EnemyIntent {
  incoming: number; // damage the next counter will deal (after shield / decree)
  enraged: boolean;
  ignoresShield: boolean;
  decrees: { name: string; text: string | null; note: string | null }[];
}

export interface SuitUpgrades {
  H: number;
  D: number;
  C: number;
  S: number;
}

export type Rarity = "common" | "uncommon" | "rare";

/** A read-only snapshot of run scalars handed to a joker's `modify`, so relics can scale off the
 *  run (e.g. damage per royal felled) without the resolution stack reaching into RunState. */
export interface ModInfo {
  fightsWon: number;
  gold: number;
  enemyTier: Tier;
  jokerCount: number; // active guild members (for "+per joker" relics like War Council)
  editionFlat?: number; // flat damage from joker Editions (Burnished/Haloed)
  editionMult?: number; // damage multiplier from joker Editions (Prismatic), default 1
  jokerState?: Record<string, number>; // per-joker accumulated bonus (scaling jokers read their id)
  handCards?: Card[]; // the current hand (incl. the cards being played) — for hand-reading jokers
  emptySlots?: number; // unfilled guild slots (Lone Wolf)
  uncommonCount?: number; // owned uncommon jokers (Banneret)
  totalSellValue?: number; // total sell value of all guild members (Quartermaster's Ledger)
  swornRank?: number; // the rank chosen this fight (Sworn Number)
  discardsThisFight?: number; // cards discarded to block this fight (Executioner's Tally)
  culledThisAct?: number; // cards removed/destroyed this Act (Cull's Reward)
}

/** A joker is data + (optionally) a pure resolution-time modifier. Passive economy/combat
 *  effects are expressed as plain fields read by combat/run; lifecycle effects use the hooks
 *  (which mutate a RunState draft in place, like combat does). Content lives in content.ts. */
export interface Joker {
  id: string;
  name: string;
  text: string;
  art: string; // emblem key, see ui/ItemArt.tsx
  rarity: Rarity;
  price: number;
  sellValue: number;
  /** Mutates the resolution context during the JOKERS phase. Pure w.r.t. RunState (ctx is fresh);
   *  `info` is a read-only snapshot for scaling/conditional relics. */
  modify?: (ctx: ResContext, info?: ModInfo) => void;
  // passive flags, read outside the resolution stack:
  handMaxBonus?: number;
  goldPerFight?: number;
  interestCapBonus?: number; // raises the interest cap (Usurer)
  exactKillMultBonus?: number;
  cancelsImmunity?: boolean; // royals are no longer immune to their own suit (the immunity "answer")
  disablesDecrees?: boolean; // the current royal's decree(s) do nothing (Court Jester / Chicot)
  slotBonus?: number; // +max guild slots
  heldMaxBonus?: number; // +consumable (tarot) inventory slots
  counterBonus?: number; // extra incoming damage you suffer each counter (a downside)
  suitBoost?: Partial<SuitUpgrades>; // run-wide +N to a suit's power (replaces the old Train)
  creditBonus?: number; // how far gold may go negative when buying (debt; Letter of Credit)
  copiesNeighbor?: "left" | "right"; // also applies the modify of the adjacent guild member (Blueprint/Brainstorm)
  // lifecycle hooks (operate on a RunState draft in place):
  onFightStart?: (run: RunState) => void; // when a fight begins (e.g. start with shield)
  onCounterResolved?: (run: RunState, incoming: number) => void; // after a counter connects (reflect)
  onRoyalFelled?: (run: RunState) => void; // after a royal is defeated (scaling)
  onPlay?: (run: RunState, played: { cards: Card[]; isCombo: boolean }) => void; // after a play commits (scaling)
  onYield?: (run: RunState) => void; // when the player yields (streak resets like Bloodthirst)
  survivesLethal?: boolean; // once per run, survive a blow that would kill you (Last Stand)
  comboMaxBonus?: number; // raises the combo sum cap above 10 (Loose Grip)
}

/** A Tarot is a HELD consumable: bought from a Tarot pack / loose offer, kept in the inventory, and
 *  used later in the shop OR mid-combat. Definitions (with `apply`) live in content.ts; RunState
 *  holds only `HeldConsumable` instances (ids), so it stays clone-safe. */
export interface Tarot {
  id: string;
  name: string;
  text: string;
  art: string;
  price: number;
  /** if set, using it needs a target card (deck card in shop, hand card in combat) */
  target?: "deck" | "hand";
  apply: (run: RunState, targetCardId?: string) => boolean;
}

/** One held tarot instance on RunState (instance id + the library tarot id). */
export interface HeldConsumable {
  id: string;
  tarotId: string;
}

// The five Balatro-style booster kinds. `relic` is the Joker pack (kept as the internal id).
export type PackKind = "card" | "tarot" | "relic" | "style" | "spectral";
// Four sizes — picks/total: s = 1-of-2, m = 1-of-3, l = 1-of-5, xl = 2-of-5.
export type PackSize = "s" | "m" | "l" | "xl";

/** A booster pack offered in the shop. `contentIds` are pre-rolled (clone-safe) and interpreted by
 *  `kind`: card→template string, tarot→tarotId, relic→jokerId, sigil→SigilId. */
export interface PackOffer {
  id: string;
  kind: PackKind;
  size: PackSize;
  price: number;
  contentIds: string[];
  picksRemaining: number;
}

/** A single-buy loose shop offer (drawn from the union of all pack-content pools). */
export interface LooseOffer {
  id: string;
  kind: PackKind;
  contentId: string;
  price: number;
}

/** A permanent run-wide upgrade ("Edict", a voucher analogue). Effects are additive flags read in
 *  specific spots; an upgrade edict appears only once its `requires` base edict is owned. */
export interface Edict {
  id: string;
  name: string;
  text: string;
  art: string;
  price: number;
  requires?: string; // base edict that must be owned before this is offered
  discount?: number; // fraction off shop prices (jokers + consumables)
  interestCapBonus?: number;
  handMaxBonus?: number;
  slotBonus?: number;
  heldMaxBonus?: number;
  rerollDelta?: number; // change to the base reroll cost
}

/** Working accumulator threaded through the resolution stack. Created fresh per play, so
 *  jokers mutating it does not violate engine purity. */
export interface ResContext {
  value: number; // aggregated attack value of the play
  cards: Card[];
  isCombo: boolean;
  comboCount: number;
  sizeStyle: FightingStyleId; // the play's size-style (by card count) — for style-aware jokers
  mounted: boolean; // the play contains an Animal Companion (Ace)
  jesterPlayed: boolean;
  firstAttackDone: boolean;
  // which suits are *active* (present and not nullified by immunity)
  heartActive: boolean;
  diamondActive: boolean;
  clubActive: boolean;
  spadeActive: boolean;
  // accumulators
  damage: number;
  heal: number;
  draw: number;
  shield: number;
  goldDelta: number;
  trace: string[];
}

export interface ResolutionResult {
  valid: boolean;
  reason?: string;
  damage: number;
  heal: number;
  draw: number;
  shield: number;
  goldDelta: number;
  jesterPlayed: boolean;
  trace: string[];
}

export interface ShopState {
  packs: PackOffer[]; // always 3 booster packs
  looseOffers: LooseOffer[]; // always 3 single-buy items (union of pack pools)
  edictOffers?: string[]; // 0 or 1 edict — one acquirable per Act
  removeCardCost: number; // escalating "Remove a card" price (snapshot for display)
  rerollCost: number;
  openPack?: PackOffer | null; // the pack currently being opened (the pick UI), else null
}

export type CombatSubphase = "play" | "defend";

export interface CombatState {
  enemy: Enemy;
  subphase: CombatSubphase;
  incoming: number; // damage to cover in the 'defend' subphase
  firstAttackDone: boolean;
  yieldedLastTurn: boolean;
  /** Set when the fight ends; the run waits on a player 'advance' before leaving the battle screen
   *  (so the win/death is legible). null while the fight is ongoing. */
  outcome: "won" | "lost" | null;
  wonExact: boolean;
  /** Suits played on the previous play turn — for decrees that forbid repeating a suit. Cleared
   *  on yield (you played no suit). undefined is treated as empty. */
  lastSuits?: Suit[];
}

export type RunPhase = "title" | "combat" | "shop" | "event" | "won" | "lost";

/** A Court Event: a between-fights choice node (run-structure variety). Definitions with their
 *  `apply` functions live in content.ts; RunState stores only the active `eventId`. */
export interface EventOption {
  id: string;
  label: string;
  desc: string;
  cost?: number; // gold required (for UI gating); the engine also enforces it
}
export interface GameEvent {
  id: string;
  title: string;
  text: string;
  options: EventOption[];
}

/** A starting Deck variant chosen at run creation (Balatro-style). Pure data — RunState stores only
 *  `deckId`; createRun reads the def. Composition fields (suits/randomize/startSigils) reshape the
 *  deck before dealing; the rest set starting gear / config / passive run flags. */
export interface DeckDef {
  id: string;
  name: string;
  text: string[]; // effect bullet lines for the carousel
  unlock?: string; // deckId you must have WON with to unlock this (undefined = unlocked from start)
  config?: Partial<RunConfig>;
  slotBonus?: number; // +/- guild slots
  heldBonus?: number; // +/- consumable pouch slots
  startSlots?: string[]; // starting relics (joker ids)
  startEdicts?: string[]; // starting edicts
  startTarots?: string[]; // starting tarots (by id) placed in the pouch
  startRandomTarots?: number; // N random tarots into the pouch
  startRandomRareRelic?: boolean; // begin with one random Rare relic
  suits?: Suit[]; // restrict the deck to these suits (duplicated to keep ~40 cards)
  randomizeSuits?: boolean; // reroll every card's suit at run start
  startSigils?: number; // engrave N random deck cards with a random sigil
  // passive run flags (read during the run):
  noInterest?: boolean;
  goldPerLeftoverHand?: number; // gold per card left in hand when a royal is felled
  tarotPerRoyal?: boolean; // a free random tarot to the pouch on each royal felled
  decreeOnFirstRoyal?: boolean; // the first royal also bears a decree (harder)
}

/** Aggregated (cumulative) difficulty modifiers from the chosen Stake. */
export interface StakeMods {
  rewardDelta: number; // per-tier fight reward change
  healthMult: number; // royal health multiplier (1 = none)
  attackBonus: number; // flat royal attack increase
  handDelta: number; // max hand size change
  startGoldDelta: number;
  rerollDelta: number; // reroll base cost change
  removeDelta: number; // remove-card base cost change
  noSell: boolean; // relics cannot be sold
}

export interface RunConfig {
  startGold: number;
  handMax: number;
  interestPer: number; // +1 gold per this many gold held at fight end
  interestCap: number;
  exactKillMult: number; // gold multiplier on an exact kill
  fightReward: Record<Tier, number>;
  rerollBase: number;
  rerollStep: number;
  trainStep: number; // suit upgrade increment (legacy; suit boosts are now relics)
  recruitMaxValue: number; // only cards <= this can be recruited (legacy)
  removeBase: number; // base cost of the shop "Remove a card" button
  removeStep: number; // how much each removal raises the cost
  heldBase: number; // base consumable (tarot) inventory size
}

export interface RunState {
  config: RunConfig;
  deckId: string; // chosen starting deck variant (resolve via content.deckById)
  stakeId: string; // chosen difficulty stake
  styleLevels: Record<FightingStyleId, number>; // Fighting-Style levels (0 = base); scale suit effects
  slotEditions?: Record<string, EditionId>; // joker Editions by joker id (Spectral-applied)
  jokerState?: Record<string, number>; // per-joker accumulated scaling bonus, by joker id
  discardsThisFight?: number; // cards discarded to block in the current fight (Executioner's Tally)
  culledThisAct?: number; // cards removed/destroyed in the current Act (Cull's Reward)
  yieldedThisFight?: boolean; // whether the player has yielded this fight (Patient Tactician)
  swornRank?: number; // rank chosen at this fight's start (Sworn Number)
  lastStandUsed?: boolean; // the once-per-run survive-lethal (Last Stand) has fired
  seedLabel: string;
  rngState: number;
  deck: Card[]; // index 0 = top (next draw); heal places cards at the bottom
  hand: Card[];
  discard: Card[];
  table: Card[]; // cards played against the current enemy (move to discard on defeat)
  gold: number;
  slots: string[]; // up to 5 active jokers, by id (resolve via content.jokerById)
  edicts?: string[]; // owned permanent run-wide edicts, by id
  held: HeldConsumable[]; // held tarots (consumable inventory), usable in shop or combat
  suitUpgrades: SuitUpgrades;
  castle: Enemy[]; // the 12 royals, in fight order
  enemyIndex: number;
  combat: CombatState | null;
  shop: ShopState | null;
  eventId?: string | null; // active Court Event (phase 'event'), looked up via content.eventById
  phase: RunPhase;
  removeUses: number; // how many times the shop "Remove a card" has been used (escalates cost)
  cardSeq: number; // monotonic counter for unique ids of cards added mid-run
  actEdictsTaken: Tier[]; // Acts whose edict has already been bought (one edict per Act)
  deckBaseline: number; // expected total card count (40 + adds − removes), for invariants
  notice: string | null; // transient UI message (e.g. why an action was rejected)
  log: Action[];
  // run summary tallies
  fightsWon: number;
  exactKills: number;
  goldEarned: number;
}

export type Action =
  | { type: "newRun"; seed: string; deckId?: string; stakeId?: string }
  | { type: "play"; cardIds: string[]; wildSuits?: Record<string, Suit> }
  | { type: "yield" }
  | { type: "discard"; cardIds: string[] }
  | { type: "advance" }
  | { type: "sellJoker"; jokerId: string }
  | { type: "buyEdict"; offerId: string }
  | { type: "openPack"; packId: string }
  | { type: "pickPackContent"; contentId: string; targetCardId?: string }
  | { type: "closePack" }
  | { type: "buyLoose"; offerId: string; targetCardId?: string }
  | { type: "removeCard"; targetCardId: string }
  | { type: "useHeld"; instanceId: string; targetCardId?: string }
  | { type: "reroll" }
  | { type: "eventChoice"; optionId: string }
  | { type: "nextFight" }
  | { type: "debugDefeat" };

export const MAX_SLOTS = 5;
