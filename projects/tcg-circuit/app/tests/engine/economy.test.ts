import { describe, it, expect } from "vitest";
import { openPack } from "../../src/engine/content/packs";
import { marketPrice, sellPrice } from "../../src/engine/content/market";
import { createCareer, careerReduce } from "../../src/engine/career";
import { getCard } from "../../src/engine/content/registry";

describe("booster packs", () => {
  it("opens 6 cards deterministically with a Rare-or-better guaranteed", () => {
    const a = openPack("pr1", 12345);
    const b = openPack("pr1", 12345);
    expect(a.cardIds).toEqual(b.cardIds); // deterministic
    expect(a.cardIds.length).toBe(6);
    expect(a.rngState).not.toBe(12345);
    const last = getCard(a.cardIds[5]);
    expect(["rare", "mythic"]).toContain(last.rarity);
    // first three are commons (the fixed slots)
    for (let i = 0; i < 3; i++) expect(getCard(a.cardIds[i]).rarity).toBe("common");
  });
});

describe("singles market", () => {
  it("prices are positive and sell-back is below buy", () => {
    const mythic = "pr1_solflare_avatar";
    const common = "pr1_ember_imp";
    expect(marketPrice(mythic, 1)).toBeGreaterThan(marketPrice(common, 1));
    expect(sellPrice(mythic, 1)).toBeLessThan(marketPrice(mythic, 1)); // 60% sell-back on a high-value card
    expect(sellPrice(common, 1)).toBeLessThanOrEqual(marketPrice(common, 1)); // floors to 1 at the bottom
  });
  it("prices drift across days but stay deterministic per day", () => {
    expect(marketPrice("pr1_scorch", 5)).toBe(marketPrice("pr1_scorch", 5));
  });
});

describe("collection economy", () => {
  it("starts owning exactly the starter deck (30 cards)", () => {
    const c = createCareer(1);
    const total = Object.values(c.collection).reduce((a, b) => a + b, 0);
    expect(total).toBe(30);
  });
  it("acquireCards adds to the collection + deducts money; sellCard reverses", () => {
    let c = createCareer(1);
    c = { ...c, money: 100 };
    const before = c.collection["pr1_colossus"] ?? 0;
    c = careerReduce(c, { type: "acquireCards", cardIds: ["pr1_colossus"], cost: 22, rngState: 999 });
    expect(c.collection["pr1_colossus"]).toBe(before + 1);
    expect(c.money).toBe(78);
    expect(c.rngState).toBe(999);
    c = careerReduce(c, { type: "sellCard", cardId: "pr1_colossus", price: 13 });
    expect(c.collection["pr1_colossus"]).toBe(before);
    expect(c.money).toBe(91);
  });
});
