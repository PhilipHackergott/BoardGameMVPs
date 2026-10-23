// Tile-level map model + distance.
//
// FCM measures Dinnertime distance as "the number of tile borders you cross" along a road from a
// restaurant entrance to a house (same tile + road-connected = 0). So we model the board as a graph
// of TILES connected by road edges and take the BFS shortest path (edge count) as the distance.
//
// M1 scope: this tile-graph captures the distance + road-connectivity that the sell loop needs.
// The finer square-level road geometry (which the mailbox/billboard footprints in M3 and the board
// render in M5 will need) layers on later without changing this distance contract.

import type { GameMap, TileId } from './types';

export function tileId(row: number, col: number): TileId {
  return `${row},${col}`;
}

export function parseTile(id: TileId): { row: number; col: number } {
  const [r, c] = id.split(',').map(Number);
  return { row: r, col: c };
}

/** Canonical undirected edge key so "a|b" === "b|a". */
export function edgeKey(a: TileId, b: TileId): string {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

export function addRoad(map: GameMap, a: TileId, b: TileId): void {
  map.roads.add(edgeKey(a, b));
}

export function hasRoad(map: GameMap, a: TileId, b: TileId): boolean {
  return map.roads.has(edgeKey(a, b));
}

/** Orthogonal neighbours of a tile that are connected to it by a road. */
export function roadNeighbours(map: GameMap, id: TileId): TileId[] {
  const { row, col } = parseTile(id);
  const out: TileId[] = [];
  for (const [dr, dc] of [
    [-1, 0],
    [1, 0],
    [0, -1],
    [0, 1],
  ] as const) {
    const r = row + dr;
    const c = col + dc;
    if (r < 0 || c < 0 || r >= map.rows || c >= map.cols) continue;
    const nb = tileId(r, c);
    if (hasRoad(map, id, nb)) out.push(nb);
  }
  return out;
}

/**
 * Tile-border distance along roads from `from` to `to` (BFS edge count).
 * Returns null if there is no road path (the chain cannot reach the house).
 */
export function tileDistance(map: GameMap, from: TileId, to: TileId): number | null {
  if (from === to) return 0;
  const seen = new Set<TileId>([from]);
  let frontier: TileId[] = [from];
  let dist = 0;
  while (frontier.length) {
    dist += 1;
    const next: TileId[] = [];
    for (const t of frontier) {
      for (const nb of roadNeighbours(map, t)) {
        if (nb === to) return dist;
        if (!seen.has(nb)) {
          seen.add(nb);
          next.push(nb);
        }
      }
    }
    frontier = next;
  }
  return null;
}

/**
 * Distance from a chain (its set of restaurant entrance tiles) to a house tile = the minimum over
 * the chain's restaurants. Returns null if no restaurant is road-connected to the house.
 */
export function chainDistance(map: GameMap, restaurants: readonly TileId[], houseTile: TileId): number | null {
  let best: number | null = null;
  for (const r of restaurants) {
    const d = tileDistance(map, r, houseTile);
    if (d === null) continue;
    if (best === null || d < best) best = d;
  }
  return best;
}
