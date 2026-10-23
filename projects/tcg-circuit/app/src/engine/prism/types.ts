// PRISM — type model for the pure, deterministic duel engine.
// No React / Pixi / DOM / I/O here. The card POOL is data (engine/content); the rules below are fixed.

export type Affinity = "ember" | "tide" | "verdant" | "gloom" | "order" | "neutral";
export type CardType = "unit" | "spell" | "gear";
export type Rarity = "common" | "uncommon" | "rare" | "mythic";

/** Base keyword set (~8). Some carry an amount N (shield/lifegain). */
export type KeywordName =
  | "haste" // can attack the turn it lands
  | "guard" // each living Guard stops one open-lane attack (Pierce still gets through)
  | "drain" // Nexus damage this unit deals heals your Nexus
  | "pierce" // combat damage in excess of the blocker's health hits the Nexus
  | "shield" // absorbs N damage once (N from amount)
  | "volatile" // destroyed at the end of your turn
  | "lifegain" // on deploy: heal your Nexus N
  | "refractplus" // discarding THIS card to Refract yields +2 Light instead of +1
  // ── Set 2 (Tideturn) ──
  | "rally" // on deploy: your OTHER units get +N power (permanent)
  | "vengeance" // on destroyed: deal N to the enemy Nexus
  // ── Set 3 (Deeproots) ──
  | "momentum"; // at the start of your turn: this unit gains +N power (permanent)

export interface KeywordTag {
  kw: KeywordName;
  n?: number; // shield/lifegain amount
}

/** Deterministic effect primitives for Spells & Gear (no RNG — an AI-learnability hard rule). */
export type EffectKind =
  | "damageUnit" // n to a target unit
  | "damageNexus" // n to the enemy Nexus
  | "healNexus" // n to your Nexus
  | "buffPower" // +n power to a target unit (permanent)
  | "drawCards" // draw n
  | "destroyUnit" // destroy a target unit
  | "grantKeyword" // give the target unit a keyword (gear)
  | "grantShield" // give the target unit shield n
  | "ramp" // +n max Light, permanently
  | "bounce"; // return a target unit to its owner's hand

export type TargetSpec =
  | "none"
  | "enemyUnit"
  | "ownUnit"
  | "anyUnit"
  | "ownNexus"; // gear attaches here

export interface Effect {
  kind: EffectKind;
  n?: number;
  kw?: KeywordTag; // for grantKeyword
  target?: TargetSpec; // defaults to "none"
}

export interface CardDef {
  id: string;
  name: string;
  setId: string;
  affinity: Affinity;
  type: CardType;
  cost: number;
  power?: number; // units only (power = attack = health)
  keywords?: KeywordTag[]; // units; refractplus may appear on any type
  effects?: Effect[]; // spells & gear (and unit onDeploy via lifegain keyword)
  rarity: Rarity;
  powerBudget: number; // §3 rarity power-budget (tuning + sim reference)
  text: string; // human rules text (UI)
  faceable?: boolean; // a damage spell that may instead hit the enemy Nexus (reach) — caster's choice
  art?: string | null; // asset-manifest seam: null => procedural pixel frame
  flavor?: string;
}

/** A card instance living in a zone (hand/deck/discard) — unique id so 3 copies stay distinct. */
export interface CardInst {
  iid: number;
  cardId: string;
}

/** A deployed unit (a CardInst promoted onto the board). */
export interface UnitInstance {
  iid: number;
  cardId: string;
  power: number; // current power (= remaining-health basis); buffs change this
  basePower: number;
  dmgTaken: number; // resets at end of the controller's turn
  shield: number; // absorbs damage; persists until spent
  keywords: KeywordTag[];
  justPlayed: boolean; // can't attack unless Haste
  gear: string[]; // attached gear cardIds (for display)
}

export interface Slot {
  unit?: UnitInstance;
}

export interface PlayerState {
  name: string;
  nexus: number; // life
  maxLight: number;
  light: number;
  refractUsed: boolean;
  hand: CardInst[];
  deck: CardInst[]; // index 0 = top
  discard: CardInst[];
  lanes: [Slot, Slot, Slot];
}

export type Phase = "main" | "over";

export interface FxEvent {
  id: number;
  kind:
    | "deploy"
    | "cast"
    | "attach"
    | "refract"
    | "clash"
    | "nexusHit"
    | "unitDie"
    | "heal"
    | "draw"
    | "lethal";
  side?: 0 | 1; // who owns / who is hit
  lane?: number;
  amount?: number;
  cardId?: string;
}

export interface Duel {
  turn: number; // 1-based, increments each player turn
  active: 0 | 1;
  firstPlayer: 0 | 1; // skips first draw
  players: [PlayerState, PlayerState];
  rngState: number;
  phase: Phase;
  combatDone: boolean; // one declared combat per turn
  winner: 0 | 1 | null;
  nextIid: number;
  log: Action[];
  fx: FxEvent[]; // appended during reduce; the UI drains these for the cascade
  fxSeq: number;
}

export type Action =
  | { type: "refract"; iid: number }
  | { type: "deploy"; iid: number; lane: number }
  | { type: "cast"; iid: number; targetIid?: number }
  | { type: "attach"; iid: number; targetIid?: number; toNexus?: boolean }
  | { type: "combat"; laneOrder: number[] }
  | { type: "endTurn" };

export const MAX_LIGHT = 10;
export const START_NEXUS = 16; // tuned down from 20: a tighter clock so slow ramp starts are punishable
export const OPENING_HAND = 5;
export const DECK_SIZE = 30;
export const MAX_COPIES = 3;
export const LANES = 3;
