// Pure transitions: applyAction(state, action) -> new state. No I/O, no randomness
// (the only randomness was the seeded shuffle at setup). Illegal moves throw with a reason
// (the UI uses legalMoves.ts to avoid sending them).
//
// Round = DRAFT phase (pick-and-pass into your pool; Dalai/Marty fire on pick) then PLACE phase
// (arrange your pool into rooms). After the last round's placement, the game ends and scores.

import { ANIMAL_BY_ID, IMPROVEMENT_BY_ID } from "./cards";
import { canPlay, envFreeRaum } from "./legalMoves";
import { scoreGame } from "./scoring";
import { dealRound } from "./setup";
import type { Action, EnvInstance, GameState, PlayerId } from "./types";

function removeFrom(list: number[], cardId: number, where: string): void {
  const i = list.indexOf(cardId);
  if (i < 0) throw new Error(`card ${cardId} not in ${where}`);
  list.splice(i, 1);
}

function findOwnedEnv(state: GameState, player: PlayerId, envCardId: number | undefined): EnvInstance {
  const env = state.players[player].environments.find((e) => e.cardId === envCardId);
  if (!env) throw new Error(`environment ${envCardId} not owned by player ${player}`);
  return env;
}

function rotateHands(state: GameState, times: number): void {
  const n = state.config.players;
  for (let r = 0; r < times; r++) {
    const rotated: number[][] = new Array(n);
    for (let i = 0; i < n; i++) rotated[(i + state.passDir + n) % n] = state.hands[i];
    state.hands = rotated;
  }
}

function endGame(state: GameState): void {
  state.phase = "ended";
  state.scores = scoreGame(state);
}

/** Draft: advance to next seat; at pick-round end pass hands; when hands empty, enter PLACE. */
function advanceDraft(state: GameState): void {
  state.turnInPick += 1;
  if (state.turnInPick < state.config.players) {
    state.current = state.turnInPick;
    return;
  }
  // Pick-round complete. All hands equal size now → apply queued Marty swaps, then pass.
  for (const sw of state.pendingSwaps) {
    [state.hands[sw.from], state.hands[sw.to]] = [state.hands[sw.to], state.hands[sw.from]];
  }
  state.pendingSwaps = [];
  rotateHands(state, 1 + state.extraRotations);
  state.extraRotations = 0;
  state.pick += 1;
  state.turnInPick = 0;
  state.current = 0;
  if (state.pick >= state.config.handSize) {
    // Draft finished — everyone now has a full pool. Move to placement.
    state.phase = "place";
    state.message = "Drafting done — place your cards.";
  }
}

/** Place: advance to the next player; after the last, start the next round or end the game. */
function advancePlacement(state: GameState): void {
  // Leftover (unplaced) pool cards are discarded.
  const me = state.players[state.current];
  me.discard.push(...me.pool);
  me.pool = [];

  if (state.current < state.config.players - 1) {
    state.current += 1;
    return;
  }
  state.current = 0;
  if (state.round < state.config.rounds) dealRound(state);
  else endGame(state);
}

export function applyAction(prev: GameState, action: Action): GameState {
  const state: GameState = structuredClone(prev);
  state.message = null;
  state.log.push(action);

  // --- Marty swap resolution (draft) ---
  if (action.type === "resolveMarty") {
    if (!state.pending || state.pending.type !== "martySwap") throw new Error("no Marty swap pending");
    if (action.withPlayer !== null) {
      if (!state.pending.options.includes(action.withPlayer)) throw new Error("illegal swap target");
      state.pendingSwaps.push({ from: state.current, to: action.withPlayer });
      state.message = `Marty: Player ${state.current + 1} will swap hands with Player ${action.withPlayer + 1} when hands pass.`;
    } else {
      state.message = "Marty: swap skipped.";
    }
    state.pending = null;
    advanceDraft(state);
    return state;
  }

  // --- Draft pick ---
  if (action.type === "draftPick") {
    if (state.phase !== "draft") throw new Error("not in the draft phase");
    if (state.pending) throw new Error("resolve the pending choice first");
    const player = state.current;
    removeFrom(state.hands[player], action.cardId, `player ${player}'s hand`);
    state.players[player].pool.push(action.cardId);

    // Draft-phase intercepts fire when the card is drafted.
    const card = state.cards[action.cardId];
    if (card.kind === "animal") {
      const adef = ANIMAL_BY_ID[card.defId];
      if (adef.draft === "rotate") {
        state.extraRotations += 1;
        state.message = "Dalai Lama drafted — all hands rotate once more.";
        advanceDraft(state);
        return state;
      }
      if (adef.draft === "swap") {
        const options = state.players.map((p) => p.id).filter((id) => id !== player);
        state.pending = { type: "martySwap", cardId: action.cardId, options };
        state.message = "Marty drafted — choose a player to swap hands with (or skip).";
        return state; // wait for resolveMarty before advancing
      }
    }
    advanceDraft(state);
    return state;
  }

  // --- Placement ---
  if (action.type === "discardFromPool") {
    if (state.phase !== "place") throw new Error("not in the placement phase");
    const me = state.players[state.current];
    removeFrom(me.pool, action.cardId, "your pool");
    me.discard.push(action.cardId);
    return state;
  }

  if (action.type === "endPlacement") {
    if (state.phase !== "place") throw new Error("not in the placement phase");
    advancePlacement(state);
    return state;
  }

  // action.type === "place"
  if (state.phase !== "place") throw new Error("not in the placement phase");
  const player = state.current;
  const me = state.players[player];
  if (!me.pool.includes(action.cardId)) throw new Error("card not in your pool");
  const card = state.cards[action.cardId];

  if (card.kind === "env") {
    removeFrom(me.pool, action.cardId, "your pool");
    me.environments.push({ cardId: action.cardId, defId: card.defId, ausbau: 0, dekoration: false, extraBiomes: [], animalIds: [] });
    return state;
  }

  if (card.kind === "animal") {
    const adef = ANIMAL_BY_ID[card.defId];
    const env = findOwnedEnv(state, player, action.targetEnvCardId);
    if (envFreeRaum(env, state.cards) < adef.raum) throw new Error(`no room: ${adef.name} needs ${adef.raum} Raum`);
    removeFrom(me.pool, action.cardId, "your pool");
    env.animalIds.push(action.cardId);
    return state;
  }

  // improvement
  const idef = IMPROVEMENT_BY_ID[card.defId];
  if (idef.kind === "verkleidung") {
    const placed = me.environments.flatMap((e) => e.animalIds);
    if (action.targetAnimalCardId === undefined || !placed.includes(action.targetAnimalCardId))
      throw new Error("Verkleidung needs one of your placed animals as a target");
    removeFrom(me.pool, action.cardId, "your pool");
    if (!state.jokered.includes(action.targetAnimalCardId)) state.jokered.push(action.targetAnimalCardId);
    me.discard.push(action.cardId);
    return state;
  }

  const env = findOwnedEnv(state, player, action.targetEnvCardId);
  removeFrom(me.pool, action.cardId, "your pool");
  if (idef.kind === "ausbau") env.ausbau += 1;
  else if (idef.kind === "dekoration") env.dekoration = true;
  else if (idef.kind === "biome" && idef.biome) env.extraBiomes.push(idef.biome);
  me.discard.push(action.cardId);
  return state;
}

export { canPlay };
