// Hard-tier multi-turn search: it stays within its (deterministic, node-count) budget on a real
// mid-game state, and on a hand-crafted scenario it finds a plan that strictly dominates the one a
// 1-turn (greedy) evaluator would pick — proving the look-ahead actually buys something.

import { describe, it, expect } from 'vitest';
import { createGame, emptyGoods, playTurn, type GameState, type Policies } from '../../src/engine';
import { makeAI } from '../../src/ai/ai';
import { candidatePlans, evalPlan, searchPlan, DEFAULT_SEARCH } from '../../src/ai/search';

const SEATS2 = [
  { kind: 'ai' as const, aiProfile: 'old-hubbard' },
  { kind: 'ai' as const, aiProfile: 'old-hubbard' },
];

describe('Hard search — budget', () => {
  it('runs within the node budget on a representative mid-game state and returns a real plan', () => {
    // Reach a clean mid-game turn boundary by playing a few Hard-vs-Med turns.
    let s = createGame({ players: 2, seed: 7, seats: SEATS2 });
    const pol: Policies = { 0: makeAI('hard', 'old-hubbard'), 1: makeAI('med', 'old-hubbard') };
    for (let i = 0; i < 4 && !s.ended; i++) s = playTurn(s, pol);
    expect(s.ended).toBe(false); // a genuine mid-game position, not a finished game

    const res = searchPlan(s, 0, 'old-hubbard', DEFAULT_SEARCH);
    // The budget is a deterministic SIM COUNT (not wall-clock) so the ladder stays reproducible.
    expect(res.nodes).toBeGreaterThan(0);
    expect(res.nodes).toBeLessThanOrEqual(DEFAULT_SEARCH.nodeBudget);
    expect(res.depth).toBe(2);
    expect(candidatePlans('old-hubbard').map((p) => p.label)).toContain(res.plan.label);

    // Deterministic: same state → same decision and same cost (no chance nodes).
    const again = searchPlan(s, 0, 'old-hubbard', DEFAULT_SEARCH);
    expect({ plan: again.plan.label, nodes: again.nodes }).toEqual({ plan: res.plan.label, nodes: res.nodes });
  });
});

describe('Hard search — look-ahead dominance', () => {
  // A position where the only profitable play is marketing, whose demand is served NEXT turn. Company
  // 0 has 3 billboard marketeers + a burger cook and reaches two houses from its restaurant: a garden
  // (pays ×2, holds up to 5) and a plain house. Concentrating all 3 billboards on the garden yields
  // 3 burgers × $10 × 2 = $60 next Dinnertime; spreading (2 garden + 1 plain) yields only
  // $40 + $10 = $50. The opponent has no restaurant, so it can't contest the houses.
  function craftLookaheadState(): GameState {
    const s = createGame({ players: 2, seed: 1, seats: SEATS2 });
    s.map.houses = [
      { id: 1, tile: '0,1', garden: true, demand: emptyGoods() }, // adjacent to company 0's (0,0)
      { id: 2, tile: '1,0', garden: false, demand: emptyGoods() }, // also adjacent to (0,0)
    ];
    s.map.drinkSources = [];

    const c0 = s.companies[0];
    c0.restaurants = ['0,0'];
    c0.cash = 500; // deep enough to ride out salary while the marketing matures
    let uid = s.nextCardUid;
    c0.cards = [
      { uid: uid++, defId: 'ceo', atWork: true },
      { uid: uid++, defId: 'junior-vp', atWork: false }, // +3 slots so all six cards fit the org chart
      { uid: uid++, defId: 'burger-cook', atWork: false }, // 3 burgers/turn → enough to serve the garden
      { uid: uid++, defId: 'marketing-trainee', atWork: false },
      { uid: uid++, defId: 'marketing-trainee', atWork: false },
      { uid: uid++, defId: 'marketing-trainee', atWork: false },
    ];
    s.nextCardUid = uid;

    s.companies[1].restaurants = []; // opponent can't reach any house → isolates company 0's payoff
    s.companies[1].cash = 0;
    s.bank = 100_000; // keep the bank deep so the 2-turn rollout fully resolves (no early bank-break)
    s.turn = 4;
    return s;
  }

  it('the depth-2 search picks the concentrate plan the 1-turn evaluator is blind to', () => {
    const s = craftLookaheadState();

    // A 1-turn evaluator only sees THIS turn's Dinnertime — but marketing placed now pays next turn,
    // so every candidate looks identical to it and it falls back to the status-quo (scored) plan.
    const greedy = searchPlan(s, 0, 'old-hubbard', { ...DEFAULT_SEARCH, depth: 1 });
    expect(greedy.plan.targeting).not.toBe('concentrate');

    // The depth-2 search sees the garden payoff mature and switches to concentrating on it.
    const deep = searchPlan(s, 0, 'old-hubbard', DEFAULT_SEARCH);
    expect(deep.plan.targeting).toBe('concentrate');
    expect(deep.plan.product).toBe('burger');
  });

  it("the search's plan strictly dominates the greedy plan at the 2-turn horizon", () => {
    const s = craftLookaheadState();
    const greedy = searchPlan(s, 0, 'old-hubbard', { ...DEFAULT_SEARCH, depth: 1 });
    const deep = searchPlan(s, 0, 'old-hubbard', DEFAULT_SEARCH);

    // Evaluate BOTH chosen plans two turns out: the search's pick must end strictly richer.
    const vDeep = evalPlan(s, 0, deep.plan, 2, 'old-hubbard');
    const vGreedy = evalPlan(s, 0, greedy.plan, 2, 'old-hubbard');
    expect(vDeep).toBeGreaterThan(vGreedy);

    // And the two evaluators genuinely disagree only because of look-ahead: at depth 1 the very same
    // plans tie (marketing hasn't paid yet), so the gap is created entirely by the extra turn.
    const d1Deep = evalPlan(s, 0, deep.plan, 1, 'old-hubbard');
    const d1Greedy = evalPlan(s, 0, greedy.plan, 1, 'old-hubbard');
    expect(d1Deep).toBe(d1Greedy);
  });
});
