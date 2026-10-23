// The card registry: the single lookup the engine, AI, deckbuilder, gallery, and sim all read.
// Content is DATA (the launch set in ./cards); the rules engine never hard-codes a card.

import type { CardDef } from "../prism/types";
import { LAUNCH_SET } from "./cards";
import { SET2 } from "./cards-pr2";
import { SET3 } from "./cards-pr3";
import { SETS } from "./sets";

export const ALL_CARDS: CardDef[] = [...LAUNCH_SET, ...SET2, ...SET3];

const INDEX: Record<string, CardDef> = {};
for (const c of ALL_CARDS) {
  if (INDEX[c.id]) throw new Error(`Duplicate card id: ${c.id}`);
  INDEX[c.id] = c;
}

export function getCard(id: string): CardDef {
  const c = INDEX[id];
  if (!c) throw new Error(`Unknown card id: ${id}`);
  return c;
}

export function hasCard(id: string): boolean {
  return !!INDEX[id];
}

export function allCards(): CardDef[] {
  return ALL_CARDS.slice();
}

export function cardsInSet(setId: string): CardDef[] {
  return ALL_CARDS.filter((c) => c.setId === setId);
}

export { SETS };
