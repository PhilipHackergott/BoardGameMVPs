// Booster packs — DATA + a PURE, deterministic opener (rarity-weighted with fixed slots = a built-in
// pity: every pack guarantees a Rare-or-better). Threads the career's rngState so opening replays.

import { Rarity } from "../prism/types";
import { rngInt } from "../prism/rng";
import { ALL_CARDS } from "./registry";

export interface PackDef {
  id: string;
  name: string;
  setId: string;
  cost: number;
  size: number;
}

export const PACKS: PackDef[] = [
  { id: "pr1_booster", name: "First Light Booster", setId: "pr1", cost: 6, size: 6 },
  { id: "pr2_booster", name: "Tideturn Booster", setId: "pr2", cost: 6, size: 6 },
  { id: "pr3_booster", name: "Deeproots Booster", setId: "pr3", cost: 6, size: 6 },
];

export function getPack(id: string): PackDef {
  const p = PACKS.find((x) => x.id === id);
  if (!p) throw new Error(`Unknown pack: ${id}`);
  return p;
}

function bySetRarity(setId: string, rarity: Rarity): string[] {
  return ALL_CARDS.filter((c) => c.setId === setId && c.rarity === rarity).map((c) => c.id);
}

function pick(pool: string[], state: number): { id: string; state: number } {
  if (pool.length === 0) return { id: ALL_CARDS[0].id, state };
  const r = rngInt(state, pool.length);
  return { id: pool[r.value], state: r.state };
}

/** Open one pack: 3 Common, 2 Uncommon, 1 Rare(80%)/Mythic(20%). Pure; returns advanced rngState. */
export function openPack(setId: string, rngState: number): { cardIds: string[]; rngState: number } {
  let s = rngState;
  const out: string[] = [];
  const commons = bySetRarity(setId, "common");
  const uncommons = bySetRarity(setId, "uncommon");
  const rares = bySetRarity(setId, "rare");
  const mythics = bySetRarity(setId, "mythic");
  for (let i = 0; i < 3; i++) { const p = pick(commons, s); out.push(p.id); s = p.state; }
  for (let i = 0; i < 2; i++) { const p = pick(uncommons, s); out.push(p.id); s = p.state; }
  const roll = rngInt(s, 100); s = roll.state;
  const p = pick(roll.value < 20 ? mythics : rares, s); out.push(p.id); s = p.state;
  return { cardIds: out, rngState: s };
}
