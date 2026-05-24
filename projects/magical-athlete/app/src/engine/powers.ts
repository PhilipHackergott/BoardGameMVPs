// Data-driven racer powers. Each power is a set of hooks the resolver calls at defined trigger
// points; hooks act through a small PowerApi of primitives. Adding a racer = one entry here + a test.
//
// Implemented (milestone 2): the mandatory, no-prompt powers, faithful to the CMYK rulebook. Optional
// ("can ...") powers and the gnarliest interaction powers (Copycat, Twin, Suckerfish, Huge Baby,
// Duelist, Magician, etc.) are deferred to a later milestone — their racers exist but have no hooks
// yet, so they simply run the track.
//
// Interpretation note: passive main-move modifiers (Gunk -1, Coach +1, Hare +2) are NOT treated as
// discrete "power activations" for Scoocher — consistent with Scoocher's own rulebook clause that
// *separately* grants a scooch per Gunk -1. Triggered effects (trip, hoofwhack, Romantic/Lackey/
// Heckler/Scoocher moves) ARE activations and trigger Scoocher.

export interface PowerApi {
  /** Index of the racer that owns this power. */
  readonly self: number;
  posOf(idx: number): number;
  ownerOf(idx: number): number;
  isFinished(idx: number): boolean;
  /** Count of racers currently standing on a space (excludes finished/eliminated). */
  countOnSpace(space: number): number;
  /** Indices of racers currently standing on a space (excludes finished/eliminated). */
  racersOnSpace(space: number): number[];
  /** Indices of all racers still in the race (excludes finished/eliminated). */
  allRacers(): number[];
  /** The power id of a racer (for powers that key off who else is racing). */
  powerOf(idx: number): string | null;
  /** Schedule a player to take the next player-turn (turn-order powers). */
  scheduleNext(owner: number): void;
  /** True if `idx` is the sole non-finished racer closest to the finish. */
  aloneInLead(idx: number): boolean;
  /** True if `idx` is the sole non-finished racer closest to the Start. */
  aloneInLast(idx: number): boolean;
  /** A triggered move of another (or self) — fires reactions + Scoocher. */
  doMove(targetIdx: number, amount: number): void;
  /** Place a racer on a space without it counting as movement (no pass/feature/stop). Fires Scoocher. */
  warp(targetIdx: number, space: number): void;
  /** A triggered trip — fires Scoocher. */
  trip(targetIdx: number): void;
  /** Remove a racer from the race (a power effect — fires Scoocher). */
  eliminate(targetIdx: number): void;
  /** Award a bronze 1-point chip (a power effect — fires Scoocher). */
  awardBronze(targetIdx: number): void;
}

export interface BeforeMainMove {
  skip: boolean;
  bronze?: boolean;
}

export interface PowerHooks {
  /** Fires at the start of the current racer's turn (before any roll/optional choice). */
  onTurnStart?(api: PowerApi, currentIdx: number): void;
  /** Contribution to the current racer's main-move distance (passive; not a Scoocher trigger). */
  mainMoveDelta?(api: PowerApi, currentIdx: number): number;
  /** Self-only: replace/skip the current racer's main move (only consulted when current === self). */
  beforeMainMove?(api: PowerApi, currentIdx: number): BeforeMainMove | void;
  /** Reacts to the rolled die before the main move is applied. */
  onRoll?(api: PowerApi, currentIdx: number, die: number): void;
  /** Reacts when `passerIdx` passes `passedIdx` during a move. */
  onPass?(api: PowerApi, passerIdx: number, passedIdx: number): void;
  /** Reacts when `stopperIdx` stops on `space`. */
  onStop?(api: PowerApi, stopperIdx: number, space: number): void;
  /** Reacts when the current racer's turn ends, having moved from startPos to endPos. */
  onTurnEnd?(api: PowerApi, currentIdx: number, startPos: number, endPos: number): void;
}

import { BLIMP_EARLY, BLIMP_LATE, SECOND_CORNER } from './config';

export const POWERS: Record<string, PowerHooks> = {
  // GOOP 'EM — other racers get -1 to their main move.
  gunk: {
    mainMoveDelta: (api, cur) => (cur !== api.self ? -1 : 0),
  },

  // BLOW IT — a big early boost before the second corner, a small penalty after. (Values: CONFIRM.)
  blimp: {
    mainMoveDelta: (api, cur) => (cur === api.self ? (api.posOf(api.self) < SECOND_CORNER ? BLIMP_EARLY : BLIMP_LATE) : 0),
  },

  // GOOD HUSTLE — everyone on my space gets +1 to their main move, including me.
  coach: {
    mainMoveDelta: (api, cur) => (api.posOf(cur) === api.posOf(api.self) ? 1 : 0),
  },

  // HUBRIS — +2 to my main move; but if I start alone in the lead I skip it and take a bronze chip.
  hare: {
    mainMoveDelta: (api, cur) => (cur === api.self ? 2 : 0),
    beforeMainMove: (api, cur) =>
      cur === api.self && api.aloneInLead(api.self) ? { skip: true, bronze: true } : undefined,
  },

  // THE SLIP — trip any racer that passes me.
  banana: {
    onPass: (api, passer, passed) => {
      if (passed === api.self) api.trip(passer);
    },
  },

  // HOOFWHACK — when I pass a racer, they move -2 (never behind Start).
  centaur: {
    onPass: (api, passer, passed) => {
      if (passer === api.self) api.doMove(passed, -2);
    },
  },

  // AH, LOVE! — when anyone stops on a space with exactly one other racer, I move 2.
  romantic: {
    onStop: (api, _stopper, space) => {
      if (api.countOnSpace(space) === 2) api.doMove(api.self, 2);
    },
  },

  // VERY GOOD SIRE — when another racer rolls a 6 for their main move, I move 2 before they move.
  lackey: {
    onRoll: (api, cur, die) => {
      if (cur !== api.self && die === 6) api.doMove(api.self, 2);
    },
  },

  // SCHADENFREUDE — when a racer ends their turn within 1 space of where they started, I move 2.
  heckler: {
    onTurnEnd: (api, _cur, startPos, endPos) => {
      if (Math.abs(endPos - startPos) <= 1) api.doMove(api.self, 2);
    },
  },

  // LEG IT — trip any racer that stops on my space, and any racer I stop on top of.
  'baba-yaga': {
    onStop: (api, stopper, space) => {
      if (stopper === api.self) {
        for (const i of api.racersOnSpace(space)) if (i !== api.self) api.trip(i);
      } else if (api.posOf(api.self) === space) {
        api.trip(stopper);
      }
    },
  },

  // ANIMAL MAGNETISM — before my move, pull every other racer 1 space toward me; +1 to my main
  // move for each other racer sharing my space.
  'party-animal': {
    onTurnStart: (api, cur) => {
      if (cur !== api.self) return;
      const myPos = api.posOf(api.self);
      for (const i of api.allRacers()) {
        if (i === api.self) continue;
        const d = api.posOf(i) < myPos ? 1 : api.posOf(i) > myPos ? -1 : 0;
        if (d !== 0) api.doMove(i, d);
      }
    },
    mainMoveDelta: (api, cur) => (cur === api.self ? Math.max(0, api.countOnSpace(api.posOf(api.self)) - 1) : 0),
  },

  // REALLY HUGE — no one may share my space (except the Start); bump them to the space behind me.
  'huge-baby': {
    onStop: (api, stopper, space) => {
      const myPos = api.posOf(api.self);
      if (myPos === 0) return; // racers may pile on the Start
      if (stopper === api.self) {
        for (const i of api.racersOnSpace(space)) if (i !== api.self) api.warp(i, myPos - 1);
      } else if (space === myPos) {
        api.warp(stopper, myPos - 1);
      }
    },
  },

  // CHOMP — when I stop on a space with exactly one other racer, eliminate them.
  mouth: {
    onStop: (api, stopper, space) => {
      if (stopper !== api.self) return;
      const others = api.racersOnSpace(space).filter((i) => i !== api.self);
      if (others.length === 1) api.eliminate(others[0]);
    },
  },

  // D'AWW — before my main move, take a bronze chip if I'm alone in last place.
  'lovable-loser': {
    onTurnStart: (api, cur) => {
      if (cur === api.self && api.aloneInLast(api.self)) api.awardBronze(api.self);
    },
  },

  // SALTY DOG — when anyone rolls a 1 for their main move, I take the next player-turn.
  skipper: {
    onRoll: (api, _cur, die) => {
      if (die === 1) api.scheduleNext(api.ownerOf(api.self));
    },
  },

  // WRIGGLE — if another racer rolls a 1 while the Skipper is also racing, I move 1 and the Skipper
  // goes next.
  inchworm: {
    onRoll: (api, cur, die) => {
      if (cur === api.self || die !== 1) return;
      const skipper = api.allRacers().find((i) => api.powerOf(i) === 'skipper');
      if (skipper !== undefined) {
        api.doMove(api.self, 1);
        api.scheduleNext(api.ownerOf(skipper));
      }
    },
  },

  // SCOOCH SCOOCH — handled directly in the resolver (reacts to any other power activation).
  scoocher: {},
};
