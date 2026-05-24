// Muster: recruit reinforcements (only for At-War nations), and bring Characters/Minions/upgrades
// into play. Recruitment respects the reinforcement pool and the 10-unit stacking limit.

import type { GameState, Nation, Side, UnitKind } from './types';
import { sideOfNation } from './types';
import { region } from './data/map';
import { CHAR_BY_ID } from './data/characters';
import { isAtWar } from './politics';
import { addUnits, emptyStack, totalUnits } from './army';
import { STACKING_LIMIT } from './army';

/** A region is a valid muster target for `nation` if it is that nation's settlement OR already
 *  holds a friendly army, and is under that side's control. */
export function canRecruitAt(state: GameState, side: Side, nation: Nation, regionId: string): boolean {
  if (sideOfNation(nation) !== side) return false;
  if (!isAtWar(state, nation)) return false;
  const r = region(regionId);
  const stack = state.regions[regionId];
  if (stack && stack.side !== side) return false;
  if (totalUnits(stack) >= STACKING_LIMIT) return false;
  const isHomeSettlement = r.nation === nation && r.settlement !== 'none';
  const hasFriendlyArmy = !!stack && stack.side === side && totalUnits(stack) > 0;
  return isHomeSettlement || hasFriendlyArmy;
}

export function reinforcementsAvailable(state: GameState, side: Side, nation: Nation, kind: UnitKind): number {
  const pool = state.reinforcements[side];
  return (kind === 'regular' ? pool.regular[nation] : pool.elite[nation]) ?? 0;
}

export function recruit(state: GameState, side: Side, nation: Nation, regionId: string, kind: UnitKind): boolean {
  if (!canRecruitAt(state, side, nation, regionId)) return false;
  if (reinforcementsAvailable(state, side, nation, kind) <= 0) return false;
  const pool = state.reinforcements[side];
  const map = kind === 'regular' ? pool.regular : pool.elite;
  map[nation] = (map[nation] ?? 0) - 1;
  let stack = state.regions[regionId];
  if (!stack) {
    stack = emptyStack(side);
    state.regions[regionId] = stack;
  }
  addUnits(stack, nation, kind, 1);
  state.log.push({ turn: state.turn, phase: state.phase, side, text: `Recruited a ${nation} ${kind} in ${region(regionId).name}.` });
  return true;
}

/** Whether a Minion/upgrade may enter now (simplified entry conditions). */
export function canBringCharacter(state: GameState, side: Side, characterId: string): boolean {
  const def = CHAR_BY_ID[characterId];
  const cs = state.characters[characterId];
  if (!def || !cs || def.side !== side || cs.inPlay) return false;
  if (cs.location.where === 'reserve') return false; // Aragorn/Gandalf White enter via Will only
  switch (characterId) {
    case 'saruman':
      return isAtWar(state, 'isengard');
    case 'mouth_of_sauron':
      return isAtWar(state, 'sauron');
    case 'witch_king':
      return state.vp.shadow >= 4 || isAtWar(state, 'sauron');
    default:
      return cs.location.where === 'available';
  }
}

export function bringCharacter(state: GameState, side: Side, characterId: string, regionId: string): boolean {
  if (!canBringCharacter(state, side, characterId)) return false;
  const cs = state.characters[characterId];
  cs.inPlay = true;
  cs.location = { where: 'region', regionId };
  let stack = state.regions[regionId];
  if (!stack) {
    stack = emptyStack(side);
    state.regions[regionId] = stack;
  }
  stack.characters.push(characterId);
  if (characterId === 'saruman') stack.besieged = stack.besieged; // no-op; Saruman is immobile in Orthanc
  state.log.push({ turn: state.turn, phase: state.phase, side, text: `${CHAR_BY_ID[characterId].name} enters play at ${region(regionId).name}.` });
  return true;
}
