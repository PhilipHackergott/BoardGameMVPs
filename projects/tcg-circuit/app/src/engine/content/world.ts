// The Act I world — DATA. Four locations as small tilemaps (floors/walls/grass only); all furniture,
// NPCs, and doors are ENTITIES with their own collision + interaction. Coordinates are in tiles.
// Real pixel-art tiles/sprites slot in via assets/manifest.ts (placeholder → final) with no code change.

import { LocationId } from "../career/types";
import { Line } from "./story";

// Tilemap chars: w=wall(solid) f=floor g=grass p=path t=tree(solid)
export const SOLID_TILES = new Set(["w", "t"]);

export type EntityKind = "npc" | "object" | "door" | "decor";
export type EntityAction = "story" | "sleep" | "deck" | "board" | "shop" | "market" | "pchub" | "activity" | "none";

export interface Entity {
  id: string;
  kind: EntityKind;
  x: number;
  y: number;
  sprite: string; // assets/manifest.ts key
  solid?: boolean;
  name?: string;
  to?: LocationId; // doors
  toEntrance?: string;
  action?: EntityAction; // objects
  activityId?: string; // for action "activity" (lifesim ACTIVITIES key)
  idle?: Line[]; // generic dialogue (npcs/objects) when not story-relevant
}

export interface WorldLocation {
  id: LocationId;
  name: string;
  tiles: string[];
  entrances: Record<string, { x: number; y: number; dir: "up" | "down" | "left" | "right" }>;
  entities: Entity[];
  bgTile: "g" | "f"; // base look hint
}

export const WORLD: Record<LocationId, WorldLocation> = {
  town: {
    id: "town",
    name: "Downtown",
    bgTile: "g",
    tiles: [
      "ttttttttttttt",
      "tgggggggggggt",
      "tgggggggggggt",
      "tggpppppppggt",
      "tgrpgrrgpgrgt",
      "tggppgpgppggt",
      "tgggpgpgpgggt",
      "tggpppppppggt",
      "tgggggggggggt",
      "tggtgggggtggt",
      "ttttttttttttt",
    ],
    entrances: { start: { x: 6, y: 7, dir: "up" }, home: { x: 2, y: 5, dir: "down" }, shop: { x: 6, y: 6, dir: "down" }, school: { x: 10, y: 5, dir: "down" } },
    entities: [
      { id: "home_door", kind: "door", x: 2, y: 4, sprite: "obj.door", solid: false, name: "Home", to: "home", toEntrance: "fromTown" },
      { id: "shop_door", kind: "door", x: 6, y: 4, sprite: "obj.door", solid: false, name: "Pip's Cards", to: "shop", toEntrance: "fromTown" },
      { id: "school_door", kind: "door", x: 10, y: 4, sprite: "obj.door", solid: false, name: "School", to: "school", toEntrance: "fromTown" },
      { id: "home_roof", kind: "decor", x: 2, y: 3, sprite: "obj.building", solid: true },
      { id: "shop_roof", kind: "decor", x: 6, y: 3, sprite: "obj.building", solid: true },
      { id: "school_roof", kind: "decor", x: 10, y: 3, sprite: "obj.building", solid: true },
      { id: "townsperson", kind: "npc", x: 4, y: 8, sprite: "spr.classmate", solid: true, name: "Neighbor", idle: [{ speaker: "Neighbor", text: "Everyone's been at Pip's all week. That card game's all anyone talks about." }] },
    ],
  },
  home: {
    id: "home",
    name: "Your Room",
    bgTile: "f",
    tiles: [
      "wwwwwwwwwww",
      "wfffffffffw",
      "wfffffffffw",
      "wfffffffffw",
      "wfffffffffw",
      "wfffffffffw",
      "wwwwwwwwwww",
    ],
    entrances: { fromTown: { x: 5, y: 5, dir: "up" } },
    entities: [
      { id: "bed", kind: "object", x: 1, y: 1, sprite: "obj.bed", solid: true, name: "Bed", action: "sleep", idle: [{ speaker: "You", text: "My bed. Sleep here to save and start a new day." }] },
      { id: "desk", kind: "object", x: 8, y: 1, sprite: "obj.desk", solid: true, name: "Desk", action: "deck", idle: [{ speaker: "You", text: "My desk — where I tune decks and flip through my binder." }] },
      { id: "pc", kind: "object", x: 3, y: 1, sprite: "obj.pc", solid: true, name: "PC", action: "pchub", idle: [{ speaker: "You", text: "My PC — the singles market and the PrismNexus community." }] },
      { id: "couch", kind: "object", x: 8, y: 4, sprite: "obj.bed", solid: true, name: "Practice Space", action: "activity", activityId: "train", idle: [{ speaker: "You", text: "Space to goldfish hands and steady my nerves." }] },
      { id: "sis", kind: "npc", x: 5, y: 2, sprite: "spr.sis", solid: true, name: "Sis", idle: [{ speaker: "Sis", text: "Go on, you'll be late! Pip's place is downtown." }] },
      { id: "home_exit", kind: "door", x: 5, y: 5, sprite: "obj.door", solid: false, name: "Outside", to: "town", toEntrance: "home" },
    ],
  },
  shop: {
    id: "shop",
    name: "Pip's Cards",
    bgTile: "f",
    tiles: [
      "wwwwwwwwwwwwwww",
      "wfffffffffffffw",
      "wfffffffffffffw",
      "wfffffffffffffw",
      "wfffffffffffffw",
      "wfffffffffffffw",
      "wfffffffffffffw",
      "wwwwwwwwwwwwwww",
    ],
    entrances: { fromTown: { x: 7, y: 6, dir: "up" } },
    entities: [
      { id: "counter", kind: "decor", x: 2, y: 2, sprite: "obj.counter", solid: true },
      { id: "counter2", kind: "decor", x: 3, y: 2, sprite: "obj.counter", solid: true },
      { id: "booster_box", kind: "object", x: 5, y: 2, sprite: "obj.booster", solid: true, name: "Booster Stand", action: "shop", idle: [{ speaker: "Pip", text: "Fresh First Light boosters — six cards a pack, a Rare guaranteed." }] },
      { id: "shelf1", kind: "decor", x: 1, y: 1, sprite: "obj.shelf", solid: true },
      { id: "shelf2", kind: "decor", x: 13, y: 1, sprite: "obj.shelf", solid: true },
      { id: "table1", kind: "decor", x: 9, y: 3, sprite: "obj.table", solid: true },
      { id: "table2", kind: "decor", x: 10, y: 3, sprite: "obj.table", solid: true },
      { id: "pip", kind: "npc", x: 2, y: 3, sprite: "spr.pip", solid: true, name: "Pip", idle: [{ speaker: "Pip", text: "New cards drop all the time. Keep that deck sharp!" }] },
      { id: "milo", kind: "npc", x: 9, y: 4, sprite: "spr.milo", solid: true, name: "Milo", idle: [{ speaker: "Milo", text: "Wanna run it back sometime? I've been practicing." }] },
      { id: "cora", kind: "npc", x: 11, y: 2, sprite: "spr.cora", solid: true, name: "Cora", idle: [{ speaker: "Cora", text: "My walls are still standing. Mostly." }] },
      { id: "events_board", kind: "object", x: 13, y: 5, sprite: "obj.board", solid: true, name: "Events Board", action: "board", idle: [{ speaker: "You", text: "Friday Night PRISM — the local proving ground." }] },
      { id: "register", kind: "object", x: 4, y: 4, sprite: "obj.counter", solid: true, name: "Register (shift)", action: "activity", activityId: "work", idle: [{ speaker: "Pip", text: "Want to pick up a shift? Always glad for the help." }] },
      { id: "lounge", kind: "object", x: 12, y: 4, sprite: "obj.table", solid: true, name: "Lounge", action: "activity", activityId: "socialize", idle: [{ speaker: "You", text: "The hangout corner — good place to make a name." }] },
      { id: "shop_exit", kind: "door", x: 7, y: 6, sprite: "obj.door", solid: false, name: "Outside", to: "town", toEntrance: "shop" },
    ],
  },
  school: {
    id: "school",
    name: "School Yard",
    bgTile: "f",
    tiles: [
      "wwwwwwwwwwwww",
      "wfffffffffffw",
      "wfffffffffffw",
      "wfffffffffffw",
      "wfffffffffffw",
      "wfffffffffffw",
      "wwwwwwwwwwwww",
    ],
    entrances: { fromTown: { x: 6, y: 5, dir: "up" } },
    entities: [
      { id: "desk1", kind: "decor", x: 2, y: 2, sprite: "obj.table", solid: true },
      { id: "desk2", kind: "decor", x: 4, y: 2, sprite: "obj.table", solid: true },
      { id: "desk3", kind: "decor", x: 6, y: 2, sprite: "obj.table", solid: true },
      { id: "desk4", kind: "decor", x: 8, y: 2, sprite: "obj.table", solid: true },
      { id: "library", kind: "object", x: 11, y: 2, sprite: "obj.shelf", solid: true, name: "Library", action: "activity", activityId: "study", idle: [{ speaker: "You", text: "Hit the books — Knowledge helps in exams and in deck-tech." }] },
      { id: "classmate", kind: "npc", x: 3, y: 4, sprite: "spr.classmate", solid: true, name: "Classmate", idle: [{ speaker: "Classmate", text: "Vex is undefeated at school. Good luck with that." }] },
      { id: "vex", kind: "npc", x: 9, y: 4, sprite: "spr.vex", solid: true, name: "Vex", idle: [{ speaker: "Vex", text: "Don't get cocky. I've got new tech." }] },
      { id: "school_exit", kind: "door", x: 6, y: 5, sprite: "obj.door", solid: false, name: "Outside", to: "town", toEntrance: "school" },
    ],
  },
};

export const TILE = 16; // logical px per tile
