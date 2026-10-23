// Campaign objective & fail-condition vocabulary (composable predicates) — the same data-driven
// hook pattern as milestones. A scenario is a setup + a list of these. The engine evaluates them
// against a (finished or in-progress) state; the campaign layer reads the result.

import type { CompanyId, GameState } from './types';

export type Objective =
  | { kind: 'richestAtEnd' }
  | { kind: 'cashBy'; amount: number; turn: number }
  | { kind: 'employeesFirstTo'; n: number }
  | { kind: 'bankruptRivals'; count?: number }
  | { kind: 'outlastAll' };

export type Fail = { kind: 'turnLimit'; turn: number } | { kind: 'wentBroke' };

export interface ObjectiveResult {
  met: boolean;
  label: string;
}

function companyCash(s: GameState, id: CompanyId): number {
  return s.companies[id]?.cash ?? 0;
}

export function evaluateObjective(s: GameState, me: CompanyId, o: Objective): ObjectiveResult {
  switch (o.kind) {
    case 'richestAtEnd': {
      const top = Math.max(...s.companies.map((c) => c.cash));
      return { met: s.ended && companyCash(s, me) === top, label: `Be the richest when the bank empties` };
    }
    case 'cashBy': {
      return { met: companyCash(s, me) >= o.amount && s.turn <= o.turn, label: `Reach $${o.amount} by turn ${o.turn}` };
    }
    case 'employeesFirstTo': {
      const mine = s.companies[me].cards.length;
      const lead = s.companies.every((c) => c.id === me || c.cards.length < mine);
      return { met: mine >= o.n && lead, label: `First to ${o.n} employees` };
    }
    case 'bankruptRivals': {
      const need = o.count ?? s.companies.length - 1;
      const broke = s.companies.filter((c) => c.id !== me && c.cash <= 0).length;
      return { met: broke >= need, label: `Bankrupt ${need} rival${need > 1 ? 's' : ''}` };
    }
    case 'outlastAll': {
      const solvent = s.companies.filter((c) => c.cash > 0);
      return { met: s.ended && solvent.length === 1 && solvent[0].id === me, label: `Outlast every rival` };
    }
  }
}

export function evaluateFail(s: GameState, me: CompanyId, f: Fail): boolean {
  if (f.kind === 'turnLimit') return s.turn > f.turn && !s.ended;
  return s.companies[me].cash <= 0 && s.ended; // wentBroke
}

export type Outcome = 'win' | 'lose' | 'ongoing';

export function scenarioOutcome(s: GameState, me: CompanyId, objectives: Objective[], fails: Fail[]): Outcome {
  if (fails.some((f) => evaluateFail(s, me, f))) return 'lose';
  const allMet = objectives.every((o) => evaluateObjective(s, me, o).met);
  if (allMet && (s.ended || objectives.every((o) => o.kind !== 'richestAtEnd' && o.kind !== 'outlastAll'))) return 'win';
  return s.ended ? 'lose' : 'ongoing';
}
