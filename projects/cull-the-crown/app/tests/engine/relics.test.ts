import { describe, expect, it } from "vitest";
import { applyAction, DEFAULT_CONFIG } from "../../src/engine/run";
import { currentHandMax, maxSlots } from "../../src/engine/combat";
import { resolvePlay } from "../../src/engine/resolution";
import { jokerById, JOKER_LIBRARY } from "../../src/engine/content";
import { Card, CombatState, Enemy, ModInfo, RunState, Suit } from "../../src/engine/types";

const num = (id: string, suit: Suit, value: number): Card => ({ id, suit, value, kind: "number" });
const J = (id: string) => [jokerById(id)!];

function enemy(suit: Suit, over: Partial<Enemy> = {}): Enemy {
  return { tier: "jack", suit, maxHealth: 20, attack: 10, damageTaken: 0, shield: 0, immunityCancelled: false, decreeId: null, decreeParam: null, ...over };
}
function combat(e: Enemy, over: Partial<CombatState> = {}): CombatState {
  return { enemy: e, subphase: "play", incoming: 0, firstAttackDone: false, yieldedLastTurn: false, outcome: null, wonExact: false, lastSuits: [], ...over };
}
function mkRun(over: Partial<RunState>): RunState {
  return {
    config: { ...DEFAULT_CONFIG }, deckId: "royal", stakeId: "white", seedLabel: "t", rngState: 12345, deck: [], hand: [], discard: [], table: [],
    gold: 0, slots: [], suitUpgrades: { H: 0, D: 0, C: 0, S: 0 }, castle: [enemy("H")], enemyIndex: 0,
    combat: combat(enemy("H")), shop: null, phase: "combat", notice: null, log: [], fightsWon: 0, exactKills: 0, goldEarned: 0,
    held: [], removeUses: 0, cardSeq: 0, actEdictsTaken: [], deckBaseline: 40,
    styleLevels: { twoHanded: 0, swordShield: 0, spear: 0, dualWield: 0, mage: 0, mounted: 0 },
    ...over,
  };
}

describe("rarity", () => {
  it("every joker declares a rarity", () => {
    for (const j of JOKER_LIBRARY) expect(["common", "uncommon", "rare"]).toContain(j.rarity);
  });
});

describe("resolution-time relics", () => {
  it("Glass Cannon multiplies damage by 1.5 and cuts hand size by 2", () => {
    const base = resolvePlay([num("c", "C", 8)], enemy("H"), [], { H: 0, D: 0, C: 0, S: 0 }, true);
    const gc = resolvePlay([num("c", "C", 8)], enemy("H"), J("glass-cannon"), { H: 0, D: 0, C: 0, S: 0 }, true);
    expect(base.damage).toBe(16); // clubs double
    expect(gc.damage).toBe(24); // 16 * 1.5
    const run = mkRun({ slots: ["glass-cannon"] });
    expect(maxSlots(run)).toBe(5);
    expect(currentHandMax(run)).toBe(6); // 8 - 2
  });

  it("Twin Daggers add +3 to combos only", () => {
    const combo = [num("a", "S", 3), num("b", "S", 3)]; // shield combo, total 6, vs Hearts enemy
    const solo = [num("c", "C", 5)];
    const upg = { H: 0, D: 0, C: 0, S: 0 };
    expect(resolvePlay(combo, enemy("H"), J("twin-daggers"), upg, true).damage).toBe(9); // 6 + 3
    expect(resolvePlay(solo, enemy("H"), J("twin-daggers"), upg, true).damage).toBe(10); // 5*2 clubs, no combo bonus
  });

  it("Whetstone scales damage with royals felled (via ModInfo)", () => {
    const upg = { H: 0, D: 0, C: 0, S: 0 };
    const info: ModInfo = { fightsWon: 3, gold: 0, enemyTier: "jack", jokerCount: 1 };
    const r = resolvePlay([num("s", "S", 4)], enemy("H"), J("whetstone"), upg, true, undefined, info);
    expect(r.damage).toBe(7); // 4 + 3 felled
    const none = resolvePlay([num("s", "S", 4)], enemy("H"), J("whetstone"), upg, true);
    expect(none.damage).toBe(4); // no info -> no bonus
  });
});

describe("downside & dynamic-slot relics", () => {
  it("Reckless Charge adds damage but raises the incoming counter", () => {
    const e = enemy("H", { attack: 10, maxHealth: 100 });
    const run = mkRun({ slots: ["reckless-charge"], hand: [num("c", "C", 8)], castle: [e], combat: combat(e) });
    const r = applyAction(run, { type: "play", cardIds: ["c"] });
    expect(r.combat!.enemy.damageTaken).toBe(21); // 8*2 + 5
    expect(r.combat!.incoming).toBe(13); // attack 10 + counterBonus 3
  });

  it("War Banner grants a sixth guild slot", () => {
    const run = mkRun({ slots: ["war-banner"] });
    expect(maxSlots(run)).toBe(6);
  });
});

describe("lifecycle relics", () => {
  it("Spiked Aegis reflects half the counter back, and can finish a royal", () => {
    const e = enemy("H", { attack: 10, maxHealth: 100, damageTaken: 96 });
    let run = mkRun({ slots: ["spiked-aegis"], hand: [num("s", "S", 1), num("s2", "S", 9), num("s3", "S", 9)], castle: [e], combat: combat(e) });
    run = applyAction(run, { type: "play", cardIds: ["s"] }); // shield 1, dmg 1 -> 97; incoming 9
    expect(run.combat!.subphase).toBe("defend");
    run = applyAction(run, { type: "discard", cardIds: ["s2"] }); // cover 9 -> reflect 4 -> 97+4=101 >=100
    expect(run.combat!.outcome).toBe("won");
  });

  it("Bottled Courage starts the next fight with shield raised", () => {
    const e = enemy("H", { attack: 10 });
    const shopRun = mkRun({
      phase: "shop", slots: ["bottled-courage"], combat: combat(e),
      shop: { packs: [], looseOffers: [], edictOffers: [], removeCardCost: 2, rerollCost: 2, openPack: null },
    });
    const r = applyAction(shopRun, { type: "nextFight" });
    expect(r.combat!.enemy.shield).toBe(5);
  });

  it("Reaper's Toll raises the interest cap on a felled royal", () => {
    const e = enemy("S", { maxHealth: 5, attack: 10 });
    const run = mkRun({ slots: ["reapers-toll"], hand: [num("c", "C", 8)], castle: [e, enemy("S")], combat: combat(e) });
    const won = applyAction(run, { type: "play", cardIds: ["c"] });
    const r = applyAction(won, { type: "advance" });
    expect(r.config.interestCap).toBe(DEFAULT_CONFIG.interestCap + 1);
  });
});
