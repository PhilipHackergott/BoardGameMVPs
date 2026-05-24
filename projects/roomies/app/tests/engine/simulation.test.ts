import { describe, it, expect } from "vitest";
import { createGame } from "../../src/engine/setup";
import { applyAction } from "../../src/engine/rules";
import { playOptionsFor, canPlay, envUsedRaum, envCapacity } from "../../src/engine/legalMoves";
import { scoreGame } from "../../src/engine/scoring";
import { mulberry32 } from "../../src/engine/rng";
import type { Action, GameState } from "../../src/engine/types";

/** Drive a full two-phase game with a random-but-legal policy. */
function playRandomGame(seed: number, players: number): GameState {
  let state = createGame({ players }, seed);
  const rng = mulberry32((seed ^ 0x9e3779b9) >>> 0);
  const pick = <T>(arr: T[]): T => arr[Math.floor(rng() * arr.length)];
  let guard = 0;

  while (state.phase !== "ended") {
    if (++guard > 8000) throw new Error("game did not terminate");

    if (state.pending?.type === "martySwap") {
      state = applyAction(state, { type: "resolveMarty", withPlayer: rng() < 0.5 ? null : pick(state.pending.options) });
      continue;
    }

    if (state.phase === "draft") {
      const hand = state.hands[state.current];
      expect(hand.length).toBeGreaterThan(0);
      state = applyAction(state, { type: "draftPick", cardId: pick(hand) });
      continue;
    }

    // place phase
    const me = state.players[state.current];
    if (me.pool.length === 0) {
      state = applyAction(state, { type: "endPlacement" });
      continue;
    }
    const cardId = pick(me.pool);
    let action: Action;
    if (canPlay(state, state.current, cardId)) {
      const opt = playOptionsFor(state, state.current, cardId);
      if (opt.kind === "env") action = { type: "place", cardId };
      else if (opt.kind === "animal") action = { type: "place", cardId, targetEnvCardId: pick(opt.envCardIds) };
      else if (opt.animalCardIds.length > 0 && (opt.envCardIds.length === 0 || rng() < 0.5))
        action = { type: "place", cardId, targetAnimalCardId: pick(opt.animalCardIds) };
      else action = { type: "place", cardId, targetEnvCardId: pick(opt.envCardIds) };
    } else {
      action = { type: "discardFromPool", cardId };
    }
    state = applyAction(state, action);
  }
  return state;
}

describe("full-game simulation (two-phase)", () => {
  for (const players of [2, 3, 4]) {
    for (const seed of [1, 2, 7, 42, 1000]) {
      it(`terminates, conserves cards, respects Raum (players=${players}, seed=${seed})`, () => {
        const end = playRandomGame(seed, players);

        expect(end.phase).toBe("ended");
        expect(end.round).toBe(end.config.rounds);
        expect(end.hands.every((h) => h.length === 0)).toBe(true);
        expect(end.players.every((p) => p.pool.length === 0)).toBe(true);

        for (const pl of end.players)
          for (const env of pl.environments) expect(envUsedRaum(env, end.cards)).toBeLessThanOrEqual(envCapacity(env));

        // Every one of the 94 cards is in exactly one place.
        const placed: number[] = [...end.deck];
        end.hands.forEach((h) => placed.push(...h));
        for (const pl of end.players) {
          placed.push(...pl.pool, ...pl.discard);
          for (const env of pl.environments) placed.push(env.cardId, ...env.animalIds);
        }
        expect(placed.slice().sort((a, b) => a - b)).toEqual(Array.from({ length: 94 }, (_, i) => i));

        expect(end.scores?.length).toBe(players);
      });
    }
  }

  it("is deterministic: replaying the action log reproduces the final scores", () => {
    const end = playRandomGame(42, 4);
    let replay = createGame({ players: 4 }, 42);
    for (const a of end.log) replay = applyAction(replay, a);
    expect(scoreGame(replay)).toEqual(end.scores);
  });
});
