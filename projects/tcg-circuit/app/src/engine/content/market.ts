// Singles market — a PURE price model. Price = a rarity base × a deterministic daily drift, so prices
// "move" day to day without any stored state (replayable). Sell-back is 60%. (A metagame/supply-driven
// model is a noted refinement; this is the MVP economy.)

import { Rarity } from "../prism/types";
import { getCard } from "./registry";

const BASE: Record<Rarity, number> = { common: 1, uncommon: 3, rare: 8, mythic: 22 };

function hash(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (h ^ (h >>> 16)) >>> 0;
}

/** Buy price for one copy of `cardId` on `day`. Deterministic; drifts ±25% daily. */
export function marketPrice(cardId: string, day: number): number {
  const base = BASE[getCard(cardId).rarity];
  const drift = 1 + ((hash(cardId + ":" + day) % 51) - 25) / 100; // 0.75 .. 1.25
  return Math.max(1, Math.round(base * drift));
}

/** What you get selling one copy (60% of buy). */
export function sellPrice(cardId: string, day: number): number {
  return Math.max(1, Math.round(marketPrice(cardId, day) * 0.6));
}

/** Daily trend arrow vs yesterday — for the market app's price ticker. */
export function priceTrend(cardId: string, day: number): "up" | "down" | "flat" {
  const t = marketPrice(cardId, day), y = marketPrice(cardId, Math.max(1, day - 1));
  return t > y ? "up" : t < y ? "down" : "flat";
}
