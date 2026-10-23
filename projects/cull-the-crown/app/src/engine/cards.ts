// Deck and castle construction. Mirrors Regicide solo: the run (Tavern) deck is the number cards
// 2..10 plus the four Animal Companions (the Aces, value 1) = 40 cards. The two Jesters are NOT
// shuffled in — per the solo rules they are set aside as charges (see RunState.jesterCharges).
// The Jacks/Queens/Kings are NOT in the deck either; they are the 12 enemies (the Castle).

import { Card, Enemy, Suit, SUITS, Tier } from "./types";

export function buildDeck(): Card[] {
  return buildSuitedDeck(SUITS);
}

/** Build a deck from a chosen set of suits, duplicated so the total stays ~40 cards (used by the
 *  composition decks, e.g. The Iron Deck = Spades & Clubs only → 2 copies each = 40). */
export function buildSuitedDeck(suits: Suit[]): Card[] {
  const cards: Card[] = [];
  const copies = Math.max(1, Math.round(SUITS.length / suits.length)); // 4 suits → 1, 2 suits → 2
  for (const suit of suits) {
    for (let k = 0; k < copies; k++) {
      const tag = k === 0 ? "" : `_${k}`;
      for (let v = 2; v <= 10; v++) cards.push({ id: `${suit}${v}${tag}`, suit, value: v, kind: "number" });
      cards.push({ id: `${suit}A${tag}`, suit, value: 1, kind: "companion" });
    }
  }
  return cards;
}

export const TIER_STATS: Record<Tier, { health: number; attack: number }> = {
  // Doubled HP (per design directive). Tuned across multi-epoch playtests so a moderately skilled
  // player can plausibly clear a run: jacks easy (the warmup tier), queens the mid-game test,
  // kings the climactic wall — but reachable. Without shop AI most playtest runs reached the
  // final-king fight at 60-70% completion, so kings are tuned tight, not unwinnable.
  jack: { health: 40, attack: 7 },
  queen: { health: 56, attack: 9 },
  king: { health: 68, attack: 11 },
};

function makeEnemy(tier: Tier, suit: Suit): Enemy {
  const { health, attack } = TIER_STATS[tier];
  return {
    tier,
    suit,
    maxHealth: health,
    attack,
    damageTaken: 0,
    shield: 0,
    immunityCancelled: false,
    decreeId: null,
    decreeParam: null,
  };
}

/** The 12 royals. Order is Jacks, then Queens, then Kings; the four suits within each rank are
 *  shuffled by the caller (so it is seed-driven). Here we return them in a fixed suit order; the
 *  run setup shuffles each rank group. */
export function buildCastleGroups(): Enemy[][] {
  const tiers: Tier[] = ["jack", "queen", "king"];
  return tiers.map((tier) => SUITS.map((suit) => makeEnemy(tier, suit)));
}
