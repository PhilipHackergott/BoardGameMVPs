// CONFIRM (counts): the Hunt tile pool. 16 standard (beige) tiles — values 0–3 = Corruption
// damage, some bearing a Reveal icon; plus Eye tiles whose damage = number of successes rolled.
// Special tiles (blue = Fellowship, red = Shadow) are set aside and enter only via Event cards.
// Exact per-value counts/reveals are CONFIRM (read off the tiles) — parameterized for a one-line fix.

import type { HuntTile } from '../types';

export function makeStandardHuntPool(): HuntTile[] {
  let n = 0;
  const tile = (kind: HuntTile['kind'], value: number, reveal: boolean): HuntTile => ({
    id: `hunt_${n++}`,
    kind,
    value,
    reveal,
  });
  return [
    tile('number', 0, true),
    tile('number', 0, false),
    tile('number', 1, false),
    tile('number', 1, false),
    tile('number', 1, true),
    tile('number', 1, true),
    tile('number', 2, false),
    tile('number', 2, true),
    tile('number', 2, true),
    tile('number', 3, true),
    tile('number', 3, true),
    tile('eye', 0, false),
    tile('eye', 0, false),
    tile('eye', 0, false),
    tile('eye', 0, false),
    tile('eye', 0, false),
  ];
}

// Special tiles enter via Event cards (Card sourcing). Summarized for the MVP — they sit in the
// reserve and are referenced by their cards' real text.
export function makeReserveHuntTiles(): HuntTile[] {
  return [
    { id: 'sp_elven_cloak', kind: 'number', value: 0, reveal: false, special: 'fp' },
    { id: 'sp_elven_rope', kind: 'number', value: 0, reveal: false, special: 'fp' },
    { id: 'sp_phial', kind: 'number', value: 0, reveal: false, special: 'fp' },
    { id: 'sp_smeagol', kind: 'number', value: 0, reveal: false, special: 'fp' },
    { id: 'sp_shelob', kind: 'eye', value: 0, reveal: true, special: 'shadow' },
    { id: 'sp_ring_is_mine', kind: 'number', value: 3, reveal: true, special: 'shadow' },
    { id: 'sp_on_they_went', kind: 'number', value: 2, reveal: true, special: 'shadow' },
    { id: 'sp_give_it_to_uss', kind: 'number', value: 1, reveal: true, special: 'shadow' },
  ];
}
