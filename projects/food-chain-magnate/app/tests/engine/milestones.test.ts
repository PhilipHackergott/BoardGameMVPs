import { describe, it, expect } from 'vitest';
import {
  TOTAL_MILESTONES,
  tryClaim,
  checkCampaignMilestones,
  checkProduceMilestones,
  checkTrainMilestone,
  checkHireMilestone,
  checkPlayedMilestones,
  checkMoneyMilestones,
  cleanup,
  createGame,
} from '../../src/engine';
import { mkCompany, mkState } from './_helpers';

describe('milestones', () => {
  it('the base set has exactly 18 distinct milestones', () => {
    expect(TOTAL_MILESTONES).toBe(18);
  });

  it('claiming applies the permanent effect and is one-shot per company', () => {
    const s = mkState([mkCompany(0)], []);
    expect(tryClaim(s, s.companies[0], 'first-train')).toBe(true);
    expect(s.companies[0].salaryDiscount).toBe(15);
    expect(tryClaim(s, s.companies[0], 'first-train')).toBe(false); // already claimed by it
  });

  it('campaign triggers fire by type and product', () => {
    const s = mkState([mkCompany(0)], []);
    checkCampaignMilestones(s, s.companies[0], 'billboard', 'burger');
    expect(s.companies[0].eternalMarketing).toBe(true); // first-billboard
    expect(s.companies[0].burgerBonus).toBe(true); // first-burger-marketed
    expect(s.milestones['first-airplane']).toBeUndefined();
  });

  it('produce / train / hire3 / played triggers grant the right effects', () => {
    const s = mkState(
      [
        mkCompany(0, {
          hireMilestoneCount: 3,
          cards: [
            { uid: 1, defId: 'ceo', atWork: true },
            { uid: 2, defId: 'errand-boy', atWork: true },
            { uid: 3, defId: 'cart-operator', atWork: true },
            { uid: 4, defId: 'waitress', atWork: true },
            { uid: 5, defId: 'pricing-mgr', atWork: true },
          ],
        }),
      ],
      [],
    );
    const c = s.companies[0];
    checkProduceMilestones(s, c, 'burger');
    expect(c.cards.some((x) => x.defId === 'burger-cook')).toBe(true); // free burger cook
    checkTrainMilestone(s, c);
    expect(c.salaryDiscount).toBe(15);
    const cardsBefore = c.cards.length;
    checkHireMilestone(s, c);
    expect(c.cards.length).toBe(cardsBefore + 2); // 2 management trainees
    checkPlayedMilestones(s, c);
    expect(c.errandBoyBonus).toBe(true);
    expect(c.buyerRangeBonus).toBe(1);
    expect(c.waitressMilestone).toBe(true);
    expect(c.lowerPrices).toBe(true);
  });

  it('$100 milestone arms the CEO-as-CFO for next turn', () => {
    const s = mkState([mkCompany(0, { cash: 120 })], []);
    checkMoneyMilestones(s, s.companies[0], true);
    expect(s.companies[0].ceoIsCfoPending).toBe(true);
    expect(s.companies[0].ceoIsCfo).toBe(false); // not yet
  });

  it('a milestone claimed this turn is locked out for everyone next turn', () => {
    const s = createGame({ players: 2, seed: 1 });
    tryClaim(s, s.companies[0], 'first-billboard');
    cleanup(s); // locks claimed milestones + activates pending CEO-CFO
    expect(s.lockedMilestones).toContain('first-billboard');
    expect(tryClaim(s, s.companies[1], 'first-billboard')).toBe(false);
  });
});
