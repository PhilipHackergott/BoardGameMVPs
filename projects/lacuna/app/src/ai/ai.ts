// Computer opponents. Pure-ish choice functions over engine state; the App driver
// dispatches the chosen move through the normal store actions so all side-effects
// (flights, sub-phase routing) are reused.

import { applyAction, beaconsLeft, dist, finalize, legalMoves } from "../engine";
import type { Action, GameState, PlayerId, PowerId, Star } from "../engine";

export type Difficulty = "low" | "medium" | "hard";

const byId = (g: GameState, id: number): Star | undefined => g.stars.find((s) => s.id === id);
const rand = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

// Point on the a–b segment farthest from every flower (avoids hit-area collisions).
function safePoint(a: Star, b: Star, stars: Star[]): { x: number; y: number } {
  let bestT = 0.5;
  let bestD = -1;
  for (let t = 0.2; t <= 0.8; t += 0.1) {
    const px = a.x + (b.x - a.x) * t;
    const py = a.y + (b.y - a.y) * t;
    let md = Infinity;
    for (const s of stars) md = Math.min(md, Math.hypot(s.x - px, s.y - py));
    if (md > bestD) {
      bestD = md;
      bestT = t;
    }
  }
  return { x: a.x + (b.x - a.x) * bestT, y: a.y + (b.y - a.y) * bestT };
}

// Rough value of a position for one player: flowers held now + projected territory.
function estimate(g: GameState, player: PlayerId): number {
  let score = g.collected[player].reduce((a, n) => a + n, 0);
  for (const star of g.stars) {
    let best = Infinity;
    let owner: PlayerId | null = null;
    for (const b of g.beacons) {
      if (b.phantom) continue;
      const d = dist(star.x, star.y, b.x, b.y);
      if (d < best) {
        best = d;
        owner = b.owner;
      }
    }
    if (owner === player) score += 1;
  }
  return score;
}

export interface PlaceChoice {
  a: number;
  b: number;
  x: number;
  y: number;
}

export function aiPlace(g: GameState, difficulty: Difficulty): PlaceChoice | null {
  const moves = legalMoves(g);
  if (moves.length === 0) return null;
  const me = g.current;

  if (difficulty === "low") {
    // Weakly sensible (no lookahead): concentrate on a colour you're already collecting,
    // and lean toward the contested centre. Random jitter keeps it varied and beatable.
    let best = moves[0];
    let bestScore = -Infinity;
    for (const m of moves) {
      const a = byId(g, m.aStarId)!;
      const b = byId(g, m.bStarId)!;
      const mx = (a.x + b.x) / 2;
      const my = (a.y + b.y) / 2;
      const central = 1 - Math.hypot(mx, my) / g.config.fieldR; // 1 at centre, ~0 at rim
      const score = g.collected[me][a.color] * 1.5 + central + Math.random();
      if (score > bestScore) {
        bestScore = score;
        best = m;
      }
    }
    const a = byId(g, best.aStarId)!;
    const b = byId(g, best.bStarId)!;
    return { a: best.aStarId, b: best.bStarId, ...safePoint(a, b, g.stars) };
  }

  // Simulate every legal placement once (with a safe drop point) and score it greedily.
  const cands: { a: number; b: number; x: number; y: number; sim: GameState; quick: number }[] = [];
  for (const m of moves) {
    const a = byId(g, m.aStarId)!;
    const b = byId(g, m.bStarId)!;
    const pt = safePoint(a, b, g.stars);
    let sim: GameState;
    try {
      sim = applyAction(g, { type: "place", aStarId: m.aStarId, bStarId: m.bStarId, x: pt.x, y: pt.y });
    } catch {
      continue;
    }
    cands.push({ a: m.aStarId, b: m.bStarId, x: pt.x, y: pt.y, sim, quick: estimate(sim, me) });
  }
  if (cands.length === 0) {
    const m = moves[0];
    const a = byId(g, m.aStarId)!;
    const b = byId(g, m.bStarId)!;
    return { a: m.aStarId, b: m.bStarId, ...safePoint(a, b, g.stars) };
  }

  // Medium: pure greedy — maximise your own projected flowers + territory (one ply).
  if (difficulty === "medium") {
    let best = cands[0];
    for (const c of cands) if (c.quick > best.quick) best = c;
    return { a: best.a, b: best.b, x: best.x, y: best.y };
  }

  // Hard: 2-ply lookahead. For the most promising placements, simulate the opponent's best
  // greedy reply, then score on the ACTUAL win condition — projected colours won (computed
  // by `finalize`, so it's power/affinity-aware), not just raw flower/territory counts.
  cands.sort((p, q) => q.quick - p.quick);
  let best = cands[0];
  let bestScore = -Infinity;
  for (const c of cands.slice(0, 8)) {
    let score: number;
    if (c.sim.phase === "ended" || c.sim.current === me) {
      // game over, or a sub-phase (free pick / steal / banish / magnet) keeps the turn with me
      score = evalColors(c.sim, me);
    } else {
      const reply = bestGreedyReply(c.sim);
      score = evalColors(reply ?? c.sim, me);
    }
    if (score > bestScore) {
      bestScore = score;
      best = c;
    }
  }
  return { a: best.a, b: best.b, x: best.x, y: best.y };
}

// The current player's single best greedy placement, simulated (or null if stuck). Used as
// the opponent model in Hard's lookahead. Caps the branch to keep the search bounded.
function bestGreedyReply(g: GameState): GameState | null {
  const moves = legalMoves(g);
  if (moves.length === 0) return null;
  const me = g.current;
  let best: GameState | null = null;
  let bestScore = -Infinity;
  for (const m of moves.slice(0, 16)) {
    const a = byId(g, m.aStarId)!;
    const b = byId(g, m.bStarId)!;
    const pt = safePoint(a, b, g.stars);
    let sim: GameState;
    try {
      sim = applyAction(g, { type: "place", aStarId: m.aStarId, bStarId: m.bStarId, x: pt.x, y: pt.y });
    } catch {
      continue;
    }
    const s = estimate(sim, me);
    if (s > bestScore) {
      bestScore = s;
      best = sim;
    }
  }
  return best;
}

// Win-condition-aware evaluation: project the end state (power/affinity-aware via finalize)
// and score the margin in COLOURS won, tie-broken by total flowers. This is what the game is
// actually won on — far better than counting raw flowers/territory.
function evalColors(g: GameState, me: PlayerId): number {
  const f = finalize(g);
  const players = g.config.players;
  const won = new Array(players).fill(0);
  for (const w of f.colorWinners ?? []) if (w !== null) won[w]++;
  let bestRival = 0;
  for (let p = 0; p < players; p++) if (p !== me) bestRival = Math.max(bestRival, won[p]);
  const tot = (f.finalByColor ?? []).map((r) => r.reduce((s, n) => s + n, 0));
  const totMine = tot[me] ?? 0;
  let totRival = 0;
  for (let p = 0; p < players; p++) if (p !== me) totRival = Math.max(totRival, tot[p] ?? 0);
  return (won[me] - bestRival) * 100 + (totMine - totRival) * 0.5;
}

// Setup claim: a central flower is most contested (medium/hard); random for low.
export function aiClaim(g: GameState, difficulty: Difficulty): number {
  if (g.stars.length === 0) return 0;
  if (difficulty === "low") return rand(g.stars).id;
  let best = g.stars[0];
  for (const s of g.stars) if (Math.hypot(s.x, s.y) < Math.hypot(best.x, best.y)) best = s;
  return best.id;
}

// Resolve a free pick: collect builds your strongest colour; remove denies rivals.
export function aiFreePick(g: GameState): number {
  const mode = g.freePicks[0];
  if (g.stars.length === 0) return g.stars[0]?.id ?? 0;
  if (mode === "remove") {
    const rivalBeacons = g.beacons.filter((b) => b.owner !== g.current && !b.phantom);
    if (rivalBeacons.length > 0) {
      let best = g.stars[0];
      let bd = Infinity;
      for (const s of g.stars) {
        for (const b of rivalBeacons) {
          const d = dist(s.x, s.y, b.x, b.y);
          if (d < bd) {
            bd = d;
            best = s;
          }
        }
      }
      return best.id;
    }
    return rand(g.stars).id;
  }
  // collect: prefer the colour the AI already holds most of
  const mine = g.collected[g.current];
  let bestColor = -1;
  let bestN = -1;
  for (let c = 0; c < g.config.colors; c++) {
    if (g.stars.some((s) => s.color === c) && mine[c] > bestN) {
      bestN = mine[c];
      bestColor = c;
    }
  }
  const pick = g.stars.find((s) => s.color === bestColor) ?? g.stars[0];
  return pick.id;
}

// Repeller cone: aim at the centroid of flowers in range to scatter the densest spot.
export function aiRepelPoint(g: GameState): { x: number; y: number } {
  const o = g.repelOrigin!;
  let cx = 0;
  let cy = 0;
  let n = 0;
  for (const s of g.stars) {
    if (dist(s.x, s.y, o.x, o.y) < 140) {
      cx += s.x;
      cy += s.y;
      n++;
    }
  }
  return n > 0 ? { x: cx / n, y: cy / n } : { x: o.x + 1, y: o.y };
}

// Draft: low picks at random; medium/hard follow a rough strength tier (post-rebalance).
const TIER: PowerId[] = [
  "procrastinator",
  "spectral",
  "lighthouse",
  "cartographer",
  "nomad",
  "gravity",
  "intercept",
  "warding",
  "alchemist",
  "catalyst",
  "momentum",
  "harvester",
  "flexible",
  "shadowfollow",
  "agile",
  "patron",
  "prism",
  "assassin",
  "tithe",
  "magpie",
  "cheater",
  "flying",
  "hoarder",
  "repeller",
];

export function aiDraftPick(pool: PowerId[], difficulty: Difficulty): PowerId {
  if (difficulty === "low") return rand(pool);
  for (const id of TIER) if (pool.includes(id)) return id;
  return pool[0];
}

const AFFINITY_TIER = [4, 3, 6, 5, 0, 2, 1]; // Dusk, Aureate, Abyss, Chalk, Ember, Verdant, Frost
export function aiDraftAffinity(pool: number[], difficulty: Difficulty): number {
  if (difficulty === "low") return rand(pool);
  for (const c of AFFINITY_TIER) if (pool.includes(c)) return c;
  return pool[0];
}

// Dusk: steal the colour a rival leads by the most.
export function aiDusk(g: GameState): number {
  let bestC = 0;
  let best = -1;
  for (let c = 0; c < g.config.colors; c++) {
    if (c === 4) continue;
    let most = 0;
    for (let p = 0; p < g.config.players; p++) if (p !== g.current) most = Math.max(most, g.collected[p][c]);
    if (most > best) {
      best = most;
      bestC = c;
    }
  }
  return bestC;
}

// Abyss: banish the flower nearest a rival pawn (deny); skip (null) if nothing worth it.
export function aiAbyss(g: GameState): number | null {
  const rivalBeacons = g.beacons.filter((b) => b.owner !== g.current && !b.phantom);
  if (g.stars.length === 0 || rivalBeacons.length === 0) return null;
  let best = g.stars[0];
  let bd = Infinity;
  for (const s of g.stars) {
    for (const b of rivalBeacons) {
      const d = dist(s.x, s.y, b.x, b.y);
      if (d < bd) {
        bd = d;
        best = s;
      }
    }
  }
  return best.id;
}

// ── Optional active abilities (previously never used by the AI) ──────────────────

// Nomad: which of my pawns to reclaim — the one nearest a rival (its territory is the
// most contested, so it's the cheapest to pick up and redeploy elsewhere).
function nomadReclaimTarget(g: GameState, me: PlayerId): number | null {
  const mine = g.beacons.filter((b) => b.owner === me && !b.phantom);
  if (mine.length === 0) return null;
  const rivals = g.beacons.filter((b) => b.owner !== me && !b.phantom);
  if (rivals.length === 0) return mine[0].id;
  let best = mine[0];
  let bestD = Infinity;
  for (const m of mine) {
    let nd = Infinity;
    for (const r of rivals) nd = Math.min(nd, dist(m.x, m.y, r.x, r.y));
    if (nd < bestD) {
      bestD = nd;
      best = m;
    }
  }
  return best.id;
}

// An optional active to take *before* placing this turn (Flexible extra turn, Nomad
// redeploy), or null. Returning an action means: dispatch it, then re-decide.
export function aiActive(g: GameState): Action | null {
  const me = g.current;
  const powers = g.powers[me] ?? [];
  // Flexible: take the extra turn — now a genuine extra pawn — once, while a move exists.
  if (powers.includes("flexible") && !g.flexExtraUsed[me] && legalMoves(g).length > 0) {
    return { type: "flexExtra" };
  }
  // Nomad: once, late, reclaim a contested pawn to redeploy it for a fresh pair.
  if (powers.includes("nomad") && !g.nomadUsed[me] && beaconsLeft(g, me) <= 2 && legalMoves(g).length > 0) {
    const id = nomadReclaimTarget(g, me);
    if (id !== null) return { type: "nomadPickup", beaconId: id };
  }
  return null;
}

// When the current player has no legal move, prefer Flexible's keep-the-pawn pass.
export function aiFlexPass(g: GameState): boolean {
  const me = g.current;
  return (g.powers[me] ?? []).includes("flexible") && !g.flexPassUsed[me];
}
