import { describe, expect, it } from "vitest";
import { createRun } from "../../src/engine/run";
import { currentHandMax, maxSlots, heldMax } from "../../src/engine/combat";
import { DECK_LIBRARY, stakeMods } from "../../src/engine/content";
import { deckCount } from "../../src/engine/index";

describe("starting decks", () => {
  it("the Royal Deck is the unmodified baseline", () => {
    const run = createRun("d", "royal", "white");
    expect(run.gold).toBe(4);
    expect(currentHandMax(run)).toBe(8);
    expect(maxSlots(run)).toBe(5);
    expect(deckCount(run)).toBe(40);
  });

  it("Merchant's Hoard starts with +10 gold", () => {
    expect(createRun("d", "merchant", "white").gold).toBe(14);
  });

  it("Bannerman's Deck has +1 hand size; Warband +1 slot / −1 hand", () => {
    expect(currentHandMax(createRun("d", "bannerman", "white"))).toBe(9);
    const w = createRun("d", "warband", "white");
    expect(maxSlots(w)).toBe(6);
    expect(currentHandMax(w)).toBe(7);
  });

  it("The Tactician: +2 hand, −1 slot", () => {
    const t = createRun("d", "tactician", "white");
    expect(currentHandMax(t)).toBe(10);
    expect(maxSlots(t)).toBe(4);
  });

  it("The Fool's Pouch starts with 2 tarots, the Spymaster edict, and +1 pouch slot", () => {
    const f = createRun("d", "fools-pouch", "white");
    expect(f.held).toHaveLength(2);
    expect(f.edicts).toContain("spymaster");
    expect(heldMax(f)).toBe(3);
  });

  it("The Occult Deck starts with a rare relic, ◆0, and a decree on the first royal", () => {
    const o = createRun("d", "occult", "white");
    expect(o.gold).toBe(0);
    expect(o.slots).toHaveLength(1);
    expect(o.castle[0].decreeId).toBeTruthy();
  });

  it("The Iron Deck has only Spades & Clubs; The Vital Deck only Hearts & Diamonds", () => {
    const iron = createRun("d", "iron", "white");
    const ironSuits = new Set([...iron.deck, ...iron.hand].map((c) => c.suit));
    expect([...ironSuits].sort()).toEqual(["C", "S"]);
    expect(deckCount(iron)).toBe(40);
    const vital = createRun("d", "vital", "white");
    const vitalSuits = new Set([...vital.deck, ...vital.hand].map((c) => c.suit));
    expect([...vitalSuits].sort()).toEqual(["D", "H"]);
  });

  it("The Enchanter's Deck pre-engraves 4 cards", () => {
    const e = createRun("d", "enchanter", "white");
    const engraved = [...e.deck, ...e.hand].filter((c) => (c.sigils ?? []).length > 0);
    expect(engraved.length).toBe(4);
  });

  it("every deck builds a legal 40-card run and a 12-royal castle", () => {
    for (const d of DECK_LIBRARY) {
      const run = createRun("seed-x", d.id, "white");
      expect(deckCount(run)).toBe(40);
      expect(run.castle).toHaveLength(12);
      expect(run.deckBaseline).toBe(40);
    }
  });

  it("is deterministic per (seed, deck)", () => {
    expect(createRun("z", "erratic", "white")).toEqual(createRun("z", "erratic", "white"));
  });
});

describe("stakes (cumulative ladder)", () => {
  it("White is neutral; higher stakes stack", () => {
    expect(stakeMods("white")).toMatchObject({ rewardDelta: 0, healthMult: 1, attackBonus: 0, noSell: false });
    expect(stakeMods("red").rewardDelta).toBe(-1);
    expect(stakeMods("black").noSell).toBe(true);
    expect(stakeMods("blue").handDelta).toBe(-1); // red+green+black+blue
    expect(stakeMods("purple").healthMult).toBeCloseTo(1.15 * 1.15, 5);
    expect(stakeMods("gold").attackBonus).toBe(3);
  });

  it("Gold Stake makes royals tougher and starts you broke", () => {
    const gold = createRun("d", "royal", "gold");
    expect(gold.gold).toBe(0); // start ◆4 − 4
    expect(gold.castle[0].attack).toBeGreaterThan(10); // base jack 10 + stake +3
  });

  it("Green Stake adds royal health", () => {
    const base = createRun("hp", "royal", "white");
    const green = createRun("hp", "royal", "green");
    expect(green.castle[0].maxHealth).toBeGreaterThan(base.castle[0].maxHealth);
  });
});
