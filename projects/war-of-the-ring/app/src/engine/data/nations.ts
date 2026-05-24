// CONFIRM (step count): the political track. Each nation advances toward the final "At War" step.
// FP nations start Passive (except the Elves, who start Active). A Passive nation can advance but
// can NEVER reach At War until it is activated. Shadow nations are always Active and simply march
// to war. Exact starting boxes are CONFIRM (read off the board) — parameterized for a one-line fix.

import type { Nation } from '../types';

export const AT_WAR_STEP = 3; // reaching this step = "At War"

export interface PoliticalStart {
  active: boolean;
  step: number;
}

export const POLITICAL_START: Record<Nation, PoliticalStart> = {
  // Free Peoples — passive except the Elves
  north: { active: false, step: 1 },
  rohan: { active: false, step: 1 },
  gondor: { active: false, step: 1 },
  elves: { active: true, step: 2 },
  dwarves: { active: false, step: 1 },
  // Shadow — always active, marching to war
  sauron: { active: true, step: 2 },
  isengard: { active: true, step: 1 },
  southrons: { active: true, step: 1 },
};
