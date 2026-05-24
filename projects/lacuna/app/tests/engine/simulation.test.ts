import { describe, expect, it } from "vitest";
import {
  applyAction,
  beaconsPlacedBy,
  createGame,
  hasLegalMove,
  legalMoves,
  makeConfig,
  placementOrder,
} from "../../src/engine";
import type { GameState } from "../../src/engine";

// A simple bot: place a random legal pair (beacon at the midpoint), else pass.
function playRandomGame(seed: number, players = 2): { state: GameState; steps: number } {
  let g = createGame(seed, makeConfig(players));
  let steps = 0;
  while (g.phase === "play" && steps < 500) {
    if (hasLegalMove(g)) {
      const moves = legalMoves(g);
      const m = moves[Math.floor(Math.random() * moves.length)];
      const a = g.stars.find((s) => s.id === m.aStarId)!;
      const b = g.stars.find((s) => s.id === m.bStarId)!;
      g = applyAction(g, {
        type: "place",
        aStarId: a.id,
        bStarId: b.id,
        x: (a.x + b.x) / 2,
        y: (a.y + b.y) / 2,
      });
    } else {
      g = applyAction(g, { type: "pass" });
    }
    steps++;
  }
  return { state: g, steps };
}

describe("full-game simulation", () => {
  it("always terminates with valid invariants across many seeds", () => {
    let reachedTwelve = 0;
    for (let seed = 1; seed <= 40; seed++) {
      const { state: g, steps } = playRandomGame(seed);
      expect(g.phase).toBe("ended");
      expect(steps).toBeLessThan(500);

      // beacon counts never exceed the per-player budget
      expect(beaconsPlacedBy(g, 0)).toBeLessThanOrEqual(6);
      expect(beaconsPlacedBy(g, 1)).toBeLessThanOrEqual(6);
      expect(g.beacons.length).toBeLessThanOrEqual(12);
      if (g.beacons.length === 12) reachedTwelve++;

      // every star is accounted for: collected + territory + discarded === 49
      const total =
        g.finalByColor![0].reduce((s, n) => s + n, 0) +
        g.finalByColor![1].reduce((s, n) => s + n, 0) +
        g.discarded;
      expect(total).toBe(49);

      expect(g.colorWinners!.length).toBe(7);
      expect(g.result === "draw" || g.result === 0 || g.result === 1).toBe(true);
    }
    // most random games place all 12 beacons — sanity that the normal path is hit
    expect(reachedTwelve).toBeGreaterThan(0);
  });

  it("round-robin order keeps 12 pawns split evenly for 2-4 players", () => {
    expect(placementOrder(2, 6)).toEqual([0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1]);
    expect(placementOrder(3, 4)).toEqual([0, 1, 2, 0, 1, 2, 0, 1, 2, 0, 1, 2]);
    for (const players of [2, 3, 4]) {
      const o = placementOrder(players, 12 / players);
      expect(o.length).toBe(12);
      for (let p = 0; p < players; p++) {
        expect(o.filter((x) => x === p).length).toBe(12 / players);
      }
    }
  });

  it("terminates with valid invariants for 3- and 4-player games", () => {
    for (const players of [3, 4]) {
      for (let seed = 1; seed <= 12; seed++) {
        const { state: g } = playRandomGame(seed, players);
        expect(g.phase).toBe("ended");
        expect(g.beacons.length).toBeLessThanOrEqual(12);
        for (let p = 0; p < players; p++) {
          expect(beaconsPlacedBy(g, p)).toBeLessThanOrEqual(12 / players);
        }
        const total =
          g.finalByColor!.reduce((s, row) => s + row.reduce((a, n) => a + n, 0), 0) + g.discarded;
        expect(total).toBe(49);
        expect(typeof g.result === "number" || g.result === "draw").toBe(true);
      }
    }
  });

  it("is deterministic: replaying the action log reproduces the final state", () => {
    for (let seed = 1; seed <= 10; seed++) {
      const { state: g } = playRandomGame(seed);
      let r = createGame(seed);
      for (const act of g.log) r = applyAction(r, act);
      expect(r.stars).toEqual(g.stars);
      expect(r.beacons).toEqual(g.beacons);
      expect(r.finalByColor).toEqual(g.finalByColor);
      expect(r.result).toBe(g.result);
    }
  });
});
