// Draftable special powers (pure data). Each power is a per-player flag the engine
// reads at decision points; resolving a draft = assigning PowerIds to players.

export type PowerId =
  | "warding"
  | "flying"
  | "agile"
  | "procrastinator"
  | "gravity"
  | "intercept"
  | "flexible"
  | "patron"
  | "cheater"
  | "spectral"
  | "hoarder"
  | "shadowfollow"
  | "harvester"
  | "assassin"
  | "repeller"
  | "nomad"
  | "catalyst"
  | "tithe"
  | "prism"
  | "magpie"
  | "alchemist"
  | "lighthouse"
  | "cartographer"
  | "momentum";

export interface Power {
  id: PowerId;
  name: string;
  blurb: string;
}

export const POWERS: Power[] = [
  {
    id: "warding",
    name: "Warding",
    blurb: "A small protected radius around each of your pawns — rivals can't place there, and it blocks their connection lines.",
  },
  {
    id: "flying",
    name: "Flying",
    blurb: "Your placement lines may cross up to two blocking flowers.",
  },
  {
    id: "agile",
    name: "Agile",
    blurb: "Your first two placements each also collect a nearby third flower.",
  },
  {
    id: "procrastinator",
    name: "Procrastinator",
    blurb: "You start a turn later, but each placement also sweeps one more connected flower of that colour.",
  },
  {
    id: "gravity",
    name: "Gravity",
    blurb: "On placement, nearby flowers are pulled slightly toward your pawn.",
  },
  {
    id: "intercept",
    name: "Intercept",
    blurb: "Each placement raises a barrier on your line — rivals can't place on or across it, and it blocks their territory claims at nightfall.",
  },
  {
    id: "flexible",
    name: "Flexible",
    blurb: "Once each per game: pass (and keep the pawn for later) or take an extra turn.",
  },
  {
    id: "patron",
    name: "Patron",
    blurb: "After your first turn, pick up any 3 flowers on the board.",
  },
  {
    id: "cheater",
    name: "Cheater",
    blurb: "At game end you win every tied colour, and pad your strongest colour by one.",
  },
  {
    id: "spectral",
    name: "Spectral",
    blurb: "Your pawns never block anyone's connection lines — and they reach 15% farther for leftover flowers at nightfall.",
  },
  {
    id: "hoarder",
    name: "Hoarder",
    blurb: "At game end, a colour you win and hold 5 or more of counts as an extra colour won.",
  },
  {
    id: "shadowfollow",
    name: "Shadow Follow",
    blurb: "Claim the same color the previous player just claimed and you steal one of it from their pile.",
  },
  {
    id: "harvester",
    name: "Harvester",
    blurb: "When a placement leaves one or two flowers of that colour, you sweep them too — and take any one more flower.",
  },
  {
    id: "assassin",
    name: "Assassin",
    blurb: "After each placement, remove one flower of your choice from the game entirely.",
  },
  {
    id: "repeller",
    name: "Magnet",
    blurb: "After placing, aim a cone — flowers within it are dragged toward your pawn, and any that reach it are harvested (warded/frozen flowers are safe).",
  },
  {
    id: "nomad",
    name: "Nomad",
    blurb: "You always go first. Once per game, reclaim one of your pawns to redeploy it for a fresh pair.",
  },
  {
    id: "catalyst",
    name: "Catalyst",
    blurb: "After your second pawn, immediately place a phantom pawn — it collects a trio but doesn't claim territory.",
  },
  {
    id: "tithe",
    name: "Tithe",
    blurb: "Whenever a rival's placement collects a colour you currently lead, you skim one of that colour for yourself.",
  },
  {
    id: "prism",
    name: "Prism",
    blurb: "Each placement also collects the nearest flower of a different colour — spreading you across the spectrum.",
  },
  {
    id: "magpie",
    name: "Magpie",
    blurb: "At nightfall, when you're behind, spoil one colour majority you trail by exactly one — nobody wins it.",
  },
  {
    id: "alchemist",
    name: "Alchemist",
    blurb: "After each placement, the nearest other flower transmutes into the colour you just collected — bending the board toward your sets.",
  },
  {
    id: "lighthouse",
    name: "Lighthouse",
    blurb: "Your first pawn is a beacon: at nightfall it claims leftover flowers from twice as far.",
  },
  {
    id: "cartographer",
    name: "Cartographer",
    blurb: "At nightfall you claim every leftover flower within a fixed radius of any of your pawns — not just the nearest.",
  },
  {
    id: "momentum",
    name: "Momentum",
    blurb: "Collect the same colour on consecutive placements and each repeat collects extra of it (a building combo).",
  },
];

export const POWER_BY_ID: Record<PowerId, Power> = Object.fromEntries(
  POWERS.map((p) => [p.id, p]),
) as Record<PowerId, Power>;

// Colour affinities — one per flower colour, triggered by collecting that colour. The
// `color` is the flower colour index it keys off; the card border uses that flower's hue.
export interface Affinity {
  color: number;
  name: string;
  blurb: string;
}

export const AFFINITIES: Affinity[] = [
  { color: 0, name: "Ember", blurb: "Collect a pair of this flower and every other one of it slides toward your pawn." },
  { color: 1, name: "Frost", blurb: "Collect a pair of this flower and the two nearest flowers freeze — nothing can ever move them." },
  { color: 2, name: "Verdant", blurb: "Collect a pair of this flower and nearby flowers of any colour drift toward your pawn." },
  { color: 3, name: "Aureate", blurb: "Collect a pair of this flower and gain +1 in whichever of your colours is closest to a majority." },
  { color: 4, name: "Dusk", blurb: "Collect a pair of this flower, then steal one flower of any other colour from whoever leads it." },
  { color: 5, name: "Chalk", blurb: "Your lines may cross one extra blocking flower for each of this flower you've collected." },
  { color: 6, name: "Abyss", blurb: "Collect a pair of this flower and you may banish any one flower from the game." },
];

export const AFFINITY_BY_COLOR: Record<number, Affinity> = Object.fromEntries(
  AFFINITIES.map((a) => [a.color, a]),
);
