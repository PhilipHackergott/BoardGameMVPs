// Asset manifest — the seam for slotting in richer art later (this is a non-distributed personal
// prototype, so art can be enriched freely for the operator's own play). While `src` is null the
// render layer draws procedural placeholders (coloured standees + labels). Drop files into
// public/art/... and set the matching `src` to upgrade with no other code changes.

export interface FactionColors {
  primary: number;
  light: number;
  ink: number;
}

// Free Peoples cool blues/silvers; Shadow reds/blacks (per Visual identity).
export const FACTION: Record<'fp' | 'shadow', FactionColors> = {
  fp: { primary: 0x3a6ea5, light: 0x9ec5e8, ink: 0x0c1c2e },
  shadow: { primary: 0x9c2a2a, light: 0xe07a5a, ink: 0x250a0a },
};

// Nation tints for standee bodies (colourblind-aware-ish, plus always a text label).
export const NATION_TINT: Record<string, number> = {
  north: 0x6fa8dc,
  rohan: 0x3fae6b,
  gondor: 0x5b8fc7,
  elves: 0xbfe3f0,
  dwarves: 0xc78a3b,
  sauron: 0x8b1e1e,
  isengard: 0x4a4a52,
  southrons: 0xc46a2a,
};

export const NATION_ABBR: Record<string, string> = {
  north: 'N',
  rohan: 'Ro',
  gondor: 'Go',
  elves: 'El',
  dwarves: 'Dw',
  sauron: 'Sa',
  isengard: 'Is',
  southrons: 'So',
};

export interface AssetManifest {
  mapImage: string | null; // official map render once available
  standee: Record<string, string | null>; // per-nation standee art
}

export const ASSETS: AssetManifest = {
  mapImage: null,
  standee: Object.fromEntries(Object.keys(NATION_TINT).map((n) => [n, null])),
};

export function tintToCss(tint: number): string {
  return '#' + tint.toString(16).padStart(6, '0');
}
