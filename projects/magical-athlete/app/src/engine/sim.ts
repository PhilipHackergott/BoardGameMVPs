// Headless match driver — plays a full match by always taking the first legal action.
// Used by tests (and a dev debug view) to prove the loop terminates and is deterministic.

import type { MatchConfig, MatchState } from './types';
import { createMatch } from './setup';
import { applyAction, legalActions } from './rules';

export function simulateMatch(config: MatchConfig, maxSteps = 100_000): MatchState {
  let s = createMatch(config);
  let steps = 0;
  while (s.phase !== 'ended') {
    const actions = legalActions(s);
    if (actions.length === 0) throw new Error(`no legal actions in phase ${s.phase}`);
    s = applyAction(s, actions[0]);
    if (++steps > maxSteps) throw new Error('simulation did not terminate');
  }
  return s;
}

/** Replay a recorded action log from a fresh match (must reproduce the same final state). */
export function replay(config: MatchConfig, log: MatchState['log']): MatchState {
  let s = createMatch(config);
  for (const action of log) s = applyAction(s, action);
  return s;
}
