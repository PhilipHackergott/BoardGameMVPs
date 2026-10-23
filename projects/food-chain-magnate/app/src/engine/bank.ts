// The bank + the two-break end condition.
//
// Rulebook: the bank starts with $50 × players. When a Dinnertime payout can't be covered, the bank
// "breaks". 1st break: reveal the chosen reserve cards and add their total to the bank. 2nd break:
// the game ends at the end of this Dinnertime; finish paying everyone (writing IOUs if needed) and
// pay NO salaries this turn. The richest player wins (tie → earlier in turn order).

import type { GameState, CompanyId } from './types';

export function startingBank(players: number): number {
  return 50 * players;
}

export function reserveTotal(s: GameState): number {
  return s.companies.reduce((sum, c) => sum + c.reserve, 0);
}

/** Pay `amount` from the bank to a company, triggering break #1 / break #2 as needed. Mutates `s`. */
export function payFromBank(s: GameState, companyId: CompanyId, amount: number): void {
  if (amount <= 0) return;
  if (s.bankBreaks < 2 && s.bank < amount) {
    if (s.bankBreaks === 0) {
      s.bankBreaks = 1;
      s.bank += reserveTotal(s); // open reserves into the bank
    }
    if (s.bank < amount) {
      // reserves didn't cover it (or we were already past break #1) → second break ends the game
      s.bankBreaks = 2;
      s.endAfterPhase = true;
    }
  }
  // Once broken twice, the bank may go negative — remaining earnings are still owed/paid (IOU).
  s.bank -= amount;
  s.companies[companyId].cash += amount;
}

/** Richest company; ties broken by earlier position in turn order. */
export function determineWinner(s: GameState): CompanyId {
  let best: CompanyId = s.turnOrder[0];
  let bestCash = -Infinity;
  for (const id of s.turnOrder) {
    if (s.companies[id].cash > bestCash) {
      bestCash = s.companies[id].cash;
      best = id;
    }
  }
  return best;
}
