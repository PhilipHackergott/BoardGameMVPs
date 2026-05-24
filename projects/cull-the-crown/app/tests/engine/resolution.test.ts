import { describe, expect, it } from "vitest";
import { resolvePlay, parseSelection } from "../../src/engine/resolution";
import { jokerById } from "../../src/engine/content";
import { Card, Enemy, Suit, SuitUpgrades } from "../../src/engine/types";

const NO_UPG: SuitUpgrades = { H: 0, D: 0, C: 0, S: 0 };
const num = (suit: Suit, value: number): Card => ({ id: `${suit}${value}`, suit, value, kind: "number" });
const comp = (suit: Suit): Card => ({ id: `${suit}A`, suit, value: 1, kind: "companion" });
const jester = (id = "JOK1"): Card => ({ id, suit: null, value: 0, kind: "jester" });

function enemy(suit: Suit, over: Partial<Enemy> = {}): Enemy {
  return {
    tier: "jack",
    suit,
    maxHealth: 20,
    attack: 10,
    damageTaken: 0,
    shield: 0,
    immunityCancelled: false,
    ...over,
  };
}

const J = (id: string) => [jokerById(id)!];

describe("parseSelection", () => {
  it("accepts a single number card", () => {
    expect(parseSelection([num("H", 7)]).ok).toBe(true);
  });
  it("rejects a mixed-rank pair", () => {
    const p = parseSelection([num("H", 3), num("S", 4)]);
    expect(p.ok).toBe(false);
  });
  it("accepts an equal-rank combo summing <= 10", () => {
    const p = parseSelection([num("D", 3), num("S", 3), num("C", 3)]);
    expect(p.ok).toBe(true);
    expect(p.value).toBe(9);
    expect(p.isCombo).toBe(true);
  });
  it("rejects a combo summing > 10", () => {
    expect(parseSelection([num("D", 6), num("S", 6)]).ok).toBe(false);
  });
  it("rejects a Jester combined with another card", () => {
    expect(parseSelection([jester(), num("H", 5)]).ok).toBe(false);
  });
  it("accepts a companion paired with one card", () => {
    const p = parseSelection([comp("C"), num("D", 8)]);
    expect(p.ok).toBe(true);
    expect(p.value).toBe(9);
  });
  it("rejects a companion with two other cards", () => {
    expect(parseSelection([comp("C"), num("D", 8), num("D", 8)]).ok).toBe(false);
  });
});

describe("base suit powers", () => {
  it("Hearts heal at value, deal value damage", () => {
    const r = resolvePlay([num("H", 7)], enemy("S"), [], NO_UPG, true);
    expect(r.damage).toBe(7);
    expect(r.heal).toBe(7);
  });
  it("Clubs double damage", () => {
    const r = resolvePlay([num("C", 8)], enemy("S"), [], NO_UPG, true);
    expect(r.damage).toBe(16);
  });
  it("Spades shield at value", () => {
    const r = resolvePlay([num("S", 5)], enemy("H"), [], NO_UPG, true);
    expect(r.shield).toBe(5);
    expect(r.damage).toBe(5);
  });
  it("Diamonds draw at value", () => {
    const r = resolvePlay([num("D", 6)], enemy("H"), [], NO_UPG, true);
    expect(r.draw).toBe(6);
  });
  it("combo resolves all powers at the total (Regicide 3-3-3 example)", () => {
    const r = resolvePlay([num("D", 3), num("S", 3), num("C", 3)], enemy("H"), [], NO_UPG, true);
    expect(r.draw).toBe(9); // Diamonds
    expect(r.shield).toBe(9); // Spades
    expect(r.damage).toBe(18); // Clubs double the total
  });
  it("companion + 8 of Diamonds with a Clubs companion (Regicide example)", () => {
    const r = resolvePlay([comp("C"), num("D", 8)], enemy("H"), [], NO_UPG, true);
    expect(r.draw).toBe(9);
    expect(r.damage).toBe(18);
  });
});

describe("enemy immunity & the Jester", () => {
  it("immune suit's power is nullified but its damage stays", () => {
    const r = resolvePlay([num("H", 7)], enemy("H"), [], NO_UPG, true);
    expect(r.heal).toBe(0);
    expect(r.damage).toBe(7);
  });
  it("Clubs do not double against a Clubs-immune enemy", () => {
    const r = resolvePlay([num("C", 8)], enemy("C"), [], NO_UPG, true);
    expect(r.damage).toBe(8);
  });
  it("a cancelled immunity restores the power", () => {
    const r = resolvePlay([num("H", 7)], enemy("H", { immunityCancelled: true }), [], NO_UPG, true);
    expect(r.heal).toBe(7);
  });
  it("a Jester flags jesterPlayed and deals no damage by itself", () => {
    const r = resolvePlay([jester()], enemy("S"), [], NO_UPG, true);
    expect(r.jesterPlayed).toBe(true);
    expect(r.damage).toBe(0);
  });
});

describe("suit upgrades (Class Training)", () => {
  it("adds to the relevant suit power", () => {
    const upg: SuitUpgrades = { H: 2, D: 1, C: 0, S: 1 };
    expect(resolvePlay([num("H", 4)], enemy("S"), [], upg, true).heal).toBe(6);
    expect(resolvePlay([num("D", 4)], enemy("S"), [], upg, true).draw).toBe(5);
    expect(resolvePlay([num("S", 4)], enemy("H"), [], upg, true).shield).toBe(5);
  });
});

describe("jokers modify resolution", () => {
  it("Bloodstained Shield adds spade damage equal to the shield", () => {
    const base = resolvePlay([num("S", 5)], enemy("H"), [], NO_UPG, true);
    const withJ = resolvePlay([num("S", 5)], enemy("H"), J("bloodstained-shield"), NO_UPG, true);
    expect(base.damage).toBe(5);
    expect(withJ.damage).toBe(10); // 5 base + 5 from shield
    expect(withJ.shield).toBe(5);
  });
  it("The Opportunist triggers Clubs an extra time in a combo", () => {
    const cards = [num("C", 3), num("C", 3)]; // combo of clubs, total 6
    const base = resolvePlay(cards, enemy("H"), [], NO_UPG, true);
    const withJ = resolvePlay(cards, enemy("H"), J("opportunist"), NO_UPG, true);
    expect(base.damage).toBe(12); // 6 doubled
    expect(withJ.damage).toBe(18); // + another 6
  });
  it("Field Medic adds +2 heal only when Hearts are played", () => {
    expect(resolvePlay([num("H", 4)], enemy("S"), J("field-medic"), NO_UPG, true).heal).toBe(6);
    expect(resolvePlay([num("S", 4)], enemy("H"), J("field-medic"), NO_UPG, true).heal).toBe(0);
  });
  it("Duelist doubles the first attack of a fight only", () => {
    const first = resolvePlay([num("H", 5)], enemy("S"), J("duelist"), NO_UPG, false);
    const later = resolvePlay([num("H", 5)], enemy("S"), J("duelist"), NO_UPG, true);
    expect(first.damage).toBe(10);
    expect(later.damage).toBe(5);
  });
});
