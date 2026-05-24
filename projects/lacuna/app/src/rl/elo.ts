// Elo / Bradley-Terry rating. Used to (a) rate trained checkpoints from an arena of games and
// (b) update a player's live rating after a match. Pure math, no I/O.

const SCALE = 400 / Math.LN10; // logistic scale so a 400-point gap ≈ 10:1 odds

export function expectedScore(ratingA: number, ratingB: number): number {
  return 1 / (1 + Math.exp(-(ratingA - ratingB) / SCALE));
}

// Standard incremental Elo update for a single game (scoreA in {1, 0.5, 0}).
export function updateElo(ratingA: number, ratingB: number, scoreA: number, k = 32): [number, number] {
  const e = expectedScore(ratingA, ratingB);
  const delta = k * (scoreA - e);
  return [ratingA + delta, ratingB - delta];
}

export interface PairResult {
  i: number;
  j: number;
  winsI: number;
  winsJ: number;
  draws: number;
}

// Fit ratings for `n` participants from aggregated pairwise results by Bradley-Terry MLE
// (gradient ascent on the log-likelihood). The mean rating is pinned to `anchorMean` (default
// 1000) to fix the otherwise-arbitrary scale offset.
export function fitElo(n: number, pairs: PairResult[], anchorMean = 1000, iters = 600, lr = 1.0): number[] {
  const r = new Array(n).fill(anchorMean);
  for (let it = 0; it < iters; it++) {
    const grad = new Array(n).fill(0);
    for (const p of pairs) {
      const games = p.winsI + p.winsJ + p.draws;
      if (games === 0) continue;
      const scoreI = p.winsI + 0.5 * p.draws;
      const expI = games * expectedScore(r[p.i], r[p.j]);
      const g = scoreI - expI; // dLL/dr_i (in score units); symmetric for j
      grad[p.i] += g;
      grad[p.j] -= g;
    }
    for (let k = 0; k < n; k++) r[k] += lr * grad[k];
    // Re-centre to pin the scale.
    const mean = r.reduce((a, b) => a + b, 0) / n;
    const shift = anchorMean - mean;
    for (let k = 0; k < n; k++) r[k] += shift;
  }
  return r.map((x) => Math.round(x));
}

// Rate a single agent against opponents of FIXED, known Elo (cheap periodic reports). `score`
// is the agent's win fraction vs that opponent over `games`. MLE on the one free rating.
export function rateVsFixed(
  opps: { elo: number; score: number; games: number }[],
  iters = 500,
  lr = 1.5,
): number {
  let r = 1000;
  const total = opps.reduce((a, o) => a + o.games, 0) || 1;
  for (let it = 0; it < iters; it++) {
    let grad = 0;
    for (const o of opps) grad += o.score * o.games - o.games * expectedScore(r, o.elo);
    r += (lr * grad) / total * 100;
  }
  return Math.round(r);
}
