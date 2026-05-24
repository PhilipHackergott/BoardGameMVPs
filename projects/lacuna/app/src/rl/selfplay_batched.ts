// Batched self-play — PURE and browser-safe (no tfjs). The throughput multiplier: run many
// games concurrently and step their MCTS searches in lockstep, so every simulation round
// collects one leaf from each live game and scores them all in ONE batched forward pass (via
// the injected `BatchEvaluator`). With G concurrent games and S sims that's S batched passes
// (size ≈ G) to make G moves, vs G·S size-1 passes naively — a 50-100× cut in NN calls.
// Node (tfjs) and the browser (tfjs-webgpu) both drive this with their own BatchEvaluator.

import { createGame, makeConfig } from "../engine";
import type { GameState } from "../engine";
import { POLICY_SIZE, candidatePolicyIndex, encodeState } from "./features";
import { legalCandidates, outcomeOf, settle, step } from "./env";
import { BC_SIZE, behaviorMetrics } from "./behavior";
import { MAX_PLAYERS } from "./types";
import type { BatchEvaluator, Candidate, Evaluation, SelfPlaySample } from "./types";

interface BNode {
  g: GameState;
  player: number;
  terminal: boolean;
  termValues: number[] | null;
  cands: Candidate[];
  expanded: boolean;
  P: number[];
  N: number[];
  W: number[][];
  children: (BNode | null)[];
  totalN: number;
}

function bMake(g: GameState): BNode {
  const terminal = g.phase === "ended";
  return {
    g,
    player: g.current,
    terminal,
    termValues: terminal ? outcomeOf(g).values : null,
    cands: terminal ? [] : legalCandidates(g),
    expanded: false,
    P: [],
    N: [],
    W: [],
    children: [],
    totalN: 0,
  };
}

function selectChild(n: BNode, cPuct: number): number {
  const sqrtTot = Math.sqrt(n.totalN + 1);
  const p = n.player;
  let best = -Infinity;
  let bi = 0;
  for (let i = 0; i < n.cands.length; i++) {
    const q = n.N[i] > 0 ? n.W[i][p] / n.N[i] : 0;
    const u = cPuct * n.P[i] * (sqrtTot / (1 + n.N[i]));
    if (q + u > best) {
      best = q + u;
      bi = i;
    }
  }
  return bi;
}

function gamma1(a: number): number {
  if (a < 1) return gamma1(a + 1) * Math.pow(Math.random() || 1e-12, 1 / a);
  const d = a - 1 / 3;
  const c = 1 / Math.sqrt(9 * d);
  for (;;) {
    let x = 0;
    let v = 0;
    do {
      const u1 = Math.random() || 1e-12;
      const u2 = Math.random();
      x = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
      v = 1 + c * x;
    } while (v <= 0);
    v = v * v * v;
    const u = Math.random();
    if (u < 1 - 0.0331 * x * x * x * x) return d * v;
    if (Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) return d * v;
  }
}
function addDirichlet(P: number[], alpha: number, frac: number): void {
  const noise = P.map(() => gamma1(alpha));
  const sum = noise.reduce((a, b) => a + b, 0) || 1;
  for (let i = 0; i < P.length; i++) P[i] = (1 - frac) * P[i] + frac * (noise[i] / sum);
}

function sampleVisits(visits: number[], temperature: number): number {
  if (temperature <= 1e-6) {
    let bi = 0;
    for (let i = 1; i < visits.length; i++) if (visits[i] > visits[bi]) bi = i;
    return bi;
  }
  const w = visits.map((v) => Math.pow(v, 1 / temperature));
  const sum = w.reduce((a, b) => a + b, 0) || 1;
  let r = Math.random() * sum;
  for (let i = 0; i < w.length; i++) {
    r -= w[i];
    if (r <= 0) return i;
  }
  return w.length - 1;
}

class Searcher {
  root: BNode;
  players: number;
  ply = 0;
  samples: SelfPlaySample[] = [];
  private path: [BNode, number][] = [];
  constructor(g0: GameState) {
    this.root = bMake(settle(g0));
    this.players = g0.config.players;
  }
  descend(cPuct: number): { terminalValue: number[] } | { node: BNode } {
    let node = this.root;
    const path: [BNode, number][] = [];
    for (;;) {
      if (node.terminal) {
        this.path = path;
        return { terminalValue: node.termValues! };
      }
      if (!node.expanded) {
        this.path = path;
        return { node };
      }
      const ci = selectChild(node, cPuct);
      path.push([node, ci]);
      if (node.children[ci] === null) node.children[ci] = bMake(step(node.g, node.cands[ci]));
      node = node.children[ci]!;
    }
  }
  expandNode(node: BNode, ev: Evaluation): number[] {
    node.P = ev.priors.slice();
    node.N = new Array(node.cands.length).fill(0);
    node.W = node.cands.map(() => new Array(this.players).fill(0));
    node.children = node.cands.map(() => null);
    node.expanded = true;
    return ev.values.slice(0, this.players);
  }
  backup(value: number[]): void {
    for (const [n, ci] of this.path) {
      n.N[ci] += 1;
      n.totalN += 1;
      const w = n.W[ci];
      for (let p = 0; p < this.players; p++) w[p] += value[p];
    }
  }
  commitMove(tempMoves: number, modelIndex: number): void {
    if (this.root.expanded && this.root.cands.length > 1) {
      const fieldR = this.root.g.config.fieldR;
      const policy = new Float32Array(POLICY_SIZE);
      let tot = 0;
      for (let i = 0; i < this.root.cands.length; i++) {
        policy[candidatePolicyIndex(this.root.cands[i].kind, this.root.cands[i].x, this.root.cands[i].y, fieldR)] +=
          this.root.N[i];
        tot += this.root.N[i];
      }
      if (tot > 0) for (let k = 0; k < policy.length; k++) policy[k] /= tot;
      const feats = encodeState(this.root.g, this.root.g.current);
      this.samples.push({
        grid: feats.grid,
        scalars: feats.scalars,
        policy,
        players: this.players,
        current: this.root.g.current,
        valueRel: new Float32Array(MAX_PLAYERS),
        model: modelIndex,
      });
      const temp = this.ply < tempMoves ? 1.0 : 0.2;
      this.root = bMake(step(this.root.g, this.root.cands[sampleVisits(this.root.N, temp)]));
    } else {
      this.root = bMake(step(this.root.g, this.root.cands[0]));
    }
    this.ply++;
  }
  finalize(): void {
    const oc = outcomeOf(this.root.g);
    for (const s of this.samples) {
      for (let k = 0; k < this.players; k++) s.valueRel[k] = oc.values[(s.current + k) % this.players];
      for (let k = this.players; k < MAX_PLAYERS; k++) s.valueRel[k] = 0.5;
    }
  }
}

export interface BatchSelfPlayOpts {
  evaluate: BatchEvaluator; // backend-specific: scores a batch of positions in one pass
  modelIndex: number;
  players: number;
  concurrent: number; // G games in flight = the NN batch size
  sims: number;
  targetGames: number;
  cPuct?: number;
  dirichletAlpha?: number;
  dirichletFrac?: number;
  tempMoves?: number;
  seedBase: number;
}

const emptyPowers = (n: number): never[][] => Array.from({ length: n }, () => []);
const nullAff = (n: number): null[] => Array.from({ length: n }, () => null);

export async function runBatchedSelfPlay(opts: BatchSelfPlayOpts): Promise<{
  samples: SelfPlaySample[];
  games: number;
  bcSum: number[];
  bcCount: number;
}> {
  const cPuct = opts.cPuct ?? 1.5;
  const samples: SelfPlaySample[] = [];
  const bcSum = new Array(BC_SIZE).fill(0);
  let bcCount = 0;
  let started = 0;
  let finished = 0;
  let seed = opts.seedBase >>> 0;
  const fresh = (): Searcher =>
    new Searcher(createGame(seed++ >>> 0, makeConfig(opts.players), true, emptyPowers(opts.players), nullAff(opts.players)));

  let live: Searcher[] = [];
  for (let i = 0; i < opts.concurrent && started < opts.targetGames; i++) {
    live.push(fresh());
    started++;
  }

  while (live.length > 0) {
    const active = live.filter((s) => !s.root.terminal && s.root.cands.length > 1);

    const rootsToExpand = active.filter((s) => !s.root.expanded);
    if (rootsToExpand.length > 0) {
      const evals = await opts.evaluate(rootsToExpand.map((s) => ({ g: s.root.g, cands: s.root.cands })));
      rootsToExpand.forEach((s, i) => {
        s.expandNode(s.root, evals[i]);
        if (opts.dirichletAlpha && opts.dirichletFrac && s.root.cands.length > 1)
          addDirichlet(s.root.P, opts.dirichletAlpha, opts.dirichletFrac);
      });
    }

    for (let sround = 0; sround < opts.sims; sround++) {
      const need: { s: Searcher; node: BNode }[] = [];
      for (const s of active) {
        const r = s.descend(cPuct);
        if ("terminalValue" in r) s.backup(r.terminalValue);
        else need.push({ s, node: r.node });
      }
      if (need.length > 0) {
        const evals = await opts.evaluate(need.map((n) => ({ g: n.node.g, cands: n.node.cands })));
        need.forEach((n, i) => n.s.backup(n.s.expandNode(n.node, evals[i])));
      }
    }

    const next: Searcher[] = [];
    for (const s of live) {
      s.commitMove(opts.tempMoves ?? 6, opts.modelIndex);
      if (s.root.terminal) {
        s.finalize();
        for (const smp of s.samples) samples.push(smp);
        for (let seat = 0; seat < opts.players; seat++) {
          const bc = behaviorMetrics(s.root.g, seat);
          for (let k = 0; k < BC_SIZE; k++) bcSum[k] += bc[k];
          bcCount++;
        }
        finished++;
        if (started < opts.targetGames) {
          next.push(fresh());
          started++;
        }
      } else {
        next.push(s);
      }
    }
    live = next;
  }
  return { samples, games: finished, bcSum, bcCount };
}
