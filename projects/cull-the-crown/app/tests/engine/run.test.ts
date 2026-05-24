import { describe, expect, it } from "vitest";
import { applyAction, createRun, DEFAULT_CONFIG } from "../../src/engine/run";
import { buildDeck } from "../../src/engine/cards";
import { deckCount } from "../../src/engine/index";
import { Card, CombatState, Enemy, RunState, ShopState, Suit } from "../../src/engine/types";

const num = (id: string, suit: Suit, value: number): Card => ({ id, suit, value, kind: "number" });
function enemy(suit: Suit, over: Partial<Enemy> = {}): Enemy {
  return { tier: "jack", suit, maxHealth: 20, attack: 10, damageTaken: 0, shield: 0, immunityCancelled: false, ...over };
}
function combat(e: Enemy): CombatState {
  return { enemy: e, subphase: "play", incoming: 0, firstAttackDone: false, yieldedLastTurn: false, outcome: null, wonExact: false };
}
function mkRun(over: Partial<RunState>): RunState {
  return {
    config: DEFAULT_CONFIG, deckId: "royal", stakeId: "white", seedLabel: "t", rngState: 999, deck: [], hand: [], discard: [], table: [],
    gold: 0, slots: [], suitUpgrades: { H: 0, D: 0, C: 0, S: 0 }, castle: [enemy("H")], enemyIndex: 0,
    combat: combat(enemy("H")), shop: null, phase: "combat", notice: null, log: [], fightsWon: 0,
    exactKills: 0, goldEarned: 0, held: [], removeUses: 0, cardSeq: 0, actEdictsTaken: [], deckBaseline: 40,
    styleLevels: { twoHanded: 0, swordShield: 0, spear: 0, dualWield: 0, mage: 0, mounted: 0 }, ...over,
  };
}

describe("deck & run setup", () => {
  it("the deck is 36 numbers + 4 companions = 40 (Jesters are set aside)", () => {
    const deck = buildDeck();
    expect(deck).toHaveLength(40);
    expect(deck.filter((c) => c.kind === "number")).toHaveLength(36);
    expect(deck.filter((c) => c.kind === "companion")).toHaveLength(4);
    expect(deck.filter((c) => c.kind === "jester")).toHaveLength(0);
  });

  it("createRun deals 8, leaves 32 in the deck, builds 12 royals", () => {
    const run = createRun("seed-1");
    expect(run.hand).toHaveLength(8);
    expect(run.deck).toHaveLength(32);
    expect(run.castle).toHaveLength(12);
    expect(deckCount(run)).toBe(40);
    expect(run.castle.slice(0, 4).every((e) => e.tier === "jack")).toBe(true);
    expect(run.castle.slice(8, 12).every((e) => e.tier === "king")).toBe(true);
  });

  it("is deterministic for a given seed and varies across seeds", () => {
    const a = createRun("alpha");
    const b = createRun("alpha");
    const c = createRun("beta");
    expect(a).toEqual(b);
    expect(a.hand.map((x) => x.id)).not.toEqual(c.hand.map((x) => x.id));
  });
});

describe("gold & interest on a (non-exact) win", () => {
  it("awards tier reward plus interest", () => {
    const e = enemy("S", { maxHealth: 5, attack: 10 });
    const run = mkRun({ gold: 10, hand: [num("c8", "C", 8)], castle: [e, enemy("S")], combat: combat(e) });
    const won = applyAction(run, { type: "play", cardIds: ["c8"] }); // 16 > 5, not exact
    expect(won.combat!.outcome).toBe("won");
    const r = applyAction(won, { type: "advance" });
    expect(r.exactKills).toBe(0);
    // jack reward 3 + interest floor(10/5)=2 -> +5
    expect(r.gold).toBe(15);
    expect(r.phase).toBe("shop");
  });
});

describe("shop (pack system)", () => {
  function shopState(over: Partial<ShopState> = {}): ShopState {
    return {
      packs: [{ id: "pack-0", kind: "relic", size: "m", price: 6, contentIds: ["field-medic", "duelist", "sapper"], picksRemaining: 1 }],
      looseOffers: [
        { id: "loose-0", kind: "relic", contentId: "quartermaster", price: 5 },
        { id: "loose-1", kind: "tarot", contentId: "the-hermit", price: 5 },
        { id: "loose-2", kind: "style", contentId: "drill-spear", price: 4 },
      ],
      edictOffers: ["bannerman"],
      removeCardCost: 2,
      rerollCost: 2,
      openPack: null,
      ...over,
    };
  }
  function shopRun(over: Partial<RunState> = {}): RunState {
    return mkRun({
      phase: "shop", gold: 20, combat: combat(enemy("H")),
      deck: [num("c2", "C", 2), num("h9", "H", 9)],
      shop: shopState(), ...over,
    });
  }

  it("opening a relic pack then picking adds the relic to the guild and closes the pack", () => {
    let r = applyAction(shopRun(), { type: "openPack", packId: "pack-0" });
    expect(r.shop!.openPack).toBeTruthy();
    expect(r.gold).toBe(14); // 20 - 6
    r = applyAction(r, { type: "pickPackContent", contentId: "field-medic" });
    expect(r.slots).toContain("field-medic");
    expect(r.shop!.openPack).toBeNull(); // standard pack = 1 pick
  });

  it("buying a loose relic fills a slot; a loose tarot goes to the pouch", () => {
    const r1 = applyAction(shopRun(), { type: "buyLoose", offerId: "loose-0" });
    expect(r1.slots).toContain("quartermaster");
    expect(r1.gold).toBe(15);
    const r2 = applyAction(shopRun(), { type: "buyLoose", offerId: "loose-1" });
    expect(r2.held.map((h) => h.tarotId)).toContain("the-hermit");
  });

  it("buying a loose Drill puts it in the pouch (used later to level a Fighting Style)", () => {
    const r = applyAction(shopRun(), { type: "buyLoose", offerId: "loose-2" });
    expect(r.held.map((h) => h.tarotId)).toContain("drill-spear");
  });

  it("removing a card thins the deck and raises the next cost", () => {
    const r = applyAction(shopRun(), { type: "removeCard", targetCardId: "c2" });
    expect(r.deck.find((c) => c.id === "c2")).toBeUndefined();
    expect(r.gold).toBe(18); // 20 - 2
    expect(r.removeUses).toBe(1);
    expect(r.shop!.removeCardCost).toBe(4); // base 2 + step 2
    expect(r.deckBaseline).toBe(39);
  });

  it("enacting an edict marks the Act taken", () => {
    const r = applyAction(shopRun(), { type: "buyEdict", offerId: "bannerman" });
    expect(r.edicts).toContain("bannerman");
    expect(r.actEdictsTaken).toContain("jack"); // enemyIndex 0 = the Jack court
  });

  it("selling a relic refunds gold and frees the slot", () => {
    const r = applyAction(shopRun({ slots: ["field-medic"] }), { type: "sellJoker", jokerId: "field-medic" });
    expect(r.slots).not.toContain("field-medic");
    expect(r.gold).toBe(22); // 20 + sellValue 2
  });

  it("reroll costs gold and increases the next reroll cost", () => {
    const r = applyAction(shopRun(), { type: "reroll" });
    expect(r.gold).toBe(18); // 20 - 2
    expect(r.shop!.rerollCost).toBe(3); // 2 + step 1
  });

  it("nextFight returns to combat", () => {
    const r = applyAction(shopRun(), { type: "nextFight" });
    expect(r.phase).toBe("combat");
    expect(r.shop).toBeNull();
  });
});
