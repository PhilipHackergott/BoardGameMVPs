// Verified: action-die faces and pool sizes (Ares/Dized official rules).
// FP die has TWO Character faces and a Will of the West, and NO pure Army face (Army appears only
// on the combined Army&Muster face). Shadow die has an Eye face (auto-moved to the Hunt Box).

import type { Die } from '../types';

export const FP_DIE_FACES: Die[] = ['character', 'character', 'armyMuster', 'muster', 'event', 'will'];
export const SHADOW_DIE_FACES: Die[] = ['character', 'army', 'armyMuster', 'muster', 'event', 'eye'];

export const FP_BASE_DICE = 4;
export const FP_MAX_DICE = 6; // +1 Aragorn (Heir), +1 Gandalf the White
export const SHADOW_BASE_DICE = 7;
export const SHADOW_MAX_DICE = 10; // +1 each: Saruman, Witch-king, Mouth of Sauron

/** Which action-die faces can satisfy a given required die type (Will of the West is wild). */
export function faceSatisfies(face: Die, required: Die): boolean {
  if (face === required) return true;
  if (face === 'will') return required !== 'eye'; // Will is wild for FP
  if (required === 'army' && face === 'armyMuster') return true;
  if (required === 'muster' && face === 'armyMuster') return true;
  return false;
}
