// Combat resolver — field and siege. "Beats not cuts": each round is applied on a `combatRound`
// action and the result is recorded in pendingCombat.lastRoll for the UI to show before the next
// round. Field: hit 5–6. Siege: attacker hits only on 6, defender on 5–6, besieged stronghold caps
// at 5 units, one round unless the attacker reduces an Elite to a Regular (combatPressSiege).

import type { GameState, Outcome, Side, Stack } from './types';
import { makeRng, rollDice } from './rng';
import { region } from './data/map';
import {
  combatStrength,
  eliteCount,
  isEmptyStack,
  leadership,
  mergeStacks,
  reduceElite,
  removeUnits,
  totalUnits,
} from './army';

export const MAX_COMBAT_DICE = 5;
export const BESIEGED_CAP = 5;

export function startCombat(state: GameState, attacker: Side, from: string, to: string): void {
  const def = state.regions[to];
  const siege = !!def?.besieged || (region(to).settlement === 'stronghold' && false);
  state.pendingCombat = {
    attackerRegion: from,
    defenderRegion: to,
    attacker,
    siege,
    round: 0,
    log: [],
    resolved: false,
  };
}

interface RollResult {
  dice: number[];
  rerolls: number[];
  hits: number;
}

function rollSide(state: GameState, stack: Stack | undefined, hitOn: number, lead: number): RollResult {
  const rng = makeRng(state.rngState);
  const n = Math.min(combatStrength(stack), MAX_COMBAT_DICE);
  const dice = rollDice(rng, n);
  let hits = dice.filter((d) => d >= hitOn).length;
  // leadership re-rolls of failed dice (≤ leadership, ≤5)
  const failed = dice.map((d, i) => (d < hitOn ? i : -1)).filter((i) => i >= 0);
  const rerollCount = Math.min(lead, MAX_COMBAT_DICE, failed.length);
  const rerolls = rollDice(rng, rerollCount);
  hits += rerolls.filter((d) => d >= hitOn).length;
  state.rngState = rng.state();
  return { dice, rerolls, hits };
}

/** Resolve one combat round. Mutates the draft. */
export function combatRound(state: GameState): void {
  const c = state.pendingCombat;
  if (!c || c.resolved) return;
  const atkStack = state.regions[c.attackerRegion];
  const defStack = state.regions[c.defenderRegion];
  if (totalUnits(atkStack) === 0 || totalUnits(defStack) === 0) {
    c.resolved = true;
    return;
  }
  c.round++;

  const atkHitOn = c.siege ? 6 : 5;
  const defHitOn = 5;
  const atk = rollSide(state, atkStack, atkHitOn, leadership(atkStack));
  const def = rollSide(state, defStack, defHitOn, leadership(defStack));

  // apply simultaneously
  const defLosses = removeUnits(defStack!, atk.hits);
  const atkLosses = removeUnits(atkStack!, def.hits);

  c.lastRoll = {
    attackerDice: atk.dice,
    defenderDice: def.dice,
    attackerHits: atk.hits,
    defenderHits: def.hits,
    attackerRerolls: atk.rerolls,
    defenderRerolls: def.rerolls,
  };
  c.log.push(
    `Round ${c.round}: attacker ${atk.hits} hit(s) (${defLosses} lost), defender ${def.hits} hit(s) (${atkLosses} lost).`,
  );

  resolveOutcome(state);
}

/** After a round (or a card), check for a decisive result and update control/VP. */
function resolveOutcome(state: GameState): void {
  const c = state.pendingCombat;
  if (!c) return;
  const atkStack = state.regions[c.attackerRegion];
  const defStack = state.regions[c.defenderRegion];

  // a leaderless army cannot stand: when units hit 0, leaders/Nazgul/characters are lost too
  if (defStack && totalUnits(defStack) === 0) {
    defStack.leaders = 0;
    defStack.nazgul = 0;
    for (const id of defStack.characters) state.characters[id] && (state.characters[id].location = { where: 'dead' }, state.characters[id].inPlay = false);
    defStack.characters = [];
  }
  if (atkStack && totalUnits(atkStack) === 0) {
    atkStack.leaders = 0;
    atkStack.nazgul = 0;
    for (const id of atkStack.characters) state.characters[id] && (state.characters[id].location = { where: 'dead' }, state.characters[id].inPlay = false);
    atkStack.characters = [];
  }

  if (isEmptyStack(defStack)) {
    // defender wiped — attacker advances into the region and captures it
    captureRegion(state, c.attackerRegion, c.defenderRegion, c.attacker);
    finish(state, `${sideName(c.attacker)} takes ${region(c.defenderRegion).name}.`);
    return;
  }
  if (isEmptyStack(atkStack)) {
    finish(state, `${sideName(c.attacker)}'s assault on ${region(c.defenderRegion).name} is broken.`);
    return;
  }
  // siege auto-stops after one round unless extended
  if (c.siege && !c.resolved) {
    // remains open; UI offers combatPressSiege (reduce elite) or combatCease
  }
}

function captureRegion(state: GameState, from: string, to: string, attacker: Side): void {
  const atkStack = state.regions[from]!;
  const defStack = state.regions[to];
  // remove any defender remnant (leaders/characters captured-eliminated for MVP simplicity)
  state.regions[to] = { ...atkStack, besieged: false };
  // move whole attacking army in
  const moved = state.regions[to]!;
  moved.side = attacker;
  state.regions[from] = undefined;
  if (defStack) {
    // any surviving non-unit pieces are lost
  }
  // settlement control + VP
  const r = region(to);
  if (r.settlement !== 'none') {
    const prev = state.control[to];
    state.control[to] = attacker;
    if (prev !== attacker) recomputeVp(state);
  }
}

export function recomputeVp(state: GameState): void {
  let fp = 0;
  let shadow = 0;
  for (const [id, side] of Object.entries(state.control)) {
    const r = region(id);
    if (r.vp <= 0) continue;
    // Shadow scores FP settlements it controls; FP scores Shadow settlements it controls.
    const owner = r.nation && ['sauron', 'isengard', 'southrons'].includes(r.nation) ? 'shadow' : 'fp';
    if (side === 'shadow' && owner === 'fp') shadow += r.vp;
    if (side === 'fp' && owner === 'shadow') fp += r.vp;
  }
  state.vp = { fp, shadow };
}

function finish(state: GameState, detail: string): void {
  const c = state.pendingCombat!;
  c.resolved = true;
  const out: Outcome = { kind: 'combat', title: 'Battle resolved', detail };
  state.outcome = out;
  state.log.push({ turn: state.turn, phase: state.phase, side: 'system', text: detail });
}

/** Defender retreats. toRegion === defenderRegion ⇒ retreat into siege (stronghold only). */
export function combatRetreat(state: GameState, toRegion: string): boolean {
  const c = state.pendingCombat;
  if (!c || c.resolved) return false;
  const defStack = state.regions[c.defenderRegion];
  if (!defStack) return false;

  if (toRegion === c.defenderRegion) {
    // retreat into siege
    if (region(c.defenderRegion).settlement !== 'stronghold') return false;
    defStack.besieged = true;
    c.siege = true;
    // overflow above the besieged cap is lost
    while (totalUnits(defStack) > BESIEGED_CAP) removeUnits(defStack, 1, false);
    finish(state, `Defenders retreat into the stronghold of ${region(c.defenderRegion).name}.`);
    return true;
  }
  // field retreat to an adjacent empty/friendly region
  if (!region(c.defenderRegion).adjacency.includes(toRegion)) return false;
  const dest = state.regions[toRegion];
  if (dest && dest.side !== defStack.side) return false;
  if (dest) mergeStacks(dest, defStack);
  else state.regions[toRegion] = defStack;
  state.regions[c.defenderRegion] = undefined;
  // attacker may advance into the vacated region
  captureRegion(state, c.attackerRegion, c.defenderRegion, c.attacker);
  finish(state, `Defenders retreat to ${region(toRegion).name}; ${sideName(c.attacker)} advances.`);
  return true;
}

export function combatCease(state: GameState): void {
  const c = state.pendingCombat;
  if (!c) return;
  finish(state, `The attack on ${region(c.defenderRegion).name} halts.`);
}

/** Attacker reduces one participating Elite to a Regular to fight another siege round. */
export function combatPressSiege(state: GameState): boolean {
  const c = state.pendingCombat;
  if (!c || c.resolved || !c.siege) return false;
  const atkStack = state.regions[c.attackerRegion];
  if (!atkStack || eliteCount(atkStack) === 0) return false;
  reduceElite(atkStack);
  combatRound(state);
  return true;
}

function sideName(s: Side): string {
  return s === 'fp' ? 'Free Peoples' : 'Shadow';
}
