// Pure career reducer. The store orchestrates interactions (matching NPCs/objects to the current
// story step, launching duels); this engine just advances deterministic career state.

import { CareerAction, CareerState, SLOTS } from "./types";
import { ACT1 } from "../content/story";
import { getDeck, expandDeck, STARTER_DECK_ID } from "../content/decks";
import { getContext, ACTIVITIES, STAT_KEYS, STAT_MAX, StatKey } from "../content/lifesim";

function clampStat(n: number): number {
  return Math.max(0, Math.min(STAT_MAX, n));
}
function applyStats(stats: Record<StatKey, number>, deltas: Partial<Record<StatKey, number>>): Record<StatKey, number> {
  const out = { ...stats };
  for (const k of STAT_KEYS) if (deltas[k]) out[k] = clampStat(out[k] + (deltas[k] ?? 0));
  return out;
}

/** Count a decklist into a {cardId: qty} collection. */
export function deckToCollection(cardIds: string[]): Record<string, number> {
  const c: Record<string, number> = {};
  for (const id of cardIds) c[id] = (c[id] ?? 0) + 1;
  return c;
}

export function createCareer(seed = 1, contextId = "hs_soph"): CareerState {
  const ctx = getContext(contextId);
  return {
    day: 1,
    slotIndex: 0,
    money: 5,
    location: "home",
    beat: 0,
    flags: {},
    activeDeckId: STARTER_DECK_ID,
    ownedDeckIds: [STARTER_DECK_ID],
    // you start owning exactly your starter deck's cards — the economy grows from here
    collection: deckToCollection(expandDeck(getDeck(STARTER_DECK_ID))),
    context: ctx.id,
    stats: { ...ctx.startStats },
    examsPassed: 0,
    fame: 0,
    trophies: 0,
    rngState: seed >>> 0,
    actComplete: false,
  };
}

/** Sponsorship perk: at Fame >= 10 a sponsor covers part of your costs (a daily stipend on sleep). */
export const SPONSOR_FAME = 10;
export function sponsorStipend(fame: number): number {
  return fame >= SPONSOR_FAME ? 3 + Math.floor((fame - SPONSOR_FAME) / 10) : 0;
}

export function careerReduce(s: CareerState, a: CareerAction): CareerState {
  switch (a.type) {
    case "enter":
      return { ...s, location: a.loc };
    case "advanceSlot":
      return { ...s, slotIndex: Math.min(s.slotIndex + 1, SLOTS.length - 1) };
    case "sleep":
      // a night's rest restores Stamina; a sponsor (Fame >= 10) pays a small daily stipend
      return { ...s, day: s.day + 1, slotIndex: 0, location: "home", money: s.money + sponsorStipend(s.fame), stats: applyStats(s.stats, { stamina: 4 }) };
    case "pickDeck":
      return s.ownedDeckIds.includes(a.id) ? { ...s, activeDeckId: a.id } : s;
    case "reward":
      return applyReward(s, a.money, a.flags, a.unlockDeck, a.fame, a.trophy);
    case "completeStep": {
      const step = ACT1[s.beat];
      if (!step) return s;
      let next = applyReward(s, step.rewardMoney, step.setFlags, step.unlockDeck);
      const beat = s.beat + 1;
      next = { ...next, beat, actComplete: beat >= ACT1.length };
      return next;
    }
    case "acquireCards": {
      const collection = { ...s.collection };
      for (const id of a.cardIds) collection[id] = (collection[id] ?? 0) + 1;
      return { ...s, collection, money: s.money - (a.cost ?? 0), rngState: a.rngState ?? s.rngState };
    }
    case "sellCard": {
      if ((s.collection[a.cardId] ?? 0) <= 0) return s;
      const collection = { ...s.collection, [a.cardId]: s.collection[a.cardId] - 1 };
      return { ...s, collection, money: s.money + a.price };
    }
    case "activity": {
      const act = ACTIVITIES[a.id];
      if (!act) return s;
      return {
        ...s,
        money: s.money + act.money,
        stats: applyStats(s.stats, act.stats),
        slotIndex: Math.min(s.slotIndex + act.slotCost, SLOTS.length), // SLOTS.length (3) => "Night, sleep"
      };
    }
    case "exam": {
      // pass -> Reputation + a little money; fail -> Reputation hit
      const delta = a.passed ? { reputation: 2, knowledge: 1 } : { reputation: -2 };
      return { ...s, stats: applyStats(s.stats, delta), money: s.money + (a.passed ? 10 : 0), examsPassed: s.examsPassed + (a.passed ? 1 : 0) };
    }
  }
}

function applyReward(s: CareerState, money?: number, flags?: string[], unlockDeck?: string, fame?: number, trophy?: boolean): CareerState {
  const newFlags = { ...s.flags };
  for (const f of flags ?? []) newFlags[f] = true;
  const owned = unlockDeck && !s.ownedDeckIds.includes(unlockDeck) ? [...s.ownedDeckIds, unlockDeck] : s.ownedDeckIds;
  return {
    ...s,
    money: s.money + (money ?? 0),
    flags: newFlags,
    ownedDeckIds: owned,
    fame: s.fame + (fame ?? 0),
    trophies: s.trophies + (trophy ? 1 : 0),
  };
}

/** The current objective text (or the act-complete message). */
export function currentObjective(s: CareerState): string {
  if (s.actComplete) return "Act I complete — the circuit awaits (Act II coming soon).";
  return ACT1[s.beat]?.objective ?? "";
}
