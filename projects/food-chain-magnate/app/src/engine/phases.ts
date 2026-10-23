// The 7-phase turn machine — building blocks (the full-turn orchestration with a policy lives in
// sim.ts). Phases: Restructuring · Order of Business · Working · Dinnertime · Payday · Marketing ·
// Clean-up.

import { derive, openSlots } from './orgchart';
import { checkThrowawayMilestone } from './milestones';
import { emptyGoods, PRODUCTS, totalGoods, type Company, type CompanyId, type GameState } from './types';

/** Set which owned cards are "at work" this turn (the CEO is always at work). */
export function setAtWork(c: Company, uids: readonly number[]): void {
  const set = new Set(uids);
  for (const card of c.cards) card.atWork = set.has(card.uid) || card.defId === 'ceo';
}

export function deriveAll(state: GameState): void {
  for (const c of state.companies) derive(c);
}

/** Phase 2 — Order of Business: most open slots acts first; ties → earlier in the previous order. */
export function computeTurnOrder(state: GameState): CompanyId[] {
  const prev = state.turnOrder;
  return state.companies
    .map((c) => c.id)
    .sort((a, b) => {
      const diff = openSlots(state.companies[b]) - openSlots(state.companies[a]);
      return diff !== 0 ? diff : prev.indexOf(a) - prev.indexOf(b);
    });
}

/** Phase 7 — Clean-up: discard unsold goods (unless a freezer keeps ≤10), un-work cards, open
 *  COMING-SOON restaurants, tick marketing durations, lock milestones claimed this turn. */
export function cleanup(state: GameState): void {
  for (const c of state.companies) {
    if (!c.freezer) {
      if (totalGoods(c.stock) > 0) checkThrowawayMilestone(state, c, true); // claims → freezer next turn
      c.stock = emptyGoods();
    } else {
      let total = totalGoods(c.stock);
      while (total > 10) {
        for (const p of PRODUCTS) {
          if (c.stock[p] > 0) {
            c.stock[p] -= 1;
            total -= 1;
            if (total <= 10) break;
          }
        }
      }
    }
    for (const card of c.cards) {
      card.atWork = false;
      if (card.busy) {
        card.busy -= 1;
        if (card.busy <= 0) delete card.busy;
      }
    }
    if (c.pendingRestaurants.length) {
      c.restaurants.push(...c.pendingRestaurants);
      c.pendingRestaurants = [];
    }
    c.hireMilestoneCount = 0;
    if (c.ceoIsCfoPending) {
      c.ceoIsCfo = true;
      c.ceoIsCfoPending = false;
    }
  }

  // tick marketing durations; eternal campaigns persist
  state.marketing = state.marketing.filter((m) => {
    if (m.eternal) return true;
    m.turnsLeft -= 1;
    return m.turnsLeft > 0;
  });

  // milestones claimed this turn become locked (unavailable) from now on
  for (const [id, claimers] of Object.entries(state.milestones)) {
    if (claimers.length > 0 && !state.lockedMilestones.includes(id)) {
      state.lockedMilestones.push(id);
    }
  }
}
