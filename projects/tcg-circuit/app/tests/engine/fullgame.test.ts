import { describe, it, expect } from "vitest";
import { playMatch } from "../../src/ai/match";
import { DECKS, expandDeck } from "../../src/engine/content/decks";

// A full duel must always terminate with a winner (Nexus->0 or empty-deck alt-loss) — never hang.
describe("full-duel simulation", () => {
  it("every archetype pairing resolves to a winner within a sane turn count", () => {
    for (let i = 0; i < DECKS.length; i++) {
      for (let j = 0; j < DECKS.length; j++) {
        const r = playMatch({
          deckA: expandDeck(DECKS[i]),
          deckB: expandDeck(DECKS[j]),
          skillA: 0.6,
          skillB: 0.6,
          seed: `fg-${i}-${j}`,
        });
        expect(r.winner === 0 || r.winner === 1).toBe(true);
        expect(r.turns).toBeGreaterThan(1);
        expect(r.turns).toBeLessThan(120);
      }
    }
  });

  it("is deterministic — same inputs reproduce the same result", () => {
    const a = expandDeck(DECKS[0]);
    const b = expandDeck(DECKS[3]);
    const r1 = playMatch({ deckA: a, deckB: b, skillA: 0.5, skillB: 0.7, seed: "repro" });
    const r2 = playMatch({ deckA: a, deckB: b, skillA: 0.5, skillB: 0.7, seed: "repro" });
    expect(r1).toEqual(r2);
  });
});
