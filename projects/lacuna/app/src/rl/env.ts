// The RL environment: a thin, pure wrapper over the engine. Enumerates the legal candidate
// moves at a decision point and runs a full game with pluggable agents. Generalises the
// headless `playout` in tests/sim so any Agent (random / heuristic / neural MCTS) can drive.

import { applyAction, finalize, legalMoves } from "../engine";
import type { GameState, PlayerId, Star } from "../engine";
import { aiAbyss, aiDusk, aiFreePick, aiRepelPoint } from "../ai/ai";
import type { Agent, Candidate, GameOutcome } from "./types";

function byId(g: GameState, id: number): Star | undefined {
  return g.stars.find((s) => s.id === id);
}

// Point on the a–b segment farthest from every flower (avoids hit-area collisions) — the
// same heuristic the AI uses to pick a concrete drop point on a guide line.
export function safePoint(a: Star, b: Star, stars: Star[]): { x: number; y: number } {
  let bestT = 0.5;
  let bestD = -1;
  for (let t = 0.2; t <= 0.8 + 1e-9; t += 0.1) {
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

// Auto-resolve any powers/affinity sub-phase (dusk/abyss/repel/free-pick) with the existing
// heuristics so the agent only ever faces the core claim/place/pass decision. A no-op in the
// base game (no powers), where all RL training happens.
export function settle(g: GameState): GameState {
  let guard = 0;
  while (g.phase !== "ended" && guard++ < 64) {
    if (g.duskPending) g = applyAction(g, { type: "duskSteal", colorId: aiDusk(g) });
    else if (g.abyssPending) {
      const t = aiAbyss(g);
      g = applyAction(g, t === null ? { type: "abyssSkip" } : { type: "abyssVoid", starId: t });
    } else if (g.repelOrigin) {
      const p = aiRepelPoint(g);
      g = applyAction(g, { type: "repel", x: p.x, y: p.y });
    } else if (g.freePicks.length > 0) {
      g = applyAction(g, { type: "freePick", starId: aiFreePick(g) });
    } else break;
  }
  return g;
}

// The legal moves the player to move can choose from, as policy-aligned candidates.
export function legalCandidates(g: GameState): Candidate[] {
  if (g.phase === "setup") {
    return g.stars.map((s) => ({ action: { type: "claim", starId: s.id } as const, x: s.x, y: s.y, kind: "claim" as const }));
  }
  const moves = legalMoves(g);
  if (moves.length === 0) return [{ action: { type: "pass" }, x: 0, y: 0, kind: "pass" }];
  return moves.map((m) => {
    const a = byId(g, m.aStarId)!;
    const b = byId(g, m.bStarId)!;
    const pt = safePoint(a, b, g.stars);
    return {
      action: { type: "place" as const, aStarId: m.aStarId, bStarId: m.bStarId, x: pt.x, y: pt.y },
      x: pt.x,
      y: pt.y,
      kind: "place" as const,
    };
  });
}

// Step the environment, auto-settling any sub-phase that results.
export function step(g: GameState, c: Candidate): GameState {
  return settle(applyAction(g, c.action));
}

// Per-seat outcome of a finished game: win 1 / draw 0.5 / loss 0, plus the colour-win counts.
export function outcomeOf(g: GameState): GameOutcome {
  const players = g.config.players;
  // Ended states already carry colorWinners; otherwise project them.
  const winners = g.colorWinners ?? finalize(g).colorWinners ?? [];
  const colorsWon = new Array(players).fill(0);
  for (const w of winners) if (w !== null && w < players) colorsWon[w]++;
  const result = (g.result ?? "draw") as PlayerId | "draw";
  const values = new Array(players).fill(0).map((_, p) => (result === "draw" ? 0.5 : result === p ? 1 : 0));
  return { values, colorsWon, result, turns: g.log.length };
}

// Play one full game with the given per-seat agents; returns the finished state + outcome.
export function runGame(g0: GameState, agents: Agent[]): { final: GameState; outcome: GameOutcome } {
  let g = settle(g0);
  let guard = 0;
  while (g.phase !== "ended" && guard++ < 4000) {
    const cands = legalCandidates(g);
    let i = 0;
    if (!(cands.length === 1 && cands[0].kind === "pass")) {
      const agent = agents[g.current] ?? agents[0];
      i = agent.act(g, cands);
      if (i < 0 || i >= cands.length) i = 0;
    }
    g = step(g, cands[i]);
  }
  return { final: g, outcome: outcomeOf(g) };
}
