// Static card data — the single source of truth for the Roomies design.
// Every value here is from the user's design brief; ⚑-flagged decisions (biomes, joker,
// deck count) are isolated as data so a spec-gate change is a data edit, not a refactor.

export type Biome = "zuhause" | "stadt" | "natur";
export type AnimalType = "firma" | "stoner" | "greyer" | "herde" | "joker";

// Which conditional scoring rule an animal uses (see scoring.ts).
export type EffectId =
  | "none"
  | "hossi" // +1 if Mikel in same env, else -1
  | "mikel" // +1 if Hossi in same env, else -1
  | "sheep" // +1 if >=3 Schafe in env; -1 if no Security in env (can stack)
  | "leo4" // +2 if exactly 4 Schafe in same env
  | "dalaiAlone" // +2 if alone in its env
  | "martySecurity"; // +1 per Security provider in same env

// Draft-phase intercept fired when the card is played.
export type DraftEffect = "rotate" | "swap";

export interface EnvDef {
  id: string;
  name: string;
  raum: number;
  multiplier: number;
  qty: number;
  biomes: Biome[]; // ⚑ D8 intrinsic biome assignment
}

export interface AnimalDef {
  id: string;
  name: string;
  raum: number;
  types: AnimalType[];
  base: number;
  qty: number;
  security: boolean; // provides the Security keyword
  schaf: boolean; // is a Schaf
  effect: EffectId;
  draft?: DraftEffect;
  // Sheep-colour tuning (effect "sheep"): herd size needed for +1 (default 3), and whether the
  // −1 "no Security" penalty applies (default false). ⚑ Slight per-colour differences (D16).
  herdThreshold?: number;
  needsSecurity?: boolean;
}

export type ImprovementKind =
  | "ausbau" // +2 Raum capacity
  | "dekoration" // no negative points in this env
  | "biome" // adds a biome tag
  | "verkleidung"; // sets target animal's type to Joker

export interface ImprovementDef {
  id: string;
  name: string;
  qty: number;
  kind: ImprovementKind;
  biome?: Biome; // for kind === "biome"
}

// --- Environments (27 cards) ---
export const ENV_DEFS: EnvDef[] = [
  { id: "park", name: "Park", raum: 7, multiplier: 1, qty: 3, biomes: ["stadt"] },
  { id: "feld", name: "Feld", raum: 10, multiplier: 1, qty: 3, biomes: ["natur"] },
  { id: "trattoria", name: "Trattoria", raum: 8, multiplier: 1, qty: 3, biomes: ["stadt"] },
  { id: "reisetasche", name: "Reisetasche", raum: 2, multiplier: 2, qty: 3, biomes: [] },
  { id: "wohnzimmer", name: "Wohnzimmer", raum: 6, multiplier: 1, qty: 3, biomes: ["zuhause"] },
  { id: "landhaus", name: "Landhaus", raum: 5, multiplier: 1, qty: 3, biomes: ["zuhause"] },
  { id: "cafe", name: "Café", raum: 3, multiplier: 2, qty: 3, biomes: ["stadt"] },
  { id: "bulli", name: "Bulli", raum: 6, multiplier: 1, qty: 6, biomes: [] },
];

// --- Animals (52 cards) ---
export const ANIMAL_DEFS: AnimalDef[] = [
  // ⚑ Croco & Mungo are two distinct characters (Croco = crocodile, Mungo = gorilla). Split from the
  // original combined "Croco/Mungo" (qty 6) into 3 + 3, same stats. Quantities/stats per-character TBC.
  { id: "croco", name: "Croco", raum: 2, types: ["firma"], base: 2, qty: 3, security: true, schaf: false, effect: "none" },
  { id: "mungo", name: "Mungo", raum: 2, types: ["firma"], base: 2, qty: 3, security: true, schaf: false, effect: "none" },
  { id: "hippo", name: "Hippo", raum: 1, types: ["joker"], base: 0, qty: 3, security: false, schaf: false, effect: "none" },
  { id: "dromi", name: "Dromi", raum: 3, types: ["stoner", "firma"], base: 3, qty: 4, security: false, schaf: false, effect: "none" },
  { id: "hossi", name: "Hossi", raum: 3, types: ["greyer"], base: 3, qty: 4, security: false, schaf: false, effect: "hossi" },
  { id: "rocky", name: "Rocky", raum: 3, types: ["firma", "herde"], base: 2, qty: 4, security: true, schaf: false, effect: "none" },
  { id: "dalai_lama", name: "Dalai Lama", raum: 2, types: ["stoner"], base: 2, qty: 3, security: false, schaf: false, effect: "dalaiAlone", draft: "rotate" },
  { id: "bumpa", name: "Bumpa", raum: 4, types: ["herde", "greyer"], base: 3, qty: 4, security: true, schaf: false, effect: "none" },
  { id: "leo", name: "Leo", raum: 4, types: ["herde"], base: 4, qty: 3, security: true, schaf: false, effect: "leo4" },
  { id: "bob", name: "Bob", raum: 4, types: ["stoner", "greyer"], base: 4, qty: 4, security: false, schaf: false, effect: "none" },
  { id: "marty", name: "Marty", raum: 3, types: ["firma"], base: 4, qty: 3, security: false, schaf: false, effect: "martySecurity", draft: "swap" },
  // ⚑ D16 — three sheep colours, mostly cosmetic with a *very slight* mechanical twist each.
  { id: "sheep_white", name: "White Sheep", raum: 1, types: ["herde"], base: 1, qty: 2, security: false, schaf: true, effect: "sheep", herdThreshold: 3, needsSecurity: true },
  { id: "sheep_brown", name: "Brown Sheep", raum: 1, types: ["herde"], base: 1, qty: 2, security: false, schaf: true, effect: "sheep", herdThreshold: 3, needsSecurity: false },
  { id: "sheep_black", name: "Black Sheep", raum: 1, types: ["herde"], base: 1, qty: 2, security: false, schaf: true, effect: "sheep", herdThreshold: 2, needsSecurity: true },
  { id: "marley", name: "Marley", raum: 1, types: ["herde", "stoner"], base: 1, qty: 4, security: false, schaf: true, effect: "none" },
  { id: "mikel", name: "Mikel", raum: 1, types: ["greyer"], base: 2, qty: 4, security: false, schaf: false, effect: "mikel" },
];

// --- Improvements (15 cards) ---
export const IMPROVEMENT_DEFS: ImprovementDef[] = [
  { id: "ausbau", name: "Ausbau", qty: 3, kind: "ausbau" },
  { id: "dekoration", name: "Dekoration", qty: 3, kind: "dekoration" },
  { id: "popup_couch", name: "Pop-Up Couch", qty: 2, kind: "biome", biome: "zuhause" },
  { id: "boombox", name: "Boombox", qty: 2, kind: "biome", biome: "stadt" },
  { id: "blumentopf", name: "Blumentopf", qty: 2, kind: "biome", biome: "natur" },
  { id: "verkleidung", name: "Verkleidung", qty: 3, kind: "verkleidung" },
];

export const BIOME_SET_BONUS = 6; // ⚑ D7 placeholder — points per complete {zuhause,stadt,natur} set
export const AUSBAU_BONUS = 2; // +2 Raum per Ausbau
export const DECK_SIZE_EXPECTED = 94; // ⚑ D1 — itemized total (brief states 96; 2 unaccounted)

// Lookup maps
export const ENV_BY_ID: Record<string, EnvDef> = Object.fromEntries(ENV_DEFS.map((d) => [d.id, d]));
export const ANIMAL_BY_ID: Record<string, AnimalDef> = Object.fromEntries(ANIMAL_DEFS.map((d) => [d.id, d]));
export const IMPROVEMENT_BY_ID: Record<string, ImprovementDef> = Object.fromEntries(IMPROVEMENT_DEFS.map((d) => [d.id, d]));

export type CardKind = "env" | "animal" | "improvement";

export interface Card {
  id: number; // unique instance id (index into the registry)
  kind: CardKind;
  defId: string;
}

/** Expand the definition tables into a flat registry of card instances (length === DECK_SIZE_EXPECTED). */
export function buildCardRegistry(): Card[] {
  const cards: Card[] = [];
  let id = 0;
  for (const d of ENV_DEFS) for (let i = 0; i < d.qty; i++) cards.push({ id: id++, kind: "env", defId: d.id });
  for (const d of ANIMAL_DEFS) for (let i = 0; i < d.qty; i++) cards.push({ id: id++, kind: "animal", defId: d.id });
  for (const d of IMPROVEMENT_DEFS) for (let i = 0; i < d.qty; i++) cards.push({ id: id++, kind: "improvement", defId: d.id });
  return cards;
}
