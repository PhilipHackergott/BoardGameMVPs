// Matchmaking groundwork. The live game stays on its existing heuristic AIs for now; this is
// the data-side plumbing a future "play a rated ladder" mode plugs into: pick an opponent
// checkpoint near a target Elo (optionally biased toward a desired play-style), and update the
// player's rating after a match. Pure — no I/O, no tfjs.

import { bcDistance } from "./behavior";
import { expectedScore, updateElo } from "./elo";
import type { CheckpointMeta, Registry } from "./checkpoint";

export const PLAYER_BASELINE = 1000;

export interface MatchPick {
  targetElo: number; // desired opponent strength
  band?: number; // acceptable +/- Elo window before falling back to nearest (default 150)
  style?: number[]; // optional desired BC vector to bias selection toward
  styleWeight?: number; // how strongly to weight style vs Elo proximity (default 0.5)
  exclude?: string[]; // checkpoint ids to avoid (e.g. recently played)
}

// Choose the checkpoint that best fits the request: nearest in Elo within the band, tie-broken
// (and optionally blended) by style similarity. Returns null if no candidates exist.
export function pickOpponent(reg: Registry, req: MatchPick): CheckpointMeta | null {
  const band = req.band ?? 150;
  const styleW = req.styleWeight ?? 0.5;
  const pool = reg.checkpoints.filter((c) => !(req.exclude ?? []).includes(c.id));
  if (pool.length === 0) return null;

  const cost = (c: CheckpointMeta): number => {
    const eloCost = Math.abs(c.elo - req.targetElo) / 400; // ~[0,1+] over a few hundred Elo
    const styleCost = req.style ? bcDistance(c.bc, req.style) : 0;
    return eloCost + styleW * styleCost;
  };

  const within = pool.filter((c) => Math.abs(c.elo - req.targetElo) <= band);
  const candidates = within.length > 0 ? within : pool;
  return candidates.reduce((best, c) => (cost(c) < cost(best) ? c : best));
}

// A spread of opponents across the ladder (e.g. to populate a "choose your match" screen):
// the nearest checkpoint to each of several Elo rungs around the player's rating.
export function ladderForPlayer(reg: Registry, playerElo: number, rungs = [-200, -100, 0, 100, 200]): CheckpointMeta[] {
  const out: CheckpointMeta[] = [];
  const seen = new Set<string>();
  for (const d of rungs) {
    const pick = pickOpponent(reg, { targetElo: playerElo + d, exclude: [...seen] });
    if (pick) {
      out.push(pick);
      seen.add(pick.id);
    }
  }
  return out;
}

// Update the player's rating after a game vs a rated checkpoint (score: 1 win / .5 draw / 0).
export function ratePlayerGame(playerElo: number, opponentElo: number, score: number, k = 32): number {
  return updateElo(playerElo, opponentElo, score, k)[0];
}

export { expectedScore };
