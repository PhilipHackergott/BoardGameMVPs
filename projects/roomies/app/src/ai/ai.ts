// AI opponents as pure choosers (Lacuna pattern): given a GameState, return the next Action for
// the current seat. The UI driver dispatches them through the real store actions, so AI moves
// animate and log exactly like human moves (and replay deterministically — the log captures the
// chosen action, so the AI may use Math.random freely for tie-breaks).
//
// easy   — random/first-fit, no lookahead.
// medium — greedy: draft for synergy with what you hold; place to maximise your own score.
// hard   — medium + biome-set awareness, stronger synergy weighting, light disruption.

import { applyAction } from "../engine/rules";
import { scorePlayer } from "../engine/scoring";
import { ANIMAL_BY_ID, ENV_BY_ID, IMPROVEMENT_BY_ID } from "../engine/cards";
import { envFreeRaum } from "../engine/legalMoves";
import type { Action, CardId, GameState, PlayerId, PlayerState, SeatType } from "../engine/types";

const isSchafDef = (defId: string) => !!ANIMAL_BY_ID[defId]?.schaf || !!ANIMAL_BY_ID[defId]?.types.includes("joker");
const isSecDef = (defId: string) => !!ANIMAL_BY_ID[defId]?.security || !!ANIMAL_BY_ID[defId]?.types.includes("joker");

function ownedAnimalDefs(state: GameState, me: PlayerState): string[] {
  const out: string[] = [];
  for (const id of me.pool) if (state.cards[id].kind === "animal") out.push(state.cards[id].defId);
  for (const e of me.environments) for (const id of e.animalIds) out.push(state.cards[id].defId);
  return out;
}

/** Heuristic value of drafting a card (placement happens later, so this can't be exact). */
function draftValue(state: GameState, cardId: CardId, me: PlayerState, diff: SeatType): number {
  const card = state.cards[cardId];
  if (card.kind === "env") {
    const d = ENV_BY_ID[card.defId];
    let v = d.raum * d.multiplier * 0.5 + (d.multiplier > 1 ? 1 : 0);
    if (me.environments.length + me.pool.filter((c) => state.cards[c].kind === "env").length < 2) v += 2;
    return v;
  }
  if (card.kind === "improvement") {
    return { ausbau: 1.2, dekoration: 0.2, verkleidung: 0.7 }[card.defId] ?? 1.0; // biome → 1.0
  }
  const a = ANIMAL_BY_ID[card.defId];
  let v = a.base;
  if (a.security) v += 1.2;
  if (a.schaf) v += 0.8;
  if (a.effect === "dalaiAlone") v += 1.2;
  if (a.effect === "leo4") v += 1.0;
  if (a.types.includes("joker")) v += 1.5;
  if (diff !== "easy") {
    const owned = ownedAnimalDefs(state, me);
    const schafe = owned.filter(isSchafDef).length;
    const hasSec = owned.some(isSecDef);
    if (a.security && schafe > 0) v += 2;
    if (a.schaf && hasSec) v += 1;
    if (a.schaf && schafe >= 2) v += 1;
    if (a.effect === "hossi" && owned.includes("mikel")) v += 2;
    if (a.effect === "mikel" && owned.includes("hossi")) v += 2;
    if (a.effect === "martySecurity") v += owned.filter(isSecDef).length * 0.8;
  }
  if (diff === "hard" && a.types.includes("joker")) v += 0.7;
  return v;
}

export function aiDraftPick(state: GameState, diff: SeatType): CardId {
  const hand = state.hands[state.current];
  if (diff === "easy") return hand[Math.floor(Math.random() * hand.length)];
  const me = state.players[state.current];
  let best = hand[0];
  let bestV = -Infinity;
  for (const c of hand) {
    const v = draftValue(state, c, me, diff) + Math.random() * 0.01;
    if (v > bestV) { bestV = v; best = c; }
  }
  return best;
}

export function aiMartySwap(state: GameState, diff: SeatType): PlayerId | null {
  const opts = state.pending?.type === "martySwap" ? state.pending.options : [];
  if (opts.length === 0) return null;
  if (diff === "easy") return Math.random() < 0.5 ? null : opts[Math.floor(Math.random() * opts.length)];
  return null; // medium/hard: keep your drafted hand (conservative)
}

/** Next placement action for the current seat: place / discard / end. Always makes progress. */
export function aiPlaceAction(state: GameState, diff: SeatType): Action {
  const me = state.players[state.current];
  const pool = me.pool;
  if (pool.length === 0) return { type: "endPlacement" };

  // 1. Always lay down a room first (enables everything else).
  const envCard = pool.find((c) => state.cards[c].kind === "env");
  if (envCard !== undefined) return { type: "place", cardId: envCard };

  // 2. No rooms yet and only non-env cards → can't place them this round; shed one.
  if (me.environments.length === 0) return { type: "discardFromPool", cardId: pool[0] };

  if (diff === "easy") {
    for (const c of pool) {
      const card = state.cards[c];
      if (card.kind === "animal") {
        const need = ANIMAL_BY_ID[card.defId].raum;
        const e = me.environments.find((e) => envFreeRaum(e, state.cards) >= need);
        if (e) return { type: "place", cardId: c, targetEnvCardId: e.cardId };
      } else if (card.defId === "verkleidung") {
        const aid = me.environments.flatMap((e) => e.animalIds)[0];
        if (aid !== undefined) return { type: "place", cardId: c, targetAnimalCardId: aid };
      } else {
        return { type: "place", cardId: c, targetEnvCardId: me.environments[0].cardId };
      }
    }
    return { type: "discardFromPool", cardId: pool[0] };
  }

  // medium / hard: pick the placement that most increases my own score (simulate via the reducer).
  const base = scorePlayer(me, state.cards, state.jokered).total;
  let best: { action: Action; delta: number } | null = null;
  const consider = (action: Action) => {
    let delta: number;
    try {
      const ns = applyAction(state, action);
      delta = scorePlayer(ns.players[state.current], ns.cards, ns.jokered).total - base;
    } catch {
      return;
    }
    if (!best || delta > best.delta) best = { action, delta };
  };

  for (const c of pool) {
    const card = state.cards[c];
    if (card.kind === "animal") {
      const need = ANIMAL_BY_ID[card.defId].raum;
      for (const e of me.environments) if (envFreeRaum(e, state.cards) >= need) consider({ type: "place", cardId: c, targetEnvCardId: e.cardId });
    } else if (IMPROVEMENT_BY_ID[card.defId].kind === "verkleidung") {
      for (const aid of me.environments.flatMap((e) => e.animalIds)) consider({ type: "place", cardId: c, targetAnimalCardId: aid });
    } else {
      for (const e of me.environments) consider({ type: "place", cardId: c, targetEnvCardId: e.cardId });
    }
  }

  if (best !== null && (best as { delta: number }).delta >= 0) return (best as { action: Action }).action;
  return { type: "endPlacement" }; // nothing left worth placing → discard the rest
}
