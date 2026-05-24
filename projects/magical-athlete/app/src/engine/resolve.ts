// The turn resolver — the heart of Magical Athlete. Runs a racer's turn (main move + all triggered
// power reactions) on a race state, in a deterministic cascade with loop-breaking.
//
// Optional ("can …") powers pause the turn: beginTurn() returns a `pending` choice instead of
// finishing, and resumeTurn() continues once the choice is made. Prompts occur strictly BEFORE the
// main-move cascade, so the cascade itself never needs to pause/resume mid-flight.
//
// Resolution order when several powers respond to one event: racetrack features (inline, highest
// priority) -> current player -> other players clockwise. A global step cap bounds runaway chains.
// All randomness is the injected die roller, so turns are reproducible.

import type { ActivationEvent, Chip, Pending, PlayerId, PromptOption, RaceState, Side } from './types';
import { BRONZE, RESOLVE_STEP_CAP } from './config';
import { buildTrack, featureAt, type Track } from './track';
import { racersById } from './racers';
import { POWERS, type PowerApi, type PowerHooks } from './powers';

export interface ChipAward {
  player: PlayerId;
  chip: Chip;
  /** When true, remove a chip from the player instead of awarding one (e.g. Sisyphus). */
  remove?: boolean;
}

export type TurnResult =
  | { kind: 'pending'; pending: Pending; chips: ChipAward[]; events: ActivationEvent[] }
  | { kind: 'done'; chips: ChipAward[]; ended: boolean; events: ActivationEvent[] };

interface Ctx {
  race: RaceState;
  track: Track;
  current: number;
  steps: number;
  ended: boolean;
  chips: ChipAward[];
  events: ActivationEvent[];
}

function over(ctx: Ctx): boolean {
  return ctx.ended || ctx.steps > RESOLVE_STEP_CAP;
}

function powerId(race: RaceState, idx: number): string | null {
  return racersById[race.racers[idx].racerId]?.powerId ?? null;
}

/** Record an automatic power activation for the UI trigger modal. */
function pushEvent(ctx: Ctx, racer: number, kind: ActivationEvent['kind'], target: number, amount?: number): void {
  ctx.events.push({ racer, powerId: powerId(ctx.race, racer) ?? '', kind, target, amount });
}

/** The non-finished, non-eliminated racer closest to the finish (ties → lowest index). */
function leadRacer(race: RaceState): number | null {
  let best = -1;
  let bestPos = -1;
  race.racers.forEach((r, i) => {
    if (r.finished || r.eliminated) return;
    if (r.pos > bestPos) {
      bestPos = r.pos;
      best = i;
    }
  });
  return best < 0 ? null : best;
}

function hooks(race: RaceState, idx: number): PowerHooks | null {
  // Twin/Egg copy a fixed power (set at race start); it overrides the racer's own id.
  const pid = race.racers[idx].copiedPowerId ?? powerId(race, idx);
  // COPY THAT — Copycat persistently has the *registry* power of the current lead racer (it can't
  // copy itself, a Copycat/Twin/Egg; optional/special powers aren't copied — documented limit).
  if (pid === 'copycat') {
    const lead = leadRacer(race);
    if (lead === null || lead === idx) return null;
    const lp = powerId(race, lead);
    if (!lp || lp === 'copycat' || lp === 'twin' || lp === 'egg') return null;
    return POWERS[lp] ?? null;
  }
  return pid ? (POWERS[pid] ?? null) : null;
}

/** Responders in resolution order: current player first, then clockwise by owner. Finished/eliminated
 *  racers' powers are off (rulebook: powers deactivate once a racer wins or leaves the race). */
function responderOrder(ctx: Ctx): number[] {
  const n = ctx.race.racers.length;
  const curOwner = ctx.race.racers[ctx.current].owner;
  const dist = (owner: number): number => (owner - curOwner + n) % n;
  return ctx.race.racers
    .map((_, i) => i)
    .filter((i) => !ctx.race.racers[i].finished && !ctx.race.racers[i].eliminated)
    .sort((a, b) => dist(ctx.race.racers[a].owner) - dist(ctx.race.racers[b].owner));
}

/** True while any non-finished, non-eliminated Stickler is in the race. */
function sticklerActive(race: RaceState): boolean {
  return race.racers.some((r, i) => !r.finished && !r.eliminated && powerId(race, i) === 'stickler');
}

function aloneInLead(race: RaceState, idx: number): boolean {
  const active = race.racers.filter((r) => !r.finished && !r.eliminated);
  if (active.length === 0) return false;
  const max = Math.max(...active.map((r) => r.pos));
  const leaders = active.filter((r) => r.pos === max);
  const r = race.racers[idx];
  return leaders.length === 1 && !r.finished && !r.eliminated && r.pos === max;
}

function aloneInLast(race: RaceState, idx: number): boolean {
  const active = race.racers.filter((r) => !r.finished && !r.eliminated);
  if (active.length === 0) return false;
  const min = Math.min(...active.map((r) => r.pos));
  const trailers = active.filter((r) => r.pos === min);
  const r = race.racers[idx];
  return trailers.length === 1 && !r.finished && !r.eliminated && r.pos === min;
}

function makeApi(ctx: Ctx, selfIdx: number): PowerApi {
  return {
    self: selfIdx,
    posOf: (i) => ctx.race.racers[i].pos,
    ownerOf: (i) => ctx.race.racers[i].owner,
    isFinished: (i) => ctx.race.racers[i].finished,
    countOnSpace: (space) => onSpace(ctx.race, space).length,
    racersOnSpace: (space) => onSpace(ctx.race, space),
    allRacers: () =>
      ctx.race.racers.map((_, i) => i).filter((i) => !ctx.race.racers[i].finished && !ctx.race.racers[i].eliminated),
    powerOf: (i) => powerId(ctx.race, i),
    scheduleNext: (owner) => {
      ctx.race.goNext = owner;
    },
    aloneInLead: (i) => aloneInLead(ctx.race, i),
    aloneInLast: (i) => aloneInLast(ctx.race, i),
    doMove: (target, amount) => powerMove(ctx, selfIdx, target, amount),
    warp: (target, space) => {
      if (over(ctx)) return;
      const clamped = Math.max(0, Math.min(space, ctx.race.length - 1));
      ctx.race.racers[target].pos = clamped; // a warp doesn't count as moving (no pass/feature/stop)
      pushEvent(ctx, selfIdx, 'warp', target);
      notePowerActivation(ctx, selfIdx);
    },
    trip: (target) => powerTrip(ctx, selfIdx, target),
    eliminate: (target) => {
      if (over(ctx)) return;
      ctx.race.racers[target].eliminated = true;
      pushEvent(ctx, selfIdx, 'eliminate', target);
      notePowerActivation(ctx, selfIdx);
    },
    awardBronze: (target) => {
      if (over(ctx)) return;
      ctx.chips.push({ player: ctx.race.racers[target].owner, chip: { kind: 'bronze', value: BRONZE.one } });
      pushEvent(ctx, selfIdx, 'bronze', target);
      notePowerActivation(ctx, selfIdx);
    },
  };
}

/** Indices of racers currently standing on a space (excludes finished and eliminated). */
function onSpace(race: RaceState, space: number): number[] {
  const out: number[] = [];
  race.racers.forEach((r, i) => {
    if (!r.finished && !r.eliminated && r.pos === space) out.push(i);
  });
  return out;
}

function finishRacer(ctx: Ctx, idx: number): void {
  const r = ctx.race.racers[idx];
  if (r.finished) return;
  r.finished = true;
  ctx.race.finishedCount += 1;
  r.place = ctx.race.finishedCount;
  if (ctx.race.finishedCount === 1) ctx.race.result.first = r.owner;
  else if (ctx.race.finishedCount === 2) {
    ctx.race.result.second = r.owner;
    ctx.ended = true; // race ends the instant the 2nd racer finishes
  }
  // KNOW-IT-ALL — if the predicted racer just won (1st), the Mastermind finishes 2nd immediately.
  const pick = ctx.race.mastermindPick;
  if (pick && r.place === 1 && pick.predicted === idx) {
    if (pick.by === idx) {
      if (ctx.race.finishedCount < 2) {
        ctx.race.finishedCount = 2;
        ctx.race.result.second = r.owner; // predicted self -> takes both 1st and 2nd
        ctx.ended = true;
      }
    } else {
      const mm = ctx.race.racers[pick.by];
      if (!mm.finished && !mm.eliminated) finishRacer(ctx, pick.by);
    }
  }
}

/** Core movement: move a racer, then resolve track feature + pass/stop reactions. Not itself a power. */
function move(ctx: Ctx, idx: number, amount: number): void {
  if (over(ctx)) return;
  ctx.steps += 1;
  const r = ctx.race.racers[idx];
  if (r.finished || r.eliminated || amount === 0) return; // "moving 0 doesn't count as moving"
  const start = r.pos;
  let end = start + amount;
  if (end < 0) end = 0; // never behind the Start space

  // JUMPFROG — Leaptoad leaps over occupied spaces for free (they don't count toward its move).
  if (amount > 0 && powerId(ctx.race, idx) === 'leaptoad') {
    let p = start;
    let remaining = amount;
    while (remaining > 0) {
      p += 1;
      if (p >= ctx.race.length) break;
      if (ctx.race.racers.some((o, i) => i !== idx && !o.finished && !o.eliminated && o.pos === p)) continue;
      remaining -= 1;
    }
    end = p;
  }

  // Stickler (ACTUALLY...): other racers cross only by landing exactly on the finish; an overshoot
  // doesn't move them at all.
  if (end > ctx.race.length && powerId(ctx.race, idx) !== 'stickler' && sticklerActive(ctx.race)) {
    return;
  }

  const passed: number[] = [];
  if (amount > 0) {
    for (let i = 0; i < ctx.race.racers.length; i++) {
      if (i === idx) continue;
      const o = ctx.race.racers[i];
      if (!o.finished && !o.eliminated && start < o.pos && o.pos < end) passed.push(i);
    }
  }

  r.pos = end;
  if (end >= ctx.race.length) {
    finishRacer(ctx, idx);
    return;
  }

  const f = featureAt(ctx.track, end);
  if (f?.kind === 'star') {
    ctx.chips.push({ player: r.owner, chip: { kind: 'bronze', value: BRONZE.one } });
  } else if (f?.kind === 'rock') {
    r.tripped = true;
  } else if (f?.kind === 'arrow') {
    firePass(ctx, idx, passed);
    move(ctx, idx, f.delta ?? 0);
    return;
  }

  firePass(ctx, idx, passed);
  if (over(ctx)) return;
  fireStop(ctx, idx, end);
}

function firePass(ctx: Ctx, passerIdx: number, passed: number[]): void {
  for (const passedIdx of passed) {
    for (const respIdx of responderOrder(ctx)) {
      if (over(ctx)) return;
      hooks(ctx.race, respIdx)?.onPass?.(makeApi(ctx, respIdx), passerIdx, passedIdx);
    }
  }
}

function fireStop(ctx: Ctx, stopperIdx: number, space: number): void {
  for (const respIdx of responderOrder(ctx)) {
    if (over(ctx)) return;
    hooks(ctx.race, respIdx)?.onStop?.(makeApi(ctx, respIdx), stopperIdx, space);
  }
}

function fireOnRoll(ctx: Ctx, currentIdx: number, die: number): void {
  for (const respIdx of responderOrder(ctx)) {
    if (over(ctx)) return;
    hooks(ctx.race, respIdx)?.onRoll?.(makeApi(ctx, respIdx), currentIdx, die);
  }
}

function fireTurnEnd(ctx: Ctx, currentIdx: number, startPos: number, endPos: number): void {
  for (const respIdx of responderOrder(ctx)) {
    if (over(ctx)) return;
    hooks(ctx.race, respIdx)?.onTurnEnd?.(makeApi(ctx, respIdx), currentIdx, startPos, endPos);
  }
}

function fireTurnStart(ctx: Ctx, currentIdx: number): void {
  for (const respIdx of responderOrder(ctx)) {
    if (over(ctx)) return;
    hooks(ctx.race, respIdx)?.onTurnStart?.(makeApi(ctx, respIdx), currentIdx);
  }
}

function powerMove(ctx: Ctx, activator: number, target: number, amount: number): void {
  if (over(ctx)) return;
  move(ctx, target, amount);
  pushEvent(ctx, activator, 'move', target, amount);
  notePowerActivation(ctx, activator);
}

function powerTrip(ctx: Ctx, activator: number, target: number): void {
  if (over(ctx)) return;
  ctx.race.racers[target].tripped = true;
  pushEvent(ctx, activator, 'trip', target);
  notePowerActivation(ctx, activator);
}

/** SCOOCH SCOOCH: each other Scoocher moves 1 whenever a power activates (chains, bounded by the cap). */
function notePowerActivation(ctx: Ctx, activator: number): void {
  if (over(ctx)) return;
  for (const idx of responderOrder(ctx)) {
    if (over(ctx)) return;
    if (idx === activator) continue;
    if (ctx.race.racers[idx].finished) continue;
    if (powerId(ctx.race, idx) === 'scoocher') {
      move(ctx, idx, 1);
      pushEvent(ctx, idx, 'move', idx, 1);
      notePowerActivation(ctx, idx);
    }
  }
}

function mainAmount(ctx: Ctx, currentIdx: number, base: number): number {
  let amount = base;
  for (let i = 0; i < ctx.race.racers.length; i++) {
    if (ctx.race.racers[i].finished || ctx.race.racers[i].eliminated) continue;
    const delta = hooks(ctx.race, i)?.mainMoveDelta?.(makeApi(ctx, i), currentIdx);
    if (delta) amount += delta;
  }
  return Math.max(0, amount);
}

// --- per-turn cascades (each its own bounded resolution) ----------------------------------------

function cascade(race: RaceState, current: number, side: Side, run: (ctx: Ctx) => void): {
  chips: ChipAward[];
  ended: boolean;
  events: ActivationEvent[];
} {
  const ctx: Ctx = { race, track: buildTrack(side), current, steps: 0, ended: false, chips: [], events: [] };
  run(ctx);
  return { chips: ctx.chips, ended: race.finishedCount >= 2, events: ctx.events };
}

function turnStartCascade(race: RaceState, current: number, side: Side) {
  return cascade(race, current, side, (ctx) => fireTurnStart(ctx, current));
}

function turnEndCascade(race: RaceState, current: number, side: Side) {
  return cascade(race, current, side, (ctx) => {
    const pos = ctx.race.racers[current].pos;
    fireTurnEnd(ctx, current, pos, pos); // a warp-only turn didn't "move"
  });
}

function onRollCascade(race: RaceState, current: number, side: Side, die: number) {
  return cascade(race, current, side, (ctx) => fireOnRoll(ctx, current, die));
}

function mainCascade(race: RaceState, current: number, side: Side, base: number) {
  return cascade(race, current, side, (ctx) => {
    const start = ctx.race.racers[current].pos;
    move(ctx, current, mainAmount(ctx, current, base));
    if (!ctx.ended) fireTurnEnd(ctx, current, start, ctx.race.racers[current].pos);
  });
}

function skipCascade(race: RaceState, current: number, side: Side, bronze: boolean) {
  return cascade(race, current, side, (ctx) => {
    const cur = ctx.race.racers[current];
    const start = cur.pos;
    cur.tripped = false; // recover
    if (bronze) {
      ctx.chips.push({ player: cur.owner, chip: { kind: 'bronze', value: BRONZE.one } });
      notePowerActivation(ctx, current);
    }
    if (!ctx.ended) fireTurnEnd(ctx, current, start, cur.pos);
  });
}

// --- optional-power decision points (current racer only, before the move cascade) ----------------

function hareSkip(race: RaceState, current: number): boolean {
  return powerId(race, current) === 'hare' && aloneInLead(race, current);
}

type PreRollOutcome = { kind: 'main'; base: number } | { kind: 'endTurn' } | { kind: 'rollMain' };

function racerName(race: RaceState, i: number): string {
  return racersById[race.racers[i].racerId]?.name ?? race.racers[i].racerId;
}

function optionalPreRoll(race: RaceState, current: number): Pending | null {
  const pid = powerId(race, current);
  const owner = race.racers[current].owner;
  const base = { player: owner, racer: current, stage: 'preRoll' as const };
  const others = race.racers
    .map((_, i) => i)
    .filter((i) => i !== current && !race.racers[i].finished && !race.racers[i].eliminated);

  if (pid === 'legs') {
    return { ...base, options: [{ id: 'jog', label: 'Skip the roll — move 5' }, { id: 'roll', label: 'Roll the die' }] };
  }
  if (pid === 'flip-flop' && others.length > 0) {
    return {
      ...base,
      options: [...others.map((i) => ({ id: `swap:${i}`, label: `Swap places with ${racerName(race, i)}` })), { id: 'roll', label: 'Roll normally' }],
    };
  }
  if (pid === 'hypnotist' && others.length > 0) {
    return {
      ...base,
      options: [...others.map((i) => ({ id: `warp:${i}`, label: `Hypnotize ${racerName(race, i)} to my space` })), { id: 'skip', label: 'Skip' }],
    };
  }
  if (pid === 'third-wheel') {
    const spaces = [...new Set(onSpaceList(race).filter((s) => s !== race.racers[current].pos))].filter(
      (s) => onSpace(race, s).length === 2,
    );
    if (spaces.length > 0) {
      return { ...base, options: [...spaces.map((s) => ({ id: `to:${s}`, label: `Roll through to space ${s}` })), { id: 'skip', label: 'Skip' }] };
    }
  }
  if (pid === 'cheerleader') {
    return { ...base, options: [{ id: 'cheer', label: 'Cheer last place (+2 each), then move 1' }, { id: 'skip', label: 'Skip' }] };
  }
  if (pid === 'genius') {
    const predicts = [1, 2, 3, 4, 5, 6].map((n) => ({ id: `predict:${n}`, label: `Predict ${n}` }));
    return { ...base, options: [...predicts, { id: 'skip', label: 'Don’t predict' }] };
  }
  // KNOW-IT-ALL — predict the winner on the first turn (mandatory, one-time).
  if (pid === 'mastermind' && (race.mastermindPick === null || race.mastermindPick.by !== current)) {
    const opts = race.racers
      .map((_, i) => i)
      .filter((i) => !race.racers[i].finished && !race.racers[i].eliminated)
      .map((i) => ({ id: `pick:${i}`, label: `Predict ${racerName(race, i)} wins` }));
    if (opts.length > 0) return { ...base, options: opts };
  }
  return null;
}

/** Distinct occupied spaces (excludes finished/eliminated). */
function onSpaceList(race: RaceState): number[] {
  return race.racers.filter((r) => !r.finished && !r.eliminated).map((r) => r.pos);
}

/** Apply the current racer's chosen pre-roll effect (via the api), and report how the turn continues. */
function applyPreRollChoice(ctx: Ctx, current: number, optionId: string): PreRollOutcome {
  const api = makeApi(ctx, current);
  switch (powerId(ctx.race, current)) {
    case 'legs':
      return optionId === 'jog' ? { kind: 'main', base: 5 } : { kind: 'rollMain' };
    case 'flip-flop':
      if (optionId.startsWith('swap:')) {
        const i = Number(optionId.slice(5));
        const myPos = ctx.race.racers[current].pos;
        const theirPos = ctx.race.racers[i].pos;
        api.warp(current, theirPos);
        api.warp(i, myPos);
        return { kind: 'endTurn' };
      }
      return { kind: 'rollMain' };
    case 'hypnotist':
      if (optionId.startsWith('warp:')) api.warp(Number(optionId.slice(5)), ctx.race.racers[current].pos);
      return { kind: 'rollMain' };
    case 'third-wheel':
      if (optionId.startsWith('to:')) api.warp(current, Number(optionId.slice(3)));
      return { kind: 'rollMain' };
    case 'cheerleader':
      if (optionId === 'cheer') {
        const active = ctx.race.racers.filter((r) => !r.finished && !r.eliminated);
        const min = Math.min(...active.map((r) => r.pos));
        const last = ctx.race.racers.map((_, i) => i).filter((i) => {
          const r = ctx.race.racers[i];
          return !r.finished && !r.eliminated && r.pos === min;
        });
        for (const i of last) api.doMove(i, 2);
        api.doMove(current, 1);
      }
      return { kind: 'rollMain' };
    case 'genius':
      if (optionId.startsWith('predict:')) ctx.race.geniusPrediction = Number(optionId.slice(8));
      return { kind: 'rollMain' };
    case 'mastermind':
      if (optionId.startsWith('pick:')) ctx.race.mastermindPick = { by: current, predicted: Number(optionId.slice(5)) };
      return { kind: 'rollMain' };
    default:
      return { kind: 'rollMain' };
  }
}

function optionalPostRoll(race: RaceState, current: number, die: number): Pending | null {
  const pid = powerId(race, current);
  const base = { player: race.racers[current].owner, racer: current, stage: 'postRoll' as const, die };
  if (pid === 'alchemist' && (die === 1 || die === 2)) {
    return { ...base, options: [{ id: 'transmute', label: 'Transmute — move 4' }, { id: 'normal', label: `Move ${die}` }] };
  }
  if (pid === 'magician') {
    return { ...base, rerolls: 0, options: [{ id: 'reroll', label: `Reroll (rolled ${die})` }, { id: 'keep', label: `Keep ${die}` }] };
  }
  // KABLOOEY — Rocket Scientist may move double its roll, then trips.
  if (pid === 'rocket-scientist') {
    return { ...base, options: [{ id: 'kablooey', label: `Kablooey — move ${die * 2}, then trip` }, { id: 'normal', label: `Move ${die}` }] };
  }
  // DICEY DEALS — a Dicemonger in the race lets anyone reroll their main move once.
  if (dicemongerInRace(race)) {
    return { ...base, dicemonger: true, options: [{ id: 'reroll', label: `Reroll (rolled ${die})` }, { id: 'keep', label: `Keep ${die}` }] };
  }
  return null;
}

function dicemongerInRace(race: RaceState): boolean {
  return race.racers.some((r, i) => !r.finished && !r.eliminated && powerId(race, i) === 'dicemonger');
}

function magicianRerollPending(player: PlayerId, current: number, die: number, used: number): Pending {
  return {
    player,
    racer: current,
    stage: 'postRoll',
    die,
    rerolls: used,
    options: [{ id: 'reroll', label: `Reroll (rolled ${die})` }, { id: 'keep', label: `Keep ${die}` }],
  };
}

// --- turn orchestration --------------------------------------------------------------------------

function afterRoll(race: RaceState, current: number, side: Side, die: number): TurnResult {
  // THINK GOOD — Genius earns an extra turn if its prediction matched the roll.
  if (powerId(race, current) === 'genius' && race.geniusPrediction !== null) {
    if (race.geniusPrediction === die) race.extraTurn = true;
    race.geniusPrediction = null;
  }
  const rc = onRollCascade(race, current, side, die);
  if (rc.ended) return { kind: 'done', chips: rc.chips, ended: true, events: rc.events };
  // KEEP ROLLIN' — Sisyphus rolling a 6 warps to the Start and loses a chip instead of moving.
  if (powerId(race, current) === 'sisyphus' && die === 6) {
    const startPos = race.racers[current].pos;
    const sc = cascade(race, current, side, (ctx) => {
      ctx.race.racers[current].pos = 0;
      ctx.chips.push({ player: ctx.race.racers[current].owner, chip: { kind: 'bronze', value: 1 }, remove: true });
      fireTurnEnd(ctx, current, startPos, 0);
    });
    return { kind: 'done', chips: [...rc.chips, ...sc.chips], ended: sc.ended, events: [...rc.events, ...sc.events] };
  }
  const post = optionalPostRoll(race, current, die);
  if (post) return { kind: 'pending', pending: post, chips: rc.chips, events: rc.events };
  const mc = mainCascade(race, current, side, die);
  return { kind: 'done', chips: [...rc.chips, ...mc.chips], ended: mc.ended, events: [...rc.events, ...mc.events] };
}

/** Start the current racer's turn. Returns a pending choice, or the completed turn's chips. */
export function beginTurn(race: RaceState, current: number, side: Side, rollDie: () => number): TurnResult {
  const cur = race.racers[current];
  if (cur.tripped) {
    const r = skipCascade(race, current, side, false);
    return { kind: 'done', chips: r.chips, ended: r.ended, events: r.events };
  }
  if (hareSkip(race, current)) {
    const r = skipCascade(race, current, side, true);
    return { kind: 'done', chips: r.chips, ended: r.ended, events: r.events };
  }
  const ts = turnStartCascade(race, current, side);
  if (ts.ended) return { kind: 'done', chips: ts.chips, ended: true, events: ts.events };
  const pre = optionalPreRoll(race, current);
  if (pre) return { kind: 'pending', pending: pre, chips: ts.chips, events: ts.events };
  const ar = afterRoll(race, current, side, rollDie());
  if (ar.kind === 'pending')
    return { kind: 'pending', pending: ar.pending, chips: [...ts.chips, ...ar.chips], events: [...ts.events, ...ar.events] };
  return { kind: 'done', chips: [...ts.chips, ...ar.chips], ended: ar.ended, events: [...ts.events, ...ar.events] };
}

/** Resume a paused turn once the optional-power choice is made. */
export function resumeTurn(
  race: RaceState,
  current: number,
  side: Side,
  pending: Pending,
  optionId: string,
  rollDie: () => number,
): TurnResult {
  if (pending.stage === 'preRoll') {
    const ctx: Ctx = { race, track: buildTrack(side), current, steps: 0, ended: false, chips: [], events: [] };
    const outcome = applyPreRollChoice(ctx, current, optionId);
    const effChips = ctx.chips;
    const effEvents = ctx.events;
    if (race.finishedCount >= 2) return { kind: 'done', chips: effChips, ended: true, events: effEvents };
    if (outcome.kind === 'main') {
      const mc = mainCascade(race, current, side, outcome.base);
      return { kind: 'done', chips: [...effChips, ...mc.chips], ended: mc.ended, events: [...effEvents, ...mc.events] };
    }
    if (outcome.kind === 'endTurn') {
      const te = turnEndCascade(race, current, side);
      return { kind: 'done', chips: [...effChips, ...te.chips], ended: te.ended, events: [...effEvents, ...te.events] };
    }
    const ar = afterRoll(race, current, side, rollDie());
    if (ar.kind === 'pending')
      return { kind: 'pending', pending: ar.pending, chips: [...effChips, ...ar.chips], events: [...effEvents, ...ar.events] };
    return { kind: 'done', chips: [...effChips, ...ar.chips], ended: ar.ended, events: [...effEvents, ...ar.events] };
  }
  // postRoll
  if (pending.dicemonger) {
    if (optionId === 'reroll') {
      const newDie = rollDie();
      // each other Dicemonger moves 1 because someone else rerolled
      const react = cascade(race, current, side, (ctx) => {
        for (let i = 0; i < ctx.race.racers.length; i++) {
          const r = ctx.race.racers[i];
          if (i !== current && !r.finished && !r.eliminated && powerId(ctx.race, i) === 'dicemonger') {
            move(ctx, i, 1);
            pushEvent(ctx, i, 'move', i, 1);
            notePowerActivation(ctx, i);
          }
        }
      });
      if (react.ended) return { kind: 'done', chips: react.chips, ended: true, events: react.events };
      const mc = mainCascade(race, current, side, newDie);
      return { kind: 'done', chips: [...react.chips, ...mc.chips], ended: mc.ended, events: [...react.events, ...mc.events] };
    }
    const mc = mainCascade(race, current, side, pending.die ?? 0);
    return { kind: 'done', chips: mc.chips, ended: mc.ended, events: mc.events };
  }
  if (powerId(race, current) === 'magician') {
    if (optionId === 'reroll') {
      const newDie = rollDie();
      const used = (pending.rerolls ?? 0) + 1;
      if (used < 2) {
        return { kind: 'pending', chips: [], events: [], pending: magicianRerollPending(pending.player, current, newDie, used) };
      }
      const mc = mainCascade(race, current, side, newDie);
      return { kind: 'done', chips: mc.chips, ended: mc.ended, events: mc.events };
    }
    const mc = mainCascade(race, current, side, pending.die ?? 0);
    return { kind: 'done', chips: mc.chips, ended: mc.ended, events: mc.events };
  }
  if (powerId(race, current) === 'rocket-scientist') {
    if (optionId === 'kablooey') {
      const mc = mainCascade(race, current, side, (pending.die ?? 0) * 2);
      if (!race.racers[current].finished) race.racers[current].tripped = true; // the cost of kablooey
      return { kind: 'done', chips: mc.chips, ended: mc.ended, events: mc.events };
    }
    const mc = mainCascade(race, current, side, pending.die ?? 0);
    return { kind: 'done', chips: mc.chips, ended: mc.ended, events: mc.events };
  }
  const base = optionId === 'transmute' ? 4 : pending.die ?? 0;
  const mc = mainCascade(race, current, side, base);
  return { kind: 'done', chips: mc.chips, ended: mc.ended, events: mc.events };
}

/** SUCKER! — Suckerfish follows a racer to its space (crossing the finish if that racer has). */
export function applySuckerfishFollow(
  race: RaceState,
  side: Side,
  reactorIdx: number,
  targetIdx: number,
): ChipAward[] {
  return cascade(race, reactorIdx, side, (ctx) => {
    const target = ctx.race.racers[targetIdx];
    if (target.finished || target.pos >= ctx.race.length) {
      finishRacer(ctx, reactorIdx);
    } else {
      ctx.race.racers[reactorIdx].pos = Math.max(0, Math.min(target.pos, ctx.race.length - 1));
    }
    notePowerActivation(ctx, reactorIdx);
  }).chips;
}

/** DUEL! — a dice roll-off; the winner (Duelist wins ties) moves 2. */
export function applyDuel(
  race: RaceState,
  side: Side,
  duelistIdx: number,
  targetIdx: number,
  duelistRoll: number,
  targetRoll: number,
): ChipAward[] {
  const winner = duelistRoll >= targetRoll ? duelistIdx : targetIdx;
  return cascade(race, duelistIdx, side, (ctx) => {
    powerMove(ctx, duelistIdx, winner, 2);
  }).chips;
}

/** Test helper: run one full turn with a fixed die on a cloned race; `choose` resolves any prompt. */
export function simulateRaceTurn(
  race: RaceState,
  current: number,
  side: Side,
  die: number | number[],
  choose: (options: PromptOption[]) => string = (opts) => opts[0].id,
): { race: RaceState; chips: ChipAward[] } {
  const cloned = structuredClone(race);
  const dice = Array.isArray(die) ? die : [die];
  let di = 0;
  const rollDie = () => dice[Math.min(di++, dice.length - 1)];
  let res = beginTurn(cloned, current, side, rollDie);
  const chips: ChipAward[] = [...res.chips];
  while (res.kind === 'pending') {
    res = resumeTurn(cloned, current, side, res.pending, choose(res.pending.options), rollDie);
    chips.push(...res.chips);
  }
  return { race: cloned, chips };
}
