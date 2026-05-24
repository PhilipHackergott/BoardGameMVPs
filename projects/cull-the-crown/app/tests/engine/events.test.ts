import { describe, expect, it } from "vitest";
import { applyAction, createRun, DEFAULT_CONFIG } from "../../src/engine/run";
import { gauntletView } from "../../src/engine/index";
import { Card, CombatState, Enemy, RunState, Suit } from "../../src/engine/types";

const num = (id: string, suit: Suit, value: number): Card => ({ id, suit, value, kind: "number" });
function enemy(suit: Suit, over: Partial<Enemy> = {}): Enemy {
  return { tier: "jack", suit, maxHealth: 20, attack: 10, damageTaken: 0, shield: 0, immunityCancelled: false, decreeId: null, decreeParam: null, ...over };
}
function combat(e: Enemy): CombatState {
  return { enemy: e, subphase: "play", incoming: 0, firstAttackDone: false, yieldedLastTurn: false, outcome: null, wonExact: false, lastSuits: [] };
}
function mkRun(over: Partial<RunState>): RunState {
  const e = enemy("H");
  return {
    config: { ...DEFAULT_CONFIG }, deckId: "royal", stakeId: "white", seedLabel: "t", rngState: 4242, deck: [], hand: [], discard: [], table: [],
    gold: 10, slots: [], edicts: [], suitUpgrades: { H: 0, D: 0, C: 0, S: 0 },
    castle: [e, e, e, e], enemyIndex: 0, combat: combat(e), shop: null, eventId: null, phase: "shop", notice: null,
    log: [], fightsWon: 0, exactKills: 0, goldEarned: 0,
    held: [], removeUses: 0, cardSeq: 0, actEdictsTaken: [], deckBaseline: 40,
    styleLevels: { twoHanded: 0, swordShield: 0, spear: 0, dualWield: 0, mage: 0, mounted: 0 },
    ...over,
  };
}

describe("Court Events route into the run", () => {
  it("leaving the shop at an event index opens an event instead of combat", () => {
    const run = mkRun({ enemyIndex: 2, shop: { packs: [], looseOffers: [], edictOffers: [], removeCardCost: 2, rerollCost: 2, openPack: null } });
    const r = applyAction(run, { type: "nextFight" });
    expect(r.phase).toBe("event");
    expect(typeof r.eventId).toBe("string");
  });

  it("leaving the shop at a non-event index goes straight to combat", () => {
    const run = mkRun({ enemyIndex: 1, shop: { packs: [], looseOffers: [], edictOffers: [], removeCardCost: 2, rerollCost: 2, openPack: null } });
    const r = applyAction(run, { type: "nextFight" });
    expect(r.phase).toBe("combat");
    expect(r.eventId).toBeNull();
  });

  it("choosing a free option applies it and proceeds to combat (Shrine: pray heals the deck)", () => {
    const run = mkRun({ phase: "event", eventId: "shrine", deck: [num("a", "C", 2)], discard: [num("b", "C", 3), num("c", "C", 4)] });
    const r = applyAction(run, { type: "eventChoice", optionId: "pray" });
    expect(r.phase).toBe("combat");
    expect(r.eventId).toBeNull();
    expect(r.discard).toHaveLength(0);
    // pray returns the 2 used cards to the deck; the fight then deals a fresh hand, so the 3 cards
    // are split across deck + hand.
    expect(r.deck.length + r.hand.length).toBe(3);
  });

  it("an unaffordable paid option is rejected and the event stays open", () => {
    const run = mkRun({ phase: "event", eventId: "shrine", gold: 2 });
    const r = applyAction(run, { type: "eventChoice", optionId: "tithe" }); // costs 6
    expect(r.phase).toBe("event");
    expect(r.notice).toMatch(/gold/i);
  });

  it("a paid option spends gold and applies (Refugees: shelter raises the interest cap)", () => {
    const run = mkRun({ phase: "event", eventId: "refugees", gold: 10 });
    const r = applyAction(run, { type: "eventChoice", optionId: "shelter" });
    expect(r.gold).toBe(5);
    expect(r.config.interestCap).toBe(DEFAULT_CONFIG.interestCap + 3);
    expect(r.phase).toBe("combat");
  });

  it("the gauntlet view flags which fights have a preceding event", () => {
    const view = gauntletView(createRun("evt-seed"));
    expect(view[2].eventBefore).toBe(true);
    expect(view[5].eventBefore).toBe(true);
    expect(view[8].eventBefore).toBe(true);
    expect(view[0].eventBefore).toBe(false);
    expect(view[1].eventBefore).toBe(false);
  });
});
