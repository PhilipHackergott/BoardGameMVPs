// Opponent roster — DATA. Each = a deck + a continuous skill rating + persona weights + flavor
// (tcg-design §4.3). `skill` rises along the roster so the Gauntlet ladder gets progressively,
// finely harder; persona is orthogonal (how a deck WANTS to play, independent of how well).

import { Persona } from "../prism/evaluate";

export const PERSONAS: Record<string, Persona> = {
  aggro: { name: "aggro", aggression: 1.6, control: 0.7 },
  tempo: { name: "tempo", aggression: 1.15, control: 1.2 },
  ramp: { name: "ramp", aggression: 0.85, control: 1.25 },
  attrition: { name: "attrition", aggression: 1.15, control: 1.3 },
  lockdown: { name: "lockdown", aggression: 0.8, control: 1.4 },
  control: { name: "control", aggression: 0.75, control: 1.6 },
  midrange: { name: "midrange", aggression: 1.1, control: 1.1 },
};

export interface Opponent {
  id: string;
  name: string;
  deckId: string;
  skill: number; // 0..1, continuous
  persona: Persona;
  flavor: string;
}

// The Gauntlet ladder, ascending skill (Beginner → Worlds-class). 14 opponents.
export const ROSTER: Opponent[] = [
  { id: "milo", name: "Milo, the New Kid", deckId: "emberrush", skill: 0.08, persona: PERSONAS.aggro, flavor: "Just opened his first packs. Plays everything face-up and fearless." },
  { id: "nan", name: "Nana Reef", deckId: "tidewatch", skill: 0.16, persona: PERSONAS.tempo, flavor: "Runs the shop's kids table. Patient, a little slow." },
  { id: "bram", name: "Bram Thornton", deckId: "wildgrowth", skill: 0.24, persona: PERSONAS.ramp, flavor: "Always drafts the biggest creature. Subtlety optional." },
  { id: "vex", name: "Vex", deckId: "cinderblood", skill: 0.33, persona: PERSONAS.aggro, flavor: "FNM regular with a chip on her shoulder and a fast clock." },
  { id: "cora", name: "Cora Vale", deckId: "ironlaw", skill: 0.42, persona: PERSONAS.lockdown, flavor: "Builds a wall and dares you to break it." },
  { id: "rook", name: "Rook", deckId: "gravetide", skill: 0.5, persona: PERSONAS.attrition, flavor: "Grinds every game to the last card. Never panics." },
  { id: "iris", name: "Iris Quill", deckId: "bastion", skill: 0.58, persona: PERSONAS.control, flavor: "The shop ace. Answers everything, then drowns you." },
  { id: "dane", name: "Dane Holt", deckId: "wildfire", skill: 0.65, persona: PERSONAS.midrange, flavor: "Tournament-tested midrange. Punishes every mistake." },
  { id: "sable", name: "Sable", deckId: "drownmark", skill: 0.72, persona: PERSONAS.attrition, flavor: "Regional finalist. Removal for days, reach to close." },
  { id: "kestrel", name: "Kestrel", deckId: "greenwall", skill: 0.78, persona: PERSONAS.ramp, flavor: "Ramps into the biggest board you'll ever fail to race." },
  { id: "onyx", name: "Onyx", deckId: "cinderblood", skill: 0.84, persona: PERSONAS.aggro, flavor: "National-level aggro. The clock is always faster than you think." },
  { id: "vivian", name: "Vivian Crane", deckId: "bastion", skill: 0.9, persona: PERSONAS.control, flavor: "National champion. Makes control look effortless." },
  { id: "atlas", name: "Atlas Mercer", deckId: "wildfire", skill: 0.94, persona: PERSONAS.midrange, flavor: "Worlds Top 8. There is no free turn." },
  { id: "prism", name: "PRISM, the Champion", deckId: "drownmark", skill: 0.97, persona: PERSONAS.control, flavor: "The reigning World Champion. Beat them and the scene knows your name." },
];

export function getOpponent(id: string): Opponent {
  const o = ROSTER.find((x) => x.id === id);
  if (!o) throw new Error(`Unknown opponent: ${id}`);
  return o;
}
