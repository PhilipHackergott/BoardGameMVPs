// CONFIRM (characters): Companions, Minions, and the Will-of-the-West upgrades. Level/Leadership
// and dice bonuses are transcribed from the character cards. Entry conditions are summarized;
// the engine enforces the dice-bonus and Fellowship membership; full ability text is descriptive.

import type { CharacterDef } from '../types';

export const CHARACTERS: CharacterDef[] = [
  // ── Free Peoples Companions (start in the Fellowship) ─────────────────────────────────
  { id: 'gandalf_grey', name: 'Gandalf the Grey', side: 'fp', level: 3, leadership: 1, diceBonus: 0, startsInFellowship: true, ability: 'After using a Character die to play an event, draw a matching card. Can be upgraded to Gandalf the White.' },
  { id: 'strider', name: 'Strider', side: 'fp', level: 3, leadership: 1, diceBonus: 0, startsInFellowship: true, ability: 'Can be crowned Aragorn — Heir to Isildur via a Will of the West.' },
  { id: 'boromir', name: 'Boromir', side: 'fp', level: 2, leadership: 1, diceBonus: 0, startsInFellowship: true, ability: 'Leadership in Gondor armies.' },
  { id: 'legolas', name: 'Legolas', side: 'fp', level: 2, leadership: 1, diceBonus: 0, startsInFellowship: true, ability: 'Activates the Elves when separated to an Elven stronghold.' },
  { id: 'gimli', name: 'Gimli', side: 'fp', level: 2, leadership: 1, diceBonus: 0, startsInFellowship: true, ability: 'Activates the Dwarves when separated to Erebor.' },
  { id: 'meriadoc', name: 'Meriadoc', side: 'fp', level: 1, leadership: 0, diceBonus: 0, startsInFellowship: true, ability: 'Hobbit. Can absorb a Hunt hit when revealed.' },
  { id: 'peregrin', name: 'Peregrin', side: 'fp', level: 1, leadership: 0, diceBonus: 0, startsInFellowship: true, ability: 'Hobbit. Can absorb a Hunt hit when revealed.' },

  // ── FP upgrades (enter via Will of the West only; each grants +1 FP action die) ────────
  { id: 'aragorn', name: 'Aragorn — Heir to Isildur', side: 'fp', level: 3, leadership: 2, diceBonus: 1, startsInFellowship: false, ability: 'Crowned from Strider via a Will of the West (in Minas Tirith, Pelargir, or Dol Amroth). +1 FP action die.' },
  { id: 'gandalf_white', name: 'Gandalf the White', side: 'fp', level: 3, leadership: 1, diceBonus: 1, startsInFellowship: false, ability: 'Returns via a Will of the West once a Minion is in play / Gandalf the Grey is lost. +1 FP action die.' },
  { id: 'gollum', name: 'Gollum', side: 'fp', level: 0, leadership: 0, diceBonus: 0, startsInFellowship: false, ability: 'Becomes the Guide when no Companions remain in the Fellowship.' },

  // ── Shadow Minions (enter via Muster; each grants +1 Shadow action die) ────────────────
  { id: 'saruman', name: 'Saruman', side: 'shadow', level: 0, leadership: 1, diceBonus: 1, startsInFellowship: false, ability: 'Enters in Orthanc once Isengard is At War. +1 Shadow die. Unlimited leadership with Isengard.' },
  { id: 'witch_king', name: 'The Witch-king', side: 'shadow', level: 3, leadership: 2, diceBonus: 1, startsInFellowship: false, ability: 'Enters once Shadow has 4+ VP captured. +1 Shadow die.' },
  { id: 'mouth_of_sauron', name: 'The Mouth of Sauron', side: 'shadow', level: 3, leadership: 2, diceBonus: 1, startsInFellowship: false, ability: 'Enters once Sauron is At War, in a Sauron stronghold. +1 Shadow die.' },
];

export const CHAR_BY_ID: Record<string, CharacterDef> = Object.fromEntries(CHARACTERS.map((c) => [c.id, c]));

export const STARTING_COMPANIONS = CHARACTERS.filter((c) => c.startsInFellowship).map((c) => c.id);
export const FP_MINIONS_OR_UPGRADES = ['aragorn', 'gandalf_white'];
export const SHADOW_MINIONS = ['saruman', 'witch_king', 'mouth_of_sauron'];
