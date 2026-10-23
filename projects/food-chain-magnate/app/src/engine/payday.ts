// Phase 5 — Payday. $5 per salaried card OWNED (structure or beach), minus milestone discounts
// (derived into salaryDue) and minus the RECRUITING discount: every recruiting-manager (2 actions)
// / HR-director (4 actions) action NOT used to hire this turn gives a $5 salary discount (rulebook
// phase 5; the recruiting girl's and the CEO's free recruit actions do NOT count). Wages go back to
// the bank; min payable is $0; salaries are skipped entirely on the turn the 2nd break fired.

import type { Company, GameState } from './types';

/** $5 per unused recruiting-manager / HR-director action this turn. */
export function recruitingDiscount(c: Company): number {
  const atWork = c.cards.filter((x) => x.atWork);
  const girls = atWork.filter((x) => x.defId === 'recruiting-girl').length;
  const managerCapacity = atWork.reduce(
    (s, x) => s + (x.defId === 'recruiting-mgr' ? 2 : x.defId === 'hr-director' ? 4 : 0),
    0,
  );
  const baseFree = 1 + girls; // CEO (1) + recruiting girls — these don't convert to discounts
  const usedManagerActions = Math.max(0, c.hireMilestoneCount - baseFree);
  const unused = Math.max(0, managerCapacity - usedManagerActions);
  return 5 * unused;
}

/** Salary actually owed after all discounts (min $0). */
export function effectiveSalary(c: Company): number {
  return Math.max(0, c.salaryDue - recruitingDiscount(c));
}

export function payday(state: GameState): GameState {
  const s = structuredClone(state) as GameState;
  if (s.endAfterPhase) return s; // 2nd break this turn → skip salaries
  for (const c of s.companies) {
    const pay = Math.min(effectiveSalary(c), Math.max(0, c.cash));
    c.cash -= pay;
    s.bank += pay;
  }
  return s;
}
