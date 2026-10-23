// M1 turn driver + a scripted full-game runner.
//
// In M1 there is no org chart / working phase yet (those are M2). The "sell loop" runs Dinnertime
// then Payday on a state whose demand + stock have been set (by a script in M1; by marketing +
// production from M3 onward). A game ends when the bank breaks a second time — the richest chain
// wins. This driver is also what an AI / the headless balance sim will eventually step (M4).

import { determineWinner } from './bank';
import { payday } from './payday';
import { resolveDinnertime } from './selling';
import type { GameState } from './types';

/** Run one turn's Dinnertime + Payday. Assumes demand & stock for this turn are already set. */
export function runTurn(state: GameState): GameState {
  const { state: afterSell } = resolveDinnertime(state);
  const s = payday(afterSell); // returns a fresh state we own
  s.turn += 1;
  if (s.endAfterPhase && !s.ended) {
    s.ended = true;
    s.winner = determineWinner(s);
  }
  return s;
}

/** A per-turn setup hook: mutate the state's demand + stock for the turn about to be played. */
export type TurnScript = (state: GameState, turn: number) => void;

/** Play a scripted game to its end (2nd bank break) or a turn cap, applying `script` each turn. */
export function simulateScriptedGame(initial: GameState, script: TurnScript, maxTurns = 200): GameState {
  let s = initial;
  while (!s.ended && s.turn <= maxTurns) {
    s = structuredClone(s) as GameState;
    script(s, s.turn);
    s = runTurn(s);
  }
  return s;
}
