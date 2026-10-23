// Public API of the Food Chain Magnate engine. UI / render / AI consume only this.
// M1 surface = the sell loop (map · pricing · Dinnertime · payday · bank). M2+ extends it.

export * from './types';
export { makeRng, shuffle, type Rng } from './rng';
export { createGame, mapSize } from './setup';
export {
  tileId,
  parseTile,
  edgeKey,
  addRoad,
  hasRoad,
  roadNeighbours,
  tileDistance,
  chainDistance,
} from './map';
export { BASE_UNIT_PRICE, effectiveUnitPrice } from './pricing';
export {
  resolveDinnertime,
  type Candidate,
  type Disqualified,
  type HouseResolution,
  type DinnertimeReport,
} from './selling';
export { payday, recruitingDiscount, effectiveSalary } from './payday';
export { startingBank, reserveTotal, payFromBank, determineWinner } from './bank';
export { runTurn, simulateScriptedGame, type TurnScript } from './sim';

// --- M2: company / org chart / working / job market ---
export { EMPLOYEES, ENTRY_IDS, isManager, canPlace, jobMarketCounts, type EmployeeDef } from './data/employees';
export type { Track } from './data/tracks';
export { managerSlots, slotsProvided, arrangementLegal, atWorkDefIds, openSlots, derive } from './orgchart';
export { hireAvailable, hire, trainable, train } from './jobmarket';
export { produce, buyErrand, buyRoute, placeRestaurant, placeHouse, addGarden } from './working';
export { setAtWork, deriveAll, computeTurnOrder, cleanup } from './phases';

// --- M3: marketing + milestones ---
export { placeCampaign, footprintHouses, resolveMarketing, type CampaignOpts } from './marketing';
export {
  MILESTONE_IDS,
  MILESTONE_NAMES,
  TOTAL_MILESTONES,
  tryClaim,
  checkPlayedMilestones,
  checkCampaignMilestones,
  checkProduceMilestones,
  checkTrainMilestone,
  checkHireMilestone,
  checkMoneyMilestones,
  checkPaydayMilestone,
  checkThrowawayMilestone,
  type MilestoneId,
} from './milestones';

// --- M4: full-turn orchestrator (policy-driven) ---
export {
  playTurn,
  simulateGame,
  type Policy,
  type Policies,
  type WorkAction,
} from './turn';

// --- M7: campaign (objectives + scenarios) ---
export {
  evaluateObjective,
  evaluateFail,
  scenarioOutcome,
  type Objective,
  type Fail,
  type Outcome,
} from './objectives';
export { applyScenario, medalFor, type Medal } from './scenario';
export { CAMPAIGN_ARC, ERAS, type ScenarioDef, type Era } from './data/scenarios';
