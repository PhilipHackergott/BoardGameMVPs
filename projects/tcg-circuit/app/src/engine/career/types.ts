// The career-sim engine (Act I slice) — PURE & deterministic, like engine/prism. Tracks the day/slot
// clock, money, current location, and story progression. The world content (tilemaps, NPCs, dialogue,
// the Act I script) is DATA in engine/content; this engine only advances state.

import { StatKey } from "../content/lifesim";

export type LocationId = "home" | "town" | "shop" | "school";
export const SLOTS = ["Morning", "Afternoon", "Evening"] as const;
export type Slot = (typeof SLOTS)[number];

export interface CareerState {
  day: number; // 1-based
  slotIndex: number; // 0..2 -> Morning/Afternoon/Evening
  money: number;
  location: LocationId;
  beat: number; // index into the Act I story script (engine/content/story.ts)
  flags: Record<string, boolean>;
  activeDeckId: string;
  ownedDeckIds: string[];
  collection: Record<string, number>; // cardId -> owned quantity (the economy "level")
  context: string; // year-level context id (lifesim)
  stats: Record<StatKey, number>; // Composure/Charisma/Knowledge/Stamina/Reputation
  examsPassed: number;
  fame: number; // scene reputation — rises with tournament results; unlocks the sponsorship perk
  trophies: number; // tournaments won
  rngState: number;
  actComplete: boolean;
}

export type CareerAction =
  | { type: "enter"; loc: LocationId }
  | { type: "completeStep" } // apply the CURRENT story step's rewards, then advance the beat
  | { type: "advanceSlot" }
  | { type: "sleep" }
  | { type: "pickDeck"; id: string }
  | { type: "reward"; money?: number; flags?: string[]; unlockDeck?: string; fame?: number; trophy?: boolean }
  | { type: "acquireCards"; cardIds: string[]; cost?: number; rngState?: number } // packs / buying singles
  | { type: "sellCard"; cardId: string; price: number } // sell a single back to the market
  | { type: "activity"; id: string } // a life-sim activity (study/work/socialize/train) — spends a slot
  | { type: "exam"; passed: boolean }; // exam-day result
