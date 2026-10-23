import { describe, expect, it } from "vitest";
import { applyAction, createRun } from "../../src/engine/run";

// Heart-suit heal effect (Regicide solo rule): shuffle the discard, count out N face-down cards
// equal to the attack value played, place them at the bottom of the Tavern deck. Verify the
// engine actually moves cards from discard → deck and that the totals balance.

describe("applyHeal — Hearts recycle discard back to the bottom of the deck", () => {
  it("moves N cards from discard to deck when a heart is played", () => {
    // The first royal is always the Jack of Hearts (Hearts-immune), so heart plays would heal 0.
    // Mutate the current enemy to a non-Hearts suit so heart effects fire.
    let run = createRun("heal-1", "royal", "white");
    let attempts = 0;
    while (!run.hand.some((c) => c.suit === "H" && c.kind === "number") && attempts < 20) {
      attempts++;
      run = createRun("heal-" + attempts, "royal", "white");
    }
    if (run.combat) run.combat.enemy.suit = "S"; // immune to spades, not hearts
    const heart = run.hand.find((c) => c.suit === "H" && c.kind === "number")!;
    expect(heart, "should find a heart in hand within 20 seeds").toBeDefined();
    // Seed the discard with 5 cards lifted off the deck.
    const fake = run.deck.splice(0, 5);
    run.discard.push(...fake);
    const deckBefore = run.deck.length;
    const discardBefore = run.discard.length;
    const heal = heart.value;
    run = applyAction(run, { type: "play", cardIds: [heart.id], wildSuits: {} });
    const moved = Math.min(heal, discardBefore);
    expect(run.discard.length, "discard should shrink by N cards").toBe(discardBefore - moved);
    // Deck change = +moved (healed cards appended) − N (draw-after-play; N = cards played = 1).
    expect(run.deck.length - deckBefore, "deck should grow by N cards (minus the draw-after-play refill)").toBe(moved - 1);
  });

  it("does nothing when discard is empty (no-op, no crash)", () => {
    let run = createRun("heal-2", "royal", "white");
    expect(run.discard.length).toBe(0);
    const heart = run.hand.find((c) => c.suit === "H" && c.kind === "number") ?? run.hand[0];
    run = applyAction(run, { type: "play", cardIds: [heart.id], wildSuits: {} });
    expect(run.discard.length).toBe(0); // still empty — nothing to heal
  });
});
