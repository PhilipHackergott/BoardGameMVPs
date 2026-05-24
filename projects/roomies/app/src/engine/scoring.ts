// The scoring calculator — the heart of Roomies. Pure functions over engine state.
// Implements the synergy rules in 03-mvp-spec.md (Hossi/Mikel, Security, herd/sheep,
// isolation, Marty, Joker, Dekoration, multipliers) and biome set-collection (⚑ D7).

import { ANIMAL_BY_ID, ENV_BY_ID, BIOME_SET_BONUS, type Biome } from "./cards";
import type { AnimalScore, EnvInstance, EnvScore, GameState, PlayerScore, PlayerState, CardId } from "./types";

/** Is this animal instance a Schaf? (Schaf def, or wild via Joker — ⚑ D10) */
function isSchaf(defId: string, jokered: boolean): boolean {
  return ANIMAL_BY_ID[defId].schaf || jokered;
}

/** Does this animal instance provide Security? (Security def, or wild via Joker — ⚑ D10) */
function providesSecurity(defId: string, jokered: boolean): boolean {
  return ANIMAL_BY_ID[defId].security || jokered;
}

/** Compute the per-environment score breakdown. */
export function scoreEnvironment(env: EnvInstance, cards: GameState["cards"], jokered: CardId[]): EnvScore {
  const def = ENV_BY_ID[env.defId];
  const jset = new Set(jokered);

  // Co-location aggregates evaluated across the environment's contents.
  // "joker" (wild) = intrinsic Joker type (Hippo) OR turned Joker by Verkleidung (⚑ D10).
  const members = env.animalIds.map((id) => {
    const defId = cards[id].defId;
    const joker = ANIMAL_BY_ID[defId].types.includes("joker") || jset.has(id);
    return { id, defId, joker };
  });
  const schafCount = members.filter((m) => isSchaf(m.defId, m.joker)).length;
  const securityCount = members.filter((m) => providesSecurity(m.defId, m.joker)).length;
  const hasMikel = members.some((m) => m.defId === "mikel");
  const hasHossi = members.some((m) => m.defId === "hossi");
  const animalCount = members.length;

  const animals: AnimalScore[] = members.map((m) => {
    const adef = ANIMAL_BY_ID[m.defId];
    let adjusted = adef.base;
    const reasons: string[] = [];
    switch (adef.effect) {
      case "hossi":
        if (hasMikel) { adjusted += 1; reasons.push("+1 (Mikel present)"); }
        else { adjusted -= 1; reasons.push("-1 (no Mikel)"); }
        break;
      case "mikel":
        if (hasHossi) { adjusted += 1; reasons.push("+1 (Hossi present)"); }
        else { adjusted -= 1; reasons.push("-1 (no Hossi)"); }
        break;
      case "sheep": {
        const threshold = adef.herdThreshold ?? 3;
        if (schafCount >= threshold) { adjusted += 1; reasons.push(`+1 (≥${threshold} Schafe)`); }
        if ((adef.needsSecurity ?? false) && securityCount === 0) { adjusted -= 1; reasons.push("-1 (no Security)"); }
        break;
      }
      case "leo4":
        if (schafCount === 4) { adjusted += 2; reasons.push("+2 (exactly 4 Schafe)"); }
        break;
      case "dalaiAlone":
        if (animalCount === 1) { adjusted += 2; reasons.push("+2 (alone)"); }
        break;
      case "martySecurity": {
        if (securityCount > 0) { adjusted += securityCount; reasons.push(`+${securityCount} (Security ×${securityCount})`); }
        break;
      }
      case "none":
        break;
    }
    if (m.joker && adef.types[0] !== "joker") reasons.unshift("Joker (Verkleidung)");
    // Dekoration: clamp each animal's adjusted contribution to >= 0 (⚑ D11)
    if (env.dekoration && adjusted < 0) {
      reasons.push("(Dekoration: clamped to 0)");
      adjusted = 0;
    }
    return { cardId: m.id, defId: m.defId, base: adef.base, adjusted, reasons };
  });

  const subtotal = animals.reduce((s, a) => s + a.adjusted, 0);
  return { cardId: env.cardId, defId: env.defId, multiplier: def.multiplier, animals, subtotal, total: subtotal * def.multiplier };
}

/** All biome tags carried by an environment (intrinsic + improvement-added, deduped). */
export function envBiomes(env: EnvInstance): Biome[] {
  const set = new Set<Biome>([...ENV_BY_ID[env.defId].biomes, ...env.extraBiomes]);
  return [...set];
}

/** Complete {zuhause,stadt,natur} sets across a player's environments. */
export function biomeSetCount(player: PlayerState): number {
  const counts: Record<Biome, number> = { zuhause: 0, stadt: 0, natur: 0 };
  for (const env of player.environments) for (const b of envBiomes(env)) counts[b] += 1;
  return Math.min(counts.zuhause, counts.stadt, counts.natur);
}

export function scorePlayer(player: PlayerState, cards: GameState["cards"], jokered: CardId[]): PlayerScore {
  const environments = player.environments.map((e) => scoreEnvironment(e, cards, jokered));
  const biomeSets = biomeSetCount(player);
  const biomeBonus = biomeSets * BIOME_SET_BONUS;
  const animalsPlaced = player.environments.reduce((s, e) => s + e.animalIds.length, 0);
  const total = environments.reduce((s, e) => s + e.total, 0) + biomeBonus;
  return { playerId: player.id, environments, biomeSets, biomeBonus, animalsPlaced, total };
}

export function scoreGame(state: GameState): PlayerScore[] {
  return state.players.map((p) => scorePlayer(p, state.cards, state.jokered));
}

/** Winner(s): highest total; tie-break by biome sets, then animals placed; else shared. */
export function winners(scores: PlayerScore[]): number[] {
  const ranked = [...scores].sort(
    (a, b) => b.total - a.total || b.biomeSets - a.biomeSets || b.animalsPlaced - a.animalsPlaced,
  );
  const top = ranked[0];
  return scores
    .filter((s) => s.total === top.total && s.biomeSets === top.biomeSets && s.animalsPlaced === top.animalsPlaced)
    .map((s) => s.playerId);
}
