import { describe, expect, it } from "vitest";
import {
  applyAction,
  beaconsLeft,
  createGame,
  DEFAULT_CONFIG,
  finalize,
  lineClearFor,
  makeConfig,
  placementPointLegal,
} from "../../src/engine";
import type { Barrier, Beacon, GameState, PowerId, Star } from "../../src/engine";

function play(opts: {
  stars: Star[];
  beacons?: Beacon[];
  barriers?: Barrier[];
  powers?: PowerId[][];
  affinity?: (number | null)[];
  current?: number;
}): GameState {
  return {
    config: DEFAULT_CONFIG,
    seed: 0,
    stars: opts.stars,
    beacons: opts.beacons ?? [],
    collected: [new Array(7).fill(0), new Array(7).fill(0)],
    current: opts.current ?? 0,
    order: [0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1],
    turnIndex: 0,
    passesInARow: 0,
    phase: "play",
    log: [],
    finalByColor: null,
    colorWinners: null,
    discarded: 0,
    result: null,
    territory: null,
    powers: opts.powers ?? [[], []],
    barriers: opts.barriers ?? [],
    flexPassUsed: [false, false],
    flexExtraUsed: [false, false],
    patronUsed: [false, false],
    freePicks: [],
    lastPlace: null,
    catalystUsed: [false, false],
    phantomNext: [false, false],
    nomadUsed: [false, false],
    repelOrigin: null,
    affinity: opts.affinity ?? [null, null],
    frozenStars: [],
    duskPending: false,
    abyssPending: false,
    bonusBeacons: [0, 0],
    momentumColor: [null, null],
    momentumStreak: [0, 0],
  };
}

const star = (id: number, x: number, y: number, color = 0): Star => ({ id, x, y, color });

describe("Flying", () => {
  it("lets the holder cross a single blocking flower, but not others", () => {
    const a = star(0, 0, 0);
    const b = star(1, 100, 0);
    const s = play({ stars: [a, b, star(2, 50, 0, 5)], powers: [["flying"], []] });
    expect(lineClearFor(s, 0, a, b)).toBe(true); // flier crosses the one blocker
    expect(lineClearFor(s, 1, a, b)).toBe(false); // others are blocked
  });

  it("can actually place across a blocking flower end to end", () => {
    const s = play({
      stars: [star(0, 0, 0), star(1, 100, 0), star(2, 50, 0, 5)],
      powers: [["flying"], []],
    });
    const g2 = applyAction(s, { type: "place", aStarId: 0, bStarId: 1, x: 50, y: 0 });
    expect(g2.beacons.length).toBe(1);
    expect(g2.collected[0][0]).toBe(2); // the pair collected; blocker flower remains
    expect(g2.stars.find((x) => x.id === 2)).toBeDefined();
  });
});

describe("Warding", () => {
  it("blocks rival placement points and lines, but not the warder's own", () => {
    const warded: Beacon = { id: 0, owner: 1, x: 50, y: 20 }; // 20 off the line
    const s = play({
      stars: [star(0, 0, 0), star(1, 100, 0)],
      beacons: [warded],
      powers: [[], ["warding"]],
    });
    expect(placementPointLegal(s, 0, 50, 6)).toBe(false); // rival blocked near warded pawn
    expect(placementPointLegal(s, 1, 50, 6)).toBe(true); // warder is fine
    const a = s.stars[0];
    const b = s.stars[1]; // line passes 20px from the warded pawn (inside ward, outside pawn)
    expect(lineClearFor(s, 0, a, b)).toBe(false); // rival's line warded off
    expect(lineClearFor(s, 1, a, b)).toBe(true); // warder's own line is clear
  });
});

describe("Intercept", () => {
  it("a rival's barrier blocks lines that cross it", () => {
    const bar: Barrier = { owner: 1, ax: 50, ay: -50, bx: 50, by: 50 };
    const a = star(0, 0, 0);
    const b = star(1, 100, 0);
    const s = play({ stars: [a, b], barriers: [bar] });
    expect(lineClearFor(s, 0, a, b)).toBe(false); // crosses rival barrier
    expect(lineClearFor(s, 1, a, b)).toBe(true); // own barrier doesn't block
  });
});

describe("Procrastinator", () => {
  it("delays their first turn (moved to the end of the order)", () => {
    const g = createGame(1, makeConfig(2), false, [[], ["procrastinator"]]);
    expect(g.order[0]).toBe(0);
    expect(g.order[1]).toBe(0); // P0 plays twice before the procrastinator
    expect(g.order[g.order.length - 1]).toBe(1);
  });

  it("collects the whole connected same-color cluster on placement", () => {
    // three color-0 flowers in a clear horizontal chain
    const s = play({
      stars: [star(0, -80, 0), star(1, 0, 0), star(2, 80, 0)],
      powers: [["procrastinator"], []],
    });
    const g2 = applyAction(s, { type: "place", aStarId: 0, bStarId: 1, x: -40, y: 0 });
    expect(g2.collected[0][0]).toBe(3); // the whole connected chain collected
    expect(g2.stars.length).toBe(0);
  });

  it("does not follow interrupted lines (a flower behind a blocker stays)", () => {
    // A-B clear; X(2) sits behind blocker Y(3) so only an interrupted line reaches it.
    const s = play({
      stars: [star(0, 0, 0), star(1, 80, 0), star(2, 160, 0), star(3, 120, 0, 5)],
      powers: [["procrastinator"], []],
    });
    const g2 = applyAction(s, { type: "place", aStarId: 0, bStarId: 1, x: 40, y: 0 });
    expect(g2.collected[0][0]).toBe(2); // only A,B
    expect(g2.stars.find((x) => x.id === 2)).toBeDefined();
  });

  it("with Flying, follows lines crossing one blocker to reach the further flower", () => {
    const s = play({
      stars: [star(0, 0, 0), star(1, 80, 0), star(2, 160, 0), star(3, 120, 0, 5)],
      powers: [["procrastinator", "flying"], []],
    });
    const g2 = applyAction(s, { type: "place", aStarId: 0, bStarId: 1, x: 40, y: 0 });
    expect(g2.collected[0][0]).toBe(3); // flying crosses the blocker to grab X too
  });
});

describe("Spectral", () => {
  it("rivals' lines pass through your beacons, but yours still block you", () => {
    const ghost: Beacon = { id: 0, owner: 1, x: 50, y: 0 };
    const s = play({ stars: [star(0, 0, 0), star(1, 100, 0)], beacons: [ghost], powers: [[], ["spectral"]] });
    const a = s.stars[0];
    const b = s.stars[1];
    expect(lineClearFor(s, 0, a, b)).toBe(true); // rival passes through the spectral pawn
    expect(lineClearFor(s, 1, a, b)).toBe(false); // owner's own pawn still blocks
  });

  it("pulls leftover flowers from farther at nightfall", () => {
    // Star at 49 is closer to P0 (49 < 51) but spectral gives P1 the reach (51/1.05 ≈ 48.6 < 49).
    const s = play({
      stars: [star(0, 49, 0, 0)],
      beacons: [
        { id: 0, owner: 0, x: 0, y: 0 },
        { id: 1, owner: 1, x: 100, y: 0 },
      ],
      powers: [[], ["spectral"]],
    });
    const g = finalize(s);
    expect(g.finalByColor![1][0]).toBe(1);
    expect(g.finalByColor![0][0]).toBe(0);
  });
});

describe("Hoarder", () => {
  it("a won colour you hold 5+ of counts as an extra colour", () => {
    const s = play({ stars: [], powers: [["hoarder"], []], current: 0 });
    s.collected[0][0] = 6; // P0 wins colour 0 and holds 5+
    s.collected[1][1] = 2;
    s.collected[1][2] = 2; // P1 wins two colours
    // Without Hoarder, P1 leads 2 colours to 1; the bonus colour flips the result to P0.
    const g = finalize(s);
    expect(g.result).toBe(0);
  });
});

describe("Shadow Follow", () => {
  it("steals one flower when you match the previous player's color", () => {
    let s = play({
      stars: [star(0, 0, 0), star(1, 80, 0), star(2, 200, 0), star(3, 280, 0)],
      powers: [[], ["shadowfollow"]],
    });
    s = applyAction(s, { type: "place", aStarId: 0, bStarId: 1, x: 40, y: 0 }); // P0 takes color 0
    const g = applyAction(s, { type: "place", aStarId: 2, bStarId: 3, x: 240, y: 0 }); // P1 follows
    expect(g.collected[1][0]).toBe(3); // 2 collected + 1 stolen
    expect(g.collected[0][0]).toBe(1); // P0 lost one
  });
});

describe("Harvester", () => {
  it("sweeps the last flower of the color and owes a free pick", () => {
    const s = play({
      stars: [star(0, 0, 0), star(1, 80, 0), star(2, 300, 0), star(3, 300, 80, 3)],
      powers: [["harvester"], []],
    });
    const g = applyAction(s, { type: "place", aStarId: 0, bStarId: 1, x: 40, y: 0 });
    expect(g.collected[0][0]).toBe(3); // pair (2) + swept last (1)
    expect(g.freePicks).toEqual(["collect"]);
  });
});

describe("Assassin", () => {
  it("queues a removal that deletes a flower without collecting it", () => {
    const s = play({
      stars: [star(0, 0, 0), star(1, 80, 0), star(2, 300, 0, 3)],
      powers: [["assassin"], []],
    });
    const g = applyAction(s, { type: "place", aStarId: 0, bStarId: 1, x: 40, y: 0 });
    expect(g.freePicks).toEqual(["remove"]);
    const g2 = applyAction(g, { type: "freePick", starId: 2 });
    expect(g2.stars.find((x) => x.id === 2)).toBeUndefined();
    expect(g2.collected[0][3]).toBe(0); // removed, not collected
  });
});

describe("Catalyst", () => {
  it("grants an extra phantom placement after the 2nd real beacon", () => {
    const s = play({
      stars: [star(0, 0, 0), star(1, 80, 0), star(2, 200, 0), star(3, 280, 0)],
      beacons: [{ id: 0, owner: 0, x: -200, y: -200 }], // P0 already has 1 real beacon
      powers: [["catalyst"], []],
    });
    const g = applyAction(s, { type: "place", aStarId: 0, bStarId: 1, x: 40, y: 0 }); // 2nd real
    expect(g.catalystUsed[0]).toBe(true);
    expect(g.phantomNext[0]).toBe(true);
    expect(g.current).toBe(0); // extra phantom turn
    const g2 = applyAction(g, { type: "place", aStarId: 2, bStarId: 3, x: 240, y: 0 });
    expect(g2.beacons[g2.beacons.length - 1].phantom).toBe(true);
    expect(g2.phantomNext[0]).toBe(false);
  });

  it("phantom beacons don't claim territory", () => {
    const s = play({
      stars: [star(0, 10, 0, 0)],
      beacons: [
        { id: 0, owner: 0, x: 0, y: 0, phantom: true },
        { id: 1, owner: 1, x: 100, y: 0 },
      ],
    });
    const g = finalize(s);
    expect(g.finalByColor![0][0]).toBe(0);
    expect(g.finalByColor![1][0]).toBe(1);
  });
});

describe("Magnet (Repeller)", () => {
  it("drags cone flowers toward the pawn and harvests close ones", () => {
    const s = play({ stars: [star(0, 0, 0), star(1, 160, 0), star(2, 80, 40, 3)], powers: [["repeller"], []] });
    const g = applyAction(s, { type: "place", aStarId: 0, bStarId: 1, x: 80, y: 0 });
    expect(g.repelOrigin).not.toBeNull();
    const g2 = applyAction(g, { type: "repel", x: 80, y: 200 }); // aim +y toward flower 2
    expect(g2.collected[0][3]).toBe(1); // flower 2 (colour 3) dragged in and harvested
    expect(g2.stars.find((x) => x.id === 2)).toBeUndefined();
    expect(g2.repelOrigin).toBeNull();
  });
});

describe("Nomad", () => {
  it("leads the order (and now claims a starting pick like everyone else)", () => {
    const g = createGame(1, makeConfig(2), true, [[], ["nomad"]]);
    expect(g.phase).toBe("setup"); // no longer skips the starting claim (rebalance)
    expect(g.order[0]).toBe(1); // still seated first
  });

  it("redeploy reclaims a beacon and inserts an extra slot", () => {
    const s = play({ stars: [], beacons: [{ id: 0, owner: 0, x: 50, y: 50 }], powers: [["nomad"], []] });
    const g = applyAction(s, { type: "nomadPickup", beaconId: 0 });
    expect(g.beacons.length).toBe(0);
    expect(g.nomadUsed[0]).toBe(true);
    expect(g.order[1]).toBe(0);
  });
});

describe("Affinities", () => {
  it("Chalk: line crossing budget equals your collected Chalk count", () => {
    const a = star(0, 0, 0);
    const b = star(1, 160, 0);
    const s = play({ stars: [a, b, star(2, 53, 0, 3), star(3, 107, 0, 3)], affinity: [5, null] });
    s.collected[0][5] = 2;
    expect(lineClearFor(s, 0, a, b)).toBe(true); // 2 blockers, budget 2
    s.collected[0][5] = 1;
    expect(lineClearFor(s, 0, a, b)).toBe(false); // 2 blockers, budget 1
  });

  it("Ember: collecting its colour pulls all remaining of it toward the pawn", () => {
    const s = play({ stars: [star(0, 0, 0), star(1, 80, 0), star(2, 300, 0, 0)], affinity: [0, null] });
    const g = applyAction(s, { type: "place", aStarId: 0, bStarId: 1, x: 40, y: 0 });
    expect(g.stars.find((x) => x.id === 2)!.x).toBeLessThan(300);
  });

  it("Frost: freezes the 2 nearest flowers and they resist displacement", () => {
    const s = play({
      stars: [star(0, 0, 0, 1), star(1, 80, 0, 1), star(2, 60, 40, 3), star(3, 400, 400, 3)],
      affinity: [1, null],
      powers: [["gravity"], []],
    });
    const g = applyAction(s, { type: "place", aStarId: 0, bStarId: 1, x: 40, y: 0 });
    expect(g.frozenStars).toContain(2);
    const f = g.stars.find((x) => x.id === 2)!;
    expect(f.x).toBe(60);
    expect(f.y).toBe(40);
  });

  it("Aureate: +1 to your best not-yet-winning colour", () => {
    const s = play({ stars: [star(0, 0, 0, 3), star(1, 80, 0, 3)], affinity: [3, null] });
    s.collected[0][2] = 3;
    const g = applyAction(s, { type: "place", aStarId: 0, bStarId: 1, x: 40, y: 0 });
    expect(g.collected[0][3]).toBe(2);
    expect(g.collected[0][2]).toBe(4);
  });

  it("Dusk: steal a chosen colour from its leading rival", () => {
    let s = play({ stars: [star(0, 0, 0, 4), star(1, 80, 0, 4)], affinity: [4, null] });
    s.collected[1][2] = 3;
    s = applyAction(s, { type: "place", aStarId: 0, bStarId: 1, x: 40, y: 0 });
    expect(s.duskPending).toBe(true);
    const g = applyAction(s, { type: "duskSteal", colorId: 2 });
    expect(g.collected[0][2]).toBe(1);
    expect(g.collected[1][2]).toBe(2);
    expect(g.duskPending).toBe(false);
  });

  it("Abyss: banish a flower (collected by no one)", () => {
    let s = play({ stars: [star(0, 0, 0, 6), star(1, 80, 0, 6), star(2, 300, 0, 3)], affinity: [6, null] });
    s = applyAction(s, { type: "place", aStarId: 0, bStarId: 1, x: 40, y: 0 });
    expect(s.abyssPending).toBe(true);
    const g = applyAction(s, { type: "abyssVoid", starId: 2 });
    expect(g.stars.find((x) => x.id === 2)).toBeUndefined();
    expect(g.collected[0][3]).toBe(0);
    expect(g.abyssPending).toBe(false);
  });
});

describe("Cheater", () => {
  it("wins every tied colour", () => {
    const s = play({ stars: [], powers: [[], ["cheater"]], current: 0 });
    s.collected[0][0] = 2;
    s.collected[1][0] = 2; // tie on colour 0 -> cheater (P1) takes it
    s.collected[1][2] = 4; // P1 leads colour 2 outright
    const g = finalize(s);
    expect(g.colorWinners![0]).toBe(1); // tie taken by cheater
    expect(g.colorWinners![2]).toBe(1); // and the colour it leads
  });
});

describe("Agile", () => {
  it("the first placement also grabs the nearest extra flower", () => {
    const s = play({
      stars: [star(0, 0, 0), star(1, 100, 0), star(2, 55, 22, 3)], // a 3rd flower near the line
      powers: [["agile"], []],
    });
    const g2 = applyAction(s, { type: "place", aStarId: 0, bStarId: 1, x: 50, y: 0 });
    const total = g2.collected[0].reduce((n, v) => n + v, 0);
    expect(total).toBe(3); // the pair (2) + one nearby bonus (1)
  });
});

describe("Prism", () => {
  it("also collects the nearest different-colour flower", () => {
    const s = play({
      stars: [star(0, 0, 0), star(1, 100, 0), star(2, 55, 25, 3)], // off-colour flower near the line
      powers: [["prism"], []],
    });
    const g = applyAction(s, { type: "place", aStarId: 0, bStarId: 1, x: 50, y: 0 });
    expect(g.collected[0][0]).toBe(2); // the pair
    expect(g.collected[0][3]).toBe(1); // + nearest off-colour
    expect(g.stars.find((x) => x.id === 2)).toBeUndefined();
  });
});

describe("Tithe", () => {
  it("skims one when a rival collects a colour you lead", () => {
    const s = play({
      stars: [star(0, 0, 0), star(1, 100, 0)],
      powers: [[], ["tithe"]],
      current: 0,
    });
    s.collected[1][0] = 2; // P1 (tithe) leads colour 0
    const g = applyAction(s, { type: "place", aStarId: 0, bStarId: 1, x: 50, y: 0 }); // P0 collects colour 0
    expect(g.collected[0][0]).toBe(2); // placer's pair
    expect(g.collected[1][0]).toBe(3); // tithe skim +1
  });

  it("does not skim a colour you don't lead", () => {
    const s = play({
      stars: [star(0, 0, 0), star(1, 100, 0)],
      powers: [[], ["tithe"]],
      current: 0,
    });
    s.collected[0][0] = 5; // placer leads colour 0; tithe holder has none
    const g = applyAction(s, { type: "place", aStarId: 0, bStarId: 1, x: 50, y: 0 });
    expect(g.collected[1][0]).toBe(0);
  });
});

describe("Magpie", () => {
  it("spoils a colour it trails by one when behind on colours", () => {
    const s = play({ stars: [], powers: [["magpie"], []], current: 0 });
    s.collected[1][0] = 3;
    s.collected[0][0] = 2; // P1 leads colour 0 by exactly 1
    s.collected[1][1] = 3; // P1 also wins colour 1 -> leads 2 colours to 0
    const g = finalize(s);
    expect(g.colorWinners![0]).toBeNull(); // behind, magpie spoils colour 0 (nobody wins it)
  });

  it("does not steal when trailing by more than one", () => {
    const s = play({ stars: [], powers: [["magpie"], []], current: 0 });
    s.collected[1][0] = 4;
    s.collected[0][0] = 2; // trails by 2 in the colour -> no steal
    const g = finalize(s);
    expect(g.colorWinners![0]).toBe(1);
  });
});

describe("Alchemist", () => {
  it("transmutes the nearest other flower into your collected colour", () => {
    const s = play({
      stars: [star(0, 0, 0), star(1, 100, 0), star(2, 60, 25, 3)], // off-colour near the line
      powers: [["alchemist"], []],
    });
    const g = applyAction(s, { type: "place", aStarId: 0, bStarId: 1, x: 50, y: 0 });
    expect(g.stars.find((x) => x.id === 2)!.color).toBe(0); // colour 3 -> 0 (stays on the board)
    expect(g.collected[0][0]).toBe(3); // pair (2) + the transmute sweetener (1)
  });
});

describe("Momentum", () => {
  it("collects extra when repeating a colour on consecutive placements", () => {
    const s = play({ stars: [star(0, 0, 0), star(1, 100, 0)], powers: [["momentum"], []], current: 0 });
    s.momentumColor[0] = 0;
    s.momentumStreak[0] = 1; // already collected colour 0 last placement
    const g = applyAction(s, { type: "place", aStarId: 0, bStarId: 1, x: 50, y: 0 });
    expect(g.collected[0][0]).toBe(3); // pair (2) + momentum bonus (1)
    expect(g.momentumStreak[0]).toBe(2);
  });

  it("resets the streak on a different colour", () => {
    const s = play({ stars: [star(0, 0, 0), star(1, 100, 0)], powers: [["momentum"], []], current: 0 });
    s.momentumColor[0] = 1;
    s.momentumStreak[0] = 2; // last colour was 1, now collecting 0
    const g = applyAction(s, { type: "place", aStarId: 0, bStarId: 1, x: 50, y: 0 });
    expect(g.collected[0][0]).toBe(2); // no bonus
    expect(g.momentumStreak[0]).toBe(1);
  });
});

describe("Lighthouse", () => {
  it("the first pawn claims leftover flowers from twice as far", () => {
    const s = play({
      stars: [star(0, 80, 0, 0)],
      beacons: [
        { id: 0, owner: 0, x: 0, y: 0 }, // P0's first pawn -> 1.5x reach
        { id: 1, owner: 1, x: 140, y: 0 },
      ],
      powers: [["lighthouse"], []],
    });
    const g = finalize(s);
    expect(g.finalByColor![0][0]).toBe(1); // 80/1.5 ≈ 53 beats P1's 60
  });
});

describe("Cartographer", () => {
  it("claims any flower within its radius, overriding nearest-pawn", () => {
    const s = play({
      stars: [star(0, 70, 0, 0)],
      beacons: [
        { id: 0, owner: 0, x: 0, y: 0 }, // 70 away but within carto radius -> counts as 35
        { id: 1, owner: 1, x: 110, y: 0 }, // 40 away (nearer, but loses to the 35)
      ],
      powers: [["cartographer"], []],
    });
    const g = finalize(s);
    expect(g.finalByColor![0][0]).toBe(1); // carto's local reach (35) beats P1's 40
  });
});

describe("Flexible", () => {
  it("the extra turn grants a real extra pawn", () => {
    const s = play({ stars: [], powers: [["flexible"], []], current: 0 });
    const g = applyAction(s, { type: "flexExtra" });
    expect(g.bonusBeacons[0]).toBe(1);
    expect(g.flexExtraUsed[0]).toBe(true);
    expect(beaconsLeft(g, 0)).toBe(g.config.beaconsPerPlayer + 1);
  });
});
