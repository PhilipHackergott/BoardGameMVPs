// The 18 base-game milestones (full set transcribed in 06-card-reference §4). Each is a one-time
// race: the first company to meet a trigger claims it; others may also claim it the SAME turn; at
// clean-up the claimed milestone is locked out for everyone else (handled in phases.cleanup). The
// effect is applied immediately and is permanent. Triggers are checked by the turn orchestrator at
// the relevant phase; effects mutate the company's permanent bonus flags.

import { DRINKS, type CampaignType, type Company, type GameState, type Product } from './types';

export const MILESTONE_IDS = [
  'first-billboard', 'first-train', 'first-hire3', 'first-burger-marketed', 'first-pizza-marketed',
  'first-drink-marketed', 'first-errand-boy', 'first-20', 'first-burger-produced', 'first-pizza-produced',
  'first-waitress', 'first-throwaway', 'first-lower-prices', 'first-cart-operator', 'first-airplane',
  'first-radio', 'first-100', 'first-pay-20',
] as const;
export type MilestoneId = (typeof MILESTONE_IDS)[number];

export const MILESTONE_NAMES: Record<MilestoneId, string> = {
  'first-billboard': 'First billboard placed',
  'first-train': 'First to train',
  'first-hire3': 'First to hire 3 in a turn',
  'first-burger-marketed': 'First burger marketed',
  'first-pizza-marketed': 'First pizza marketed',
  'first-drink-marketed': 'First drink marketed',
  'first-errand-boy': 'First errand boy played',
  'first-20': 'First to have $20',
  'first-burger-produced': 'First burger produced',
  'first-pizza-produced': 'First pizza produced',
  'first-waitress': 'First waitress played',
  'first-throwaway': 'First to throw away food/drink',
  'first-lower-prices': 'First to lower prices',
  'first-cart-operator': 'First cart operator',
  'first-airplane': 'First airplane campaign',
  'first-radio': 'First radio campaign',
  'first-100': 'First to have $100',
  'first-pay-20': 'First to pay $20+ salaries',
};

function applyEffect(state: GameState, c: Company, id: MilestoneId): void {
  switch (id) {
    case 'first-billboard': c.eternalMarketing = true; break;
    case 'first-train': c.salaryDiscount = 15; break;
    case 'first-hire3':
      for (let i = 0; i < 2; i++) c.cards.push({ uid: state.nextCardUid++, defId: 'mgmt-trainee', atWork: false });
      break;
    case 'first-burger-marketed': c.burgerBonus = true; break;
    case 'first-pizza-marketed': c.pizzaBonus = true; break;
    case 'first-drink-marketed': c.drinkBonus = true; break;
    case 'first-errand-boy': c.errandBoyBonus = true; break;
    case 'first-20': break; // peek reserve cards — no mechanical engine effect
    case 'first-burger-produced': c.cards.push({ uid: state.nextCardUid++, defId: 'burger-cook', atWork: false }); break;
    case 'first-pizza-produced': c.cards.push({ uid: state.nextCardUid++, defId: 'pizza-cook', atWork: false }); break;
    case 'first-waitress': c.waitressMilestone = true; break;
    case 'first-throwaway': c.freezer = true; break;
    case 'first-lower-prices': c.lowerPrices = true; break;
    case 'first-cart-operator': c.buyerRangeBonus += 1; break;
    case 'first-airplane': c.airplaneSlots = 2; break;
    case 'first-radio': c.radioDouble = true; break;
    case 'first-100': c.ceoIsCfoPending = true; break;
    case 'first-pay-20': c.stackTrainers = true; break;
  }
}

/** Claim a milestone for a company if available (not locked, not already claimed by it). */
export function tryClaim(state: GameState, c: Company, id: MilestoneId): boolean {
  if (state.lockedMilestones.includes(id)) return false;
  const claimers = (state.milestones[id] ??= []);
  if (claimers.includes(c.id)) return false;
  claimers.push(c.id);
  applyEffect(state, c, id);
  return true;
}

const atWork = (c: Company, defId: string) => c.cards.some((x) => x.atWork && x.defId === defId);

/** Triggers based on which cards are at work this turn (checked after restructuring/working). */
export function checkPlayedMilestones(state: GameState, c: Company): void {
  if (atWork(c, 'errand-boy')) tryClaim(state, c, 'first-errand-boy');
  if (atWork(c, 'waitress')) tryClaim(state, c, 'first-waitress');
  if (atWork(c, 'cart-operator')) tryClaim(state, c, 'first-cart-operator');
  if (atWork(c, 'pricing-mgr') || atWork(c, 'discount-mgr')) tryClaim(state, c, 'first-lower-prices');
}

export function checkCampaignMilestones(state: GameState, c: Company, type: CampaignType, product: Product): void {
  if (type === 'billboard') tryClaim(state, c, 'first-billboard');
  if (type === 'airplane') tryClaim(state, c, 'first-airplane');
  if (type === 'radio') tryClaim(state, c, 'first-radio');
  if (product === 'burger') tryClaim(state, c, 'first-burger-marketed');
  else if (product === 'pizza') tryClaim(state, c, 'first-pizza-marketed');
  else if (DRINKS.includes(product)) tryClaim(state, c, 'first-drink-marketed');
}

export function checkProduceMilestones(state: GameState, c: Company, product: Product): void {
  if (product === 'burger') tryClaim(state, c, 'first-burger-produced');
  if (product === 'pizza') tryClaim(state, c, 'first-pizza-produced');
}

export function checkTrainMilestone(state: GameState, c: Company): void {
  tryClaim(state, c, 'first-train');
}

export function checkHireMilestone(state: GameState, c: Company): void {
  if (c.hireMilestoneCount >= 3) tryClaim(state, c, 'first-hire3');
}

export function checkMoneyMilestones(state: GameState, c: Company, atEndOfDinnertime: boolean): void {
  if (c.cash >= 20) tryClaim(state, c, 'first-20');
  if (atEndOfDinnertime && c.cash >= 100) tryClaim(state, c, 'first-100');
}

export function checkPaydayMilestone(state: GameState, c: Company, amountPaid: number): void {
  if (amountPaid >= 20) tryClaim(state, c, 'first-pay-20');
}

export function checkThrowawayMilestone(state: GameState, c: Company, discardedAny: boolean): void {
  if (discardedAny) tryClaim(state, c, 'first-throwaway');
}

export const TOTAL_MILESTONES = MILESTONE_IDS.length;
