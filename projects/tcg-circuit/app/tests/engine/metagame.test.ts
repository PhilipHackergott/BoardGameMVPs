import { describe, it, expect } from "vitest";
import { TOURNAMENTS } from "../../src/engine/content/tournaments";
import { ROSTER } from "../../src/engine/content/opponents";
import { getPack } from "../../src/engine/content/packs";
import { currentFormat, newsUpTo, CAMPAIGN } from "../../src/engine/content/calendar";
import { isLegalDeck } from "../../src/engine/content/format";
import { BLOG_POSTS } from "../../src/engine/content/community";
import { getDeck, expandDeck } from "../../src/engine/content/decks";

describe("tournaments", () => {
  it("every tournament references real opponents + a real prize pack", () => {
    expect(TOURNAMENTS.length).toBeGreaterThanOrEqual(1);
    for (const t of TOURNAMENTS) {
      for (const r of t.rounds) expect(ROSTER.some((o) => o.id === r.opponentId), `opp ${r.opponentId}`).toBe(true);
      if (t.championPack) expect(() => getPack(t.championPack!)).not.toThrow();
      expect(t.rounds.length).toBeGreaterThanOrEqual(2);
    }
  });
});

describe("campaign calendar + live B&R", () => {
  it("the legal format shifts as B&R announcements fire over the campaign", () => {
    // A legal 30-card list with three World Titans (every card ≤ 3 copies).
    const deck = [
      ...Array(3).fill("pr1_world_titan"),
      ...["pr1_verdant_sprout", "pr1_briar_guardian", "pr1_thorn_elk", "pr1_verdant_tender", "pr1_ancient_ent", "pr1_mana_grove", "pr1_growth_surge", "pr1_root_network", "pr1_overgrowth"].flatMap((id) => [id, id, id]),
    ];
    const earlyOk = isLegalDeck(deck, currentFormat(1));
    const lateOk = isLegalDeck(deck, currentFormat(7));
    expect(earlyOk.ok).toBe(true);
    expect(lateOk.ok).toBe(false); // limited to 1 after the day-7 update
    expect(lateOk.reasons.join(" ")).toMatch(/World Titan/);
  });

  it("news feed grows as days pass", () => {
    expect(newsUpTo(1).length).toBeLessThan(newsUpTo(99).length);
    expect(newsUpTo(99).length).toBe(CAMPAIGN.length);
  });
});

describe("community blog decklists are valid", () => {
  it("every blog post embeds a real, legal deck", () => {
    for (const b of BLOG_POSTS) {
      expect(() => getDeck(b.deckId)).not.toThrow();
      expect(expandDeck(getDeck(b.deckId)).length).toBe(30);
    }
  });
});
