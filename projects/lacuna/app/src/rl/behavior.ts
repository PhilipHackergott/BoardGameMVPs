// Behavioral-characteristic (BC) metrics — the foundation for stylistic VARIETY, not just
// strength. Each finished game yields a per-player style fingerprint; the trainer averages
// these over an agent's games. A MAP-Elites-style archive (see checkpoint.ts / the trainer)
// then keeps the best agent per (style-cell x strength-band), so distinct "characters" emerge
// organically from population self-play rather than being hand-scripted.

import type { GameState, PlayerId } from "../engine";

export const BC_LABELS = ["aggression", "centrality", "hoarding", "territory", "spread"] as const;
export const BC_SIZE = BC_LABELS.length;

const clamp01 = (x: number): number => (x < 0 ? 0 : x > 1 ? 1 : x);

// A per-player style vector in [0,1]^BC_SIZE for one finished game:
//  • aggression  — share of my pawns placed to contest a rival (within 1/3 field of one)
//  • centrality  — how much I fight for the contested centre vs the rim
//  • hoarding    — colour concentration (Herfindahl) of my final haul: specialist vs generalist
//  • territory   — share of my flowers won at nightfall (area play) vs grabbed during placement
//  • spread      — how spread out (vs clustered) my pawns are across the field
export function behaviorMetrics(g: GameState, player: PlayerId): number[] {
  const R = g.config.fieldR;
  const mine = g.beacons.filter((b) => b.owner === player && !b.phantom);
  const rivals = g.beacons.filter((b) => b.owner !== player && !b.phantom);

  const contest = R * 0.33;
  let near = 0;
  for (const m of mine) {
    let nd = Infinity;
    for (const r of rivals) nd = Math.min(nd, Math.hypot(m.x - r.x, m.y - r.y));
    if (nd < contest) near++;
  }
  const aggression = mine.length ? near / mine.length : 0;

  let cen = 0;
  for (const m of mine) cen += Math.hypot(m.x, m.y) / R;
  const centrality = clamp01(1 - (mine.length ? cen / mine.length : 1));

  const fbc = g.finalByColor?.[player] ?? g.collected[player];
  const finalTot = fbc.reduce((a, n) => a + n, 0);
  const colors = g.config.colors;
  let herf = 0;
  if (finalTot > 0) for (const n of fbc) herf += (n / finalTot) * (n / finalTot);
  const hoarding = colors > 1 ? clamp01((herf - 1 / colors) / (1 - 1 / colors)) : 0;

  const collectedTot = g.collected[player].reduce((a, n) => a + n, 0);
  const territory = finalTot > 0 ? clamp01((finalTot - collectedTot) / finalTot) : 0;

  let sp = 0;
  let pairs = 0;
  for (let i = 0; i < mine.length; i++)
    for (let j = i + 1; j < mine.length; j++) {
      sp += Math.hypot(mine[i].x - mine[j].x, mine[i].y - mine[j].y);
      pairs++;
    }
  const spread = pairs > 0 ? clamp01(sp / pairs / (2 * R)) : 0;

  return [aggression, centrality, hoarding, territory, spread];
}

// Euclidean distance between two style vectors (for novelty / archive cells / matchmaking).
export function bcDistance(a: number[], b: number[]): number {
  let s = 0;
  for (let i = 0; i < Math.min(a.length, b.length); i++) s += (a[i] - b[i]) * (a[i] - b[i]);
  return Math.sqrt(s);
}

// Discretise a style vector into an archive cell key (MAP-Elites grid), `bins` per axis.
export function bcCell(bc: number[], bins = 3): string {
  return bc.map((v) => Math.min(bins - 1, Math.max(0, Math.floor(v * bins)))).join("-");
}
