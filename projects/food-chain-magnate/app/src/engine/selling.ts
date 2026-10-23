// Phase 4 — Dinnertime. THE HEART of the game, and the most exacting rule.
//
// For each house (in house-number order) that has demand:
//   • Qualifying chains = those road-connected to the house that can serve the FULL order from stock.
//   • Each qualifier's score = effectiveUnitPrice + distance (distance = closest restaurant, tiles).
//   • Lowest score wins. Tie → most waitresses → earliest in turn order.
//   • The winner sells every demanded item: per item = unitPrice (×2 if the house has a garden)
//     + per-item milestone bonus (NOT doubled). Stock is consumed; cash is paid from the bank.
// After all houses: each chain earns its waitress income ($3, or $5 with the milestone), then any
// chain with a CFO earns +50% of all cash earned this turn (rounded up). All from the bank.
//
// Returns a new state plus a step-by-step report (the data the Dinnertime "why" UI will replay).

import type { Company, CompanyId, GameState, Goods, House, Product } from './types';
import { DRINKS, PRODUCTS, totalGoods } from './types';
import { effectiveUnitPrice } from './pricing';
import { chainDistance } from './map';
import { payFromBank } from './bank';

export interface Candidate {
  companyId: CompanyId;
  unitPrice: number;
  distance: number;
  score: number; // unitPrice + distance
}

export interface Disqualified {
  companyId: CompanyId;
  reason: 'unreachable' | 'cannot-serve-full-order';
}

export interface HouseResolution {
  houseId: number;
  tile: string;
  demand: Goods;
  garden: boolean;
  candidates: Candidate[]; // qualifying chains, sorted best-first
  disqualified: Disqualified[]; // chains that wanted in but couldn't (with why)
  winner: CompanyId | null; // null = nobody could serve / reach it
  tieBreak: 'waitresses' | 'turnOrder' | null;
  itemsSold: number;
  salePayout: number; // cash from this one house's sale (pre waitress/CFO)
  unitPrice: number | null; // the winner's unit price applied
}

export interface DinnertimeReport {
  houses: HouseResolution[];
  waitressIncome: Record<CompanyId, number>;
  cfoBonus: Record<CompanyId, number>;
  earned: Record<CompanyId, number>; // total cash earned this Dinnertime, per company
  breaksAfter: 0 | 1 | 2;
}

function canServe(c: Company, demand: Goods): boolean {
  return PRODUCTS.every((p) => c.stock[p] >= demand[p]);
}

function perItemBonus(c: Company, p: Product): number {
  if (p === 'burger' && c.burgerBonus) return 5;
  if (p === 'pizza' && c.pizzaBonus) return 5;
  if (DRINKS.includes(p) && c.drinkBonus) return 5;
  return 0;
}

function resolveHouse(s: GameState, house: House, earned: Record<CompanyId, number>): HouseResolution {
  const orderIndex = new Map<CompanyId, number>(s.turnOrder.map((id, i) => [id, i]));
  const candidates: Candidate[] = [];
  const disqualified: Disqualified[] = [];
  for (const id of s.turnOrder) {
    const c = s.companies[id];
    if (c.restaurants.length === 0) continue; // not in the running at all
    const serves = canServe(c, house.demand);
    const distance = chainDistance(s.map, c.restaurants, house.tile);
    if (!serves) {
      disqualified.push({ companyId: id, reason: 'cannot-serve-full-order' });
      continue;
    }
    if (distance === null) {
      disqualified.push({ companyId: id, reason: 'unreachable' });
      continue;
    }
    const unitPrice = effectiveUnitPrice(c);
    candidates.push({ companyId: id, unitPrice, distance, score: unitPrice + distance });
  }
  candidates.sort(
    (a, b) =>
      a.score - b.score ||
      s.companies[b.companyId].waitresses - s.companies[a.companyId].waitresses ||
      orderIndex.get(a.companyId)! - orderIndex.get(b.companyId)!,
  );

  const res: HouseResolution = {
    houseId: house.id,
    tile: house.tile,
    demand: { ...house.demand },
    garden: house.garden,
    candidates,
    disqualified,
    winner: null,
    tieBreak: null,
    itemsSold: 0,
    salePayout: 0,
    unitPrice: null,
  };
  if (candidates.length === 0) return res;

  const win = candidates[0];
  res.winner = win.companyId;
  // tie-break diagnostics: was more than one chain on the winning score?
  const tied = candidates.filter((c) => c.score === win.score);
  if (tied.length > 1) {
    const topW = s.companies[win.companyId].waitresses;
    res.tieBreak = tied.some((c) => s.companies[c.companyId].waitresses !== topW) ? 'waitresses' : 'turnOrder';
  }

  const winner = s.companies[win.companyId];
  let payout = 0;
  let items = 0;
  for (const p of PRODUCTS) {
    const q = house.demand[p];
    if (q <= 0) continue;
    const unit = win.unitPrice * (house.garden ? 2 : 1) + perItemBonus(winner, p);
    payout += q * unit;
    items += q;
    winner.stock[p] -= q;
  }
  house.demand = { burger: 0, pizza: 0, soda: 0, lemonade: 0, beer: 0 };
  res.itemsSold = items;
  res.salePayout = payout;
  res.unitPrice = win.unitPrice;
  payFromBank(s, win.companyId, payout);
  earned[win.companyId] += payout;
  return res;
}

export function resolveDinnertime(state: GameState): { state: GameState; report: DinnertimeReport } {
  const s = structuredClone(state) as GameState;
  const earned: Record<CompanyId, number> = {};
  for (const c of s.companies) earned[c.id] = 0;

  const houses = [...s.map.houses].sort((a, b) => a.id - b.id);
  const resolutions: HouseResolution[] = [];
  for (const house of houses) {
    if (totalGoods(house.demand) === 0) continue;
    resolutions.push(resolveHouse(s, house, earned));
  }

  // Waitress income (after all houses): $3 each, or $5 with the "First waitress played" milestone.
  const waitressIncome: Record<CompanyId, number> = {};
  for (const c of s.companies) {
    const inc = c.waitresses * (c.waitressMilestone ? 5 : 3);
    waitressIncome[c.id] = inc;
    if (inc > 0) {
      payFromBank(s, c.id, inc);
      earned[c.id] += inc;
    }
  }

  // CFO: +50% (rounded up) of all cash earned this turn, including waitress tips.
  const cfoBonus: Record<CompanyId, number> = {};
  for (const c of s.companies) {
    const bonus = c.cfo ? Math.ceil(earned[c.id] * 0.5) : 0;
    cfoBonus[c.id] = bonus;
    if (bonus > 0) {
      payFromBank(s, c.id, bonus);
      earned[c.id] += bonus;
    }
  }

  return { state: s, report: { houses: resolutions, waitressIncome, cfoBonus, earned, breaksAfter: s.bankBreaks } };
}
