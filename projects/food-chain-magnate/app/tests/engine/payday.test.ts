import { describe, it, expect } from 'vitest';
import { payday, recruitingDiscount, effectiveSalary } from '../../src/engine';
import { mkCompany, mkState } from './_helpers';

describe('recruiting salary discount', () => {
  const ceo = { uid: 1, defId: 'ceo', atWork: true };
  it('a recruiting card makes a company pay less salary (unused actions × $5)', () => {
    const withRecruiter = mkCompany(0, { salaryDue: 50, hireMilestoneCount: 0, cards: [ceo, { uid: 2, defId: 'recruiting-mgr', atWork: true }] });
    const without = mkCompany(1, { salaryDue: 50, hireMilestoneCount: 0, cards: [ceo] });
    expect(recruitingDiscount(withRecruiter)).toBe(10); // 2 unused manager actions
    expect(effectiveSalary(withRecruiter)).toBe(40);
    expect(effectiveSalary(without)).toBe(50);
    expect(effectiveSalary(withRecruiter)).toBeLessThan(effectiveSalary(without));
  });
  it('HR director gives up to $20, reduced by hires beyond the free actions', () => {
    const idle = mkCompany(0, { salaryDue: 60, hireMilestoneCount: 0, cards: [ceo, { uid: 2, defId: 'hr-director', atWork: true }] });
    expect(recruitingDiscount(idle)).toBe(20);
    const used = mkCompany(0, { salaryDue: 60, hireMilestoneCount: 3, cards: [ceo, { uid: 2, defId: 'hr-director', atWork: true }] });
    // baseFree=1 (CEO); 2 hires came from HR director → 2 unused → $10
    expect(recruitingDiscount(used)).toBe(10);
  });
});

describe('Payday', () => {
  it('pays $ salaryDue back to the bank', () => {
    const s = mkState([mkCompany(0, { cash: 50, salaryDue: 15 })], [], { bank: 0 });
    const after = payday(s);
    expect(after.companies[0].cash).toBe(35);
    expect(after.bank).toBe(15);
  });

  it('pays only what the chain can afford (no negative cash)', () => {
    const s = mkState([mkCompany(0, { cash: 10, salaryDue: 25 })], [], { bank: 0 });
    const after = payday(s);
    expect(after.companies[0].cash).toBe(0);
    expect(after.bank).toBe(10);
  });

  it('skips salaries entirely on the turn the 2nd bank-break fired', () => {
    const s = mkState([mkCompany(0, { cash: 50, salaryDue: 15 })], [], { bank: 0 });
    s.endAfterPhase = true;
    const after = payday(s);
    expect(after.companies[0].cash).toBe(50);
    expect(after.bank).toBe(0);
  });

  it('is pure', () => {
    const s = mkState([mkCompany(0, { cash: 50, salaryDue: 15 })], []);
    payday(s);
    expect(s.companies[0].cash).toBe(50);
  });
});
