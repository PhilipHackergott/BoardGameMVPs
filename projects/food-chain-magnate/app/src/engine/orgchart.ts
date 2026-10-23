// The company org chart (capacity model) + the per-turn derive of economic fields.
//
// Structure rules (rulebook): CEO has 3 report slots; managers (black cards) have 2–10; cards under
// a manager must be normal staff (managers report only to the CEO). So the tree is ≤3 deep and what
// matters mechanically is (a) does the at-work set fit, and (b) how many slots are left open. We
// model that as a capacity check rather than an explicit tree (the UI builds a canonical tree for
// display). Legal iff: managers ≤ 3 AND (cards − 1) ≤ slotsProvided, where slotsProvided = 3 (CEO)
// + Σ(manager slots). Open slots = slotsProvided − (cards − 1), plus the "First airplane" bonus.

import { EMPLOYEES, isManager } from './data/employees';
import type { Company } from './types';

export function managerSlots(defId: string): number {
  return isManager(defId) ? EMPLOYEES[defId].slots ?? 0 : 0;
}

export function slotsProvided(atWorkDefIds: readonly string[]): number {
  return 3 + atWorkDefIds.reduce((s, id) => s + managerSlots(id), 0);
}

/** Is an at-work set (which must include the CEO) a legal company structure? */
export function arrangementLegal(atWorkDefIds: readonly string[]): boolean {
  if (!atWorkDefIds.includes('ceo')) return false;
  const managers = atWorkDefIds.filter(isManager).length;
  if (managers > 3) return false;
  const used = atWorkDefIds.length - 1; // every card except the CEO occupies a slot
  return used <= slotsProvided(atWorkDefIds);
}

export function atWorkDefIds(c: Company): string[] {
  return c.cards.filter((x) => x.atWork).map((x) => x.defId);
}

/** Open slots for Order of Business (includes the "First airplane campaign" +2 bonus). */
export function openSlots(c: Company): number {
  const ids = atWorkDefIds(c);
  const structural = Math.max(0, slotsProvided(ids) - (ids.length - 1));
  return structural + c.airplaneSlots;
}

/** Recompute the per-turn economic fields a company exposes to Dinnertime / Payday. */
export function derive(c: Company): void {
  const atWork = c.cards.filter((x) => x.atWork).map((x) => EMPLOYEES[x.defId]);
  c.pricing = {
    price: atWork.filter((e) => e.id === 'pricing-mgr').length,
    discount: atWork.filter((e) => e.id === 'discount-mgr').length,
    luxury: atWork.filter((e) => e.id === 'luxuries-mgr').length,
  };
  c.waitresses = atWork.filter((e) => e.waitress).length;
  c.cfo = c.ceoIsCfo || atWork.some((e) => e.cfo);

  // Salary: $5 per salaried card OWNED (at work or on the beach), minus milestone discounts.
  let salaried = c.cards.filter((x) => EMPLOYEES[x.defId].salaried);
  if (c.eternalMarketing) salaried = salaried.filter((x) => EMPLOYEES[x.defId].track !== 'marketing');
  c.salaryDue = Math.max(0, salaried.length * 5 - c.salaryDiscount);
}
