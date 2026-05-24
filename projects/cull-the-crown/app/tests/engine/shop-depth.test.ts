import { describe, expect, it } from "vitest";
import { createRun, DEFAULT_CONFIG } from "../../src/engine/run";
import { resolvePlay } from "../../src/engine/resolution";
import { currentHandMax, effectiveSuitUpgrades, heldMax, maxSlots } from "../../src/engine/combat";
import { addSigil, discountedPrice, edictBonuses, makeCardFromTemplate, rollShopV2, tarotById } from "../../src/engine/content";
import { Card, Enemy, RunState, SigilId, Suit, SuitUpgrades } from "../../src/engine/types";

const NO_UPG: SuitUpgrades = { H: 0, D: 0, C: 0, S: 0 };
const num = (id: string, suit: Suit, value: number): Card => ({ id, suit, value, kind: "number" });
function enemy(suit: Suit, over: Partial<Enemy> = {}): Enemy {
  return { tier: "jack", suit, maxHealth: 100, attack: 0, damageTaken: 0, shield: 0, immunityCancelled: false, decreeId: null, decreeParam: null, ...over };
}
const sig = (c: Card, ...s: SigilId[]) => {
  for (const x of s) addSigil(c, x);
  return c;
};

describe("rollShopV2", () => {
  it("always offers 3 packs and 3 loose items, plus the base remove cost", () => {
    const run = createRun("shop-seed");
    const { shop } = rollShopV2(run.rngState, run, 2, 0);
    expect(shop.packs).toHaveLength(3);
    expect(shop.looseOffers).toHaveLength(3);
    expect(shop.removeCardCost).toBe(DEFAULT_CONFIG.removeBase);
  });
  it("is deterministic for the same rng state", () => {
    const run = createRun("shop-seed");
    expect(rollShopV2(run.rngState, run, 2, 0).shop).toEqual(rollShopV2(run.rngState, run, 2, 0).shop);
  });
});

describe("edicts", () => {
  it("bonuses aggregate and discounts stack", () => {
    expect(edictBonuses(["bannerman", "standard-bearer"]).handMaxBonus).toBe(2);
    expect(edictBonuses(["conscription"]).slotBonus).toBe(1);
    // War Tithe (+5 → cap ◆10) then King's Ransom (+10 → cap ◆20), mirroring Balatro's Seed Money / Money Tree.
    expect(edictBonuses(["war-tithe", "kings-ransom"]).interestCapBonus).toBe(15);
    expect(discountedPrice(10, [])).toBe(10);
    expect(discountedPrice(10, ["black-market"])).toBe(8);
    expect(discountedPrice(10, ["black-market", "free-port"])).toBe(6);
  });
});

describe("sigils in resolution", () => {
  it("flat sigils stack and apply", () => {
    const r = resolvePlay([sig(num("a", "S", 4), "keen", "keen")], enemy("H"), [], NO_UPG, true);
    expect(r.damage).toBe(8); // 4 base + 2 + 2
    expect(r.shield).toBe(4);
  });
  it("honed raises the card's value so every power scales", () => {
    const r = resolvePlay([sig(num("h", "H", 4), "honed")], enemy("S"), [], NO_UPG, true);
    expect(r.heal).toBe(6); // 4 + 2
    expect(r.damage).toBe(6);
  });
  it("extra-suit fires both suits' powers", () => {
    const c = num("x", "H", 5);
    addSigil(c, "extra");
    expect(c.extraSuit).toBe("D");
    const r = resolvePlay([c], enemy("S"), [], NO_UPG, true);
    expect(r.heal).toBe(5); // Hearts
    expect(r.draw).toBe(5); // Diamonds (the extra suit)
  });
  it("wildcard plays as the chosen suit", () => {
    const c = num("w", "H", 6);
    addSigil(c, "wildcard");
    const r = resolvePlay([c], enemy("H"), [], NO_UPG, true, undefined, undefined, { w: "S" });
    expect(r.shield).toBe(6); // chosen as Spades (enemy is Hearts-immune, so Spades works)
    expect(r.heal).toBe(0); // no longer counts as Hearts
  });
  it("companion sigil makes a value-1 pairable card", () => {
    const c = num("c", "C", 7);
    addSigil(c, "companion");
    expect(c.kind).toBe("companion");
    expect(c.value).toBe(1);
  });
});

describe("suit-boost relics (replace Train)", () => {
  it("Heartsworn adds +2 Hearts power for the run", () => {
    const run = { ...createRun("x"), slots: ["heartsworn"] } as RunState;
    expect(effectiveSuitUpgrades(run).H).toBe(2);
  });
});

describe("tarots", () => {
  it("The Hermit doubles gold (capped at +20)", () => {
    const run = { ...createRun("x"), gold: 8 };
    tarotById("the-hermit")!.apply(run);
    expect(run.gold).toBe(16);
  });
  it("Conjuration adds a card and bumps the deck baseline", () => {
    const run = createRun("x");
    const before = run.deckBaseline;
    const n = run.deck.length;
    tarotById("conjuration")!.apply(run);
    expect(run.deck.length).toBe(n + 1);
    expect(run.deckBaseline).toBe(before + 1);
  });
  it("The Hierophant hones the target card", () => {
    const run = createRun("x");
    const target = run.deck[0];
    expect(tarotById("the-hierophant")!.apply(run, target.id)).toBe(true);
    expect(target.sigils).toContain("honed");
  });
});

describe("card templates & inventory caps", () => {
  it("makeCardFromTemplate parses suit / value / sigil / companion", () => {
    expect(makeCardFromTemplate("H7", 1)).toMatchObject({ suit: "H", value: 7, kind: "number" });
    expect(makeCardFromTemplate("S3:keen", 2).sigils).toContain("keen");
    expect(makeCardFromTemplate("DA", 3)).toMatchObject({ kind: "companion", value: 1 });
  });
  it("held base is 2; War Banner adds a guild slot", () => {
    const run = createRun("x");
    expect(heldMax(run)).toBe(2);
    expect(maxSlots(run)).toBe(5);
    expect(maxSlots({ ...run, slots: ["war-banner"] })).toBe(6);
    expect(currentHandMax(run)).toBe(8);
  });
});
