import { describe, expect, it } from "vitest";
import {
  applyAction,
  beaconsLeft,
  createGame,
  DEFAULT_CONFIG,
  isLegalPlacement,
  legalMoves,
  legalPartners,
} from "../../src/engine";
import type { GameState, Star } from "../../src/engine";

function customState(stars: Star[]): GameState {
  return {
    config: DEFAULT_CONFIG,
    seed: 0,
    stars,
    beacons: [],
    collected: [new Array(7).fill(0), new Array(7).fill(0)],
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

const mid = (a: Star, b: Star) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });

describe("legality", () => {
  it("finds legal partners of the same color via a clear line", () => {
    const s: Star[] = [
      { id: 0, color: 0, x: 0, y: 0 },
      { id: 1, color: 0, x: 100, y: 0 },
      { id: 2, color: 1, x: 0, y: 100 },
    ];
    const state = customState(s);
    expect(legalPartners(state, 0)).toEqual([1]); // same color, clear
  });

  it("rejects a different-color pair", () => {
    const s: Star[] = [
      { id: 0, color: 0, x: 0, y: 0 },
      { id: 1, color: 1, x: 100, y: 0 },
    ];
    const r = isLegalPlacement(customState(s), 0, 1);
    expect(r.ok).toBe(false);
  });

  it("rejects a blocked line", () => {
    const s: Star[] = [
      { id: 0, color: 0, x: 0, y: 0 },
      { id: 1, color: 0, x: 100, y: 0 },
      { id: 2, color: 5, x: 50, y: 2 }, // sits on the line
    ];
    const r = isLegalPlacement(customState(s), 0, 1);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toMatch(/blocked/i);
  });
});

describe("applyAction", () => {
  it("places a beacon, removes the two stars, credits the color, flips the player", () => {
    const g = createGame(42);
    const m = legalMoves(g)[0];
    const a = g.stars.find((s) => s.id === m.aStarId)!;
    const b = g.stars.find((s) => s.id === m.bStarId)!;
    const color = a.color;
    const p = mid(a, b);
    const g2 = applyAction(g, { type: "place", aStarId: a.id, bStarId: b.id, x: p.x, y: p.y });

    expect(g2.stars.length).toBe(47);
    expect(g2.stars.find((s) => s.id === a.id)).toBeUndefined();
    expect(g2.beacons.length).toBe(1);
    expect(g2.beacons[0].owner).toBe(0);
    expect(g2.collected[0][color]).toBe(2);
    expect(g2.current).toBe(1);
    // input must not be mutated
    expect(g.stars.length).toBe(49);
  });

  it("alternates players across moves", () => {
    let g = createGame(7);
    const owners: number[] = [];
    for (let i = 0; i < 4; i++) {
      const m = legalMoves(g)[0];
      const a = g.stars.find((s) => s.id === m.aStarId)!;
      const b = g.stars.find((s) => s.id === m.bStarId)!;
      const p = mid(a, b);
      g = applyAction(g, { type: "place", aStarId: a.id, bStarId: b.id, x: p.x, y: p.y });
      owners.push(g.beacons[g.beacons.length - 1].owner);
    }
    expect(owners).toEqual([0, 1, 0, 1]);
  });

  it("ends the game after two consecutive passes", () => {
    const g = createGame(3);
    const g2 = applyAction(g, { type: "pass" });
    expect(g2.phase).toBe("play");
    const g3 = applyAction(g2, { type: "pass" });
    expect(g3.phase).toBe("ended");
    expect(g3.result).not.toBeNull();
  });

  it("throws on an illegal placement", () => {
    const s: Star[] = [
      { id: 0, color: 0, x: 0, y: 0 },
      { id: 1, color: 1, x: 100, y: 0 },
    ];
    expect(() => applyAction(customState(s), { type: "place", aStarId: 0, bStarId: 1, x: 50, y: 0 })).toThrow();
  });

  it("tracks beacons remaining per player", () => {
    const g = createGame(11);
    expect(beaconsLeft(g, 0)).toBe(6);
    expect(beaconsLeft(g, 1)).toBe(6);
  });
});

describe("starting pick (setup)", () => {
  it("claims one flower, credits the color, and enters play with the same player", () => {
    const g = createGame(5, DEFAULT_CONFIG, true);
    expect(g.phase).toBe("setup");
    const star = g.stars[0];
    const g2 = applyAction(g, { type: "claim", starId: star.id });
    expect(g2.phase).toBe("play");
    expect(g2.stars.length).toBe(48);
    expect(g2.collected[0][star.color]).toBe(1);
    expect(g2.current).toBe(0); // the claimer places first
  });

  it("forbids placing before the starting pick is made", () => {
    const g = createGame(5, DEFAULT_CONFIG, true);
    const m = legalMoves(g)[0];
    expect(() =>
      applyAction(g, { type: "place", aStarId: m.aStarId, bStarId: m.bStarId, x: 0, y: 0 }),
    ).toThrow();
  });
});
