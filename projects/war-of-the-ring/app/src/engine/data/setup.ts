// CONFIRM (data): starting unit placement, reinforcement pools, deck assignment, Fellowship start.
// Transcribed/approximated from the rulebook setup. Counts are tuned so a 2-player game resolves;
// exact figures are CONFIRM (read off the setup sheet) and a wrong value is a one-line edit.

import type { Nation, Reinforcements, Side } from '../types';

export interface UnitPlacement {
  nation: Nation;
  regular?: number;
  elite?: number;
}

export interface Placement {
  side: Side;
  units: UnitPlacement[];
  leaders?: number;
  nazgul?: number;
  characters?: string[];
}

export const STARTING_PLACEMENT: Record<string, Placement> = {
  // ── Free Peoples ──────────────────────────────────────────────────────────────────────
  minas_tirith: { side: 'fp', units: [{ nation: 'gondor', regular: 3, elite: 1 }], leaders: 1 },
  osgiliath: { side: 'fp', units: [{ nation: 'gondor', regular: 2 }] },
  pelennor: { side: 'fp', units: [{ nation: 'gondor', regular: 1 }] },
  dol_amroth: { side: 'fp', units: [{ nation: 'gondor', regular: 1, elite: 1 }] },
  pelargir: { side: 'fp', units: [{ nation: 'gondor', regular: 1 }] },
  edoras: { side: 'fp', units: [{ nation: 'rohan', regular: 1, elite: 1 }], leaders: 1 },
  helms_deep: { side: 'fp', units: [{ nation: 'rohan', regular: 1 }] },
  fords_of_isen: { side: 'fp', units: [{ nation: 'rohan', regular: 2 }], leaders: 1 },
  bree: { side: 'fp', units: [{ nation: 'north', regular: 1 }] },
  fornost: { side: 'fp', units: [{ nation: 'north', regular: 1 }] },
  the_shire: { side: 'fp', units: [{ nation: 'north', regular: 1 }] },
  dale: { side: 'fp', units: [{ nation: 'north', regular: 1 }], leaders: 1 },
  rivendell: { side: 'fp', units: [{ nation: 'elves', elite: 2 }], leaders: 1 },
  grey_havens: { side: 'fp', units: [{ nation: 'elves', elite: 1 }], leaders: 1 },
  lorien: { side: 'fp', units: [{ nation: 'elves', elite: 1 }], leaders: 1 },
  woodland_realm: { side: 'fp', units: [{ nation: 'elves', elite: 1 }] },
  erebor: { side: 'fp', units: [{ nation: 'dwarves', regular: 1, elite: 1 }], leaders: 1 },
  ered_luin: { side: 'fp', units: [{ nation: 'dwarves', regular: 1 }] },
  iron_hills: { side: 'fp', units: [{ nation: 'dwarves', regular: 1 }] },

  // ── Shadow ────────────────────────────────────────────────────────────────────────────
  morannon: { side: 'shadow', units: [{ nation: 'sauron', regular: 5, elite: 1 }], nazgul: 1 },
  minas_morgul: { side: 'shadow', units: [{ nation: 'sauron', regular: 3, elite: 1 }], nazgul: 1 },
  gorgoroth: { side: 'shadow', units: [{ nation: 'sauron', regular: 3 }] },
  barad_dur: { side: 'shadow', units: [{ nation: 'sauron', regular: 4, elite: 1 }], nazgul: 1 },
  nurn: { side: 'shadow', units: [{ nation: 'sauron', regular: 2 }] },
  moria: { side: 'shadow', units: [{ nation: 'sauron', regular: 2 }] },
  dol_guldur: { side: 'shadow', units: [{ nation: 'sauron', regular: 3, elite: 1 }], nazgul: 1 },
  mount_gundabad: { side: 'shadow', units: [{ nation: 'sauron', regular: 2 }] },
  orthanc: { side: 'shadow', units: [{ nation: 'isengard', regular: 4, elite: 1 }] },
  north_dunland: { side: 'shadow', units: [{ nation: 'isengard', regular: 1 }] },
  south_dunland: { side: 'shadow', units: [{ nation: 'isengard', regular: 1 }] },
  umbar: { side: 'shadow', units: [{ nation: 'southrons', regular: 3 }] },
  near_harad: { side: 'shadow', units: [{ nation: 'southrons', regular: 3, elite: 1 }] },
  far_harad: { side: 'shadow', units: [{ nation: 'southrons', regular: 2 }] },
  khand: { side: 'shadow', units: [{ nation: 'southrons', regular: 2 }] },
};

export function startingReinforcements(): { fp: Reinforcements; shadow: Reinforcements } {
  return {
    fp: {
      regular: { north: 6, rohan: 6, gondor: 6, elves: 2, dwarves: 5 },
      elite: { north: 2, rohan: 4, gondor: 4, elves: 4, dwarves: 3 },
      leaders: { north: 2, rohan: 3, gondor: 2, elves: 1, dwarves: 1 },
      nazgul: 0,
    },
    shadow: {
      regular: { sauron: 8, isengard: 6, southrons: 10 },
      elite: { sauron: 4, isengard: 5, southrons: 3 },
      leaders: {},
      nazgul: 4, // the un-Witch-king Nazgul reserve
    },
  };
}

export const FELLOWSHIP_START_REGION = 'rivendell';
