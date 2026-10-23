import { describe, it, expect } from 'vitest';
import { resolveDinnertime, goods } from '../../src/engine';
import { mkCompany, mkHouse, mkState } from './_helpers';

describe('Dinnertime resolution — the heart', () => {
  it('reproduces the rulebook worked example ($125)', () => {
    // 1 burger + 2 beer to a GARDEN house; chain has a luxury manager (+$10 → unit $20) and the
    // "First burger marketed" milestone (+$5/burger). Garden doubles the unit price (not the bonus).
    // burger: 20×2 + 5 = $45; beer: 20×2 each = $40 → $45 + 2×$40 = $125.
    const c = mkCompany(0, {
      restaurants: ['0,0'],
      stock: goods({ burger: 5, beer: 5 }),
      pricing: { price: 0, discount: 0, luxury: 1 },
      burgerBonus: true,
    });
    const house = mkHouse(1, '0,0', goods({ burger: 1, beer: 2 }), true);
    const { state, report } = resolveDinnertime(mkState([c], [house]));
    expect(report.houses[0].salePayout).toBe(125);
    expect(report.houses[0].winner).toBe(0);
    expect(state.companies[0].cash).toBe(125);
    expect(state.companies[0].stock.burger).toBe(4);
    expect(state.companies[0].stock.beer).toBe(3);
  });

  it('a plain garden house doubles the unit price', () => {
    const c = mkCompany(0, { stock: goods({ burger: 2 }) });
    const { report } = resolveDinnertime(mkState([c], [mkHouse(1, '0,0', goods({ burger: 1 }), true)]));
    expect(report.houses[0].salePayout).toBe(20); // 10 × 2
  });

  it('requires the FULL order — a chain missing an item cannot serve', () => {
    const c = mkCompany(0, { stock: goods({ burger: 5 }) }); // no beer
    const { state, report } = resolveDinnertime(
      mkState([c], [mkHouse(1, '0,0', goods({ burger: 2, beer: 1 }))]),
    );
    expect(report.houses[0].winner).toBeNull();
    expect(state.companies[0].cash).toBe(0);
    expect(state.companies[0].stock.burger).toBe(5); // nothing consumed
  });

  it('picks the lowest unit price + distance (cheaper-but-farther beats closer)', () => {
    // A: unit $10 at distance 0 → score 10.  B: 2 discount managers → unit $4, distance 1 → score 5.
    const a = mkCompany(0, { restaurants: ['0,0'], stock: goods({ burger: 3 }) });
    const b = mkCompany(1, {
      restaurants: ['0,1'],
      stock: goods({ burger: 3 }),
      pricing: { price: 0, discount: 2, luxury: 0 },
    });
    const house = mkHouse(1, '0,0', goods({ burger: 1 }));
    const { report } = resolveDinnertime(mkState([a, b], [house], { roads: [['0,0', '0,1']] }));
    expect(report.houses[0].winner).toBe(1); // B (score 5) beats A (score 10)
    expect(report.houses[0].candidates[0].score).toBe(5);
  });

  it('breaks a price+distance tie by most waitresses', () => {
    const a = mkCompany(0, { restaurants: ['0,1'], stock: goods({ burger: 3 }), waitresses: 0 });
    const b = mkCompany(1, { restaurants: ['0,1'], stock: goods({ burger: 3 }), waitresses: 1 });
    const house = mkHouse(1, '0,0', goods({ burger: 1 }));
    const { report } = resolveDinnertime(mkState([a, b], [house], { roads: [['0,0', '0,1']] }));
    expect(report.houses[0].winner).toBe(1);
    expect(report.houses[0].tieBreak).toBe('waitresses');
  });

  it('breaks a full tie by earliest turn order', () => {
    const a = mkCompany(0, { restaurants: ['0,1'], stock: goods({ burger: 3 }) });
    const b = mkCompany(1, { restaurants: ['0,1'], stock: goods({ burger: 3 }) });
    const { report } = resolveDinnertime(
      mkState([a, b], [mkHouse(1, '0,0', goods({ burger: 1 }))], { roads: [['0,0', '0,1']] }),
    );
    expect(report.houses[0].winner).toBe(0);
    expect(report.houses[0].tieBreak).toBe('turnOrder');
  });

  it('a house with no road-connected qualifying chain is not served', () => {
    const c = mkCompany(0, { restaurants: ['4,4'], stock: goods({ burger: 3 }) }); // no roads added
    const { state, report } = resolveDinnertime(mkState([c], [mkHouse(1, '0,0', goods({ burger: 1 }))]));
    expect(report.houses[0].winner).toBeNull();
    expect(state.companies[0].cash).toBe(0);
  });

  it('adds waitress income ($3, or $5 with the milestone) and the CFO +50% after houses', () => {
    const c = mkCompany(0, {
      stock: goods({ burger: 1 }),
      waitresses: 2,
      waitressMilestone: true,
      cfo: true,
    });
    const { state, report } = resolveDinnertime(mkState([c], [mkHouse(1, '0,0', goods({ burger: 1 }))]));
    // sale 10 + waitresses 2×$5=10 → earned 20 before CFO; CFO +50% = 10 → total 30.
    expect(report.houses[0].salePayout).toBe(10);
    expect(report.waitressIncome[0]).toBe(10);
    expect(report.cfoBonus[0]).toBe(10);
    expect(state.companies[0].cash).toBe(30);
  });

  it('is pure — the input state is not mutated', () => {
    const c = mkCompany(0, { stock: goods({ burger: 2 }) });
    const input = mkState([c], [mkHouse(1, '0,0', goods({ burger: 1 }))]);
    resolveDinnertime(input);
    expect(input.companies[0].cash).toBe(0);
    expect(input.companies[0].stock.burger).toBe(2);
    expect(input.map.houses[0].demand.burger).toBe(1);
  });
});
