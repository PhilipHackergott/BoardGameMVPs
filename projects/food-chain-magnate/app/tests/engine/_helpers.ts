// Shared builders for the engine tests. (Not a *.test.ts file, so vitest won't run it directly.)
import {
  addRoad,
  emptyGoods,
  type Company,
  type GameMap,
  type GameState,
  type Goods,
  type House,
  type TileId,
} from '../../src/engine';

export function mkCompany(id: number, o: Partial<Company> = {}): Company {
  return {
    id,
    name: o.name ?? `C${id}`,
    kind: o.kind ?? 'human',
    aiProfile: o.aiProfile,
    cash: o.cash ?? 0,
    restaurants: o.restaurants ?? ['0,0'],
    pendingRestaurants: o.pendingRestaurants ?? [],
    stock: o.stock ?? emptyGoods(),
    cards: o.cards ?? [{ uid: 1000 + id, defId: 'ceo', atWork: true }],
    pricing: o.pricing ?? { price: 0, discount: 0, luxury: 0 },
    waitresses: o.waitresses ?? 0,
    cfo: o.cfo ?? false,
    salaryDue: o.salaryDue ?? 0,
    reserve: o.reserve ?? 100,
    lowerPrices: o.lowerPrices ?? false,
    waitressMilestone: o.waitressMilestone ?? false,
    burgerBonus: o.burgerBonus ?? false,
    pizzaBonus: o.pizzaBonus ?? false,
    drinkBonus: o.drinkBonus ?? false,
    freezer: o.freezer ?? false,
    eternalMarketing: o.eternalMarketing ?? false,
    buyerRangeBonus: o.buyerRangeBonus ?? 0,
    errandBoyBonus: o.errandBoyBonus ?? false,
    salaryDiscount: o.salaryDiscount ?? 0,
    ceoIsCfo: o.ceoIsCfo ?? false,
    ceoIsCfoPending: o.ceoIsCfoPending ?? false,
    airplaneSlots: o.airplaneSlots ?? 0,
    radioDouble: o.radioDouble ?? false,
    stackTrainers: o.stackTrainers ?? false,
    hireMilestoneCount: o.hireMilestoneCount ?? 0,
  };
}

export function mkHouse(id: number, tile: TileId, demand: Goods, garden = false): House {
  return { id, tile, garden, demand };
}

export function mkState(
  companies: Company[],
  houses: House[],
  opts: { bank?: number; roads?: [TileId, TileId][]; rows?: number; cols?: number } = {},
): GameState {
  const map: GameMap = {
    rows: opts.rows ?? 5,
    cols: opts.cols ?? 5,
    roads: new Set(),
    houses,
    drinkSources: [],
  };
  for (const [a, b] of opts.roads ?? []) addRoad(map, a, b);
  return {
    config: { players: companies.length, seed: 1 },
    rngState: 1,
    turn: 1,
    phase: 'dinnertime',
    bank: opts.bank ?? 100000,
    bankBreaks: 0,
    endAfterPhase: false,
    companies,
    map,
    jobMarket: {},
    marketing: [],
    nextMarketingId: 1,
    nextCardUid: 1,
    milestones: {},
    lockedMilestones: [],
    turnOrder: companies.map((c) => c.id),
    winner: null,
    ended: false,
    log: [],
  };
}
