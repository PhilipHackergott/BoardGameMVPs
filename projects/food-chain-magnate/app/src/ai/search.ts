// Hard-tier multi-turn game-tree search.
//
// WHY THIS EXISTS. The 1-turn heuristic ({@link ./heuristic}) can't see the load-bearing timing rule
// of Food Chain Magnate: marketing placed this turn creates demand that is only SERVED at the *next*
// turn's Dinnertime. So a greedy "what earns most cash THIS turn" evaluator is structurally blind to
// the highest-value play in the game. This search fixes that by looking 1–2 full turns ahead and
// scoring the *resulting position*, so the payoff of marketing (and of concentrating vs spreading it)
// shows up in the score.
//
// SHAPE OF THE SEARCH. It is a deterministic best-response search, not adversarial minimax:
//   • We (the searching company) choose a turn-PLAN from a small candidate set (movegen below).
//   • Opponents are a fixed OPPONENT MODEL — the Med heuristic — not an adversarial minimiser, so
//     there are no min nodes and no chance nodes (the only randomness, the heuristic's jitter, is
//     seeded → fully deterministic). This keeps the sim reproducible.
//   • A plan is rolled out with playTurn for `depth` full turns; at the leaf we score cash advantage
//     (richest-wins is the actual victory condition, so relative cash is the honest objective).
//   • Because it's a max-only tree, classic alpha-beta has nothing to prune against. Instead we use
//     MOVE ORDERING (a depth-1 pass orders candidates best-first), ITERATIVE DEEPENING (depth 1 → 2,
//     reusing that order), a NODE BUDGET (count of playTurn sims, not wall-clock — determinism), and
//     a branch-and-bound prune that skips a candidate's expensive deep expansion when its depth-1
//     value can't plausibly catch the best (bounded by an optimistic per-turn cash swing).
//
// RECURSION GUARD. Rollouts use the plain heuristic for everyone (us included), never makeSearchAI —
// only the live game's top-level Hard seat searches, so the tree never re-enters itself.

import {
  playTurn,
  type CompanyId,
  type GameState,
  type Policies,
  type Policy,
  type Product,
} from '../engine';
import { heuristicPolicy, type Targeting } from './heuristic';
import { DEFAULT_PROFILE, PROFILES, type Tier } from './profiles';

/** A full-turn plan, expressed as the marketing levers the search varies over the shared heuristic. */
export interface PlanDescriptor {
  label: string;
  product: Product; // which product this turn's campaigns push
  targeting: Targeting; // how marketeers pick houses
}

export interface SearchOpts {
  depth: number; // full turns to look ahead (1 = greedy 1-turn evaluator; 2 = the real search)
  nodeBudget: number; // max playTurn sims per decision — a deterministic budget, not wall-clock
  opponentTier: Tier; // the opponent model used for rivals during rollout
  /** optimistic upper bound on how much one extra look-ahead turn can improve our cash advantage. */
  swingPerTurn: number;
}

export const DEFAULT_SEARCH: SearchOpts = { depth: 2, nodeBudget: 96, opponentTier: 'med', swingPerTurn: 120 };

/** Candidate turn-plans. Index 0 is the status-quo Hard plan (scored spread on the profile product),
 *  so the search can never do worse than the old heuristic and ties resolve to it. */
export function candidatePlans(profileId: string): PlanDescriptor[] {
  const profile = PROFILES[profileId] ?? PROFILES[DEFAULT_PROFILE];
  const primary: Product = profile.bias === 'pizza' ? 'pizza' : profile.bias === 'drink' ? 'beer' : 'burger';
  const alt: Product = primary === 'pizza' ? 'burger' : 'pizza';
  return [
    { label: 'scored/primary', product: primary, targeting: 'scored' }, // status quo — keep first
    { label: 'concentrate/primary', product: primary, targeting: 'concentrate' },
    { label: 'nearest/primary', product: primary, targeting: 'nearest' },
    { label: 'scored/alt', product: alt, targeting: 'scored' },
    { label: 'concentrate/alt', product: alt, targeting: 'concentrate' },
  ];
}

/** The heuristic-Hard policy specialised to a plan's marketing levers. */
export function planPolicy(plan: PlanDescriptor, profileId: string): Policy {
  return heuristicPolicy('hard', profileId, { marketProduct: plan.product, targeting: plan.targeting });
}

/** Policies for a rollout: `me` plays `myPolicy`; every rival plays the opponent-model heuristic. */
function rolloutPolicies(state: GameState, me: CompanyId, myPolicy: Policy, oppTier: Tier): Policies {
  const pol: Policies = {};
  for (const c of state.companies) {
    pol[c.id] = c.id === me ? myPolicy : heuristicPolicy(oppTier, c.aiProfile ?? DEFAULT_PROFILE);
  }
  return pol;
}

/** Leaf score = our cash minus the richest rival's cash (richest-wins → relative cash is the goal). */
export function leafEval(state: GameState, me: CompanyId): number {
  const mine = state.companies[me].cash;
  let best = -Infinity;
  for (const c of state.companies) if (c.id !== me) best = Math.max(best, c.cash);
  return mine - (best === -Infinity ? 0 : best);
}

export interface SearchResult {
  plan: PlanDescriptor; // the chosen this-turn plan
  value: number; // its look-ahead leaf value
  nodes: number; // playTurn sims spent (≤ nodeBudget)
  depth: number; // depth actually searched
  ranked: { plan: PlanDescriptor; value: number }[]; // depth-1 ordering (for tests/inspection)
}

/**
 * Evaluate committing to `plan` THIS turn from `state`, then playing the best heuristic continuation
 * for `depth-1` more turns (we re-choose among candidate plans each future turn; rivals stay on the
 * opponent model). Returns the leaf cash advantage. `budget` caps the number of playTurn sims.
 */
function evalPlanRec(
  state: GameState,
  me: CompanyId,
  plan: PlanDescriptor,
  depth: number,
  profileId: string,
  opts: SearchOpts,
  budget: { left: number },
  ordered: PlanDescriptor[],
): number {
  budget.left -= 1;
  const ns = playTurn(state, rolloutPolicies(state, me, planPolicy(plan, profileId), opts.opponentTier));
  if (ns.ended || depth <= 1 || budget.left <= 0) return leafEval(ns, me);
  let best = -Infinity;
  for (const next of ordered) {
    if (budget.left <= 0) break;
    best = Math.max(best, evalPlanRec(ns, me, next, depth - 1, profileId, opts, budget, ordered));
  }
  // if the budget cut us off before any continuation ran, fall back to the static leaf
  return best === -Infinity ? leafEval(ns, me) : best;
}

/** Public helper for tests: the leaf value of a single plan at a given look-ahead depth. */
export function evalPlan(
  state: GameState,
  me: CompanyId,
  plan: PlanDescriptor,
  depth: number,
  profileId: string = DEFAULT_PROFILE,
  opts: SearchOpts = DEFAULT_SEARCH,
): number {
  const ordered = candidatePlans(profileId);
  return evalPlanRec(state, me, plan, depth, profileId, opts, { left: opts.nodeBudget }, ordered);
}

/** Choose this turn's plan for company `me` by multi-turn look-ahead from `state`. */
export function searchPlan(
  state: GameState,
  me: CompanyId,
  profileId: string = DEFAULT_PROFILE,
  opts: SearchOpts = DEFAULT_SEARCH,
): SearchResult {
  const plans = candidatePlans(profileId);
  const budget = { left: opts.nodeBudget };

  // Depth-1 pass: a cheap one-turn rollout per candidate. Doubles as MOVE ORDERING for the deep pass.
  const ranked = plans
    .map((plan) => {
      budget.left -= 1;
      const ns = playTurn(state, rolloutPolicies(state, me, planPolicy(plan, profileId), opts.opponentTier));
      return { plan, value: leafEval(ns, me) };
    })
    .sort((a, b) => b.value - a.value);
  const ordered = ranked.map((r) => r.plan);

  if (opts.depth <= 1) {
    const top = ranked[0];
    return { plan: top.plan, value: top.value, nodes: opts.nodeBudget - budget.left, depth: 1, ranked };
  }

  // Deep pass, best-first. Branch-and-bound: a candidate whose depth-1 value already trails the best
  // depth-`depth` value by more than the most one extra turn could swing can't win — skip its subtree.
  let best = ordered[0];
  let bestV = -Infinity;
  for (const { plan, value: d1 } of ranked) {
    if (budget.left <= 0) break;
    if (bestV > -Infinity && d1 + opts.swingPerTurn * (opts.depth - 1) < bestV) continue; // prune
    const v = evalPlanRec(state, me, plan, opts.depth, profileId, opts, budget, ordered);
    if (v > bestV) {
      bestV = v;
      best = plan;
    }
  }
  return { plan: best, value: bestV, nodes: opts.nodeBudget - budget.left, depth: opts.depth, ranked };
}

/**
 * The Hard seat's policy. The search runs once per turn at the clean restructuring boundary (the only
 * point where playTurn can simulate whole turns from the start); the chosen plan is cached and the
 * `work` phase replays it, so restructuring and working stay consistent.
 */
export function makeSearchAI(profileId: string = DEFAULT_PROFILE, opts: SearchOpts = DEFAULT_SEARCH): Policy {
  let cache: { turn: number; policy: Policy } | null = null;
  const planFor = (state: GameState, id: CompanyId): Policy => {
    if (!cache || cache.turn !== state.turn) {
      const { plan } = searchPlan(state, id, profileId, opts);
      cache = { turn: state.turn, policy: planPolicy(plan, profileId) };
    }
    return cache.policy;
  };
  return {
    restructure: (state, id) => planFor(state, id).restructure(state, id),
    work: (state, id) => planFor(state, id).work(state, id),
  };
}
