import { describe, it, expect } from 'vitest';
import { payFromBank, determineWinner, startingBank } from '../../src/engine';
import { mkCompany, mkState } from './_helpers';

describe('bank & the two-break end', () => {
  it('startingBank is $50 × players', () => {
    expect(startingBank(2)).toBe(100);
    expect(startingBank(4)).toBe(200);
  });

  it('first break adds the reserve total; second break ends the game and allows IOUs', () => {
    const s = mkState([mkCompany(0, { reserve: 50 }), mkCompany(1, { reserve: 50 })], [], { bank: 100 });

    payFromBank(s, 0, 80); // covered
    expect(s.bank).toBe(20);
    expect(s.bankBreaks).toBe(0);

    payFromBank(s, 0, 50); // 20 < 50 → break #1: +100 reserves → 120, pays → 70
    expect(s.bankBreaks).toBe(1);
    expect(s.bank).toBe(70);
    expect(s.endAfterPhase).toBe(false);

    payFromBank(s, 0, 200); // 70 < 200, already broken once → break #2, pays anyway (IOU)
    expect(s.bankBreaks).toBe(2);
    expect(s.endAfterPhase).toBe(true);
    expect(s.bank).toBe(-130);
    expect(s.companies[0].cash).toBe(330);
  });

  it('a single payout exceeding bank+reserves breaks twice at once', () => {
    const s = mkState([mkCompany(0, { reserve: 50 })], [], { bank: 50 });
    payFromBank(s, 0, 500); // 50 < 500 → break1 (+50 → 100), still < 500 → break2
    expect(s.bankBreaks).toBe(2);
    expect(s.endAfterPhase).toBe(true);
  });

  it('determineWinner = most cash, ties to earlier turn order', () => {
    const s = mkState(
      [mkCompany(0, { cash: 5 }), mkCompany(1, { cash: 5 }), mkCompany(2, { cash: 3 })],
      [],
    );
    expect(determineWinner(s)).toBe(0); // tie 0 vs 1 → earlier in turn order
    s.turnOrder = [1, 0, 2];
    expect(determineWinner(s)).toBe(1);
  });
});
