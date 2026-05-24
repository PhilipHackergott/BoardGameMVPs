import { describe, it, expect } from "vitest";
import { createGame } from "../../src/engine/setup";
import { applyAction } from "../../src/engine/rules";
import { aiDraftPick, aiMartySwap, aiPlaceAction } from "../../src/ai/ai";
import type { GameState, SeatType } from "../../src/engine/types";

/** Play a game where every seat is an AI of its configured difficulty. */
function playAiGame(seed: number, seats: SeatType[]): GameState {
  let s = createGame({ seats }, seed);
  let guard = 0;
  while (s.phase !== "ended") {
    if (++guard > 10000) throw new Error("AI game did not terminate");
    const diff = s.config.seats[s.current];
    if (s.pending?.type === "martySwap") {
      s = applyAction(s, { type: "resolveMarty", withPlayer: aiMartySwap(s, diff) });
    } else if (s.phase === "draft") {
      s = applyAction(s, { type: "draftPick", cardId: aiDraftPick(s, diff) });
    } else {
      s = applyAction(s, aiPlaceAction(s, diff));
    }
  }
  return s;
}

describe("AI plays full games legally to completion", () => {
  const configs: SeatType[][] = [
    ["easy", "easy"],
    ["medium", "medium", "medium"],
    ["hard", "hard", "hard", "hard"],
    ["easy", "medium", "hard"],
  ];
  for (const seats of configs) {
    for (const seed of [1, 7, 99]) {
      it(`[${seats.join(",")}] seed ${seed}: terminates, legal, conserves cards`, () => {
        const end = playAiGame(seed, seats);
        expect(end.phase).toBe("ended");
        expect(end.round).toBe(3);
        expect(end.players.every((p) => p.pool.length === 0)).toBe(true);
        expect(end.scores?.length).toBe(seats.length);
        const placed: number[] = [...end.deck];
        end.hands.forEach((h) => placed.push(...h));
        for (const p of end.players) {
          placed.push(...p.pool, ...p.discard);
          for (const e of p.environments) placed.push(e.cardId, ...e.animalIds);
        }
        expect(placed.slice().sort((a, b) => a - b)).toEqual(Array.from({ length: 94 }, (_, i) => i));
      });
    }
  }

  it("Hard is not worse than Easy across several seeds (sanity)", () => {
    let hard = 0;
    let easy = 0;
    for (const seed of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]) {
      const end = playAiGame(seed, ["easy", "hard"]);
      const e = end.scores!.find((s) => s.playerId === 0)!.total;
      const h = end.scores!.find((s) => s.playerId === 1)!.total;
      if (h > e) hard++;
      else if (e > h) easy++;
    }
    expect(hard).toBeGreaterThanOrEqual(easy);
  });
});
