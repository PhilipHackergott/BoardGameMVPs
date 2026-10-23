import { describe, it, expect } from 'vitest';
import {
  CAMPAIGN_ARC,
  applyScenario,
  medalFor,
  evaluateObjective,
  scenarioOutcome,
  simulateGame,
  type Objective,
} from '../../src/engine';
import { makeAI } from '../../src/ai/ai';

describe('campaign — scenarios & objectives', () => {
  it('applyScenario builds the right seat config (1 human + rivals)', () => {
    const def = CAMPAIGN_ARC.find((s) => s.id === 'hostile-takeover')!;
    const s = applyScenario(def, 1);
    expect(s.companies).toHaveLength(4);
    expect(s.companies[0].kind).toBe('human');
    expect(s.companies.slice(1).every((c) => c.kind === 'ai')).toBe(true);
  });

  it('evaluates objective predicates', () => {
    const def = CAMPAIGN_ARC[0];
    const s = applyScenario(def, 1);
    s.companies[0].cash = 80;
    const cashBy: Objective = { kind: 'cashBy', amount: 60, turn: 30 };
    expect(evaluateObjective(s, 0, cashBy).met).toBe(true);
    s.companies[0].cash = 40;
    expect(evaluateObjective(s, 0, cashBy).met).toBe(false);
  });

  it('medals key off turns-to-win (lower is better)', () => {
    const def = CAMPAIGN_ARC[0]; // gold 16 / silver 22 / bronze 30
    expect(medalFor(def, 14)).toBe('gold');
    expect(medalFor(def, 20)).toBe('silver');
    expect(medalFor(def, 28)).toBe('bronze');
    expect(medalFor(def, 50)).toBeNull();
  });

  it('every shipped scenario is playable to a definite outcome', () => {
    for (const def of CAMPAIGN_ARC) {
      const policies: Record<number, ReturnType<typeof makeAI>> = {};
      policies[0] = makeAI('hard', 'burger-baron'); // the "player" seat, played by a strong AI
      def.rivals.forEach((r, i) => (policies[i + 1] = makeAI(r.tier, r.profile)));
      const end = simulateGame(applyScenario(def, 3), policies);
      expect(end.ended).toBe(true);
      const outcome = scenarioOutcome(end, 0, def.objectives, def.fails);
      expect(['win', 'lose']).toContain(outcome); // resolves definitively, never stuck 'ongoing'
    }
  });
});
