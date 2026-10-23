import { describe, it, expect } from 'vitest';
import {
  arrangementLegal,
  slotsProvided,
  openSlots,
  derive,
  hire,
  hireAvailable,
  train,
  produce,
  buyErrand,
  computeTurnOrder,
  cleanup,
  createGame,
  EMPLOYEES,
  ENTRY_IDS,
  type GameState,
} from '../../src/engine';
import { mkCompany } from './_helpers';

describe('employee registry & training tree', () => {
  it('has the resolved management tree edges', () => {
    expect(EMPLOYEES['mgmt-trainee'].trainsInto).toEqual(['new-biz-dev', 'junior-vp', 'luxuries-mgr']);
    expect(EMPLOYEES['junior-vp'].trainsInto).toContain('recruiting-mgr');
    expect(EMPLOYEES['junior-vp'].trainsInto).toContain('coach');
    expect(EMPLOYEES['senior-vp'].trainsInto).toEqual(['cfo', 'executive-vp', 'hr-director']);
    expect(EMPLOYEES['vice-president'].slots).toBe(4);
  });
  it('all 8 entry cards are salary-free; trained cards are salaried', () => {
    expect(ENTRY_IDS.sort()).toEqual(
      ['errand-boy', 'kitchen-trainee', 'marketing-trainee', 'mgmt-trainee', 'pricing-mgr', 'recruiting-girl', 'trainer', 'waitress'].sort(),
    );
    expect(ENTRY_IDS.every((id) => !EMPLOYEES[id].salaried)).toBe(true);
    expect(EMPLOYEES['burger-cook'].salaried).toBe(true);
  });
});

describe('org-chart capacity', () => {
  it('CEO alone provides 3 slots', () => {
    expect(slotsProvided(['ceo'])).toBe(3);
    expect(arrangementLegal(['ceo'])).toBe(true);
  });
  it('rejects > 3 managers under the CEO', () => {
    expect(arrangementLegal(['ceo', 'junior-vp', 'junior-vp', 'junior-vp', 'junior-vp'])).toBe(false);
  });
  it('a manager adds its slots; over-capacity is illegal', () => {
    // CEO(3) + junior-vp(3) = 6 slots provided; junior-vp + 5 staff = 6 cards under CEO → used 6 ≤ 6 ok
    const ok = ['ceo', 'junior-vp', 'waitress', 'waitress', 'pricing-mgr', 'errand-boy', 'kitchen-trainee'];
    expect(arrangementLegal(ok)).toBe(true);
    expect(arrangementLegal([...ok, 'trainer'])).toBe(false); // 7 used > 6 provided
  });
  it('openSlots counts unused slots + the airplane milestone bonus', () => {
    const c = mkCompany(0, {
      cards: [
        { uid: 1, defId: 'ceo', atWork: true },
        { uid: 2, defId: 'waitress', atWork: true },
      ],
    });
    expect(openSlots(c)).toBe(2); // 3 provided − 1 used
    c.airplaneSlots = 2;
    expect(openSlots(c)).toBe(4);
  });
});

describe('derive (per-turn economic fields from cards at work)', () => {
  it('counts pricing staff, waitresses, CFO and salary', () => {
    const c = mkCompany(0, {
      cards: [
        { uid: 1, defId: 'ceo', atWork: true },
        { uid: 2, defId: 'discount-mgr', atWork: true },
        { uid: 3, defId: 'waitress', atWork: true },
        { uid: 4, defId: 'cfo', atWork: true },
        { uid: 5, defId: 'burger-cook', atWork: false }, // on the beach, still salaried
      ],
    });
    derive(c);
    expect(c.pricing.discount).toBe(1);
    expect(c.waitresses).toBe(1);
    expect(c.cfo).toBe(true);
    // salaried owned: discount-mgr + cfo + burger-cook = 3 × $5 = 15
    expect(c.salaryDue).toBe(15);
  });
  it('applies the "First to train" salary discount and eternal-marketing salary waiver', () => {
    const c = mkCompany(0, {
      salaryDiscount: 15,
      cards: [
        { uid: 1, defId: 'ceo', atWork: true },
        { uid: 2, defId: 'burger-cook', atWork: true },
        { uid: 3, defId: 'campaign-mgr', atWork: true },
      ],
    });
    derive(c);
    // 2 salaried × 5 = 10, − 15 discount → max(0, −5) = 0
    expect(c.salaryDue).toBe(0);
    c.salaryDiscount = 0;
    c.eternalMarketing = true;
    derive(c); // marketeer salary waived → only burger-cook salaried = 5
    expect(c.salaryDue).toBe(5);
  });
});

describe('job market — hire & train', () => {
  it('hires entry cards while copies remain', () => {
    const s = createGame({ players: 2, seed: 1 });
    const c = s.companies[0];
    const before = s.jobMarket['kitchen-trainee'];
    expect(hireAvailable(s, 'kitchen-trainee')).toBe(true);
    expect(hire(s, c, 'kitchen-trainee')).toBe(true);
    expect(s.jobMarket['kitchen-trainee']).toBe(before - 1);
    expect(c.cards.some((x) => x.defId === 'kitchen-trainee')).toBe(true);
    expect(hireAvailable(s, 'burger-cook')).toBe(false); // not an entry card
  });
  it('trains a beach card one step along its track, returning the old card', () => {
    const s = createGame({ players: 2, seed: 1 });
    const c = s.companies[0];
    hire(s, c, 'kitchen-trainee');
    const card = c.cards.find((x) => x.defId === 'kitchen-trainee')!;
    const burgerBefore = s.jobMarket['burger-cook'];
    expect(train(s, c, card.uid, 'burger-cook')).toBe(true);
    expect(card.defId).toBe('burger-cook');
    expect(s.jobMarket['burger-cook']).toBe(burgerBefore - 1);
    expect(s.jobMarket['kitchen-trainee']).toBeGreaterThan(0); // returned to market
    expect(train(s, c, card.uid, 'pizza-chef')).toBe(false); // illegal edge
  });
});

describe('working — production & buying', () => {
  it('kitchen produces food into stock', () => {
    const c = mkCompany(0, {
      cards: [
        { uid: 1, defId: 'ceo', atWork: true },
        { uid: 2, defId: 'burger-cook', atWork: true },
        { uid: 3, defId: 'kitchen-trainee', atWork: true },
      ],
    });
    expect(produce(c, 2)).toBe(true);
    expect(c.stock.burger).toBe(3);
    expect(produce(c, 3, 'pizza')).toBe(true);
    expect(c.stock.pizza).toBe(1);
  });
  it('errand boy takes a drink (+1 with the milestone)', () => {
    const c = mkCompany(0, {
      cards: [
        { uid: 1, defId: 'ceo', atWork: true },
        { uid: 2, defId: 'errand-boy', atWork: true },
      ],
    });
    expect(buyErrand(c, 2, 'beer')).toBe(true);
    expect(c.stock.beer).toBe(1);
    c.errandBoyBonus = true;
    buyErrand(c, 2, 'beer');
    expect(c.stock.beer).toBe(3); // +2 this time
  });
});

describe('phases — order of business & cleanup', () => {
  it('orders by most open slots, tie → previous order', () => {
    const a = mkCompany(0, { cards: [{ uid: 1, defId: 'ceo', atWork: true }, { uid: 2, defId: 'waitress', atWork: true }] }); // 2 open
    const b = mkCompany(1, { cards: [{ uid: 3, defId: 'ceo', atWork: true }] }); // 3 open
    const s: GameState = { ...createGame({ players: 2, seed: 1 }), companies: [a, b], turnOrder: [0, 1] };
    expect(computeTurnOrder(s)).toEqual([1, 0]); // b (3 open) first
  });
  it('cleanup discards goods, un-works cards and opens COMING SOON restaurants', () => {
    const s = createGame({ players: 2, seed: 1 });
    s.companies[0].stock.burger = 5;
    s.companies[0].pendingRestaurants = ['1,1'];
    s.companies[0].cards.push({ uid: 99, defId: 'waitress', atWork: true });
    cleanup(s);
    expect(s.companies[0].stock.burger).toBe(0);
    expect(s.companies[0].restaurants).toContain('1,1');
    expect(s.companies[0].cards.every((x) => !x.atWork)).toBe(true);
  });
});
