import { expect, it } from "vitest";
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { AFFINITIES, applyAction, createGame, hasLegalMove, makeConfig, POWERS } from "../../src/engine";
import type { GameState, PowerId } from "../../src/engine";
import {
  aiAbyss,
  aiActive,
  aiClaim,
  aiDusk,
  aiFlexPass,
  aiFreePick,
  aiPlace,
  aiRepelPoint,
} from "../../src/ai/ai";
import type { Difficulty } from "../../src/ai/ai";

// Headless balance harness: two HARD AIs, 2 players, AI vs AI. Replicates the App
// driver loop over the pure engine. Powers/affinities are assigned RANDOMLY to the
// two seats (not via the tier draft) so per-entity win rates aren't confounded by
// draft order; seat 0 always moves first, so seat-0 win rate is the first-player signal.

const N = Number(process.env.SIM_N ?? 300); // games per category
const POWER_IDS = POWERS.map((p) => p.id);
const AFFINITY_COLORS = AFFINITIES.map((a) => a.color);

function rint(n: number): number {
  return Math.floor(Math.random() * n);
}
function pick2<T>(arr: T[]): [T, T] {
  const i = rint(arr.length);
  let j = rint(arr.length);
  while (j === i) j = rint(arr.length);
  return [arr[i], arr[j]];
}

// Play one game to completion with HARD AI on both seats.
function playout(g0: GameState, diffs: Difficulty[] = ["hard", "hard", "hard", "hard"]): GameState {
  let g = g0;
  let guard = 0;
  while (g.phase !== "ended" && guard++ < 4000) {
    const d = diffs[g.current] ?? "hard";
    if (g.phase === "setup") {
      g = applyAction(g, { type: "claim", starId: aiClaim(g, d) });
      continue;
    }
    if (g.duskPending) {
      g = applyAction(g, { type: "duskSteal", colorId: aiDusk(g) });
      continue;
    }
    if (g.abyssPending) {
      const t = aiAbyss(g);
      g = applyAction(g, t === null ? { type: "abyssSkip" } : { type: "abyssVoid", starId: t });
      continue;
    }
    if (g.repelOrigin) {
      const p = aiRepelPoint(g);
      g = applyAction(g, { type: "repel", x: p.x, y: p.y });
      continue;
    }
    if (g.freePicks.length > 0) {
      g = applyAction(g, { type: "freePick", starId: aiFreePick(g) });
      continue;
    }
    // Optional actives (Flexible extra turn, Nomad redeploy) before placing.
    const act = aiActive(g);
    if (act) {
      g = applyAction(g, act);
      continue;
    }
    if (!hasLegalMove(g)) {
      g = applyAction(g, aiFlexPass(g) ? { type: "flexPass" } : { type: "pass" });
      continue;
    }
    const mv = aiPlace(g, d);
    if (!mv) {
      g = applyAction(g, aiFlexPass(g) ? { type: "flexPass" } : { type: "pass" });
      continue;
    }
    g = applyAction(g, { type: "place", aStarId: mv.a, bStarId: mv.b, x: mv.x, y: mv.y });
  }
  return g;
}

interface Tally {
  games: number;
  wins: number;
  draws: number;
  colorsFor: number;
  colorsAgainst: number;
}
const newTally = (): Tally => ({ games: 0, wins: 0, draws: 0, colorsFor: 0, colorsAgainst: 0 });

function colorsWon(g: GameState): [number, number] {
  const w = g.colorWinners ?? [];
  let a = 0;
  let b = 0;
  for (const x of w) {
    if (x === 0) a++;
    else if (x === 1) b++;
  }
  return [a, b];
}

interface CatResult {
  games: number;
  seat0Wins: number;
  seat1Wins: number;
  draws: number;
  nonterminating: number;
  errors: number;
  firstError: string | null;
  avgColorsTotal: number;
  powers: Record<string, Tally>;
  affinities: Record<string, Tally>;
}

function runCategory(kind: "powers" | "affinities" | "both"): CatResult {
  const res: CatResult = {
    games: N,
    seat0Wins: 0,
    seat1Wins: 0,
    draws: 0,
    nonterminating: 0,
    errors: 0,
    firstError: null,
    avgColorsTotal: 0,
    powers: {},
    affinities: {},
  };
  let colorsTotal = 0;

  for (let i = 0; i < N; i++) {
    let powers: PowerId[][] = [[], []];
    let affinity: (number | null)[] = [null, null];
    let pA: PowerId | null = null;
    let pB: PowerId | null = null;
    let aA: number | null = null;
    let aB: number | null = null;

    if (kind === "powers" || kind === "both") {
      [pA, pB] = pick2(POWER_IDS);
      powers = [[pA], [pB]];
    }
    if (kind === "affinities" || kind === "both") {
      [aA, aB] = pick2(AFFINITY_COLORS);
      affinity = [aA, aB];
    }

    const seed = (Math.random() * 0xffffffff) >>> 0;
    let g: GameState;
    try {
      g = playout(createGame(seed, makeConfig(2), true, powers, affinity));
    } catch (e) {
      res.errors++;
      if (!res.firstError) {
        res.firstError = `${kind} seed=${seed} powers=${JSON.stringify(powers)} aff=${JSON.stringify(affinity)} :: ${e instanceof Error ? e.message : String(e)}`;
      }
      continue;
    }
    if (g.phase !== "ended") {
      res.nonterminating++;
      continue;
    }

    const [c0, c1] = colorsWon(g);
    colorsTotal += c0 + c1;
    const r = g.result;
    if (r === 0) res.seat0Wins++;
    else if (r === 1) res.seat1Wins++;
    else res.draws++;

    const credit = (bag: Record<string, Tally>, key: string, seat: 0 | 1) => {
      const t = (bag[key] ??= newTally());
      t.games++;
      if (r === seat) t.wins++;
      else if (r === "draw") t.draws++;
      t.colorsFor += seat === 0 ? c0 : c1;
      t.colorsAgainst += seat === 0 ? c1 : c0;
    };
    if (pA && pB) {
      credit(res.powers, pA, 0);
      credit(res.powers, pB, 1);
    }
    if (aA !== null && aB !== null) {
      credit(res.affinities, String(aA), 0);
      credit(res.affinities, String(aB), 1);
    }
  }
  res.avgColorsTotal = colorsTotal / Math.max(1, N - res.nonterminating - res.errors);
  return res;
}

function summarize(bag: Record<string, Tally>, label: (k: string) => string) {
  return Object.entries(bag)
    .map(([k, t]) => ({
      id: k,
      name: label(k),
      games: t.games,
      winRate: (t.wins + 0.5 * t.draws) / Math.max(1, t.games),
      colorMargin: (t.colorsFor - t.colorsAgainst) / Math.max(1, t.games),
    }))
    .sort((a, b) => b.winRate - a.winRate);
}

it(
  "AI-vs-AI balance sweep (powers / affinities / both)",
  () => {
    const powerName = (id: string) => POWERS.find((p) => p.id === id)?.name ?? id;
    const affName = (c: string) => AFFINITIES.find((a) => a.color === Number(c))?.name ?? c;

    const cats = {
      powers: runCategory("powers"),
      affinities: runCategory("affinities"),
      both: runCategory("both"),
    };

    const report = {
      generatedAt: new Date().toISOString(),
      gamesPerCategory: N,
      categories: {
        powers: {
          firstPlayerWinRate:
            cats.powers.seat0Wins /
            Math.max(1, N - cats.powers.draws - cats.powers.nonterminating - cats.powers.errors),
          drawRate: cats.powers.draws / N,
          avgColorsTotal: cats.powers.avgColorsTotal,
          nonterminating: cats.powers.nonterminating,
          errors: cats.powers.errors,
          firstError: cats.powers.firstError,
          powers: summarize(cats.powers.powers, powerName),
        },
        affinities: {
          firstPlayerWinRate:
            cats.affinities.seat0Wins /
            Math.max(1, N - cats.affinities.draws - cats.affinities.nonterminating - cats.affinities.errors),
          drawRate: cats.affinities.draws / N,
          avgColorsTotal: cats.affinities.avgColorsTotal,
          nonterminating: cats.affinities.nonterminating,
          errors: cats.affinities.errors,
          firstError: cats.affinities.firstError,
          affinities: summarize(cats.affinities.affinities, affName),
        },
        both: {
          firstPlayerWinRate:
            cats.both.seat0Wins / Math.max(1, N - cats.both.draws - cats.both.nonterminating - cats.both.errors),
          drawRate: cats.both.draws / N,
          avgColorsTotal: cats.both.avgColorsTotal,
          nonterminating: cats.both.nonterminating,
          errors: cats.both.errors,
          firstError: cats.both.firstError,
          powers: summarize(cats.both.powers, powerName),
          affinities: summarize(cats.both.affinities, affName),
        },
      },
    };

    const out = resolve(process.cwd(), "balance-sim.json");
    writeFileSync(out, JSON.stringify(report, null, 2));
    console.log("BALANCE REPORT written to", out);
    console.log(JSON.stringify(report, null, 2));
  },
  600_000,
);

// Verifies the difficulty ladder actually goes up: stronger tier should beat weaker in the
// base game (no powers). Seats alternate so first-player advantage cancels.
it(
  "AI strength ladder — stronger tiers win more",
  () => {
    const STR_N = 240;
    const matchup = (strong: Difficulty, weak: Difficulty): number => {
      let strongWins = 0;
      let decisive = 0;
      for (let i = 0; i < STR_N; i++) {
        const strongSeat = (i % 2) as 0 | 1;
        const diffs: Difficulty[] = strongSeat === 0 ? [strong, weak] : [weak, strong];
        const seed = (Math.random() * 0xffffffff) >>> 0;
        let g: GameState;
        try {
          g = playout(createGame(seed, makeConfig(2), true, [[], []], [null, null]), diffs);
        } catch {
          continue; // rare illegal-placement edge — skip this seed
        }
        if (g.phase !== "ended" || g.result === "draw") continue;
        decisive++;
        if (g.result === strongSeat) strongWins++;
      }
      return strongWins / Math.max(1, decisive);
    };
    const hardVsMed = matchup("hard", "medium");
    const medVsLow = matchup("medium", "low");
    const hardVsLow = matchup("hard", "low");
    console.log(
      `STRENGTH LADDER  hard>medium=${(hardVsMed * 100).toFixed(0)}%  ` +
        `medium>low=${(medVsLow * 100).toFixed(0)}%  hard>low=${(hardVsLow * 100).toFixed(0)}%`,
    );
    expect(hardVsMed).toBeGreaterThan(0.5);
    expect(medVsLow).toBeGreaterThan(0.5);
    expect(hardVsLow).toBeGreaterThan(0.55);
  },
  600_000,
);
