import { describe, it, expect } from "vitest";
import { buildCardRegistry, DECK_SIZE_EXPECTED, ENV_DEFS, ANIMAL_DEFS, IMPROVEMENT_DEFS } from "../../src/engine/cards";
import { createGame } from "../../src/engine/setup";

describe("card registry / deck", () => {
  it("expands to the itemized total (⚑ D1: 94, brief states 96)", () => {
    const reg = buildCardRegistry();
    expect(reg.length).toBe(DECK_SIZE_EXPECTED);
    expect(reg.length).toBe(94);
  });

  it("component subtotals are 27 env + 52 animals + 15 improvements", () => {
    const envQty = ENV_DEFS.reduce((s, d) => s + d.qty, 0);
    const animalQty = ANIMAL_DEFS.reduce((s, d) => s + d.qty, 0);
    const impQty = IMPROVEMENT_DEFS.reduce((s, d) => s + d.qty, 0);
    expect([envQty, animalQty, impQty]).toEqual([27, 52, 15]);
  });

  it("every card has a unique id and a known def", () => {
    const reg = buildCardRegistry();
    const ids = new Set(reg.map((c) => c.id));
    expect(ids.size).toBe(reg.length);
    expect(reg.every((c) => c.id >= 0 && c.id < reg.length)).toBe(true);
  });
});

describe("deterministic setup", () => {
  it("same seed → identical shuffle and deal", () => {
    const a = createGame({ players: 4 }, 12345);
    const b = createGame({ players: 4 }, 12345);
    expect(a.hands).toEqual(b.hands);
    expect(a.deck).toEqual(b.deck);
  });

  it("different seeds → different deal (almost surely)", () => {
    const a = createGame({ players: 4 }, 1);
    const b = createGame({ players: 4 }, 2);
    expect(a.hands).not.toEqual(b.hands);
  });

  it("deals handSize cards to each player and starts at round 1", () => {
    const g = createGame({ players: 3 }, 7);
    expect(g.round).toBe(1);
    expect(g.hands.length).toBe(3);
    expect(g.hands.every((h) => h.length === 6)).toBe(true);
    expect(g.deck.length).toBe(94 - 3 * 6);
  });
});
