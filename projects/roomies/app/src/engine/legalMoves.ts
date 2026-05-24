// Legal-move generation / validation. Pure; drives both the UI ("which targets are
// enabled, and why not") and the rules reducer's guards.

import { ANIMAL_BY_ID, ENV_BY_ID } from "./cards";
import type { CardId, EnvInstance, GameState, PlayerId, PlayerState } from "./types";

/** Effective Raum capacity of an environment (intrinsic + Ausbau). */
export function envCapacity(env: EnvInstance): number {
  return ENV_BY_ID[env.defId].raum + env.ausbau * 2;
}

/** Raum consumed by the animals currently in an environment. */
export function envUsedRaum(env: EnvInstance, cards: GameState["cards"]): number {
  return env.animalIds.reduce((sum, id) => sum + ANIMAL_BY_ID[cards[id].defId].raum, 0);
}

export function envFreeRaum(env: EnvInstance, cards: GameState["cards"]): number {
  return envCapacity(env) - envUsedRaum(env, cards);
}

/** Environments owned by `player` that have room for the given animal def. */
export function legalEnvironmentsForAnimal(player: PlayerState, animalDefId: string, cards: GameState["cards"]): CardId[] {
  const need = ANIMAL_BY_ID[animalDefId].raum;
  return player.environments.filter((e) => envFreeRaum(e, cards) >= need).map((e) => e.cardId);
}

/** Legal targets for an improvement: env ids, or (Verkleidung) placed-animal ids. */
export function legalImprovementTargets(
  player: PlayerState,
  improvementDefId: string,
): { envCardIds: CardId[]; animalCardIds: CardId[] } {
  if (improvementDefId === "verkleidung") {
    const animalCardIds = player.environments.flatMap((e) => e.animalIds);
    return { envCardIds: [], animalCardIds };
  }
  return { envCardIds: player.environments.map((e) => e.cardId), animalCardIds: [] };
}

export type PlayOption =
  | { kind: "env" }
  | { kind: "animal"; envCardIds: CardId[] }
  | { kind: "improvement"; envCardIds: CardId[]; animalCardIds: CardId[] };

/** What can the current player do with a card in hand: play it (and where) or only discard. */
export function playOptionsFor(state: GameState, player: PlayerId, cardId: CardId): PlayOption {
  const card = state.cards[cardId];
  const p = state.players[player];
  if (card.kind === "env") return { kind: "env" };
  if (card.kind === "animal") return { kind: "animal", envCardIds: legalEnvironmentsForAnimal(p, card.defId, state.cards) };
  const t = legalImprovementTargets(p, card.defId);
  return { kind: "improvement", envCardIds: t.envCardIds, animalCardIds: t.animalCardIds };
}

/** True if the card can be played at all (vs. must be discarded). */
export function canPlay(state: GameState, player: PlayerId, cardId: CardId): boolean {
  const opt = playOptionsFor(state, player, cardId);
  if (opt.kind === "env") return true;
  if (opt.kind === "animal") return opt.envCardIds.length > 0;
  return opt.envCardIds.length > 0 || opt.animalCardIds.length > 0;
}
