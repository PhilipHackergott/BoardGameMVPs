// Pure, deterministic transitions. legalActions() lists what's possible; applyAction() returns a
// new state.
//
// Turn model: turns advance per *player*. A player-turn activates one or more of that player's
// racers (each a full beginTurn cascade). Standard play = exactly one racer per player-turn. The 2P
// double-racer variant = each player runs two racers: one on their first turn of the race, both on
// every turn after (here in fixed racer order; the prompt system can add a chosen order later).

import type { Action, MatchState, Pending, PlayerId, RaceState, RacerInPlay } from './types';
import { makeRng } from './rng';
import { applyDraftPick, currentDrafter } from './draft';
import { GOLD_VALUES, SILVER_VALUES, TRACK_LENGTH } from './config';
import { computeWinners } from './scoring';
import { applyDuel, applySuckerfishFollow, beginTurn, resumeTurn, type ChipAward, type TurnResult } from './resolve';

function clone(state: MatchState): MatchState {
  return structuredClone(state);
}

/** The value the next main-move roll will produce, without mutating state (for the UI die preview).
 *  Deterministic: it reads the same PRNG state that handleRoll's first die() draw will consume. */
export function peekDie(s: MatchState): number {
  return makeRng(s.rngState).die();
}

function seats(n: number): PlayerId[] {
  return Array.from({ length: n }, (_, i) => i);
}

/** Racers a player can still move (not finished, not eliminated). */
function movableOf(race: RaceState, player: PlayerId): number[] {
  const out: number[] = [];
  race.racers.forEach((r, i) => {
    if (r.owner === player && !r.finished && !r.eliminated) out.push(i);
  });
  return out;
}

/** The racer currently taking its turn, or -1 if none (e.g. between phases). */
export function currentRacerIndex(race: RaceState): number {
  return race.activations[race.actPtr] ?? -1;
}

export function legalActions(state: MatchState): Action[] {
  switch (state.phase) {
    case 'draft': {
      if (currentDrafter(state.draft) === null) return [];
      return state.draft.line.map((racerId) => ({ type: 'draftPick', racerId }));
    }
    case 'reveal': {
      const player = state.reveal.needed[0];
      const taken = new Set([...state.used[player], ...(state.reveal.chosen[player] ?? [])]);
      return state.draft.hands[player]
        .filter((id) => !taken.has(id))
        .map((racerId) => ({ type: 'reveal', player, racerId }));
    }
    case 'race':
      if (state.race?.pending) {
        return state.race.pending.options.map((o) => ({ type: 'resolvePrompt', optionId: o.id }));
      }
      return [{ type: 'roll' }];
    case 'afterRace':
      return [{ type: 'nextRace' }];
    case 'ended':
      return [];
  }
}

export function applyAction(prev: MatchState, action: Action): MatchState {
  const s = clone(prev);
  s.events = []; // cleared each action; turn resolution repopulates it for the trigger modal
  switch (action.type) {
    case 'draftPick':
      handleDraftPick(s, action.racerId);
      break;
    case 'reveal':
      handleReveal(s, action.player, action.racerId);
      break;
    case 'roll':
      handleRoll(s);
      break;
    case 'resolvePrompt':
      handleResolvePrompt(s, action.optionId);
      break;
    case 'nextRace':
      handleNextRace(s);
      break;
  }
  s.log.push(action);
  return s;
}

function handleDraftPick(s: MatchState, racerId: string): void {
  if (s.phase !== 'draft') throw new Error('not in draft phase');
  applyDraftPick(s.draft, racerId);
  if (s.draft.done) startReveal(s);
}

function startReveal(s: MatchState): void {
  s.reveal = { needed: seats(s.config.players), chosen: {} };
  s.phase = 'reveal';
}

/** Racers each player reveals per race (2 in the double-racer variant). */
function revealCount(s: MatchState): number {
  return s.config.doubleRacer ? 2 : 1;
}

function handleReveal(s: MatchState, player: PlayerId, racerId: string): void {
  if (s.phase !== 'reveal') throw new Error('not in reveal phase');
  if (s.reveal.needed[0] !== player) throw new Error(`not player ${player}'s turn to reveal`);
  if (!s.draft.hands[player].includes(racerId)) throw new Error('racer not in hand');
  if (s.used[player].includes(racerId)) throw new Error('racer already used');
  const chosen = s.reveal.chosen[player] ?? [];
  if (chosen.includes(racerId)) throw new Error('racer already chosen this race');
  chosen.push(racerId);
  s.reveal.chosen[player] = chosen;
  if (chosen.length >= revealCount(s)) s.reveal.needed.shift();
  if (s.reveal.needed.length === 0) startRace(s);
}

function startRace(s: MatchState): void {
  const side = s.config.schedule[s.raceNo];
  const length = TRACK_LENGTH[side];
  const racers: RacerInPlay[] = [];
  for (let p = 0; p < s.config.players; p++) {
    for (const racerId of s.reveal.chosen[p] ?? []) {
      s.used[p].push(racerId);
      racers.push({
        racerId,
        owner: p,
        pos: 0,
        finished: false,
        place: null,
        tripped: false,
        eliminated: false,
        copiedPowerId: copiedPowerFor(s, racerId),
      });
      // KEEP ROLLIN' — Sisyphus starts the race with 4 point chips.
      if (s.racersById[racerId]?.powerId === 'sisyphus') {
        for (let k = 0; k < 4; k++) s.chips[p].push({ kind: 'bronze', value: 1 });
      }
    }
  }
  const playerOrder = s.raceNo === 0 ? rollOffOrder(s) : clockwiseFrom(s.nextFirst, s.config.players);
  s.race = {
    side,
    length,
    racers,
    playerOrder,
    playerPtr: 0,
    activations: [],
    actPtr: 0,
    firstTurnTaken: seats(s.config.players).map(() => false),
    goNext: null,
    geniusPrediction: null,
    extraTurn: false,
    mastermindPick: null,
    preTurnPos: racers.map((r) => r.pos),
    reactionsOffered: [],
    finishedCount: 0,
    result: { first: null, second: null },
    lastDie: null,
    pending: null,
  };
  s.phase = 'race';
  computeActivations(s);
}

/** Twin copies the most recent past winner; Egg copies the top of the undrafted deck. Auto-picked
 *  (the rulebook lets the player choose; the prompt system can add that later). Hook-powers only. */
function copiedPowerFor(s: MatchState, racerId: string): string | null {
  const pid = s.racersById[racerId]?.powerId ?? null;
  let src: string | null = null;
  if (pid === 'twin' && s.pastWinners.length > 0) src = s.pastWinners[s.pastWinners.length - 1];
  else if (pid === 'egg' && s.draft.pool.length > 0) src = s.draft.pool[0];
  if (src === null) return null;
  const copied = s.racersById[src]?.powerId ?? null;
  return copied === 'twin' || copied === 'egg' || copied === 'copycat' ? null : copied;
}

/** Set the current player's racers to activate this player-turn (1 on a double-racer first turn). */
function computeActivations(s: MatchState): void {
  const race = s.race!;
  const player = race.playerOrder[race.playerPtr];
  const pool = movableOf(race, player);
  race.activations = s.config.doubleRacer && !race.firstTurnTaken[player] ? pool.slice(0, 1) : pool;
  race.actPtr = 0;
}

/** Race 0 player-turn order: everyone rolls; highest goes first, ties broken by seat. */
function rollOffOrder(s: MatchState): PlayerId[] {
  const rng = makeRng(s.rngState);
  const rolls = seats(s.config.players).map((p) => ({ p, roll: rng.die() }));
  s.rngState = rng.state();
  rolls.sort((a, b) => b.roll - a.roll || a.p - b.p);
  return rolls.map((x) => x.p);
}

/** Subsequent races: clockwise from the designated first player. */
function clockwiseFrom(first: PlayerId, count: number): PlayerId[] {
  return Array.from({ length: count }, (_, k) => (first + k) % count);
}

function handleRoll(s: MatchState): void {
  const race = s.race;
  if (!race || s.phase !== 'race') throw new Error('not racing');
  if (race.pending) throw new Error('a power choice is pending');
  race.preTurnPos = race.racers.map((r) => r.pos);
  race.reactionsOffered = [];
  const rng = makeRng(s.rngState);
  let firstDie: number | null = null;
  const res = beginTurn(race, currentRacerIndex(race), race.side, () => {
    const v = rng.die();
    if (firstDie === null) firstDie = v;
    return v;
  });
  s.rngState = rng.state();
  if (firstDie !== null) race.lastDie = firstDie;
  applyTurnResult(s, res);
}

function handleResolvePrompt(s: MatchState, optionId: string): void {
  const race = s.race;
  if (!race || s.phase !== 'race' || !race.pending) throw new Error('no pending choice');
  const pending = race.pending;
  race.pending = null;
  if (pending.stage === 'react') {
    applyReaction(s, pending, optionId);
    if (race.finishedCount >= 2) endRace(s);
    else advanceOrReact(s);
    return;
  }
  const rng = makeRng(s.rngState);
  let firstDie: number | null = null;
  const res = resumeTurn(race, currentRacerIndex(race), race.side, pending, optionId, () => {
    const v = rng.die();
    if (firstDie === null) firstDie = v;
    return v;
  });
  s.rngState = rng.state();
  if (firstDie !== null) race.lastDie = firstDie; // a reroll/main re-roll updates the displayed die
  applyTurnResult(s, res);
}

function applyChips(s: MatchState, awards: ChipAward[]): void {
  for (const a of awards) {
    if (a.remove) {
      if (s.chips[a.player].length > 0) s.chips[a.player].pop();
    } else {
      s.chips[a.player].push(a.chip);
    }
  }
}

function applyTurnResult(s: MatchState, res: TurnResult): void {
  const race = s.race!;
  s.events = res.events; // surface this step's automatic ability activations to the UI
  applyChips(s, res.chips);
  if (res.kind === 'pending') {
    race.pending = res.pending;
    return;
  }
  if (race.finishedCount >= 2) endRace(s);
  else advanceOrReact(s);
}

/** After a turn completes, offer any post-turn reactions (Suckerfish/Duelist) before advancing. */
function advanceOrReact(s: MatchState): void {
  const react = nextReaction(s);
  if (react) {
    s.race!.reactionsOffered.push(reactionKey(react));
    s.race!.pending = react;
    return;
  }
  advanceActivation(s);
}

function reactionKey(p: { reactKind?: string; racer: number; target?: number }): string {
  return p.reactKind === 'suckerfish' ? `suck:${p.racer}` : `duel:${p.racer}:${p.target}`;
}

function racerName(s: MatchState, i: number): string {
  const id = s.race!.racers[i].racerId;
  return s.racersById[id]?.name ?? id;
}

/** The first un-offered post-turn reaction (Suckerfish follow, then Duelist challenge), or null. */
function nextReaction(s: MatchState): Pending | null {
  const race = s.race!;
  const power = (i: number): string | null => s.racersById[race.racers[i].racerId]?.powerId ?? null;
  const active = (i: number): boolean => !race.racers[i].finished && !race.racers[i].eliminated;
  const offered = (k: string): boolean => race.reactionsOffered.includes(k);
  const mover = currentRacerIndex(race);

  if (mover >= 0 && race.racers[mover].pos !== race.preTurnPos[mover]) {
    for (let i = 0; i < race.racers.length; i++) {
      if (i === mover || !active(i) || power(i) !== 'suckerfish') continue;
      if (race.preTurnPos[i] !== race.preTurnPos[mover]) continue;
      if (offered(`suck:${i}`)) continue;
      return {
        player: race.racers[i].owner,
        racer: i,
        stage: 'react',
        reactKind: 'suckerfish',
        target: mover,
        options: [
          { id: 'follow', label: `Follow ${racerName(s, mover)} to space ${race.racers[mover].pos}` },
          { id: 'skip', label: 'Stay' },
        ],
      };
    }
  }

  for (let d = 0; d < race.racers.length; d++) {
    if (!active(d) || power(d) !== 'duelist') continue;
    for (let t = 0; t < race.racers.length; t++) {
      if (t === d || !active(t)) continue;
      if (race.racers[t].pos !== race.racers[d].pos) continue;
      if (offered(`duel:${d}:${t}`)) continue;
      return {
        player: race.racers[d].owner,
        racer: d,
        stage: 'react',
        reactKind: 'duelist',
        target: t,
        options: [
          { id: 'duel', label: `Duel ${racerName(s, t)}!` },
          { id: 'skip', label: 'No duel' },
        ],
      };
    }
  }
  return null;
}

function applyReaction(s: MatchState, pending: Pending, optionId: string): void {
  const race = s.race!;
  if (pending.reactKind === 'suckerfish') {
    if (optionId === 'follow') applyChips(s, applySuckerfishFollow(race, race.side, pending.racer, pending.target!));
  } else if (pending.reactKind === 'duelist') {
    if (optionId === 'duel') {
      const rng = makeRng(s.rngState);
      const dRoll = rng.die();
      const tRoll = rng.die();
      s.rngState = rng.state();
      applyChips(s, applyDuel(race, race.side, pending.racer, pending.target!, dRoll, tRoll));
    }
  }
}

/** Advance to the next racer in the current player-turn, or hand off to the next player. */
function advanceActivation(s: MatchState): void {
  const race = s.race!;
  if (race.extraTurn) {
    race.extraTurn = false;
    // Genius (THINK GOOD): another turn after this one — re-activate the same racer next.
    race.activations.splice(race.actPtr + 1, 0, race.activations[race.actPtr]);
  }
  race.actPtr += 1;
  // skip any racers that finished/were eliminated mid-cascade
  while (race.actPtr < race.activations.length) {
    const r = race.racers[race.activations[race.actPtr]];
    if (!r.finished && !r.eliminated) return;
    race.actPtr += 1;
  }
  race.firstTurnTaken[race.playerOrder[race.playerPtr]] = true;
  advancePlayerTurn(s);
}

function advancePlayerTurn(s: MatchState): void {
  const race = s.race!;
  // A turn-order power may have scheduled a specific player to go next.
  if (race.goNext !== null) {
    const target = race.goNext;
    race.goNext = null;
    const ptr = race.playerOrder.indexOf(target);
    if (ptr >= 0 && movableOf(race, target).length > 0) {
      race.playerPtr = ptr;
      computeActivations(s);
      if (race.activations.length > 0) return;
    }
  }
  const n = race.playerOrder.length;
  for (let k = 1; k <= n; k++) {
    const ptr = (race.playerPtr + k) % n;
    if (movableOf(race, race.playerOrder[ptr]).length > 0) {
      race.playerPtr = ptr;
      computeActivations(s);
      if (race.activations.length > 0) return;
    }
  }
  // No movable racers anywhere — end the race with whatever finishers exist.
  endRace(s);
}

function endRace(s: MatchState): void {
  const race = s.race!;
  if (race.result.first !== null) {
    s.chips[race.result.first].push({ kind: 'gold', value: GOLD_VALUES[s.raceNo] });
  }
  if (race.result.second !== null) {
    s.chips[race.result.second].push({ kind: 'silver', value: SILVER_VALUES[s.raceNo] });
  }
  const winner = race.racers.find((r) => r.place === 1);
  if (winner) s.pastWinners.push(winner.racerId);
  s.nextFirst = s.config.doubleRacer ? lowerRacePoints(s, race) : farthestBehind(race);
  s.phase = 'afterRace';
}

/** Standard: the farthest-behind player goes first next race (finished racers count as ahead). */
function farthestBehind(race: RaceState): PlayerId {
  let best: PlayerId | null = null;
  let bestPos = Infinity;
  for (const r of race.racers) {
    const effPos = r.finished ? race.length + (3 - (r.place ?? 3)) : r.pos;
    if (effPos < bestPos) {
      bestPos = effPos;
      best = r.owner;
    }
  }
  return best ?? 0;
}

/** Double-racer: the player who scored fewer points this race goes first next race. */
function lowerRacePoints(s: MatchState, race: RaceState): PlayerId {
  const pts = seats(s.config.players).map(() => 0);
  if (race.result.first !== null) pts[race.result.first] += GOLD_VALUES[s.raceNo];
  if (race.result.second !== null) pts[race.result.second] += SILVER_VALUES[s.raceNo];
  let best = 0;
  let bestPts = Infinity;
  pts.forEach((p, i) => {
    if (p < bestPts) {
      bestPts = p;
      best = i;
    }
  });
  return best;
}

function handleNextRace(s: MatchState): void {
  if (s.phase !== 'afterRace') throw new Error('not after a race');
  if (s.raceNo + 1 >= s.config.schedule.length) {
    s.winners = computeWinners(s);
    s.race = null;
    s.phase = 'ended';
  } else {
    s.raceNo += 1;
    s.race = null;
    startReveal(s);
  }
}
