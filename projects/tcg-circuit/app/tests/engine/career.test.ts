import { describe, it, expect } from "vitest";
import { createCareer, careerReduce, currentObjective } from "../../src/engine/career";
import { ACT1 } from "../../src/engine/content/story";
import { WORLD } from "../../src/engine/content/world";
import { ROSTER } from "../../src/engine/content/opponents";
import { getDeck } from "../../src/engine/content/decks";

describe("career engine (Act I)", () => {
  it("starts at home on day 1 with the starter", () => {
    const c = createCareer(1);
    expect(c.day).toBe(1);
    expect(c.location).toBe("home");
    expect(c.activeDeckId).toBe("emberrush");
    expect(currentObjective(c)).toBe(ACT1[0].objective);
  });

  it("completeStep applies rewards and advances the beat; sleep advances the day", () => {
    let c = createCareer(1);
    const before = c.money;
    // step 0 has no money; jump to a rewarding beat
    c = { ...c, beat: 2 }; // tutorial: +3 money, flag learned_game
    c = careerReduce(c, { type: "completeStep" });
    expect(c.beat).toBe(3);
    expect(c.money).toBe(before + 3);
    expect(c.flags.learned_game).toBe(true);
    const day = c.day;
    c = careerReduce(c, { type: "sleep" });
    expect(c.day).toBe(day + 1);
    expect(c.location).toBe("home");
  });

  it("completing the final step marks the act complete", () => {
    let c = createCareer(1);
    for (let i = 0; i < ACT1.length; i++) c = careerReduce(c, { type: "completeStep" });
    expect(c.actComplete).toBe(true);
    expect(currentObjective(c)).toMatch(/Act I complete/);
  });
});

describe("life-sim", () => {
  it("a context seeds the five stats; activities spend a slot and move money/stats", () => {
    let c = createCareer(1, "college");
    expect(c.context).toBe("college");
    expect(c.stats.knowledge).toBe(8);
    const m0 = c.money, k0 = c.stats.knowledge, slot0 = c.slotIndex;
    c = careerReduce(c, { type: "activity", id: "study" }); // knowledge +1, stamina -1, +1 slot
    expect(c.stats.knowledge).toBe(k0 + 1);
    expect(c.slotIndex).toBe(slot0 + 1);
    c = careerReduce(c, { type: "activity", id: "work" }); // +money, +1 slot
    expect(c.money).toBeGreaterThan(m0);
    expect(c.slotIndex).toBe(slot0 + 2);
  });

  it("a full day caps at 3 slots; sleep resets the day and restores Stamina", () => {
    let c = createCareer(1, "hs_soph");
    c = { ...c, stats: { ...c.stats, stamina: 2 } };
    for (let i = 0; i < 5; i++) c = careerReduce(c, { type: "activity", id: "study" });
    expect(c.slotIndex).toBe(3); // clamps at "Night"
    const day = c.day;
    c = careerReduce(c, { type: "sleep" });
    expect(c.day).toBe(day + 1);
    expect(c.slotIndex).toBe(0);
    expect(c.stats.stamina).toBeGreaterThan(2); // rest restored it
  });

  it("exams move Reputation", () => {
    let c = createCareer(1, "hs_junior");
    const r0 = c.stats.reputation;
    c = careerReduce(c, { type: "exam", passed: true });
    expect(c.stats.reputation).toBeGreaterThan(r0);
    expect(c.examsPassed).toBe(1);
  });
});

describe("world + story integrity", () => {
  it("every story step targets an entity that exists in its location, and duel opponents are real", () => {
    for (const step of ACT1) {
      const loc = WORLD[step.location];
      expect(loc, `location ${step.location}`).toBeTruthy();
      const ids = loc.entities.map((e) => e.id);
      expect(ids, `${step.id} target ${step.target} in ${step.location}`).toContain(step.target);
      if (step.duelOpponent) {
        expect(ROSTER.some((o) => o.id === step.duelOpponent), `opponent ${step.duelOpponent}`).toBe(true);
        // the opponent's deck must be a real, valid deck
        const opp = ROSTER.find((o) => o.id === step.duelOpponent)!;
        expect(() => getDeck(opp.deckId)).not.toThrow();
      }
    }
  });

  it("every door entity points to a valid location + entrance", () => {
    for (const loc of Object.values(WORLD)) {
      for (const e of loc.entities) {
        if (e.kind === "door") {
          expect(WORLD[e.to!]).toBeTruthy();
          expect(WORLD[e.to!].entrances[e.toEntrance!], `${loc.id}->${e.to}:${e.toEntrance}`).toBeTruthy();
        }
      }
      // tilemap rows are uniform width
      const w = loc.tiles[0].length;
      for (const row of loc.tiles) expect(row.length).toBe(w);
    }
  });
});
