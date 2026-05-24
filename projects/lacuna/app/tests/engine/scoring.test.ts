import { describe, expect, it } from "vitest";
import { DEFAULT_CONFIG, finalize } from "../../src/engine";
import type { Beacon, GameState, Star } from "../../src/engine";

function endState(stars: Star[], beacons: Beacon[], collected: number[][]): GameState {
  return {
    config: DEFAULT_CONFIG,
    seed: 0,
    stars,
    beacons,
    collected,
    current: 0,
    order: [0, 1],
    turnIndex: 0,
    passesInARow: 0,
    phase: "play",
    log: [],
    finalByColor: null,
    colorWinners: null,
    discarded: 0,
    result: null,
    territory: null,
    powers: [[], []],
    barriers: [],
    flexPassUsed: [false, false],
    flexExtraUsed: [false, false],
    patronUsed: [false, false],
    freePicks: [],
    lastPlace: null,
    catalystUsed: [false, false],
    phantomNext: [false, false],
    nomadUsed: [false, false],
    repelOrigin: null,
    affinity: [null, null],
    frozenStars: [],
    duskPending: false,
    abyssPending: false,
    bonusBeacons: [0, 0],
    momentumColor: [null, null],
    momentumStreak: [0, 0],
  };
}

const zero = () => new Array(7).fill(0);

describe("finalize", () => {
  it("awards territory to the nearest beacon, discards equidistant stars, and picks color/overall winners", () => {
    const beacons: Beacon[] = [
      { id: 0, owner: 0, x: 0, y: 0 },
      { id: 1, owner: 1, x: 100, y: 0 },
    ];
    const stars: Star[] = [
      { id: 0, color: 0, x: 10, y: 0 }, // -> P0
      { id: 1, color: 0, x: 90, y: 0 }, // -> P1
      { id: 2, color: 1, x: 50, y: 0 }, // equidistant -> discard
    ];
    const collected = [zero(), zero()];
    collected[0][0] = 2; // P0 collected a pair of color 0 in play

    const g = finalize(endState(stars, beacons, collected));
    expect(g.phase).toBe("ended");
    expect(g.finalByColor![0][0]).toBe(3); // 2 collected + 1 territory
    expect(g.finalByColor![1][0]).toBe(1);
    expect(g.discarded).toBe(1);
    expect(g.colorWinners![0]).toBe(0);
    expect(g.colorWinners![1]).toBeNull(); // discarded -> 0-0 tie
    expect(g.result).toBe(0);

    // territory records who claimed each leftover flower (null = discarded).
    expect(g.territory).toHaveLength(3);
    expect(g.territory!.find((t) => t.starId === 0)!.owner).toBe(0);
    expect(g.territory!.find((t) => t.starId === 1)!.owner).toBe(1);
    expect(g.territory!.find((t) => t.starId === 2)!.owner).toBeNull();
  });

  it("declares a draw when colors won and totals are equal", () => {
    const beacons: Beacon[] = [
      { id: 0, owner: 0, x: 0, y: 0 },
      { id: 1, owner: 1, x: 100, y: 0 },
    ];
    const stars: Star[] = [
      { id: 0, color: 0, x: 10, y: 0 }, // -> P0 wins color 0
      { id: 1, color: 1, x: 90, y: 0 }, // -> P1 wins color 1
    ];
    const g = finalize(endState(stars, beacons, [zero(), zero()]));
    expect(g.colorWinners![0]).toBe(0);
    expect(g.colorWinners![1]).toBe(1);
    expect(g.result).toBe("draw");
  });
});
