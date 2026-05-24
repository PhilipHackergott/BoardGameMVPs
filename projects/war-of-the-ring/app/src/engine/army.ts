// Stack helpers — pure functions over an army Stack. Units are stored as per-nation counts so a
// region can hold a mixed-nation army. Leaders/Nazgul/Characters do not count toward the 10-unit
// stacking limit. Combat strength = participating units (capped at 5 dice elsewhere).

import type { CharacterDef, Nation, Side, Stack, UnitKind } from './types';
import { CHAR_BY_ID } from './data/characters';

export const STACKING_LIMIT = 10;

export function emptyStack(side: Side): Stack {
  return { side, regular: {}, elite: {}, leaders: 0, nazgul: 0, characters: [], besieged: false };
}

export function totalUnits(s: Stack | undefined): number {
  if (!s) return 0;
  let n = 0;
  for (const v of Object.values(s.regular)) n += v ?? 0;
  for (const v of Object.values(s.elite)) n += v ?? 0;
  return n;
}

export function regularCount(s: Stack): number {
  let n = 0;
  for (const v of Object.values(s.regular)) n += v ?? 0;
  return n;
}

export function eliteCount(s: Stack): number {
  let n = 0;
  for (const v of Object.values(s.elite)) n += v ?? 0;
  return n;
}

/** Combat Strength = number of units (regular + elite). */
export function combatStrength(s: Stack | undefined): number {
  return totalUnits(s);
}

/** Leadership = leaders + nazgul + sum of present characters' leadership. */
export function leadership(s: Stack | undefined): number {
  if (!s) return 0;
  let l = s.leaders + s.nazgul;
  for (const id of s.characters) l += CHAR_BY_ID[id]?.leadership ?? 0;
  return l;
}

export function addUnits(s: Stack, nation: Nation, kind: UnitKind, n: number): void {
  const map = kind === 'regular' ? s.regular : s.elite;
  map[nation] = (map[nation] ?? 0) + n;
}

/** Remove `n` units of any nation, preferring regulars first (casualties). Returns removed count. */
export function removeUnits(s: Stack, n: number, preferElite = false): number {
  let removed = 0;
  const order: UnitKind[] = preferElite ? ['elite', 'regular'] : ['regular', 'elite'];
  for (const kind of order) {
    const map = kind === 'regular' ? s.regular : s.elite;
    for (const nation of Object.keys(map) as Nation[]) {
      while ((map[nation] ?? 0) > 0 && removed < n) {
        map[nation] = (map[nation] ?? 0) - 1;
        if (map[nation] === 0) delete map[nation];
        removed++;
      }
    }
  }
  return removed;
}

/** Reduce one Elite to a Regular (siege Elite-reduction). Returns true if it happened. */
export function reduceElite(s: Stack): boolean {
  for (const nation of Object.keys(s.elite) as Nation[]) {
    if ((s.elite[nation] ?? 0) > 0) {
      s.elite[nation] = (s.elite[nation] ?? 0) - 1;
      if (s.elite[nation] === 0) delete s.elite[nation];
      s.regular[nation] = (s.regular[nation] ?? 0) + 1;
      return true;
    }
  }
  return false;
}

export function hasNation(s: Stack | undefined, nation: Nation): boolean {
  if (!s) return false;
  return (s.regular[nation] ?? 0) > 0 || (s.elite[nation] ?? 0) > 0;
}

export function nationsInStack(s: Stack): Nation[] {
  const set = new Set<Nation>();
  for (const k of Object.keys(s.regular) as Nation[]) set.add(k);
  for (const k of Object.keys(s.elite) as Nation[]) set.add(k);
  return [...set];
}

export function isEmptyStack(s: Stack | undefined): boolean {
  return !s || (totalUnits(s) === 0 && s.leaders === 0 && s.nazgul === 0 && s.characters.length === 0);
}

/** Move up to `count` units (and leaders/nazgul/characters) from one stack to another. Simplest
 *  policy: move the whole army (all units), used by the Army/Character move actions. */
export function mergeStacks(into: Stack, from: Stack): void {
  for (const [n, v] of Object.entries(from.regular)) into.regular[n as Nation] = (into.regular[n as Nation] ?? 0) + (v ?? 0);
  for (const [n, v] of Object.entries(from.elite)) into.elite[n as Nation] = (into.elite[n as Nation] ?? 0) + (v ?? 0);
  into.leaders += from.leaders;
  into.nazgul += from.nazgul;
  into.characters.push(...from.characters);
}

export function characterDefs(ids: string[]): CharacterDef[] {
  return ids.map((id) => CHAR_BY_ID[id]).filter(Boolean);
}
