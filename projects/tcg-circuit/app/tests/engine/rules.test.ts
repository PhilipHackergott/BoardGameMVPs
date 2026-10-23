import { describe, it, expect } from "vitest";
import {
  createDuel,
  reduce,
  legalMoves,
  Duel,
  PlayerState,
  UnitInstance,
  CardInst,
  KeywordTag,
} from "../../src/engine/prism";
import { getCard } from "../../src/engine/content/registry";

// ── helpers: build a fully-controlled Duel so combat/keyword behavior is deterministic ───────────
let iid = 1000;
function filler(n: number): CardInst[] {
  return Array.from({ length: n }, () => ({ iid: iid++, cardId: "pr1_ember_imp" }));
}
function blankPlayer(name: string): PlayerState {
  return {
    name,
    nexus: 20,
    maxLight: 10,
    light: 10,
    refractUsed: false,
    hand: [],
    deck: filler(20),
    discard: [],
    lanes: [{}, {}, {}],
  };
}
function unit(cardId: string, power: number, kws: KeywordTag[] = [], justPlayed = false): UnitInstance {
  return { iid: iid++, cardId, power, basePower: power, dmgTaken: 0, shield: 0, keywords: kws, justPlayed, gear: [] };
}
function blankDuel(): Duel {
  return {
    turn: 1,
    active: 0,
    firstPlayer: 0,
    players: [blankPlayer("A"), blankPlayer("B")],
    rngState: 1,
    phase: "main",
    combatDone: false,
    winner: null,
    nextIid: 9000,
    log: [],
    fx: [],
    fxSeq: 0,
  };
}

describe("Light & turn structure", () => {
  it("escalates max Light by 1 per turn and refills; on-the-play skips the first draw", () => {
    const d = createDuel({ decks: [deck(), deck()], seed: "t1" });
    expect(d.players[0].maxLight).toBe(1);
    expect(d.players[0].light).toBe(1);
    expect(d.players[0].hand.length).toBe(5); // on-the-play kept 5 (skipped draw)
    const d2 = reduce(d, { type: "endTurn" });
    expect(d2.active).toBe(1);
    expect(d2.players[1].maxLight).toBe(1);
    expect(d2.players[1].hand.length).toBe(6); // drew on its first turn
    const d3 = reduce(d2, { type: "endTurn" });
    expect(d3.players[0].maxLight).toBe(2);
  });

  it("caps max Light at 10", () => {
    let d = createDuel({ decks: [deck(), deck()], seed: "cap" });
    for (let i = 0; i < 30 && d.phase !== "over"; i++) d = reduce(d, { type: "endTurn" });
    expect(d.players[0].maxLight).toBeLessThanOrEqual(10);
    expect(d.players[1].maxLight).toBeLessThanOrEqual(10);
  });
});

describe("Refract", () => {
  it("discards a card for +1 Light, once per turn", () => {
    const d = blankDuel();
    d.players[0].light = 1;
    const c: CardInst = { iid: 1, cardId: "pr1_ember_imp" };
    d.players[0].hand = [c, { iid: 2, cardId: "pr1_ember_brute" }];
    const after = reduce(d, { type: "refract", iid: 1 });
    expect(after.players[0].light).toBe(2);
    expect(after.players[0].refractUsed).toBe(true);
    expect(after.players[0].discard.map((x) => x.iid)).toContain(1);
    // second refract is illegal -> no-op
    const again = reduce(after, { type: "refract", iid: 2 });
    expect(again.players[0].light).toBe(2);
  });

  it("Refract+ yields +2 Light", () => {
    const d = blankDuel();
    d.players[0].light = 0;
    d.players[0].hand = [{ iid: 1, cardId: "pr1_scrap_drone" }];
    const after = reduce(d, { type: "refract", iid: 1 });
    expect(after.players[0].light).toBe(2);
  });
});

describe("Deploy legality", () => {
  it("rejects unaffordable / occupied-lane / wrong-type plays", () => {
    const d = blankDuel();
    d.players[0].light = 0;
    d.players[0].hand = [{ iid: 1, cardId: "pr1_ember_brute" }]; // costs 3
    const broke = reduce(d, { type: "deploy", iid: 1, lane: 0 });
    expect(broke.players[0].lanes[0].unit).toBeUndefined(); // couldn't afford

    const d2 = blankDuel();
    d2.players[0].light = 5;
    d2.players[0].lanes[0].unit = unit("pr1_ember_imp", 2);
    d2.players[0].hand = [{ iid: 1, cardId: "pr1_ember_brute" }];
    const occupied = reduce(d2, { type: "deploy", iid: 1, lane: 0 });
    expect(occupied.players[0].lanes[0].unit?.cardId).toBe("pr1_ember_imp"); // unchanged
    const ok = reduce(d2, { type: "deploy", iid: 1, lane: 1 });
    expect(ok.players[0].lanes[1].unit?.cardId).toBe("pr1_ember_brute");
    expect(ok.players[0].light).toBe(2); // paid 3
  });
});

describe("Combat & keywords", () => {
  it("an open lane deals power to the enemy Nexus", () => {
    const d = blankDuel();
    d.players[0].lanes[0].unit = unit("pr1_ember_brute", 4);
    const after = reduce(d, { type: "combat", laneOrder: [0] });
    expect(after.players[1].nexus).toBe(16);
  });

  it("same-lane units trade power as damage; lethal trades destroy both", () => {
    const d = blankDuel();
    d.players[0].lanes[1].unit = unit("pr1_ember_brute", 4);
    d.players[1].lanes[1].unit = unit("pr1_thorn_elk", 4);
    const after = reduce(d, { type: "combat", laneOrder: [1] });
    expect(after.players[0].lanes[1].unit).toBeUndefined();
    expect(after.players[1].lanes[1].unit).toBeUndefined();
    expect(after.players[1].nexus).toBe(20); // blocked, no nexus damage
  });

  it("Haste lets a just-played unit attack; without it, it can't", () => {
    const d = blankDuel();
    d.players[0].lanes[0].unit = unit("pr1_cinder_sprite", 2, [{ kw: "haste" }], true);
    expect(legalMoves(d).some((m) => m.type === "combat")).toBe(true);
    const after = reduce(d, { type: "combat", laneOrder: [0] });
    expect(after.players[1].nexus).toBe(18);

    const d2 = blankDuel();
    d2.players[0].lanes[0].unit = unit("pr1_ember_brute", 4, [], true);
    expect(legalMoves(d2).some((m) => m.type === "combat")).toBe(false);
  });

  it("Guard blocks open-lane Nexus damage; Pierce ignores it", () => {
    const d = blankDuel();
    d.players[0].lanes[0].unit = unit("pr1_ember_brute", 4); // open lane attacker
    d.players[1].lanes[2].unit = unit("pr1_order_sentinel", 3, [{ kw: "guard" }]);
    const blocked = reduce(d, { type: "combat", laneOrder: [0] });
    expect(blocked.players[1].nexus).toBe(20); // Guard wall

    const d2 = blankDuel();
    d2.players[0].lanes[0].unit = unit("pr1_firefist_duelist", 4, [{ kw: "pierce" }]);
    d2.players[1].lanes[2].unit = unit("pr1_order_sentinel", 3, [{ kw: "guard" }]);
    const through = reduce(d2, { type: "combat", laneOrder: [0] });
    expect(through.players[1].nexus).toBe(16); // Pierce ignores the wall
  });

  it("Pierce carries combat overkill to the Nexus", () => {
    const d = blankDuel();
    d.players[0].lanes[0].unit = unit("pr1_firefist_duelist", 6, [{ kw: "pierce" }]);
    d.players[1].lanes[0].unit = unit("pr1_ember_imp", 2);
    const after = reduce(d, { type: "combat", laneOrder: [0] });
    expect(after.players[1].lanes[0].unit).toBeUndefined();
    expect(after.players[1].nexus).toBe(16); // 6 - 2 = 4 overkill to Nexus
  });

  it("Drain heals your Nexus by the Nexus damage dealt", () => {
    const d = blankDuel();
    d.players[0].nexus = 10;
    d.players[0].lanes[0].unit = unit("pr1_grave_knight", 3, [{ kw: "drain" }]);
    const after = reduce(d, { type: "combat", laneOrder: [0] });
    expect(after.players[1].nexus).toBe(17);
    expect(after.players[0].nexus).toBe(13);
  });

  it("Shield absorbs damage once", () => {
    const d = blankDuel();
    d.players[0].lanes[0].unit = unit("pr1_ember_brute", 4);
    d.players[1].lanes[0].unit = unit("pr1_order_squire", 2, [], false);
    d.players[1].lanes[0].unit!.shield = 3;
    const after = reduce(d, { type: "combat", laneOrder: [0] });
    // 4 dmg: 3 absorbed by shield, 1 to a 2-power body -> survives
    expect(after.players[1].lanes[0].unit).toBeDefined();
    expect(after.players[1].lanes[0].unit?.shield).toBe(0);
  });
});

describe("Spells, Gear & on-deploy", () => {
  it("Lifegain heals on deploy", () => {
    const d = blankDuel();
    d.players[0].nexus = 10;
    d.players[0].light = 3;
    d.players[0].hand = [{ iid: 1, cardId: "pr1_radiant_cleric" }]; // lifegain 3
    const after = reduce(d, { type: "deploy", iid: 1, lane: 0 });
    expect(after.players[0].nexus).toBe(13);
  });

  it("a damage spell kills a unit; an effect can hit the Nexus", () => {
    const d = blankDuel();
    d.players[0].light = 5;
    d.players[1].lanes[0].unit = unit("pr1_ember_imp", 2);
    d.players[0].hand = [{ iid: 1, cardId: "pr1_scorch" }]; // deal 4 to a unit
    const after = reduce(d, { type: "cast", iid: 1, targetIid: d.players[1].lanes[0].unit!.iid });
    expect(after.players[1].lanes[0].unit).toBeUndefined();
  });

  it("Gear permanently buffs an attached unit and grants a keyword", () => {
    const d = blankDuel();
    d.players[0].light = 5;
    d.players[0].lanes[0].unit = unit("pr1_ember_imp", 2);
    const tid = d.players[0].lanes[0].unit!.iid;
    d.players[0].hand = [{ iid: 1, cardId: "pr1_champions_blade" }]; // +3 power & Pierce
    const after = reduce(d, { type: "attach", iid: 1, targetIid: tid });
    expect(after.players[0].lanes[0].unit?.power).toBe(5);
    expect(after.players[0].lanes[0].unit?.keywords.some((k) => k.kw === "pierce")).toBe(true);
  });
});

describe("End of turn", () => {
  it("Volatile units die at the end of their controller's turn; damage resets", () => {
    const d = blankDuel();
    d.players[0].lanes[0].unit = unit("pr1_cinder_sprite", 2, [{ kw: "volatile" }]);
    d.players[1].lanes[1].unit = unit("pr1_ember_brute", 4);
    d.players[1].lanes[1].unit!.dmgTaken = 2;
    const after = reduce(d, { type: "endTurn" });
    expect(after.players[0].lanes[0].unit).toBeUndefined(); // volatile expired
    expect(after.players[1].lanes[1].unit?.dmgTaken).toBe(0); // damage reset
  });
});

describe("Set 2/3 keywords", () => {
  it("Rally buffs your OTHER units on deploy", () => {
    const d = blankDuel();
    d.players[0].light = 5;
    d.players[0].lanes[0].unit = unit("pr1_ember_imp", 2);
    d.players[0].hand = [{ iid: 1, cardId: "pr2_warleader" }]; // Rally 2, cost 4
    const after = reduce(d, { type: "deploy", iid: 1, lane: 1 });
    expect(after.players[0].lanes[0].unit?.power).toBe(4); // 2 + Rally 2
    expect(after.players[0].lanes[1].unit?.power).toBe(4); // the warleader itself isn't self-buffed
  });

  it("Vengeance hits the enemy Nexus when the unit dies", () => {
    const d = blankDuel();
    d.players[0].lanes[0].unit = unit("pr1_ember_imp", 2, [{ kw: "vengeance", n: 2 }]);
    d.players[1].lanes[0].unit = unit("pr1_ember_brute", 3); // kills the 2-power vengeance unit
    const after = reduce(d, { type: "combat", laneOrder: [0] });
    expect(after.players[0].lanes[0].unit).toBeUndefined();
    expect(after.players[1].nexus).toBe(18); // 20 - Vengeance 2 to the enemy Nexus
  });

  it("Momentum grows the unit at the start of your turn", () => {
    const d = blankDuel();
    d.players[0].lanes[0].unit = unit("pr1_ember_imp", 3, [{ kw: "momentum", n: 2 }]);
    const t1 = reduce(d, { type: "endTurn" }); // -> opponent's turn
    const back = reduce(t1, { type: "endTurn" }); // -> your turn again (beginTurn applies momentum)
    expect(back.players[0].lanes[0].unit?.power).toBe(5); // 3 + Momentum 2
  });
});

describe("Win conditions", () => {
  it("reducing the enemy Nexus to 0 wins", () => {
    const d = blankDuel();
    d.players[1].nexus = 3;
    d.players[0].lanes[0].unit = unit("pr1_ember_brute", 4);
    const after = reduce(d, { type: "combat", laneOrder: [0] });
    expect(after.winner).toBe(0);
    expect(after.phase).toBe("over");
  });

  it("drawing from an empty deck is an alt-loss", () => {
    const d = blankDuel();
    d.players[1].deck = []; // B will draw on its turn and lose
    const afterEnd = reduce(d, { type: "endTurn" });
    expect(afterEnd.winner).toBe(0);
  });
});

// a real legal 30-card list for setup-driven tests
function deck(): string[] {
  const c = getCard("pr1_ember_imp");
  expect(c).toBeDefined();
  const out: string[] = [];
  const ids = ["pr1_ember_imp", "pr1_ashfang_hound", "pr1_ember_brute", "pr1_flame_jab", "pr1_scorch"];
  for (let i = 0; i < 30; i++) out.push(ids[i % ids.length]);
  return out;
}
