// Format = the legal card pool right now (tcg-design §1–2). Deckbuilding + event entry read this;
// the duel engine is format-agnostic (it just plays the two decks). Carries the Banned/Limited list
// as data so the campaign can use B&R as a live mechanic later. MVP ships ONE authored format + a
// tiny demo limited entry to exercise the machinery.

import { MAX_COPIES, DECK_SIZE } from "../prism/types";
import { getCard } from "./registry";

export interface Format {
  id: string;
  name: string;
  legalSetIds: string[];
  banned: string[];
  limited: Record<string, 1 | 2>;
}

export const STANDARD_FORMAT: Format = {
  id: "std",
  name: "Standard",
  legalSetIds: ["pr1", "pr2", "pr3"], // everything released; Story restricts to sets dropped so far (calendar.ts)
  banned: [],
  // Demo limited entry: the swingiest Mythic is restricted to 1 copy, to exercise the B&R machinery.
  limited: { pr1_solflare_avatar: 1 },
};

export interface LegalityResult {
  ok: boolean;
  reasons: string[];
}

/** Validate a decklist (array of cardIds) against a format. Returns human-readable reasons. */
export function isLegalDeck(deck: string[], format: Format = STANDARD_FORMAT): LegalityResult {
  const reasons: string[] = [];
  if (deck.length !== DECK_SIZE) reasons.push(`Deck must be exactly ${DECK_SIZE} cards (has ${deck.length}).`);
  const counts = new Map<string, number>();
  for (const id of deck) counts.set(id, (counts.get(id) ?? 0) + 1);
  for (const [id, n] of counts) {
    const card = getCard(id);
    if (!format.legalSetIds.includes(card.setId)) reasons.push(`${card.name} is not in the legal sets.`);
    if (format.banned.includes(id)) reasons.push(`${card.name} is banned.`);
    const cap = format.limited[id] ?? MAX_COPIES;
    if (n > cap) reasons.push(`${card.name}: max ${cap} cop${cap === 1 ? "y" : "ies"} (has ${n}).`);
  }
  return { ok: reasons.length === 0, reasons };
}
