// Phase 3 — Working 9-to-5 action application (effects only; the chooser is the AI/UI).
// Production, drink-buying (errand boy + route buyers), restaurant placement, house/garden placement.

import { EMPLOYEES } from './data/employees';
import { chainDistance, parseTile, roadNeighbours, tileDistance } from './map';
import { DRINKS, emptyGoods, type Company, type GameState, type Product, type TileId } from './types';

function cardAtWork(c: Company, uid: number) {
  const card = c.cards.find((x) => x.uid === uid);
  return card && card.atWork ? card : undefined;
}

function tileOccupied(state: GameState, tile: TileId): boolean {
  if (state.map.houses.some((h) => h.tile === tile)) return true;
  if (state.map.drinkSources.some((d) => d.tile === tile)) return true;
  for (const co of state.companies) {
    if (co.restaurants.includes(tile) || co.pendingRestaurants.includes(tile)) return true;
  }
  return false;
}

/** Kitchen card → food into stock. `choose` applies to the kitchen trainee (burger or pizza). */
export function produce(c: Company, uid: number, choose: Product = 'burger'): boolean {
  const card = cardAtWork(c, uid);
  if (!card) return false;
  const p = EMPLOYEES[card.defId].produce;
  if (!p) return false;
  if (p.burger) c.stock.burger += p.burger;
  if (p.pizza) c.stock.pizza += p.pizza;
  if (p.choose) {
    if (choose !== 'burger' && choose !== 'pizza') return false;
    c.stock[choose] += p.choose;
  }
  return true;
}

/** Errand Boy → take 1 drink of choice (+1 with the "First errand boy" milestone). */
export function buyErrand(c: Company, uid: number, drink: Product): boolean {
  const card = cardAtWork(c, uid);
  if (!card || EMPLOYEES[card.defId].id !== 'errand-boy' || !DRINKS.includes(drink)) return false;
  c.stock[drink] += 1 + (c.errandBoyBonus ? 1 : 0);
  return true;
}

/**
 * Route buyer (cart/truck/zeppelin): from a restaurant entrance, trace up to `range` tiles and
 * collect `perSource` drinks for each drink source encountered (+ milestone bonuses). M3 geometry,
 * simplified to "every drink source within range (by road, or any tile if it ignores roads)".
 */
export function buyRoute(state: GameState, c: Company, uid: number): number {
  const card = cardAtWork(c, uid);
  if (!card) return 0;
  const def = EMPLOYEES[card.defId];
  if (!def.buy || def.buy.range === 0) return 0;
  const range = def.buy.range + c.buyerRangeBonus;
  const per = def.buy.perSource + (c.errandBoyBonus ? 1 : 0);
  let collected = 0;
  for (const src of state.map.drinkSources) {
    let reachable = false;
    if (def.buy.ignoreRoads) {
      // zeppelin: Chebyshev tile distance, ignoring roads
      const best = c.restaurants.reduce((m, r) => {
        const a = parseTile(r);
        const b = parseTile(src.tile);
        return Math.min(m, Math.max(Math.abs(a.row - b.row), Math.abs(a.col - b.col)));
      }, Infinity);
      reachable = best <= range;
    } else {
      const d = chainDistance(state.map, c.restaurants, src.tile);
      reachable = d !== null && d <= range;
    }
    if (reachable) {
      c.stock[src.drink] += per;
      collected += per;
    }
  }
  return collected;
}

/** Local (COMING SOON, within range 3) / Regional (anywhere, opens now) restaurant placement. */
export function placeRestaurant(state: GameState, c: Company, uid: number, tile: TileId): boolean {
  const card = cardAtWork(c, uid);
  if (!card) return false;
  const kind = EMPLOYEES[card.defId].restaurant;
  if (!kind || tileOccupied(state, tile)) return false;
  if (kind === 'local') {
    const reach = c.restaurants.some((r) => {
      const d = tileDistance(state.map, r, tile);
      return d !== null && d <= 3;
    });
    if (!reach) return false;
    c.pendingRestaurants.push(tile);
  } else {
    c.restaurants.push(tile); // regional: opens immediately
  }
  return true;
}

/** New Business Developer → place a new (road-connected) house, or add a garden to a house. */
export function placeHouse(state: GameState, c: Company, uid: number, tile: TileId): boolean {
  const card = cardAtWork(c, uid);
  if (!card || !EMPLOYEES[card.defId].developer || tileOccupied(state, tile)) return false;
  if (roadNeighbours(state.map, tile).length === 0) return false;
  const id = (state.map.houses.reduce((m, h) => Math.max(m, h.id), 0) || 0) + 1;
  state.map.houses.push({ id, tile, garden: true, demand: emptyGoods() }); // developer houses come with a garden
  return true;
}

export function addGarden(state: GameState, c: Company, uid: number, houseId: number): boolean {
  const card = cardAtWork(c, uid);
  if (!card || !EMPLOYEES[card.defId].developer) return false;
  const house = state.map.houses.find((h) => h.id === houseId);
  if (!house || house.garden) return false;
  house.garden = true;
  return true;
}
