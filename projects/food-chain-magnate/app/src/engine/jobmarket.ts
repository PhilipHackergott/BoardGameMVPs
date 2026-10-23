// The shared job market: hiring entry cards and training cards up their tracks. Mutates `state`.
//
// Hiring: only entry (►) cards, only if a copy is available in the market. Training: a beach card
// (not at work) advances one step along its def's trainsInto; the target must be available, and the
// old card returns to the market. (Multi-step coach/guru training is done by repeated single steps;
// the "intermediates needn't be in stock" nuance is a noted M2 simplification — see README.)

import { EMPLOYEES } from './data/employees';
import type { Company, GameState } from './types';

export function hireAvailable(state: GameState, defId: string): boolean {
  const def = EMPLOYEES[defId];
  return !!def && def.entry && (state.jobMarket[defId] ?? 0) > 0;
}

export function hire(state: GameState, c: Company, defId: string): boolean {
  if (!hireAvailable(state, defId)) return false;
  state.jobMarket[defId] -= 1;
  c.cards.push({ uid: state.nextCardUid++, defId, atWork: false });
  c.hireMilestoneCount += 1;
  return true;
}

export function trainable(state: GameState, c: Company, uid: number, intoId: string): boolean {
  const card = c.cards.find((x) => x.uid === uid);
  if (!card || card.atWork) return false; // only beach cards may be trained
  const def = EMPLOYEES[card.defId];
  if (!def.trainsInto?.includes(intoId)) return false;
  return (state.jobMarket[intoId] ?? 0) > 0;
}

export function train(state: GameState, c: Company, uid: number, intoId: string): boolean {
  if (!trainable(state, c, uid, intoId)) return false;
  const card = c.cards.find((x) => x.uid === uid)!;
  state.jobMarket[intoId] -= 1;
  state.jobMarket[card.defId] = (state.jobMarket[card.defId] ?? 0) + 1; // return old card to the market
  card.defId = intoId;
  return true;
}
