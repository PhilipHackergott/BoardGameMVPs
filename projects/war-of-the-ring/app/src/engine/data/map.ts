// CONFIRM: map — the region graph transcribed from the War of the Ring board. This is a curated,
// strategically-complete subset of the ~50 printed regions: every settlement that scores VP, the
// full Fellowship path Rivendell→Mordor, and a connected military graph. Adjacencies are built
// from a symmetric edge list so they can't drift out of sync. A wrong value here is a one-line fix
// (per the factory's CONFIRM practice). Layout coords (col,row on a 12×9 grid) drive the 2.5D map.

import type { Region, Settlement, Terrain, Nation } from '../types';

interface RegionDef {
  id: string;
  name: string;
  nation: Nation | null;
  terrain: Terrain;
  settlement: Settlement;
  coastal?: boolean;
  // normalized board position for the perspective map (x: 0..1 west→east, y: 0..1 north→south)
  x: number;
  y: number;
}

function vpOf(s: Settlement): number {
  return s === 'city' ? 1 : s === 'stronghold' ? 2 : 0;
}

const DEFS: RegionDef[] = [
  // ── Eriador (NW) ───────────────────────────────────────────────────────────────────────
  { id: 'grey_havens', name: 'Grey Havens', nation: 'elves', terrain: 'plains', settlement: 'stronghold', coastal: true, x: 0.03, y: 0.30 },
  { id: 'ered_luin', name: 'Ered Luin', nation: 'dwarves', terrain: 'mountains', settlement: 'city', x: 0.05, y: 0.16 },
  { id: 'the_shire', name: 'The Shire', nation: 'north', terrain: 'plains', settlement: 'town', x: 0.12, y: 0.24 },
  { id: 'fornost', name: 'Fornost', nation: 'north', terrain: 'plains', settlement: 'town', x: 0.16, y: 0.13 },
  { id: 'bree', name: 'Bree', nation: 'north', terrain: 'plains', settlement: 'town', x: 0.19, y: 0.26 },
  { id: 'north_downs', name: 'North Downs', nation: null, terrain: 'hills', settlement: 'none', x: 0.13, y: 0.10 },
  { id: 'weather_hills', name: 'Weather Hills', nation: null, terrain: 'hills', settlement: 'none', x: 0.24, y: 0.18 },
  { id: 'ettenmoors', name: 'Ettenmoors', nation: null, terrain: 'hills', settlement: 'none', x: 0.27, y: 0.07 },
  { id: 'angmar', name: 'Angmar', nation: 'sauron', terrain: 'wasteland', settlement: 'none', x: 0.22, y: 0.02 },
  { id: 'rivendell', name: 'Rivendell', nation: 'elves', terrain: 'mountains', settlement: 'stronghold', x: 0.31, y: 0.20 },
  { id: 'trollshaws', name: 'Trollshaws', nation: null, terrain: 'hills', settlement: 'none', x: 0.29, y: 0.26 },
  { id: 'enedwaith', name: 'Enedwaith', nation: null, terrain: 'plains', settlement: 'none', x: 0.25, y: 0.40 },

  // ── Misty Mountains / Rhovanion (N-central) ───────────────────────────────────────────
  { id: 'mount_gundabad', name: 'Mount Gundabad', nation: 'sauron', terrain: 'mountains', settlement: 'stronghold', x: 0.40, y: 0.04 },
  { id: 'high_pass', name: 'High Pass', nation: null, terrain: 'mountains', settlement: 'none', x: 0.37, y: 0.18 },
  { id: 'gladden_fields', name: 'Gladden Fields', nation: null, terrain: 'plains', settlement: 'none', x: 0.43, y: 0.22 },
  { id: 'old_ford', name: 'Old Ford', nation: null, terrain: 'plains', settlement: 'none', x: 0.45, y: 0.13 },
  { id: 'woodland_realm', name: 'Woodland Realm', nation: 'elves', terrain: 'forest', settlement: 'stronghold', x: 0.53, y: 0.10 },
  { id: 'dale', name: 'Dale', nation: 'north', terrain: 'plains', settlement: 'city', x: 0.60, y: 0.06 },
  { id: 'erebor', name: 'Erebor', nation: 'dwarves', terrain: 'mountains', settlement: 'stronghold', x: 0.64, y: 0.10 },
  { id: 'iron_hills', name: 'Iron Hills', nation: 'dwarves', terrain: 'hills', settlement: 'town', x: 0.72, y: 0.10 },
  { id: 'moria', name: 'Moria', nation: 'sauron', terrain: 'mountains', settlement: 'stronghold', x: 0.40, y: 0.27 },
  { id: 'dimrill_dale', name: 'Dimrill Dale', nation: null, terrain: 'mountains', settlement: 'none', x: 0.44, y: 0.30 },
  { id: 'lorien', name: 'Lorien', nation: 'elves', terrain: 'forest', settlement: 'stronghold', x: 0.48, y: 0.33 },
  { id: 'anduin', name: 'Vales of Anduin', nation: null, terrain: 'plains', settlement: 'none', x: 0.50, y: 0.27 },
  { id: 'dol_guldur', name: 'Dol Guldur', nation: 'sauron', terrain: 'forest', settlement: 'stronghold', x: 0.56, y: 0.27 },
  { id: 'southern_mirkwood', name: 'Southern Mirkwood', nation: null, terrain: 'forest', settlement: 'none', x: 0.58, y: 0.20 },

  // ── Rohan / Isengard (central) ─────────────────────────────────────────────────────────
  { id: 'fangorn', name: 'Fangorn', nation: null, terrain: 'forest', settlement: 'none', x: 0.45, y: 0.42 },
  { id: 'orthanc', name: 'Orthanc', nation: 'isengard', terrain: 'mountains', settlement: 'stronghold', x: 0.38, y: 0.46 },
  { id: 'north_dunland', name: 'North Dunland', nation: 'isengard', terrain: 'hills', settlement: 'town', x: 0.32, y: 0.46 },
  { id: 'south_dunland', name: 'South Dunland', nation: 'isengard', terrain: 'hills', settlement: 'town', x: 0.32, y: 0.53 },
  { id: 'gap_of_rohan', name: 'Gap of Rohan', nation: null, terrain: 'plains', settlement: 'none', x: 0.40, y: 0.53 },
  { id: 'fords_of_isen', name: 'Fords of Isen', nation: 'rohan', terrain: 'plains', settlement: 'none', x: 0.43, y: 0.50 },
  { id: 'helms_deep', name: "Helm's Deep", nation: 'rohan', terrain: 'mountains', settlement: 'stronghold', x: 0.46, y: 0.56 },
  { id: 'edoras', name: 'Edoras', nation: 'rohan', terrain: 'plains', settlement: 'city', x: 0.52, y: 0.55 },
  { id: 'druwaith', name: 'Druwaith Iaur', nation: null, terrain: 'hills', settlement: 'none', coastal: true, x: 0.40, y: 0.62 },

  // ── Gondor / Ithilien (SE-central) ─────────────────────────────────────────────────────
  { id: 'minas_tirith', name: 'Minas Tirith', nation: 'gondor', terrain: 'plains', settlement: 'stronghold', x: 0.62, y: 0.55 },
  { id: 'pelennor', name: 'Pelennor Fields', nation: 'gondor', terrain: 'plains', settlement: 'none', x: 0.66, y: 0.51 },
  { id: 'osgiliath', name: 'Osgiliath', nation: 'gondor', terrain: 'plains', settlement: 'town', x: 0.69, y: 0.55 },
  { id: 'lossarnach', name: 'Lossarnach', nation: 'gondor', terrain: 'hills', settlement: 'town', x: 0.63, y: 0.63 },
  { id: 'pelargir', name: 'Pelargir', nation: 'gondor', terrain: 'plains', settlement: 'city', coastal: true, x: 0.62, y: 0.71 },
  { id: 'dol_amroth', name: 'Dol Amroth', nation: 'gondor', terrain: 'plains', settlement: 'stronghold', coastal: true, x: 0.54, y: 0.72 },
  { id: 'minas_morgul', name: 'Minas Morgul', nation: 'sauron', terrain: 'mountains', settlement: 'stronghold', x: 0.75, y: 0.56 },
  { id: 'south_ithilien', name: 'South Ithilien', nation: 'gondor', terrain: 'plains', settlement: 'none', x: 0.74, y: 0.62 },
  { id: 'north_ithilien', name: 'North Ithilien', nation: 'gondor', terrain: 'plains', settlement: 'none', x: 0.76, y: 0.49 },
  { id: 'dagorlad', name: 'Dagorlad', nation: null, terrain: 'wasteland', settlement: 'none', x: 0.82, y: 0.46 },
  { id: 'dead_marshes', name: 'Dead Marshes', nation: null, terrain: 'wasteland', settlement: 'none', x: 0.80, y: 0.55 },

  // ── Mordor (E) ───────────────────────────────────────────────────────────────────────
  { id: 'morannon', name: 'Morannon', nation: 'sauron', terrain: 'wasteland', settlement: 'town', x: 0.86, y: 0.50 },
  { id: 'gorgoroth', name: 'Gorgoroth', nation: 'sauron', terrain: 'wasteland', settlement: 'none', x: 0.90, y: 0.57 },
  { id: 'mount_doom', name: 'Mount Doom', nation: 'sauron', terrain: 'mountains', settlement: 'none', x: 0.95, y: 0.60 },
  { id: 'barad_dur', name: 'Barad-dur', nation: 'sauron', terrain: 'wasteland', settlement: 'stronghold', x: 0.92, y: 0.50 },
  { id: 'nurn', name: 'Nurn', nation: 'sauron', terrain: 'plains', settlement: 'town', x: 0.90, y: 0.68 },

  // ── Harad / South (S) ────────────────────────────────────────────────────────────────
  { id: 'south_gondor', name: 'South Gondor', nation: null, terrain: 'wasteland', settlement: 'none', x: 0.66, y: 0.80 },
  { id: 'umbar', name: 'Umbar', nation: 'southrons', terrain: 'plains', settlement: 'stronghold', coastal: true, x: 0.60, y: 0.88 },
  { id: 'near_harad', name: 'Near Harad', nation: 'southrons', terrain: 'wasteland', settlement: 'town', x: 0.74, y: 0.88 },
  { id: 'far_harad', name: 'Far Harad', nation: 'southrons', terrain: 'plains', settlement: 'city', coastal: true, x: 0.82, y: 0.95 },
  { id: 'khand', name: 'Khand', nation: 'southrons', terrain: 'wasteland', settlement: 'town', x: 0.88, y: 0.82 },
];

// Symmetric edge list (each pair listed once). CONFIRM against the board.
const EDGES: [string, string][] = [
  ['grey_havens', 'ered_luin'], ['grey_havens', 'the_shire'],
  ['ered_luin', 'the_shire'], ['ered_luin', 'north_downs'],
  ['the_shire', 'bree'], ['the_shire', 'north_downs'],
  ['north_downs', 'fornost'], ['north_downs', 'weather_hills'],
  ['fornost', 'weather_hills'], ['fornost', 'ettenmoors'],
  ['bree', 'weather_hills'], ['bree', 'trollshaws'],
  ['weather_hills', 'rivendell'], ['weather_hills', 'ettenmoors'],
  ['ettenmoors', 'angmar'], ['ettenmoors', 'mount_gundabad'],
  ['angmar', 'mount_gundabad'],
  ['rivendell', 'trollshaws'], ['rivendell', 'high_pass'],
  ['trollshaws', 'high_pass'], ['trollshaws', 'enedwaith'],
  ['enedwaith', 'north_dunland'], ['enedwaith', 'south_dunland'],
  ['high_pass', 'old_ford'], ['high_pass', 'gladden_fields'],
  ['mount_gundabad', 'old_ford'], ['mount_gundabad', 'woodland_realm'],
  ['old_ford', 'gladden_fields'], ['old_ford', 'woodland_realm'],
  ['gladden_fields', 'dimrill_dale'], ['gladden_fields', 'anduin'],
  ['woodland_realm', 'dale'], ['woodland_realm', 'southern_mirkwood'],
  ['dale', 'erebor'], ['erebor', 'iron_hills'], ['dale', 'iron_hills'],
  ['moria', 'high_pass'], ['moria', 'dimrill_dale'],
  ['dimrill_dale', 'lorien'], ['dimrill_dale', 'anduin'],
  ['lorien', 'anduin'], ['lorien', 'fangorn'],
  ['anduin', 'dol_guldur'], ['anduin', 'fangorn'],
  ['dol_guldur', 'southern_mirkwood'], ['dol_guldur', 'lorien'],
  ['fangorn', 'orthanc'], ['fangorn', 'fords_of_isen'], ['fangorn', 'gap_of_rohan'],
  ['orthanc', 'north_dunland'], ['orthanc', 'fords_of_isen'],
  ['north_dunland', 'south_dunland'], ['north_dunland', 'gap_of_rohan'],
  ['south_dunland', 'gap_of_rohan'], ['south_dunland', 'druwaith'],
  ['gap_of_rohan', 'fords_of_isen'], ['gap_of_rohan', 'helms_deep'],
  ['fords_of_isen', 'helms_deep'], ['fords_of_isen', 'edoras'],
  ['helms_deep', 'edoras'], ['helms_deep', 'druwaith'],
  ['edoras', 'minas_tirith'], ['edoras', 'druwaith'], ['edoras', 'lossarnach'],
  ['druwaith', 'dol_amroth'],
  ['minas_tirith', 'pelennor'], ['minas_tirith', 'lossarnach'],
  ['pelennor', 'osgiliath'], ['pelennor', 'north_ithilien'],
  ['osgiliath', 'minas_morgul'], ['osgiliath', 'south_ithilien'], ['osgiliath', 'north_ithilien'],
  ['lossarnach', 'pelargir'],
  ['pelargir', 'dol_amroth'], ['pelargir', 'south_gondor'],
  ['minas_morgul', 'south_ithilien'], ['minas_morgul', 'dead_marshes'],
  ['south_ithilien', 'north_ithilien'], ['south_ithilien', 'dead_marshes'],
  ['north_ithilien', 'dagorlad'], ['north_ithilien', 'dead_marshes'],
  ['dagorlad', 'dead_marshes'], ['dagorlad', 'morannon'],
  ['dead_marshes', 'morannon'],
  ['morannon', 'gorgoroth'], ['morannon', 'barad_dur'],
  ['gorgoroth', 'mount_doom'], ['gorgoroth', 'barad_dur'], ['gorgoroth', 'nurn'],
  ['barad_dur', 'nurn'],
  ['south_gondor', 'umbar'], ['south_gondor', 'near_harad'],
  ['umbar', 'near_harad'], ['umbar', 'far_harad'],
  ['near_harad', 'far_harad'], ['near_harad', 'khand'],
  ['khand', 'nurn'],
];

function buildRegions(): Record<string, Region> {
  const adj: Record<string, Set<string>> = {};
  for (const d of DEFS) adj[d.id] = new Set();
  for (const [a, b] of EDGES) {
    if (!adj[a] || !adj[b]) continue; // tolerate any stray edge
    adj[a].add(b);
    adj[b].add(a);
  }
  const out: Record<string, Region> = {};
  for (const d of DEFS) {
    out[d.id] = {
      id: d.id,
      name: d.name,
      nation: d.nation,
      terrain: d.terrain,
      settlement: d.settlement,
      vp: vpOf(d.settlement),
      coastal: !!d.coastal,
      adjacency: [...adj[d.id]].sort(),
    };
  }
  return out;
}

export const REGIONS: Record<string, Region> = buildRegions();
export const REGION_IDS: string[] = Object.keys(REGIONS);
export const REGION_POS: Record<string, { x: number; y: number }> = Object.fromEntries(
  DEFS.map((d) => [d.id, { x: d.x, y: d.y }]),
);

export function region(id: string): Region {
  const r = REGIONS[id];
  if (!r) throw new Error(`unknown region ${id}`);
  return r;
}

export function adjacent(a: string, b: string): boolean {
  return REGIONS[a]?.adjacency.includes(b) ?? false;
}

/** Mordor entry regions: the Ring-bearers enter the Mordor track here. */
export const MORDOR_ENTRY = ['minas_morgul', 'morannon'];
