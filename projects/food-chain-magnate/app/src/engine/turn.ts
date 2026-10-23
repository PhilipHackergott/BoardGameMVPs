// The full-turn orchestrator: runs the 7 phases driven by a per-company Policy (the AI in the sim;
// the UI drives the interactive game directly using the same building blocks). Milestone triggers
// are checked at the relevant phase. Pure: playTurn returns a new state.

import { determineWinner } from './bank';
import {
  checkCampaignMilestones,
  checkHireMilestone,
  checkMoneyMilestones,
  checkPaydayMilestone,
  checkPlayedMilestones,
  checkProduceMilestones,
  checkTrainMilestone,
} from './milestones';
import { placeCampaign, resolveMarketing, type CampaignOpts } from './marketing';
import { cleanup, computeTurnOrder, deriveAll, setAtWork } from './phases';
import { effectiveSalary, payday } from './payday';
import { resolveDinnertime } from './selling';
import { hire, train } from './jobmarket';
import { addGarden, buyErrand, buyRoute, placeHouse, placeRestaurant, produce } from './working';
import type { CampaignType, CompanyId, GameState, Product, TileId } from './types';

export type WorkAction =
  | { kind: 'recruit'; defId: string }
  | { kind: 'train'; uid: number; into: string }
  | { kind: 'produce'; uid: number; product?: Product }
  | { kind: 'buyErrand'; uid: number; drink: Product }
  | { kind: 'buyRoute'; uid: number }
  | { kind: 'marketing'; uid: number; type: CampaignType; product: Product; opts: CampaignOpts }
  | { kind: 'placeRestaurant'; uid: number; tile: TileId }
  | { kind: 'placeHouse'; uid: number; tile: TileId }
  | { kind: 'addGarden'; uid: number; houseId: number };

export interface Policy {
  restructure(state: GameState, companyId: CompanyId): number[];
  work(state: GameState, companyId: CompanyId): WorkAction[];
}

export type Policies = Record<CompanyId, Policy>;

function applyWork(state: GameState, companyId: CompanyId, a: WorkAction): void {
  const c = state.companies[companyId];
  switch (a.kind) {
    case 'recruit':
      hire(state, c, a.defId);
      break;
    case 'train':
      if (train(state, c, a.uid, a.into)) checkTrainMilestone(state, c);
      break;
    case 'produce':
      if (produce(c, a.uid, a.product)) checkProduceMilestones(state, c, a.product ?? 'burger');
      break;
    case 'buyErrand':
      buyErrand(c, a.uid, a.drink);
      break;
    case 'buyRoute':
      buyRoute(state, c, a.uid);
      break;
    case 'marketing':
      if (placeCampaign(state, c, a.uid, a.type, a.product, a.opts) !== null)
        checkCampaignMilestones(state, c, a.type, a.product);
      break;
    case 'placeRestaurant':
      placeRestaurant(state, c, a.uid, a.tile);
      break;
    case 'placeHouse':
      placeHouse(state, c, a.uid, a.tile);
      break;
    case 'addGarden':
      addGarden(state, c, a.uid, a.houseId);
      break;
  }
}

/** Run one full turn (all 7 phases) with the given policies. Returns a new state. */
export function playTurn(state: GameState, policies: Policies): GameState {
  const s = structuredClone(state) as GameState;
  if (s.ended) return s;

  // 1. Restructuring (simultaneous): each company fields a legal set of cards.
  for (const c of s.companies) setAtWork(c, policies[c.id].restructure(s, c.id));
  deriveAll(s);
  for (const c of s.companies) checkPlayedMilestones(s, c);

  // 2. Order of Business.
  s.turnOrder = computeTurnOrder(s);

  // 3. Working 9-to-5 (in turn order).
  for (const id of s.turnOrder) {
    for (const a of policies[id].work(s, id)) applyWork(s, id, a);
    checkHireMilestone(s, s.companies[id]);
  }

  // 4. Dinnertime.
  const sell = resolveDinnertime(s);
  Object.assign(s, sell.state);
  s.lastDinnertime = sell.report;
  for (const c of s.companies) checkMoneyMilestones(s, c, true);
  s.log.push(
    `Turn ${s.turn}: ` +
      s.companies.map((c) => `${c.name} +$${sell.report.earned[c.id] ?? 0}`).join(' · '),
  );

  // 5. Payday (skipped entirely if the 2nd break fired this Dinnertime).
  if (!s.endAfterPhase) {
    for (const c of s.companies) checkPaydayMilestone(s, c, effectiveSalary(c));
    const afterPay = payday(s);
    Object.assign(s, afterPay);
  }

  // 6. Marketing campaigns place demand.
  resolveMarketing(s);

  // 7. Clean-up (discard goods, un-work cards, open restaurants, tick campaigns, lock milestones).
  cleanup(s);

  s.turn += 1;
  s.phase = 'restructuring';
  if (s.endAfterPhase && !s.ended) {
    s.ended = true;
    s.winner = determineWinner(s);
  }
  return s;
}

/** Play a whole game with AI policies until it ends (2nd bank break) or a turn cap. */
export function simulateGame(initial: GameState, policies: Policies, maxTurns = 60): GameState {
  let s = initial;
  while (!s.ended && s.turn <= maxTurns) s = playTurn(s, policies);
  if (!s.ended) {
    // safety: cap reached → end now, richest wins (long games are a balance signal, not a crash)
    s = structuredClone(s) as GameState;
    s.ended = true;
    s.winner = determineWinner(s);
  }
  return s;
}
