import { describe, expect, it } from "vitest";
import { applyAction, DEFAULT_CONFIG } from "../../src/engine/run";
import { Card, CombatState, Enemy, RunState, Suit } from "../../src/engine/types";

const num = (id: string, suit: Suit, value: number): Card => ({ id, suit, value, kind: "number" });

function enemy(suit: Suit, over: Partial<Enemy> = {}): Enemy {
  return { tier: "jack", suit, maxHealth: 20, attack: 10, damageTaken: 0, shield: 0, immunityCancelled: false, ...over };
}
function combat(e: Enemy, over: Partial<CombatState> = {}): CombatState {
  return { enemy: e, subphase: "play", incoming: 0, firstAttackDone: false, yieldedLastTurn: false, outcome: null, wonExact: false, ...over };
}
function mkRun(over: Partial<RunState>): RunState {
  return {
    config: DEFAULT_CONFIG,
    deckId: "royal",
    stakeId: "white",
    styleLevels: { twoHanded: 0, swordShield: 0, spear: 0, dualWield: 0, mage: 0, mounted: 0 },
    seedLabel: "t",
    rngState: 12345,
    deck: [],
    hand: [],
    discard: [],
    table: [],
    gold: 0,
    slots: [],
    suitUpgrades: { H: 0, D: 0, C: 0, S: 0 },
    castle: [enemy("H")],
    enemyIndex: 0,
    combat: combat(enemy("H")),
    shop: null,
    phase: "combat",
    notice: null,
    log: [],
    fightsWon: 0,
    exactKills: 0,
    goldEarned: 0,
    held: [],
    removeUses: 0,
    cardSeq: 0,
    actEdictsTaken: [],
    deckBaseline: 40,
    ...over,
  };
}

describe("playing and defending", () => {
  it("a play deals damage, moves the card to the table, and asks to defend", () => {
    const e = enemy("H"); // immune to Hearts, so Clubs double works
    const run = mkRun({
      hand: [num("c8", "C", 8), num("s5", "S", 5), num("d6", "D", 6)],
      castle: [e],
      combat: combat(e),
    });
    const r = applyAction(run, { type: "play", cardIds: ["c8"] });
    expect(r.combat!.enemy.damageTaken).toBe(16);
    expect(r.table.map((c) => c.id)).toEqual(["c8"]);
    expect(r.combat!.subphase).toBe("defend");
    expect(r.combat!.incoming).toBe(10);
  });

  it("discarding enough cards covers the counter-attack and returns to play", () => {
    const e = enemy("H");
    let run = mkRun({ hand: [num("c8", "C", 8), num("s5", "S", 5), num("h7", "H", 7)], castle: [e], combat: combat(e) });
    run = applyAction(run, { type: "play", cardIds: ["c8"] });
    run = applyAction(run, { type: "discard", cardIds: ["s5", "h7"] }); // 12 >= 10
    expect(run.combat!.subphase).toBe("play");
    expect(run.discard.map((c) => c.id).sort()).toEqual(["h7", "s5"]);
    expect(run.phase).toBe("combat");
  });

  it("accumulated Spade shield reduces the counter-attack", () => {
    const e = enemy("H", { attack: 10 });
    let run = mkRun({ hand: [num("s5", "S", 5), num("s5b", "S", 5)], castle: [e], combat: combat(e) });
    run = applyAction(run, { type: "play", cardIds: ["s5"] });
    expect(run.combat!.incoming).toBe(5); // 10 attack − 5 shield
    expect(run.combat!.enemy.shield).toBe(0); // the block is spent absorbing the strike it reduced
    run = applyAction(run, { type: "discard", cardIds: ["s5b"] }); // cover the remaining 5
    expect(run.combat!.subphase).toBe("play");
  });

  it("can't cover -> deferred loss (battle screen stays); advancing reaches game over", () => {
    const e = enemy("H", { attack: 10 });
    const run = mkRun({ hand: [num("s5", "S", 5)], castle: [e], combat: combat(e) });
    const dead = applyAction(run, { type: "play", cardIds: ["s5"] }); // shield 5, incoming 5, hand now empty
    expect(dead.combat!.outcome).toBe("lost");
    expect(dead.phase).toBe("combat"); // not yet — the strike animates, then a Continue gate
    const r = applyAction(dead, { type: "advance" });
    expect(r.phase).toBe("lost");
  });
});

describe("yielding", () => {
  it("yield skips to the counter-attack; you cannot yield twice in a row", () => {
    const e = enemy("H", { attack: 10 });
    // spare card (s2) so the hand is not empty after defending — otherwise the engine would
    // (correctly) flag a loss: empty hand + cannot yield again.
    let run = mkRun({ hand: [num("h7", "H", 7), num("d6", "D", 6), num("s2", "S", 2)], castle: [e], combat: combat(e) });
    run = applyAction(run, { type: "yield" });
    expect(run.combat!.subphase).toBe("defend");
    run = applyAction(run, { type: "discard", cardIds: ["h7", "d6"] });
    expect(run.combat!.yieldedLastTurn).toBe(true);
    const after = applyAction(run, { type: "yield" });
    expect(after.notice).toMatch(/twice/i);
    expect(after.combat!.subphase).toBe("play");
  });
});

describe("defeat, exact kill, gold and the shop", () => {
  it("a kill defers to a won state; Continue (advance) awards the exact-kill reward and opens the shop", () => {
    const e = enemy("S", { maxHealth: 16, attack: 10 });
    const e2 = enemy("S");
    const run = mkRun({ hand: [num("c8", "C", 8)], castle: [e, e2], enemyIndex: 0, combat: combat(e) });
    const won = applyAction(run, { type: "play", cardIds: ["c8"] }); // 16 damage == 16 health
    // deferred: the battle screen stays until the player advances
    expect(won.combat!.outcome).toBe("won");
    expect(won.combat!.wonExact).toBe(true);
    expect(won.phase).toBe("combat");
    expect(won.gold).toBe(0);

    const r = applyAction(won, { type: "advance" });
    expect(r.exactKills).toBe(1);
    expect(r.gold).toBe(6); // jack reward 3 * exactKillMult 2
    expect(r.phase).toBe("shop");
    expect(r.enemyIndex).toBe(1);
    expect(r.table).toHaveLength(0);
    expect(r.discard.map((c) => c.id)).toEqual(["c8"]);
  });

  it("defeating the final royal then advancing wins the run", () => {
    const e = enemy("S", { maxHealth: 5, attack: 10 });
    const run = mkRun({ hand: [num("d5", "D", 5)], castle: [e], enemyIndex: 0, combat: combat(e) });
    const won = applyAction(run, { type: "play", cardIds: ["d5"] });
    expect(won.combat!.outcome).toBe("won");
    const r = applyAction(won, { type: "advance" });
    expect(r.phase).toBe("won");
    expect(r.fightsWon).toBe(1);
  });
});

describe("Hearts heal and Diamonds draw move cards correctly", () => {
  it("Hearts move N cards from the discard to the bottom of the deck", () => {
    const e = enemy("S", { attack: 0, maxHealth: 100 });
    const run = mkRun({
      hand: [num("h5", "H", 5)],
      deck: [],
      discard: [num("x", "C", 2), num("y", "C", 2), num("z", "C", 2)],
      castle: [e],
      combat: combat(e),
    });
    const r = applyAction(run, { type: "play", cardIds: ["h5"] });
    expect(r.deck).toHaveLength(3); // healed 3 (capped at discard size)
    expect(r.discard).toHaveLength(0);
  });

  it("Diamonds draw N from the top of the deck into the hand", () => {
    const e = enemy("H", { attack: 0, maxHealth: 100 });
    const run = mkRun({
      hand: [num("d3", "D", 3)],
      deck: [num("a", "C", 4), num("b", "C", 4), num("c", "C", 4), num("d", "C", 4)],
      castle: [e],
      combat: combat(e),
    });
    const r = applyAction(run, { type: "play", cardIds: ["d3"] });
    expect(r.hand).toHaveLength(3); // drew a,b,c (d3 went to the table)
    expect(r.deck.map((c) => c.id)).toEqual(["d"]);
  });
});
