import { describe, it, expect } from "vitest";
import { LAUNCH_SET } from "../../src/engine/content/cards";
import { DECKS, expandDeck } from "../../src/engine/content/decks";
import { isLegalDeck, STANDARD_FORMAT } from "../../src/engine/content/format";
import { ROSTER } from "../../src/engine/content/opponents";

describe("launch set", () => {
  it("ships a content-rich set with unique ids across all 5 Affinities", () => {
    expect(LAUNCH_SET.length).toBeGreaterThanOrEqual(55);
    const ids = new Set(LAUNCH_SET.map((c) => c.id));
    expect(ids.size).toBe(LAUNCH_SET.length);
    const affinities = new Set(LAUNCH_SET.map((c) => c.affinity));
    for (const a of ["ember", "tide", "verdant", "gloom", "order", "neutral"]) expect(affinities.has(a as never)).toBe(true);
  });

  it("every card is well-formed (units have power, cost >= 0, valid rarity)", () => {
    for (const c of LAUNCH_SET) {
      expect(c.cost).toBeGreaterThanOrEqual(0);
      expect(["common", "uncommon", "rare", "mythic"]).toContain(c.rarity);
      if (c.type === "unit") expect(typeof c.power).toBe("number");
    }
  });

  it("rarer cards carry a larger power budget (balanced around rarity, §3)", () => {
    const byR = (r: string) => LAUNCH_SET.filter((c) => c.rarity === r)[0].powerBudget;
    expect(byR("common")).toBeLessThan(byR("uncommon"));
    expect(byR("uncommon")).toBeLessThan(byR("rare"));
    expect(byR("rare")).toBeLessThan(byR("mythic"));
  });
});

describe("prebuilt decks", () => {
  it("there are several archetype decks and each is a legal 30-card list", () => {
    expect(DECKS.length).toBeGreaterThanOrEqual(8);
    for (const d of DECKS) {
      const list = expandDeck(d);
      expect(list.length).toBe(30);
      const res = isLegalDeck(list, STANDARD_FORMAT);
      expect(res.ok, `${d.name}: ${res.reasons.join("; ")}`).toBe(true);
    }
  });
});

describe("opponent roster", () => {
  it("has a full ladder of opponents on a rising, valid skill scale", () => {
    expect(ROSTER.length).toBeGreaterThanOrEqual(12);
    for (const o of ROSTER) {
      expect(o.skill).toBeGreaterThanOrEqual(0);
      expect(o.skill).toBeLessThanOrEqual(1);
      expect(DECKS.some((d) => d.id === o.deckId)).toBe(true);
    }
    // ascending overall
    expect(ROSTER[0].skill).toBeLessThan(ROSTER[ROSTER.length - 1].skill);
  });
});
