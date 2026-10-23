// Phase 3 (place) + Phase 6 (resolve) marketing.
//
// Marketeers place campaigns that seed product demand on houses in a footprint over several turns:
//   billboard — houses on/orthogonally-adjacent to the tile
//   mailbox   — the local "block" (approximated at tile level as the tile + orthogonal neighbours)
//   radio     — the tile + the 8 surrounding tiles (3×3)
//   airplane  — a band of 1/3/5 full rows or columns from a board edge
// House demand caps at 3 tokens (5 with a garden). A "First radio" owner's radio places 2 tokens.
// (Tile-level note: mailbox's exact square geometry is approximated — see 06-card-reference §9 / README.)

import { EMPLOYEES, canPlace } from './data/employees';
import { parseTile, tileId } from './map';
import { totalGoods, type CampaignType, type Company, type GameState, type House, type Product, type TileId } from './types';

export interface CampaignOpts {
  tile: TileId; // origin tile (or row/col anchor for airplanes)
  axis?: 'row' | 'col';
  span?: 1 | 3 | 5;
}

/** Place a marketing campaign with an at-work marketeer. Returns the piece id, or null if illegal. */
export function placeCampaign(
  state: GameState,
  c: Company,
  uid: number,
  type: CampaignType,
  product: Product,
  opts: CampaignOpts,
): number | null {
  const card = c.cards.find((x) => x.uid === uid);
  if (!card || !card.atWork) return null;
  const m = EMPLOYEES[card.defId].marketeer;
  if (!m || !canPlace(m.type, type)) return null;

  const eternal = c.eternalMarketing;
  const id = state.nextMarketingId++;
  state.marketing.push({
    id,
    type,
    product,
    ownerId: c.id,
    tile: opts.tile,
    axis: type === 'airplane' ? opts.axis ?? 'row' : undefined,
    span: type === 'airplane' ? opts.span ?? 1 : undefined,
    turnsLeft: eternal ? 999 : m.maxDuration,
    eternal,
  });
  card.busy = eternal ? 999 : m.maxDuration; // unavailable while the campaign runs
  return id;
}

function ortho(tile: TileId): TileId[] {
  const { row, col } = parseTile(tile);
  return [tileId(row - 1, col), tileId(row + 1, col), tileId(row, col - 1), tileId(row, col + 1)];
}

/** The houses a campaign reaches. */
export function footprintHouses(state: GameState, piece: GameState['marketing'][number]): House[] {
  const { houses } = state.map;
  if (piece.type === 'airplane') {
    const a = parseTile(piece.tile);
    const span = piece.span ?? 1;
    return houses.filter((h) => {
      const p = parseTile(h.tile);
      return piece.axis === 'col'
        ? p.col >= a.col && p.col < a.col + span
        : p.row >= a.row && p.row < a.row + span;
    });
  }
  if (piece.type === 'radio') {
    const a = parseTile(piece.tile);
    return houses.filter((h) => {
      const p = parseTile(h.tile);
      return Math.abs(p.row - a.row) <= 1 && Math.abs(p.col - a.col) <= 1;
    });
  }
  // billboard + mailbox: the tile + orthogonal neighbours
  const tiles = new Set<TileId>([piece.tile, ...ortho(piece.tile)]);
  return houses.filter((h) => tiles.has(h.tile));
}

/** Phase 6 — run every campaign (lowest id first), seeding demand within the cap. */
export function resolveMarketing(state: GameState): void {
  const byId = [...state.marketing].sort((a, b) => a.id - b.id);
  for (const piece of byId) {
    const owner = state.companies[piece.ownerId];
    const amount = piece.type === 'radio' && owner.radioDouble ? 2 : 1;
    for (const house of footprintHouses(state, piece)) {
      const cap = house.garden ? 5 : 3;
      const room = cap - totalGoods(house.demand);
      if (room > 0) house.demand[piece.product] += Math.min(amount, room);
    }
  }
}
