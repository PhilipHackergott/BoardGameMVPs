// Headless random-playout harness. This is exactly what an AI driver would consume (legalActions
// + apply over `view`), proving the engine is AI-ready. Used by simulation.test for termination,
// legality, and determinism checks.

import type { Action, GameState } from './types';
import { createGame } from './setup';
import { apply, legalActions } from './rules';
import { makeRng } from './rng';

export interface SimResult {
  state: GameState;
  steps: number;
  actions: Action[];
  terminated: boolean; // stopped cleanly (winner or turn cap) without a deadlock
  deadlock: boolean; // legalActions was empty mid-game (a bug)
  reachedWinner: boolean;
}

/** Play a game by choosing legal actions (default policy nudges toward progress). Stops at a
 *  winner, a turn cap (random play rarely finishes a full WotR game), or a step budget. `chooser`
 *  lets a test inject a different policy (e.g. an AI). The real invariant is: never deadlocks. */
export function playRandomGame(
  seed: number,
  maxSteps = 4000,
  maxTurns = 40,
  chooser?: (state: GameState, options: Action[], rngPick: (n: number) => number) => Action,
): SimResult {
  let state = createGame({ scenario: 'base-2p', fpSeatName: 'FP', shadowSeatName: 'Shadow' }, seed);
  const pickRng = makeRng(seed ^ 0x1234abcd);
  const actions: Action[] = [];
  let steps = 0;
  let deadlock = false;

  while (!state.winner && steps < maxSteps && state.turn <= maxTurns) {
    const options = legalActions(state);
    if (options.length === 0) {
      deadlock = true;
      break;
    }
    const action = chooser
      ? chooser(state, options, (n) => pickRng.int(n))
      : defaultChooser(state, options, (n) => pickRng.int(n));
    actions.push(action);
    state = apply(state, action);
    steps++;
  }
  return {
    state,
    steps,
    actions,
    terminated: !deadlock && steps < maxSteps,
    deadlock,
    reachedWinner: !!state.winner,
  };
}

/** A light policy that nudges the game toward completion: clear outcomes/combat first, then a
 *  random action, biased away from forfeiting everything immediately. */
function defaultChooser(_state: GameState, options: Action[], rngPick: (n: number) => number): Action {
  const priority = options.find((a) => a.type === 'clearOutcome' || a.type === 'combatRound' || a.type === 'recoverAndDraw' || a.type === 'rollDice');
  if (priority) return priority;
  return options[rngPick(options.length)];
}

/** Replay an action list from a fresh game with the same seed; returns the reconstructed state. */
export function replay(seed: number, actions: Action[]): GameState {
  let state = createGame({ scenario: 'base-2p', fpSeatName: 'FP', shadowSeatName: 'Shadow' }, seed);
  for (const a of actions) state = apply(state, a);
  return state;
}
