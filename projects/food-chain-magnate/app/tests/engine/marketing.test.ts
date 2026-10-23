import { describe, it, expect } from 'vitest';
import { placeCampaign, footprintHouses, resolveMarketing, goods } from '../../src/engine';
import { mkCompany, mkHouse, mkState } from './_helpers';

function marketeer(defId: string) {
  return mkCompany(0, {
    cards: [
      { uid: 1, defId: 'ceo', atWork: true },
      { uid: 2, defId, atWork: true },
    ],
  });
}

describe('marketing — placement & footprints', () => {
  it('a marketing trainee can place a billboard but not a radio', () => {
    const s = mkState([marketeer('marketing-trainee')], [mkHouse(1, '0,0', goods({}))]);
    expect(placeCampaign(s, s.companies[0], 2, 'billboard', 'burger', { tile: '0,1' })).not.toBeNull();
    expect(placeCampaign(s, s.companies[0], 2, 'radio', 'burger', { tile: '0,1' })).toBeNull();
  });

  it('billboard reaches orthogonally-adjacent houses', () => {
    const s = mkState([marketeer('marketing-trainee')], [
      mkHouse(1, '0,0', goods({})),
      mkHouse(2, '0,2', goods({})),
      mkHouse(3, '2,2', goods({})), // far away
    ]);
    const id = placeCampaign(s, s.companies[0], 2, 'billboard', 'burger', { tile: '0,1' })!;
    const piece = s.marketing.find((m) => m.id === id)!;
    const reached = footprintHouses(s, piece).map((h) => h.id).sort();
    expect(reached).toEqual([1, 2]);
  });

  it('radio reaches the 3×3 tile block', () => {
    const s = mkState([marketeer('brand-director')], [
      mkHouse(1, '1,1', goods({})),
      mkHouse(2, '2,2', goods({})),
      mkHouse(3, '4,4', goods({})), // outside the 3×3 around 1,1
    ]);
    const id = placeCampaign(s, s.companies[0], 2, 'radio', 'pizza', { tile: '1,1' })!;
    const reached = footprintHouses(s, s.marketing.find((m) => m.id === id)!).map((h) => h.id).sort();
    expect(reached).toEqual([1, 2]);
  });

  it('airplane covers a band of rows', () => {
    const s = mkState([marketeer('brand-director')], [
      mkHouse(1, '0,3', goods({})),
      mkHouse(2, '2,1', goods({})),
      mkHouse(3, '3,0', goods({})),
    ]);
    const id = placeCampaign(s, s.companies[0], 2, 'airplane', 'soda', { tile: '0,0', axis: 'row', span: 3 })!;
    const reached = footprintHouses(s, s.marketing.find((m) => m.id === id)!).map((h) => h.id).sort();
    expect(reached).toEqual([1, 2]); // rows 0–2, not row 3
  });
});

describe('marketing — demand generation', () => {
  it('seeds product demand up to the house cap (3, or 5 with a garden)', () => {
    const houses = [mkHouse(1, '0,0', goods({}), false), mkHouse(2, '0,2', goods({}), true)];
    const s = mkState([marketeer('marketing-trainee')], houses);
    placeCampaign(s, s.companies[0], 2, 'billboard', 'burger', { tile: '0,1' });
    for (let i = 0; i < 6; i++) resolveMarketing(s); // run many times; demand should cap
    expect(s.map.houses[0].demand.burger).toBe(3); // no garden → cap 3
    expect(s.map.houses[1].demand.burger).toBe(5); // garden → cap 5
  });

  it('a "First radio" owner places 2 goods per radio', () => {
    const c = marketeer('brand-director');
    c.radioDouble = true;
    const s = mkState([c], [mkHouse(1, '1,1', goods({}))]);
    placeCampaign(s, s.companies[0], 2, 'radio', 'beer', { tile: '1,1' });
    resolveMarketing(s);
    expect(s.map.houses[0].demand.beer).toBe(2);
  });
});
