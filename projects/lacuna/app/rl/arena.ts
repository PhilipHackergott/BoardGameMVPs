// Round-robin Elo arena. Rates any set of agents (neural checkpoints, the heuristic ladder,
// random) via 2-player head-to-head games with alternating seats, then fits Bradley-Terry Elo.
// Elo is derived from 2-player play (cleanest); multi-count training still happens separately.

import { createGame, makeConfig } from "../src/engine";
import { runGame } from "../src/rl/env";
import { fitElo } from "../src/rl/elo";
import type { PairResult } from "../src/rl/elo";
import type { Agent } from "../src/rl/types";

export interface ArenaParticipant {
  name: string;
  agent: Agent;
}

export interface ArenaResult {
  names: string[];
  ratings: number[];
  pairs: PairResult[];
  record: { name: string; w: number; l: number; d: number }[];
}

export function runArena(parts: ArenaParticipant[], gamesPerPair: number): ArenaResult {
  const n = parts.length;
  const pairs: PairResult[] = [];
  const rec = parts.map((p) => ({ name: p.name, w: 0, l: 0, d: 0 }));
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      let wi = 0;
      let wj = 0;
      let dr = 0;
      for (let g = 0; g < gamesPerPair; g++) {
        const iSeat = (g % 2) as 0 | 1;
        const agents = iSeat === 0 ? [parts[i].agent, parts[j].agent] : [parts[j].agent, parts[i].agent];
        const seed = (Math.random() * 0xffffffff) >>> 0;
        let result: 0 | 1 | "draw";
        try {
          result = runGame(createGame(seed, makeConfig(2), true, [[], []], [null, null]), agents).outcome.result as
            | 0
            | 1
            | "draw";
        } catch {
          continue;
        }
        if (result === "draw") {
          dr++;
          rec[i].d++;
          rec[j].d++;
        } else if (result === iSeat) {
          wi++;
          rec[i].w++;
          rec[j].l++;
        } else {
          wj++;
          rec[j].w++;
          rec[i].l++;
        }
      }
      pairs.push({ i, j, winsI: wi, winsJ: wj, draws: dr });
    }
  }
  return { names: parts.map((p) => p.name), ratings: fitElo(n, pairs), pairs, record: rec };
}

// Quick head-to-head win rate of A vs B over `games` (alternating seats). A clean, low-variance
// proof-of-learning signal independent of the full arena fit.
export function headToHead(a: Agent, b: Agent, games: number): number {
  let aScore = 0;
  let decided = 0;
  for (let g = 0; g < games; g++) {
    const aSeat = (g % 2) as 0 | 1;
    const agents = aSeat === 0 ? [a, b] : [b, a];
    const seed = (Math.random() * 0xffffffff) >>> 0;
    let res: 0 | 1 | "draw";
    try {
      res = runGame(createGame(seed, makeConfig(2), true, [[], []], [null, null]), agents).outcome.result as
        | 0
        | 1
        | "draw";
    } catch {
      continue;
    }
    decided++;
    if (res === "draw") aScore += 0.5;
    else if (res === aSeat) aScore += 1;
  }
  return decided > 0 ? aScore / decided : 0.5;
}
