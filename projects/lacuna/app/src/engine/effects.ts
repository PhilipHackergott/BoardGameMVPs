// Pure helpers that fold the special-powers rules into legality, placement, and the
// collect step. With no powers drafted (and no barriers) every function here reduces
// to base Lacuna behavior, so the base game is untouched.

import { dist, pointSegInfo, segmentsIntersect } from "./geometry";
import type { PowerId } from "./powers";
import type { GameState, PlayerId, Star } from "./types";

const EPS = 1e-9;

// Tuned "swingy".
export const WARD_RADIUS = 85; // Warding: rivals blocked within this of a warded pawn
export const GRAVITY_RADIUS = 143; // Verdant affinity: flowers within this are pulled in
export const GRAVITY_FACTOR = 0.31; // ...by this fraction of the distance
export const GRAVITY_POWER_RADIUS = 122; // Gravity power: weaker than Verdant (rebalanced down)
export const GRAVITY_POWER_FACTOR = 0.24;
export const AGILE_RADIUS = 95; // Agile: bonus flower must be within this
export const PRISM_RADIUS = 130; // Prism: nearest off-colour flower must be within this
export const ALCHEMIST_RADIUS = 120; // Alchemist: nearest flower to transmute must be within this
export const CARTO_RADIUS = 85; // Cartographer: strong local reach within this of a pawn
export const REPEL_RADIUS = 155; // Repeller: cone reach (rebalanced up)
export const REPEL_FACTOR = 0.4; // Repeller: push fraction (rebalanced up)
export const REPEL_COS = 0.34; // cos(~70°): wider cone (rebalanced up)

export function hasPower(state: GameState, player: PlayerId, id: PowerId): boolean {
  return state.powers[player]?.includes(id) ?? false;
}

// Is the line a–b a usable connection for `player`? Honors Flying (cross up to one
// flower), rival Warding pawns (block within WARD_RADIUS), and rival Intercept barriers.
export function lineClearFor(
  state: GameState,
  player: PlayerId,
  a: Star,
  b: Star,
  ignoreFlying = false,
): boolean {
  const { stars, beacons, config, barriers } = state;
  const { starR, beaconR } = config;

  let flowerBlocks = 0;
  // Crossing budget: Flying gives +1; Chalk affinity gives +1 per Chalk (colour 5) collected.
  const budget = ignoreFlying
    ? 0
    : (hasPower(state, player, "flying") ? 2 : 0) +
      (state.affinity[player] === 5 ? state.collected[player][5] : 0);
  for (const s of stars) {
    if (s.id === a.id || s.id === b.id) continue;
    const info = pointSegInfo(s, a, b);
    if (info.t > EPS && info.t < 1 - EPS && info.distance < starR) {
      if (++flowerBlocks > budget) return false;
    }
  }

  for (const bn of beacons) {
    // Spectral: a rival's beacons don't block your lines at all.
    if (bn.owner !== player && hasPower(state, bn.owner, "spectral")) continue;
    const info = pointSegInfo(bn, a, b);
    if (!(info.t > EPS && info.t < 1 - EPS)) continue;
    const rivalWard = bn.owner !== player && hasPower(state, bn.owner, "warding");
    const blockR = rivalWard ? WARD_RADIUS : beaconR;
    if (info.distance < blockR) return false;
  }

  for (const bar of barriers) {
    if (bar.owner === player) continue;
    if (segmentsIntersect(a, b, { x: bar.ax, y: bar.ay }, { x: bar.bx, y: bar.by })) return false;
  }
  return true;
}

// May `player` drop a pawn at (x,y)? Blocked inside a rival's Warding radius or on a
// rival's Intercept barrier line.
export function placementPointLegal(state: GameState, player: PlayerId, x: number, y: number): boolean {
  for (const bn of state.beacons) {
    if (bn.owner === player) continue;
    if (hasPower(state, bn.owner, "warding") && dist(x, y, bn.x, bn.y) < WARD_RADIUS) return false;
  }
  for (const bar of state.barriers) {
    if (bar.owner === player) continue;
    const info = pointSegInfo({ x, y }, { x: bar.ax, y: bar.ay }, { x: bar.bx, y: bar.by });
    if (info.t > EPS && info.t < 1 - EPS && info.distance < state.config.beaconR) return false;
  }
  return true;
}

// A flower is shielded from push/pull (Gravity, Repeller) if it sits inside any
// Warding zone or on any Intercept barrier. Per the rules, those zones lock the board.
export function isShielded(state: GameState, x: number, y: number): boolean {
  for (const bn of state.beacons) {
    if (hasPower(state, bn.owner, "warding") && dist(x, y, bn.x, bn.y) < WARD_RADIUS) return true;
  }
  for (const bar of state.barriers) {
    const info = pointSegInfo({ x, y }, { x: bar.ax, y: bar.ay }, { x: bar.bx, y: bar.by });
    if (info.t > EPS && info.t < 1 - EPS && info.distance < state.config.beaconR + 4) return true;
  }
  return false;
}

// Spectral makes a player's beacons pull leftover flowers from 8% farther at nightfall
// (rebalanced down from 30%; 1.12 was a touch hot, so settled at 1.08).
export function territoryWeight(state: GameState, player: PlayerId): number {
  return hasPower(state, player, "spectral") ? 1.08 : 1;
}

// A star may be displaced (Gravity/Repeller/Ember/Verdant) only if not frozen or shielded.
export function canDisplace(state: GameState, star: { id: number; x: number; y: number }): boolean {
  return !state.frozenStars.includes(star.id) && !isShielded(state, star.x, star.y);
}

// Procrastinator: the connected component of same-color flowers reachable from the
// placed pair via the *player's own usable lines* — i.e. only uninterrupted (green)
// connections, unless the player also has Flying (which may cross one flower per line).
export function connectedSameColor(
  state: GameState,
  player: PlayerId,
  aId: number,
  bId: number,
): number[] {
  const a = state.stars.find((s) => s.id === aId);
  if (!a) return [aId, bId];
  const nodes = state.stars.filter((s) => s.color === a.color);
  const byId = new Map(nodes.map((s) => [s.id, s] as const));
  const visited = new Set<number>();
  const queue: number[] = [];
  for (const id of [aId, bId]) {
    if (byId.has(id)) {
      visited.add(id);
      queue.push(id);
    }
  }
  while (queue.length) {
    const cur = byId.get(queue.shift()!)!;
    for (const n of nodes) {
      if (visited.has(n.id)) continue;
      if (lineClearFor(state, player, cur, n)) {
        visited.add(n.id);
        queue.push(n.id);
      }
    }
  }
  return [...visited];
}
