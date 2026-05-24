// End-game resolution: territory assignment, per-color winners, overall result.

import { dist, segmentsIntersect } from "./geometry";
import { CARTO_RADIUS, hasPower, territoryWeight } from "./effects";
import type { Beacon, GameState, PlayerId, Result, Star, TerritoryClaim } from "./types";

// Does the line from a star to a beacon cross a rival's Intercept barrier? Such a wall
// blocks the claim — the beacon can't reach territory on the far side of an enemy wall.
function blockedByBarrier(state: GameState, star: Star, b: Beacon): boolean {
  for (const bar of state.barriers) {
    if (bar.owner === b.owner) continue;
    if (segmentsIntersect(star, b, { x: bar.ax, y: bar.ay }, { x: bar.bx, y: bar.by })) return true;
  }
  return false;
}

// Effective claim distance for a beacon: Spectral reach (×weight), Lighthouse (the owner's
// first pawn reaches 2× farther), and Cartographer (any flower within CARTO_RADIUS counts as
// adjacent, overriding nearest-pawn — ties among cartographers broken by true distance).
function effDist(state: GameState, star: Star, b: Beacon, lighthouseIds: Set<number>): number {
  const raw = dist(star.x, star.y, b.x, b.y);
  if (hasPower(state, b.owner, "cartographer") && raw < CARTO_RADIUS) {
    return raw * 0.5; // strong local reach within the radius (a much-closer rival can still win)
  }
  let w = territoryWeight(state, b.owner);
  if (lighthouseIds.has(b.id)) w *= 1.5; // Lighthouse: 1.5× reach on the first pawn (2× was too strong)
  return raw / w;
}

// Nearest beacon to a star (by effective distance); rival Intercept walls block the claim.
// Tie between rivals → discard.
function claimOwner(
  state: GameState,
  star: Star,
  lighthouseIds: Set<number>,
): { owner: PlayerId | null; beacon: Beacon | null } {
  const EPS = 1e-7;
  let best = Infinity;
  let owner: PlayerId | null = null;
  let beacon: Beacon | null = null;
  let tied = false;
  for (const b of state.beacons) {
    if (b.phantom) continue; // Catalyst phantoms don't claim territory
    if (blockedByBarrier(state, star, b)) continue; // walled off by a rival Intercept barrier
    const d = effDist(state, star, b, lighthouseIds);
    if (d < best - EPS) {
      best = d;
      owner = b.owner;
      beacon = b;
      tied = false;
    } else if (Math.abs(d - best) <= EPS && b.owner !== owner) {
      tied = true;
    }
  }
  return tied ? { owner: null, beacon: null } : { owner, beacon };
}

// Returns a NEW ended state with finalByColor, colorWinners, discarded, result, and
// per-flower territory filled in. Pure: does not mutate the input.
//
// Scoring (any player count): each colour is won by the player holding a strict
// majority of it (ties → nobody). The overall winner has the plurality of colours;
// ties are broken by total flowers, then declared a draw.
export function finalize(state: GameState): GameState {
  const { config, stars, collected } = state;
  const players = config.players;
  const finalByColor: number[][] = collected.map((row) => row.slice());
  const territory: TerritoryClaim[] = [];
  let discarded = 0;

  // Lighthouse: each holder's *first* pawn (lowest beacon id) reaches twice as far.
  const lighthouseIds = new Set<number>();
  for (let p = 0; p < players; p++) {
    if (!hasPower(state, p, "lighthouse")) continue;
    let firstId = Infinity;
    for (const b of state.beacons) if (b.owner === p && !b.phantom && b.id < firstId) firstId = b.id;
    if (firstId !== Infinity) lighthouseIds.add(firstId);
  }

  for (const star of stars) {
    const { beacon, owner } = claimOwner(state, star, lighthouseIds);
    if (owner === null) discarded++;
    else finalByColor[owner][star.color]++;
    territory.push({
      starId: star.id,
      color: star.color,
      x: star.x,
      y: star.y,
      owner,
      beaconX: beacon ? beacon.x : null,
      beaconY: beacon ? beacon.y : null,
    });
  }

  // Cheater: wins every tied colour (a clean, focused edge — the fabricated +1 was too
  // strong in testing, so it's just the tie-breaker now).
  const cheater = Array.from(
    { length: players },
    (_, p) => state.powers[p]?.includes("cheater") ?? false,
  );

  const colorWinners: (PlayerId | null)[] = [];
  const colorsWon = new Array(players).fill(0);
  for (let c = 0; c < config.colors; c++) {
    const winner = colorWinnerOf(finalByColor, c, null, cheater);
    colorWinners.push(winner);
    if (winner !== null) colorsWon[winner]++;
  }

  // Magpie: when behind on colours, SPOIL one colour majority you trail by exactly one —
  // it becomes contested (nobody wins it). A 1-swing comeback denial, not a 2-swing steal
  // (stealing tested too strong; a strict behind-by-2 gate tested too weak).
  for (let p = 0; p < players; p++) {
    if (!(state.powers[p]?.includes("magpie"))) continue;
    for (let c = 0; c < config.colors; c++) {
      const w = colorWinners[c];
      if (w === null || w === p) continue;
      if (colorsWon[p] >= colorsWon[w]) continue; // only when trailing this rival on colours
      if (finalByColor[w][c] - finalByColor[p][c] === 1) {
        colorWinners[c] = null; // spoiled — nobody wins it
        colorsWon[w]--;
        break; // one colour only
      }
    }
  }

  // Hoarder: each colour you win in which you hold 5+ counts as an extra colour won
  // (helps the win condition — plurality of colours — not just the flower tiebreak).
  for (let p = 0; p < players; p++) {
    if (!(state.powers[p]?.includes("hoarder"))) continue;
    for (let c = 0; c < config.colors; c++) {
      if (colorWinners[c] === p && finalByColor[p][c] >= 5) {
        colorsWon[p]++;
        break; // one bonus colour
      }
    }
  }

  const totals = finalByColor.map((row) => row.reduce((s, n) => s + n, 0));
  const result = pickWinner(players, colorsWon, totals);

  return {
    ...state,
    phase: "ended",
    finalByColor,
    colorWinners,
    discarded,
    result,
    territory,
  };
}

// Winner of a single colour: strict max owns it; on a tie a Cheater among the leaders
// takes it, otherwise nobody. `prefer` lets the greedy bonus probe a specific player.
function colorWinnerOf(
  finalByColor: number[][],
  c: number,
  prefer: PlayerId | null,
  cheater: boolean[],
): PlayerId | null {
  let max = 0;
  const leaders: PlayerId[] = [];
  for (let p = 0; p < finalByColor.length; p++) {
    const v = finalByColor[p][c];
    if (v > max) {
      max = v;
      leaders.length = 0;
      leaders.push(p);
    } else if (v === max) {
      leaders.push(p);
    }
  }
  if (max <= 0) return null;
  if (leaders.length === 1) return leaders[0];
  if (prefer !== null && cheater[prefer] && leaders.includes(prefer)) return prefer;
  const ch = leaders.find((p) => cheater[p]);
  return ch ?? null;
}

// Plurality of colours; tie-break by total flowers; remaining tie → draw.
function pickWinner(players: number, colorsWon: number[], totals: number[]): Result {
  const bestColors = Math.max(...colorsWon);
  const leaders: PlayerId[] = [];
  for (let p = 0; p < players; p++) if (colorsWon[p] === bestColors) leaders.push(p);
  if (leaders.length === 1) return leaders[0];

  let bestTotal = -1;
  let winner: Result = "draw";
  let tie = false;
  for (const p of leaders) {
    if (totals[p] > bestTotal) {
      bestTotal = totals[p];
      winner = p;
      tie = false;
    } else if (totals[p] === bestTotal) {
      tie = true;
    }
  }
  return tie ? "draw" : winner;
}
