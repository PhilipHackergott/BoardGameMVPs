// Build the initial Duel from two decklists + a seed. Pure & deterministic.

import { CardInst, Duel, PlayerState, Slot } from "./types";
import { OPENING_HAND, START_NEXUS } from "./types";
import { seedFromString, shuffle } from "./rng";

export interface DuelConfig {
  decks: [string[], string[]]; // cardId lists (length 30)
  names?: [string, string];
  seed?: string;
  firstPlayer?: 0 | 1;
}

function emptyLanes(): [Slot, Slot, Slot] {
  return [{}, {}, {}];
}

export function createDuel(cfg: DuelConfig): Duel {
  let rngState = seedFromString(cfg.seed ?? "prism");
  let nextIid = 1;
  const names = cfg.names ?? ["You", "Opponent"];

  const players: [PlayerState, PlayerState] = [0, 1].map((pi) => {
    const insts: CardInst[] = cfg.decks[pi].map((cardId) => ({ iid: nextIid++, cardId }));
    const sh = shuffle(insts, rngState);
    rngState = sh.state;
    const deck = sh.arr;
    const hand = deck.splice(0, OPENING_HAND);
    return {
      name: names[pi],
      nexus: START_NEXUS,
      maxLight: 0,
      light: 0,
      refractUsed: false,
      hand,
      deck,
      discard: [],
      lanes: emptyLanes(),
    } as PlayerState;
  }) as [PlayerState, PlayerState];

  const first = cfg.firstPlayer ?? 0;
  const duel: Duel = {
    turn: 0,
    active: first,
    firstPlayer: first,
    players,
    rngState,
    phase: "main",
    combatDone: false,
    winner: null,
    nextIid,
    log: [],
    fx: [],
    fxSeq: 0,
  };
  // Open the first player's turn.
  beginTurn(duel);
  return duel;
}

/** Mutates `duel` to open the active player's turn (max-Light++, refill, reset, draw). */
export function beginTurn(duel: Duel): void {
  duel.turn += 1;
  const p = duel.players[duel.active];
  p.maxLight = Math.min(p.maxLight + 1, 10);
  p.light = p.maxLight;
  p.refractUsed = false;
  duel.combatDone = false;
  for (const slot of p.lanes) {
    if (slot.unit) {
      slot.unit.justPlayed = false;
      slot.unit.dmgTaken = 0; // damage healed at the start of your next turn (resets between turns)
      // Momentum: this unit grows +N power at the start of your turn (permanent)
      const m = slot.unit.keywords.find((k) => k.kw === "momentum");
      if (m && m.n) { slot.unit.power += m.n; slot.unit.basePower += m.n; }
    }
  }
  const skipDraw = duel.turn === 1 && duel.active === duel.firstPlayer;
  if (!skipDraw) drawCard(duel, duel.active);
}

/** Draw one card for player `pi`; empty-deck draw = alt-loss. */
export function drawCard(duel: Duel, pi: 0 | 1): void {
  const p = duel.players[pi];
  if (p.deck.length === 0) {
    duel.winner = (pi === 0 ? 1 : 0) as 0 | 1;
    duel.phase = "over";
    return;
  }
  const card = p.deck.shift()!;
  p.hand.push(card);
}
