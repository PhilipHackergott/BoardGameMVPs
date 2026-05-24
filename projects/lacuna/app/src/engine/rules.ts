// Pure game transitions and legality checks.

import { dist, pointSegInfo } from "./geometry";
import {
  AGILE_RADIUS,
  ALCHEMIST_RADIUS,
  GRAVITY_FACTOR,
  GRAVITY_POWER_FACTOR,
  GRAVITY_POWER_RADIUS,
  GRAVITY_RADIUS,
  PRISM_RADIUS,
  REPEL_COS,
  REPEL_FACTOR,
  REPEL_RADIUS,
  canDisplace,
  connectedSameColor,
  hasPower,
  lineClearFor,
  placementPointLegal,
} from "./effects";
import { finalize } from "./scoring";
import type { Action, FreePick, GameState, PlayerId, Star } from "./types";

// Advance the placement sequence by one turn.
function advanceTurn(state: GameState): { current: GameState["current"]; turnIndex: number; done: boolean } {
  const turnIndex = state.turnIndex + 1;
  const done = turnIndex >= state.order.length;
  const current = done ? state.current : state.order[turnIndex];
  return { current, turnIndex, done };
}

// Advance to the next turn, unless a sub-phase (free picks, Dusk, Abyss, Repeller cone)
// is still pending for the current player — then stay put.
function finishOrStay(state: GameState): GameState {
  if (state.freePicks.length > 0 || state.duskPending || state.abyssPending || state.repelOrigin) {
    return state;
  }
  const turnIndex = state.turnIndex + 1;
  const done = turnIndex >= state.order.length;
  const next: GameState = {
    ...state,
    current: done ? state.current : state.order[turnIndex],
    turnIndex,
  };
  return done ? finalize(next) : next;
}

export function beaconsPlacedBy(state: GameState, player: PlayerId): number {
  let n = 0;
  for (const b of state.beacons) if (b.owner === player && !b.phantom) n++;
  return n;
}

export function beaconsLeft(state: GameState, player: PlayerId): number {
  return state.config.beaconsPerPlayer + state.bonusBeacons[player] - beaconsPlacedBy(state, player);
}

function starById(state: GameState, id: number): Star | undefined {
  return state.stars.find((s) => s.id === id);
}

// Same-color stars reachable from `starId` via a usable line for the current player.
export function legalPartners(state: GameState, starId: number): number[] {
  const a = starById(state, starId);
  if (!a) return [];
  const out: number[] = [];
  for (const b of state.stars) {
    if (b.id === a.id || b.color !== a.color) continue;
    if (lineClearFor(state, state.current, a, b)) out.push(b.id);
  }
  return out;
}

// All distinct legal pairs (a.id < b.id) for the current player.
export function legalMoves(state: GameState): { aStarId: number; bStarId: number }[] {
  const pairs: { aStarId: number; bStarId: number }[] = [];
  const stars = state.stars;
  for (let i = 0; i < stars.length; i++) {
    for (let j = i + 1; j < stars.length; j++) {
      const a = stars[i];
      const b = stars[j];
      if (a.color !== b.color) continue;
      if (lineClearFor(state, state.current, a, b)) {
        pairs.push({ aStarId: a.id, bStarId: b.id });
      }
    }
  }
  return pairs;
}

export function hasLegalMove(state: GameState): boolean {
  if (state.phase !== "play") return false;
  if (beaconsLeft(state, state.current) <= 0) return false;
  return legalMoves(state).length > 0;
}

export type Legality = { ok: true } | { ok: false; reason: string };

export function isLegalPlacement(
  state: GameState,
  aStarId: number,
  bStarId: number,
): Legality {
  if (state.phase !== "play") return { ok: false, reason: "Game has ended" };
  if (beaconsLeft(state, state.current) <= 0)
    return { ok: false, reason: "No beacons left" };
  if (aStarId === bStarId) return { ok: false, reason: "Pick two different stars" };
  const a = starById(state, aStarId);
  const b = starById(state, bStarId);
  if (!a || !b) return { ok: false, reason: "Star not found" };
  if (a.color !== b.color) return { ok: false, reason: "Pick a star of the same color" };
  if (!lineClearFor(state, state.current, a, b)) return { ok: false, reason: "Line is blocked" };
  return { ok: true };
}

// Snap an arbitrary point onto the interior of segment a–b (kept off the endpoints).
export function snapBeacon(
  state: GameState,
  a: Star,
  b: Star,
  x: number,
  y: number,
): { x: number; y: number } {
  const segLen = Math.hypot(b.x - a.x, b.y - a.y);
  const insetDist = state.config.starR + state.config.beaconR;
  let tInset = segLen > 0 ? insetDist / segLen : 0.5;
  if (tInset > 0.5) tInset = 0.5;
  let { t } = pointSegInfo({ x, y }, a, b);
  if (t < tInset) t = tInset;
  if (t > 1 - tInset) t = 1 - tInset;
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}

// Apply an action, returning a NEW state. Throws on an illegal placement.
export function applyAction(state: GameState, action: Action): GameState {
  // Setup: the first player takes one flower of their choice, then play begins.
  if (action.type === "claim") {
    if (state.phase !== "setup") throw new Error("Not in setup");
    const s = starById(state, action.starId);
    if (!s) throw new Error("Star not found");
    const stars = state.stars.filter((x) => x.id !== s.id);
    const collected = state.collected.map((row) => row.slice());
    collected[state.current][s.color] += 1;
    return {
      ...state,
      stars,
      collected,
      phase: "play",
      current: state.order[0],
      turnIndex: 0,
      log: [...state.log, action],
    };
  }

  if (state.phase !== "play") throw new Error("Game has ended");

  if (action.type === "pass") {
    const passes = state.passesInARow + 1;
    const { current, turnIndex, done } = advanceTurn(state);
    const next: GameState = {
      ...state,
      current,
      turnIndex,
      passesInARow: passes,
      log: [...state.log, action],
    };
    return passes >= state.config.players || done ? finalize(next) : next;
  }

  // Resolve a queued free pick: collect the flower (Patron/Harvester) or remove it from
  // the game (Assassin). Stay on the player until the queue is empty.
  if (action.type === "freePick") {
    if (state.freePicks.length === 0) throw new Error("No free pick available");
    const s = starById(state, action.starId);
    if (!s) throw new Error("Star not found");
    const mode = state.freePicks[0];
    const stars = state.stars.filter((x) => x.id !== s.id);
    const collected = state.collected.map((row) => row.slice());
    if (mode === "collect") collected[state.current][s.color] += 1;
    return finishOrStay({ ...state, stars, collected, freePicks: state.freePicks.slice(1), log: [...state.log, action] });
  }

  // Magnet (formerly Repeller): DRAG eligible flowers in the aimed cone toward the pawn,
  // and harvest up to two that reach it. A real active-collect tool instead of pushing
  // flowers away (which only hurt the owner).
  if (action.type === "repel") {
    const o = state.repelOrigin;
    if (!o) throw new Error("No magnet cone pending");
    const dx = action.x - o.x;
    const dy = action.y - o.y;
    const len = Math.hypot(dx, dy) || 1;
    const ux = dx / len;
    const uy = dy / len;
    const moved = state.stars.map((s) => {
      const vx = s.x - o.x;
      const vy = s.y - o.y;
      const d = Math.hypot(vx, vy);
      if (d > 0 && d < REPEL_RADIUS && (vx * ux + vy * uy) / d >= REPEL_COS && canDisplace(state, s)) {
        return { ...s, x: s.x - vx * REPEL_FACTOR, y: s.y - vy * REPEL_FACTOR }; // toward the pawn
      }
      return s;
    });
    // Harvest up to two flowers dragged within reach of the pawn.
    const reach = state.config.starR + state.config.beaconR + 6;
    const collected = state.collected.map((row) => row.slice());
    const stars: Star[] = [];
    let harvested = 0;
    for (const s of moved) {
      if (harvested < 2 && Math.hypot(s.x - o.x, s.y - o.y) <= reach) {
        collected[state.current][s.color] += 1;
        harvested++;
      } else {
        stars.push(s);
      }
    }
    return finishOrStay({ ...state, stars, collected, repelOrigin: null, log: [...state.log, action] });
  }

  // Dusk affinity: steal one of the chosen colour from whichever rival holds the most of it.
  if (action.type === "duskSteal") {
    if (!state.duskPending) throw new Error("No Dusk steal pending");
    const c = action.colorId;
    const collected = state.collected.map((row) => row.slice());
    let target: PlayerId | null = null;
    let most = 0;
    for (let p = 0; p < state.config.players; p++) {
      if (p === state.current) continue;
      if (collected[p][c] > most) {
        most = collected[p][c];
        target = p;
      }
    }
    if (target !== null && most > 0) {
      collected[target][c] -= 1;
      collected[state.current][c] += 1;
    }
    return finishOrStay({ ...state, collected, duskPending: false, log: [...state.log, action] });
  }

  // Abyss affinity: banish a flower from the game (or decline).
  if (action.type === "abyssVoid") {
    if (!state.abyssPending) throw new Error("No Abyss banish pending");
    const stars = state.stars.filter((x) => x.id !== action.starId);
    return finishOrStay({ ...state, stars, abyssPending: false, log: [...state.log, action] });
  }
  if (action.type === "abyssSkip") {
    if (!state.abyssPending) throw new Error("No Abyss banish pending");
    return finishOrStay({ ...state, abyssPending: false, log: [...state.log, action] });
  }

  // Nomad: reclaim one of your own pawns (territory anchor gone) and get an extra slot to redeploy.
  if (action.type === "nomadPickup") {
    if (state.nomadUsed[state.current]) throw new Error("Nomad redeploy already used");
    const b = state.beacons.find(
      (x) => x.id === action.beaconId && x.owner === state.current && !x.phantom,
    );
    if (!b) throw new Error("Pick one of your own pawns");
    const beacons = state.beacons.filter((x) => x.id !== b.id);
    const nomadUsed = state.nomadUsed.slice();
    nomadUsed[state.current] = true;
    const order = state.order.slice();
    order.splice(state.turnIndex + 1, 0, state.current);
    return { ...state, beacons, nomadUsed, order, log: [...state.log, action] };
  }

  // Flexible — skip now but keep the pawn: move your slot to the end of the order.
  if (action.type === "flexPass") {
    if (state.flexPassUsed[state.current]) throw new Error("Flexible pass already used");
    const flexPassUsed = state.flexPassUsed.slice();
    flexPassUsed[state.current] = true;
    const order = state.order.slice();
    const [me] = order.splice(state.turnIndex, 1);
    order.push(me);
    const done = state.turnIndex >= order.length;
    return {
      ...state,
      order,
      current: done ? state.current : order[state.turnIndex],
      flexPassUsed,
      log: [...state.log, action],
    };
  }

  // Flexible — extra turn: gain a genuine EXTRA pawn (a 13th beacon) and an extra turn slot
  // right after now to place it. (Reordering alone added no pawns and tested worthless.)
  if (action.type === "flexExtra") {
    if (state.flexExtraUsed[state.current]) throw new Error("Flexible extra already used");
    const me = state.current;
    const order = state.order.slice();
    order.splice(state.turnIndex + 1, 0, me); // an extra turn right after this one…
    const bonusBeacons = state.bonusBeacons.slice();
    bonusBeacons[me] += 1; // …and an extra pawn to place on it
    const flexExtraUsed = state.flexExtraUsed.slice();
    flexExtraUsed[me] = true;
    return { ...state, order, bonusBeacons, flexExtraUsed, log: [...state.log, action] };
  }

  // place
  const placer = state.current;
  const legality = isLegalPlacement(state, action.aStarId, action.bStarId);
  if (!legality.ok) throw new Error(`Illegal placement: ${legality.reason}`);
  const a = starById(state, action.aStarId)!;
  const b = starById(state, action.bStarId)!;
  const pos = snapBeacon(state, a, b, action.x, action.y);
  if (!placementPointLegal(state, placer, pos.x, pos.y))
    throw new Error("Illegal placement: that spot is blocked");

  const collected = state.collected.map((row) => row.slice());

  // Which flowers does this placement collect? Procrastinator sweeps the chosen pair
  // PLUS up to two more from the connected same-colour cluster (nearest to the drop) —
  // capped at +2 so it can't snowball a whole chain (rebalanced from the full cluster).
  let takenIds = [a.id, b.id];
  if (hasPower(state, placer, "procrastinator") && beaconsPlacedBy(state, placer) < 1) {
    const cluster = connectedSameColor(state, placer, a.id, b.id).filter((id) => id !== a.id && id !== b.id);
    const extra = cluster
      .map((id) => {
        const s = starById(state, id)!;
        return { id, d: dist(s.x, s.y, action.x, action.y) };
      })
      .sort((p, q) => p.d - q.d)
      .slice(0, 1) // cap the bonus at +1 (was +2 → still 94% win rate)
      .map((p) => p.id);
    takenIds = [a.id, b.id, ...extra];
  }
  const takenSet = new Set(takenIds);
  collected[placer][a.color] += takenSet.size;
  let stars = state.stars.filter((s) => !takenSet.has(s.id));

  // Momentum: collecting the same colour on consecutive placements builds a streak; each
  // repeat collects extra of that colour (+1, +2, … capped at +3).
  let momentumColor = state.momentumColor;
  let momentumStreak = state.momentumStreak;
  if (hasPower(state, placer, "momentum")) {
    momentumColor = state.momentumColor.slice();
    momentumStreak = state.momentumStreak.slice();
    momentumStreak[placer] = state.momentumColor[placer] === a.color ? state.momentumStreak[placer] + 1 : 1;
    momentumColor[placer] = a.color;
    const bonus = Math.min(momentumStreak[placer] - 1, 3);
    if (bonus > 0) collected[placer][a.color] += bonus;
  }

  // Agile: the first two placements also grab the nearest remaining flower.
  if (hasPower(state, placer, "agile") && beaconsPlacedBy(state, placer) < 2) {
    let best: Star | null = null;
    let bestD = AGILE_RADIUS;
    for (const s of stars) {
      const d = dist(s.x, s.y, pos.x, pos.y);
      if (d < bestD) {
        bestD = d;
        best = s;
      }
    }
    if (best) {
      collected[placer][best.color] += 1;
      stars = stars.filter((s) => s.id !== best!.id);
    }
  }

  // Prism: your first three placements also collect the nearest different-colour flower.
  if (hasPower(state, placer, "prism") && beaconsPlacedBy(state, placer) < 3) {
    let best: Star | null = null;
    let bestD = PRISM_RADIUS;
    for (const s of stars) {
      if (s.color === a.color) continue;
      const d = dist(s.x, s.y, pos.x, pos.y);
      if (d < bestD) {
        bestD = d;
        best = s;
      }
    }
    if (best) {
      collected[placer][best.color] += 1;
      stars = stars.filter((s) => s.id !== best!.id);
    }
  }

  // Harvester: if this placement leaves one or two flowers of that colour, sweep them too.
  let harvestFired = false;
  if (hasPower(state, placer, "harvester")) {
    const sameColor = stars.filter((s) => s.color === a.color);
    if (sameColor.length >= 1 && sameColor.length <= 2) {
      collected[placer][a.color] += sameColor.length;
      const sweep = new Set(sameColor.map((s) => s.id));
      stars = stars.filter((s) => !sweep.has(s.id));
      harvestFired = true;
    }
  }

  // Alchemist: the nearest other flower transmutes into the colour just collected,
  // bending the board toward the placer's sets (does not collect it).
  if (hasPower(state, placer, "alchemist")) {
    let best: Star | null = null;
    let bestD = ALCHEMIST_RADIUS;
    for (const s of stars) {
      if (s.color === a.color) continue;
      const d = dist(s.x, s.y, pos.x, pos.y);
      if (d < bestD) {
        bestD = d;
        best = s;
      }
    }
    if (best) {
      const tid = best.id;
      stars = stars.map((s) => (s.id === tid ? { ...s, color: a.color } : s));
      collected[placer][a.color] += 1; // a small immediate gain so it isn't pure (slow) board-shaping
    }
  }

  // ── Affinity (collecting a pair of your affinity colour) + Gravity displacement ──
  const aff = state.affinity[placer];
  const affTrigger = aff !== null && aff === a.color;
  let frozenStars = state.frozenStars;

  // Frost: freeze the two nearest remaining flowers (immune to all later displacement).
  if (affTrigger && aff === 1) {
    const freeze = stars
      .filter((s) => !frozenStars.includes(s.id))
      .map((s) => ({ id: s.id, d: dist(s.x, s.y, pos.x, pos.y) }))
      .sort((p, q) => p.d - q.d)
      .slice(0, 2)
      .map((p) => p.id);
    if (freeze.length) frozenStars = [...frozenStars, ...freeze];
  }

  const dState: GameState = { ...state, frozenStars };
  const pull = (radius: number, colorOnly: number | null, factor = GRAVITY_FACTOR) => {
    stars = stars.map((s) => {
      if (colorOnly !== null && s.color !== colorOnly) return s;
      const d = dist(s.x, s.y, pos.x, pos.y);
      if (d > 0 && d < radius && canDisplace(dState, s)) {
        return { ...s, x: s.x + (pos.x - s.x) * factor, y: s.y + (pos.y - s.y) * factor };
      }
      return s;
    });
  };
  if (affTrigger && aff === 0) pull(1e9, a.color); // Ember: pull all of that colour, globally
  if (affTrigger && aff === 2) pull(GRAVITY_RADIUS, null); // Verdant: local any-colour pulse
  if (hasPower(state, placer, "gravity")) pull(GRAVITY_POWER_RADIUS, null, GRAVITY_POWER_FACTOR); // Gravity power (weaker)

  // Aureate: +1 to the colour you're closest to a majority in (not yet winning).
  if (affTrigger && aff === 3) {
    const majority = Math.floor(state.config.perColor / 2) + 1;
    let bestC = -1;
    let bestN = -1;
    for (let c = 0; c < state.config.colors; c++) {
      if (collected[placer][c] < majority && collected[placer][c] > bestN) {
        bestN = collected[placer][c];
        bestC = c;
      }
    }
    if (bestC < 0)
      for (let c = 0; c < state.config.colors; c++)
        if (collected[placer][c] > bestN) {
          bestN = collected[placer][c];
          bestC = c;
        }
    if (bestC >= 0) collected[placer][bestC] += 1;
  }

  // Catalyst marks this beacon a phantom if one was queued by a previous trigger.
  const isPhantom = state.phantomNext[placer] === true;
  let phantomNext = state.phantomNext;
  if (isPhantom) {
    phantomNext = state.phantomNext.slice();
    phantomNext[placer] = false;
    // Catalyst: a phantom placement collects a TRIO — also grab the nearest remaining flower
    // (tight radius so it only fires when one is genuinely close).
    let best: Star | null = null;
    let bestD = AGILE_RADIUS;
    for (const s of stars) {
      const d = dist(s.x, s.y, pos.x, pos.y);
      if (d < bestD) {
        bestD = d;
        best = s;
      }
    }
    if (best) {
      collected[placer][best.color] += 1;
      stars = stars.filter((s) => s.id !== best!.id);
    }
  }
  const beacons = [
    ...state.beacons,
    { id: state.beacons.length, owner: placer, x: pos.x, y: pos.y, ...(isPhantom ? { phantom: true } : {}) },
  ];

  // Catalyst: after the 2nd real placement, slot in an extra phantom placement.
  let order = state.order;
  let catalystUsed = state.catalystUsed;
  if (
    hasPower(state, placer, "catalyst") &&
    !state.catalystUsed[placer] &&
    !isPhantom &&
    beaconsPlacedBy(state, placer) === 1
  ) {
    catalystUsed = state.catalystUsed.slice();
    catalystUsed[placer] = true;
    phantomNext = phantomNext.slice();
    phantomNext[placer] = true;
    order = state.order.slice();
    order.splice(state.turnIndex + 1, 0, placer);
  }

  // Intercept: the placement line becomes a barrier rivals can't cross.
  const barriers = hasPower(state, placer, "intercept")
    ? [...state.barriers, { owner: placer, ax: a.x, ay: a.y, bx: b.x, by: b.y }]
    : state.barriers;

  // Shadow Follow: matching the previous player's colour steals one of it from their pile.
  const lp = state.lastPlace;
  if (
    hasPower(state, placer, "shadowfollow") &&
    lp &&
    lp.owner !== placer &&
    lp.color === a.color &&
    collected[lp.owner][a.color] >= 1
  ) {
    collected[lp.owner][a.color] -= 1;
    collected[placer][a.color] += 1;
  }
  const lastPlace = { owner: placer, color: a.color };

  // Tithe: any rival who currently leads the colour this placement collected skims one of
  // it for themselves (lead measured before this placement, so the placer's own gain
  // doesn't disqualify them).
  for (let t = 0; t < state.config.players; t++) {
    if (t === placer || !hasPower(state, t, "tithe")) continue;
    const held = state.collected[t][a.color];
    if (held < 1) continue;
    let leads = true;
    for (let p = 0; p < state.config.players; p++) {
      if (p !== t && state.collected[p][a.color] > held) {
        leads = false;
        break;
      }
    }
    if (leads) collected[t][a.color] += 1;
  }

  // Queue power-driven free picks (resolved by clicking flowers; the player keeps the turn).
  const freePicks: FreePick[] = [];
  let patronUsed = state.patronUsed;
  if (hasPower(state, placer, "patron") && !state.patronUsed[placer] && beaconsPlacedBy(state, placer) === 0) {
    patronUsed = state.patronUsed.slice();
    patronUsed[placer] = true;
    freePicks.push("collect", "collect", "collect");
  }
  if (harvestFired) freePicks.push("collect"); // Harvester: also take any flower
  if (hasPower(state, placer, "assassin")) freePicks.push("remove"); // Assassin: remove one
  const cappedPicks = freePicks.slice(0, stars.length);

  // Repeller: after placing, aim a cone — but only stop for it if there's something to push.
  const repelOrigin =
    hasPower(state, placer, "repeller") &&
    stars.some((s) => {
      const d = dist(s.x, s.y, pos.x, pos.y);
      return d > 0 && d < REPEL_RADIUS && canDisplace(dState, s);
    })
      ? { x: pos.x, y: pos.y }
      : null;

  // Dusk: choose a colour to steal — only if a rival actually holds a non-Dusk colour.
  const duskPending =
    affTrigger &&
    aff === 4 &&
    collected.some((row, p) => p !== placer && row.some((n, c) => c !== 4 && n >= 1));
  // Abyss: optionally banish a flower (skippable) if any remain.
  const abyssPending = affTrigger && aff === 6 && stars.length > 0;

  return finishOrStay({
    ...state,
    stars,
    beacons,
    barriers,
    collected,
    order,
    patronUsed,
    phantomNext,
    catalystUsed,
    frozenStars,
    lastPlace,
    momentumColor,
    momentumStreak,
    passesInARow: 0,
    freePicks: cappedPicks,
    repelOrigin,
    duskPending,
    abyssPending,
    log: [...state.log, action],
  });
}
