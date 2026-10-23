// Initial game state from { players, seed, seats }.
//
// Board: a grid of tiles scaled by player count (2p 3×3, 3p 3×4, 4p 4×4 — 5p out of MVP scope), a
// full road grid, scattered numbered houses (some with gardens) and printed drink sources. Per the
// spec the MVP procedurally generates rules-legal tiles rather than reproducing Splotter's 20 (the
// real board is randomly assembled anyway). Each company starts with a CEO + one open restaurant.

import { addRoad, tileId } from './map';
import { jobMarketCounts } from './data/employees';
import { makeRng } from './rng';
import {
  DRINKS,
  emptyGoods,
  type Company,
  type GameConfig,
  type GameMap,
  type GameState,
  type Product,
  type TileId,
} from './types';

export function mapSize(players: number): { rows: number; cols: number } {
  if (players <= 2) return { rows: 3, cols: 3 };
  if (players === 3) return { rows: 3, cols: 4 };
  return { rows: 4, cols: 4 };
}

function newCompany(
  id: number,
  kind: 'human' | 'ai',
  aiProfile: string | undefined,
  ceoUid: number,
  restaurant: TileId,
): Company {
  return {
    id,
    name: `Company ${id + 1}`,
    kind,
    aiProfile,
    cash: 0,
    restaurants: [restaurant],
    pendingRestaurants: [],
    stock: emptyGoods(),
    cards: [{ uid: ceoUid, defId: 'ceo', atWork: true }],
    pricing: { price: 0, discount: 0, luxury: 0 },
    waitresses: 0,
    cfo: false,
    salaryDue: 0,
    reserve: 100,
    lowerPrices: false,
    waitressMilestone: false,
    burgerBonus: false,
    pizzaBonus: false,
    drinkBonus: false,
    freezer: false,
    eternalMarketing: false,
    buyerRangeBonus: 0,
    errandBoyBonus: false,
    salaryDiscount: 0,
    ceoIsCfo: false,
    ceoIsCfoPending: false,
    airplaneSlots: 0,
    radioDouble: false,
    stackTrainers: false,
    hireMilestoneCount: 0,
  };
}

export function createGame(config: GameConfig): GameState {
  const rng = makeRng(config.seed);
  const { rows, cols } = mapSize(config.players);

  const map: GameMap = { rows, cols, roads: new Set(), houses: [], drinkSources: [] };
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (r + 1 < rows) addRoad(map, tileId(r, c), tileId(r + 1, c));
      if (c + 1 < cols) addRoad(map, tileId(r, c), tileId(r, c + 1));
    }
  }

  const corners = [tileId(0, 0), tileId(rows - 1, cols - 1), tileId(0, cols - 1), tileId(rows - 1, 0)];
  const restaurantTiles = corners.slice(0, config.players);

  let houseN = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const t = tileId(r, c);
      if (restaurantTiles.includes(t)) continue;
      const roll = rng.next();
      if ((r + c) % 2 === 0 || roll < 0.35) {
        houseN += 1;
        map.houses.push({ id: houseN, tile: t, garden: houseN % 3 === 0, demand: emptyGoods() });
      } else if (roll < 0.7) {
        const drink = DRINKS[rng.int(DRINKS.length)] as Product;
        map.drinkSources.push({ tile: t, drink });
      }
    }
  }

  let uid = 1;
  const companies: Company[] = [];
  for (let i = 0; i < config.players; i++) {
    const seat = config.seats?.[i];
    companies.push(newCompany(i, seat?.kind ?? 'human', seat?.aiProfile, uid++, restaurantTiles[i]));
  }

  return {
    config,
    rngState: rng.state(),
    turn: 1,
    phase: 'restructuring',
    bank: 50 * config.players,
    bankBreaks: 0,
    endAfterPhase: false,
    companies,
    map,
    jobMarket: jobMarketCounts(config.players),
    marketing: [],
    nextMarketingId: 1,
    nextCardUid: uid,
    milestones: {},
    lockedMilestones: [],
    turnOrder: companies.map((c) => c.id),
    winner: null,
    ended: false,
    log: [],
  };
}
