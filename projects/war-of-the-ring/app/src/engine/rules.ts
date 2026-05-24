// The single public reducer the UI AND a future AI both drive: legalActions(state, side) +
// apply(state, action) => state (pure). apply deep-clones the state, mutates the clone, and returns
// it — so callers never observe mutation and determinism holds (all randomness via rngState).

import type { Action, CardDeck, Die, GameState, Nation, Side } from './types';
import { FP_NATIONS, SHADOW_NATIONS } from './types';
import { faceSatisfies } from './data/dice';
import { region, REGION_IDS } from './data/map';
import { CARD_BY_ID } from './data/cards';
import { hasUnusedDice, rollActionDice } from './dice';
import { advance as advancePolitical, activate, isAtWar } from './politics';
import {
  combatCease,
  combatPressSiege,
  combatRetreat,
  combatRound,
  recomputeVp,
  startCombat,
} from './combat';
import {
  canEnterMordor,
  changeGuide as changeGuideFn,
  declareFellowship,
  enterMordor,
  hideFellowship,
  mordorIdleCheck,
  moveFellowship,
  recomputeGuide,
} from './fellowship';
import { drawCard, discardToHandLimit, playCard } from './cards';
import { bringCharacter, canBringCharacter, canRecruitAt, recruit, reinforcementsAvailable } from './muster';
import { checkMilitary, checkVictory } from './victory';
import { mergeStacks, totalUnits, STACKING_LIMIT } from './army';
import { CHAR_BY_ID } from './data/characters';

const clone = (s: GameState): GameState =>
  typeof structuredClone === 'function' ? structuredClone(s) : JSON.parse(JSON.stringify(s));

// ── helpers ────────────────────────────────────────────────────────────────────────────────
function friendlyArmies(state: GameState, side: Side): string[] {
  return REGION_IDS.filter((id) => {
    const s = state.regions[id];
    return s && s.side === side && totalUnits(s) > 0;
  });
}

function leaderLed(state: GameState, regionId: string): boolean {
  const s = state.regions[regionId];
  return !!s && (s.leaders > 0 || s.nazgul > 0 || s.characters.length > 0);
}

function adjacentEnemies(state: GameState, regionId: string, side: Side): string[] {
  return region(regionId).adjacency.filter((to) => {
    const s = state.regions[to];
    return s && s.side !== side && totalUnits(s) > 0;
  });
}

function adjacentMoveTargets(state: GameState, regionId: string, side: Side): string[] {
  return region(regionId).adjacency.filter((to) => {
    const s = state.regions[to];
    return !s || totalUnits(s) === 0 || s.side === side;
  });
}

function maxHuntAllocation(state: GameState): number {
  return state.fellowship.companions.length;
}

// ── legalActions ───────────────────────────────────────────────────────────────────────────
export function legalActions(state: GameState, side?: Side): Action[] {
  if (state.winner) return [];
  const acts: Action[] = [];

  if (state.pendingCombat && !state.pendingCombat.resolved) {
    acts.push({ type: 'combatRound' });
    acts.push({ type: 'combatCease' });
    const c = state.pendingCombat;
    const def = state.regions[c.defenderRegion];
    if (def) {
      if (region(c.defenderRegion).settlement === 'stronghold' && !def.besieged)
        acts.push({ type: 'combatRetreat', toRegion: c.defenderRegion });
      for (const to of adjacentMoveTargets(state, c.defenderRegion, def.side)) acts.push({ type: 'combatRetreat', toRegion: to });
    }
    if (c.siege) acts.push({ type: 'combatPressSiege' });
    return acts;
  }
  if (state.outcome) return [{ type: 'clearOutcome' }];

  switch (state.phase) {
    case 'recoverAndDraw':
      return [{ type: 'recoverAndDraw' }];
    case 'fellowship': {
      acts.push({ type: 'endPhase' });
      // declare at the last-known or an adjacent region (a small candidate set)
      acts.push({ type: 'declareFellowship', regionId: state.fellowship.lastDeclaredRegion });
      for (const id of state.fellowship.companions)
        if (id !== state.fellowship.guideId) acts.push({ type: 'changeGuide', characterId: id });
      return acts;
    }
    case 'huntAllocation': {
      for (let d = 0; d <= maxHuntAllocation(state); d++) acts.push({ type: 'huntAllocate', dice: d });
      acts.push({ type: 'endPhase' });
      return acts;
    }
    case 'actionRoll':
      return [{ type: 'rollDice' }];
    case 'victoryCheck':
      return [{ type: 'endPhase' }];
    case 'actionResolution':
      break;
  }

  const cur = side ?? state.current;
  if (state.passed[cur] || !hasUnusedDice(state, cur)) {
    // nothing to do this turn; allow forfeiting / passing control
    return [{ type: 'forfeitRemaining', side: cur }];
  }

  // enumerate one action per unused die (bounded candidate set so the sim terminates)
  state.dice[cur].forEach((d, dieIndex) => {
    if (d.used) return;
    const face = d.face;
    acts.push({ type: 'passDie', side: cur }); // always legal — guarantees progress

    const can = (req: Die) => faceSatisfies(face, req);

    // Fellowship & characters (FP, Character/Will)
    if (cur === 'fp' && can('character')) {
      acts.push({ type: 'moveFellowship', dieIndex });
      if (state.fellowship.revealed) acts.push({ type: 'hideFellowship', dieIndex });
    }
    // Army movement / attack
    if (can('army') || (face === 'character' && cur === 'fp') || face === 'will') {
      const armies = friendlyArmies(state, cur);
      for (const from of armies.slice(0, 8)) {
        const leaderRequired = face === 'character';
        if (leaderRequired && !leaderLed(state, from)) continue;
        const fromUnits = totalUnits(state.regions[from]);
        for (const to of adjacentMoveTargets(state, from, cur).slice(0, 3)) {
          if (totalUnits(state.regions[to]) + fromUnits > STACKING_LIMIT) continue; // respect stacking
          acts.push({ type: 'moveArmy', side: cur, from, to, dieIndex });
        }
        for (const to of adjacentEnemies(state, from, cur).slice(0, 3)) acts.push({ type: 'attack', side: cur, from, to, dieIndex });
      }
    }
    // Muster
    if (can('muster')) {
      for (const nation of (cur === 'fp' ? FP_NATIONS : SHADOW_NATIONS) as Nation[]) {
        if (!isAtWar(state, nation)) {
          // advancing the political track is a Muster action
          if (state.politics[nation].step < 3) acts.push({ type: 'advancePolitical', side: cur, nation, dieIndex });
          continue;
        }
        for (const regionId of REGION_IDS) {
          if (canRecruitAt(state, cur, nation, regionId)) {
            if (reinforcementsAvailable(state, cur, nation, 'regular') > 0) acts.push({ type: 'muster', side: cur, nation, regionId, kind: 'regular', dieIndex });
            break; // one candidate region per nation keeps the set bounded
          }
        }
      }
      for (const id of Object.keys(state.characters))
        if (canBringCharacter(state, cur, id)) {
          const home = cur === 'shadow' ? 'orthanc' : 'minas_tirith';
          acts.push({ type: 'bringCharacter', side: cur, characterId: id, regionId: home, dieIndex });
        }
    }
    // Event
    if (can('event')) {
      const chooseDeck: CardDeck = cur === 'fp' ? 'fpStrategy' : 'shadowStrategy';
      acts.push({ type: 'drawCard', side: cur, deck: chooseDeck, dieIndex });
    }
    // Play a card whose die requirement this face satisfies
    for (const cardId of state.hands[cur]) {
      const card = CARD_BY_ID[cardId];
      if (face === 'event' || faceSatisfies(face, card.dieToPlay as Die))
        acts.push({ type: 'playCard', side: cur, cardId, dieIndex });
    }
    // Will of the West unique uses
    if (face === 'will' && cur === 'fp') {
      if (state.characters['aragorn']?.location.where === 'reserve') acts.push({ type: 'upgradeAragorn', dieIndex });
      if (state.characters['gandalf_white']?.location.where === 'reserve') acts.push({ type: 'upgradeGandalf', dieIndex });
    }
  });

  // Mordor entry (free, when eligible)
  if (cur === 'fp' && canEnterMordor(state)) {
    // represented as moving the fellowship; handled in apply when eligible — no extra action needed
  }

  return acts;
}

// ── apply ──────────────────────────────────────────────────────────────────────────────────
function consumeDie(s: GameState, side: Side, dieIndex: number): void {
  const d = s.dice[side][dieIndex];
  if (d) d.used = true;
}

function passControl(s: GameState): void {
  // alternation: hand to the other side if they still have dice and haven't passed
  const other: Side = s.current === 'fp' ? 'shadow' : 'fp';
  if (!s.passed[other] && hasUnusedDice(s, other)) s.current = other;
  else if (!hasUnusedDice(s, s.current)) s.passed[s.current] = true;
}

function maybeEndResolution(s: GameState): void {
  const fpDone = s.passed.fp || !hasUnusedDice(s, 'fp');
  const shDone = s.passed.shadow || !hasUnusedDice(s, 'shadow');
  if (fpDone && shDone) {
    s.passed.fp = true;
    s.passed.shadow = true;
    s.phase = 'victoryCheck';
  }
}

function log(s: GameState, side: Side | 'system', text: string): void {
  s.log.push({ turn: s.turn, phase: s.phase, side, text });
}

export function apply(state: GameState, action: Action): GameState {
  const s = clone(state);
  if (s.winner && action.type !== 'clearOutcome') return s;

  switch (action.type) {
    case 'recoverAndDraw': {
      // recover dice & reset per-turn counters
      s.dice = { fp: [], shadow: [] };
      s.huntBox = { shadowAllocated: 0, eye: 0 };
      s.fellowship.fpDiceInBox = 0;
      s.fellowship.actedThisTurn = false;
      s.passed = { fp: false, shadow: false };
      // draw
      if (s.turn === 1) {
        drawCard(s, 'fpCharacter');
        drawCard(s, 'fpStrategy');
        drawCard(s, 'shadowCharacter');
        drawCard(s, 'shadowStrategy');
      } else {
        // 1 from each side's chosen deck (default: strategy if available, else character)
        drawCard(s, s.decks.fpStrategy.length ? 'fpStrategy' : 'fpCharacter');
        drawCard(s, s.decks.shadowStrategy.length ? 'shadowStrategy' : 'shadowCharacter');
      }
      discardToHandLimit(s, 'fp');
      discardToHandLimit(s, 'shadow');
      log(s, 'system', `Turn ${s.turn}: dice recovered, cards drawn.`);
      s.phase = 'fellowship';
      break;
    }
    case 'declareFellowship':
      s.outcome = declareFellowship(s, action.regionId);
      recomputeVp(s);
      break;
    case 'changeGuide':
      changeGuideFn(s, action.characterId);
      break;
    case 'huntAllocate':
      s.huntBox.shadowAllocated = Math.min(action.dice, maxHuntAllocation(s));
      log(s, 'shadow', `Allocated ${s.huntBox.shadowAllocated} dice to the Hunt.`);
      break;
    case 'rollDice': {
      // remove allocated dice from the shadow pool by rolling fewer (handled in rollActionDice via
      // dicePoolSize minus allocation): we subtract allocation after rolling for simplicity.
      rollActionDice(s);
      // honor allocation: mark that many shadow non-eye dice as used (committed to the box)
      let toCommit = s.huntBox.shadowAllocated;
      for (const d of s.dice.shadow) {
        if (toCommit <= 0) break;
        if (!d.used) {
          d.used = true;
          toCommit--;
        }
      }
      s.current = 'fp';
      s.passed = { fp: false, shadow: false };
      s.phase = 'actionResolution';
      log(s, 'system', `Dice rolled (FP ${s.dice.fp.length}, Shadow ${s.dice.shadow.length}). Eyes → Hunt Box: ${s.huntBox.eye}.`);
      break;
    }
    case 'endPhase': {
      if (s.phase === 'fellowship') s.phase = 'huntAllocation';
      else if (s.phase === 'huntAllocation') s.phase = 'actionRoll';
      else if (s.phase === 'victoryCheck') {
        checkMilitary(s);
        mordorIdleCheck(s);
        if (!s.winner) {
          s.turn += 1;
          s.phase = 'recoverAndDraw';
          s.current = 'fp';
        }
      }
      break;
    }
    case 'passDie':
      consumeDie(s, action.side, firstUnused(s, action.side));
      passControl(s);
      maybeEndResolution(s);
      break;
    case 'forfeitRemaining':
      for (const d of s.dice[action.side]) d.used = true;
      s.passed[action.side] = true;
      passControl(s);
      maybeEndResolution(s);
      break;
    case 'moveArmy': {
      const from = s.regions[action.from];
      const dest = s.regions[action.to];
      const wouldOverflow = totalUnits(dest) + totalUnits(from) > STACKING_LIMIT;
      if (from && from.side === action.side && !wouldOverflow) {
        if (dest) mergeStacks(dest, from);
        else s.regions[action.to] = from;
        s.regions[action.from] = undefined;
        log(s, action.side, `Army moves ${region(action.from).name} → ${region(action.to).name}.`);
      }
      consumeDie(s, action.side, action.dieIndex);
      passControl(s);
      maybeEndResolution(s);
      break;
    }
    case 'attack': {
      // moving nation must be At War to attack into non-friendly territory (gate, simplified)
      startCombat(s, action.side, action.from, action.to);
      combatRound(s);
      consumeDie(s, action.side, action.dieIndex);
      // control passes after the combat is resolved/ceased (handled on clearOutcome)
      break;
    }
    case 'moveFellowship': {
      if (canEnterMordor(s)) s.outcome = enterMordor(s);
      else s.outcome = moveFellowship(s);
      consumeDie(s, 'fp', action.dieIndex);
      passControl(s);
      maybeEndResolution(s);
      break;
    }
    case 'hideFellowship':
      s.outcome = hideFellowship(s);
      consumeDie(s, 'fp', action.dieIndex);
      passControl(s);
      maybeEndResolution(s);
      break;
    case 'muster':
      recruit(s, action.side, action.nation, action.regionId, action.kind);
      consumeDie(s, action.side, action.dieIndex);
      passControl(s);
      maybeEndResolution(s);
      break;
    case 'advancePolitical':
      activate(s, action.nation, 'muster');
      advancePolitical(s, action.nation, 1, 'muster');
      consumeDie(s, action.side, action.dieIndex);
      passControl(s);
      maybeEndResolution(s);
      break;
    case 'bringCharacter':
      bringCharacter(s, action.side, action.characterId, action.regionId);
      consumeDie(s, action.side, action.dieIndex);
      passControl(s);
      maybeEndResolution(s);
      break;
    case 'drawCard':
      drawCard(s, action.deck);
      discardToHandLimit(s, action.side);
      consumeDie(s, action.side, action.dieIndex);
      passControl(s);
      maybeEndResolution(s);
      break;
    case 'playCard':
      s.outcome = playCard(s, action.side, action.cardId);
      checkVictory(s);
      recomputeVp(s);
      consumeDie(s, action.side, action.dieIndex);
      passControl(s);
      maybeEndResolution(s);
      break;
    case 'upgradeAragorn': {
      const strider = s.characters['strider'];
      const aragorn = s.characters['aragorn'];
      if (aragorn.location.where === 'reserve') {
        aragorn.inPlay = true;
        // crown in place of Strider (in fellowship or wherever Strider is)
        aragorn.location = strider.location;
        if (s.fellowship.companions.includes('strider')) {
          s.fellowship.companions = s.fellowship.companions.map((c) => (c === 'strider' ? 'aragorn' : c));
          recomputeGuide(s);
        }
        strider.inPlay = false;
        strider.location = { where: 'dead' };
        log(s, 'fp', 'Aragorn is crowned Heir to Isildur (+1 FP die).');
      }
      consumeDie(s, 'fp', action.dieIndex);
      passControl(s);
      maybeEndResolution(s);
      break;
    }
    case 'upgradeGandalf': {
      const gw = s.characters['gandalf_white'];
      if (gw.location.where === 'reserve') {
        gw.inPlay = true;
        gw.location = { where: 'region', regionId: 'fangorn' };
        log(s, 'fp', 'Gandalf the White returns (+1 FP die).');
      }
      consumeDie(s, 'fp', action.dieIndex);
      passControl(s);
      maybeEndResolution(s);
      break;
    }
    case 'combatRound':
      combatRound(s);
      break;
    case 'combatRetreat':
      combatRetreat(s, action.toRegion);
      break;
    case 'combatCease':
      combatCease(s);
      break;
    case 'combatPressSiege':
      combatPressSiege(s);
      break;
    case 'clearOutcome':
      s.outcome = null;
      if (s.pendingCombat && s.pendingCombat.resolved) {
        s.pendingCombat = null;
        recomputeVp(s);
        checkVictory(s);
        passControl(s);
        maybeEndResolution(s);
      }
      break;
  }

  return s;
}

function firstUnused(s: GameState, side: Side): number {
  return s.dice[side].findIndex((d) => !d.used);
}

export { CHAR_BY_ID };
