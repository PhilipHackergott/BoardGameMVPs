// Pure PUCT MCTS, generalised to N players (max^n backups), with the position evaluator
// INJECTED. It has no tfjs dependency, so the same search runs in Node (training/arena) and,
// later, in the browser — only the evaluator (a neural net forward pass, or anything else)
// differs. Values are absolute per-seat in [0,1]; each node selects to maximise the value of
// the player to move at that node.

import { legalCandidates, outcomeOf, step } from "./env";
import type { GameState } from "../engine";
import type { Candidate, Evaluator } from "./types";

interface Node {
  g: GameState;
  player: number;
  terminal: boolean;
  termValues: number[] | null;
  cands: Candidate[];
  P: number[];
  N: number[];
  W: number[][]; // per-child accumulated value vector (length = players)
  children: (Node | null)[];
  totalN: number;
  expanded: boolean;
}

function makeNode(g: GameState): Node {
  const terminal = g.phase === "ended";
  return {
    g,
    player: g.current,
    terminal,
    termValues: terminal ? outcomeOf(g).values : null,
    cands: terminal ? [] : legalCandidates(g),
    P: [],
    N: [],
    W: [],
    children: [],
    totalN: 0,
    expanded: false,
  };
}

function expand(node: Node, evaluator: Evaluator, players: number): number[] {
  const ev = evaluator(node.g, node.cands);
  node.P = ev.priors.slice();
  node.N = new Array(node.cands.length).fill(0);
  node.W = node.cands.map(() => new Array(players).fill(0));
  node.children = node.cands.map(() => null);
  node.expanded = true;
  return ev.values.slice(0, players);
}

function selectChild(node: Node, cPuct: number): number {
  const sqrtTot = Math.sqrt(node.totalN + 1);
  const p = node.player;
  let best = -Infinity;
  let bi = 0;
  for (let i = 0; i < node.cands.length; i++) {
    const q = node.N[i] > 0 ? node.W[i][p] / node.N[i] : 0;
    const u = cPuct * node.P[i] * (sqrtTot / (1 + node.N[i]));
    const s = q + u;
    if (s > best) {
      best = s;
      bi = i;
    }
  }
  return bi;
}

// ── Dirichlet noise (root exploration), via Marsaglia–Tsang gamma sampling ──────────────
function gamma1(alpha: number): number {
  // alpha >= 1 path is enough for our small symmetric alpha after the boost trick.
  if (alpha < 1) return gamma1(alpha + 1) * Math.pow(Math.random(), 1 / alpha);
  const d = alpha - 1 / 3;
  const c = 1 / Math.sqrt(9 * d);
  for (;;) {
    let x = 0;
    let v = 0;
    do {
      // standard normal via Box–Muller
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

export interface MctsOptions {
  sims: number;
  cPuct?: number;
  dirichletAlpha?: number; // root noise (self-play exploration); omit for evaluation
  dirichletFrac?: number;
}

export interface MctsResult {
  cands: Candidate[];
  visits: number[];
  rootValues: number[]; // absolute per-seat value estimate at the root
}

// Run the search from `root` and return the visit counts over the root's candidates.
export function runMcts(root: GameState, evaluator: Evaluator, opts: MctsOptions): MctsResult {
  const players = root.config.players;
  const cPuct = opts.cPuct ?? 1.5;
  const rootNode = makeNode(root);
  if (rootNode.terminal) return { cands: [], visits: [], rootValues: rootNode.termValues ?? [] };
  const rootValues = expand(rootNode, evaluator, players);
  if (opts.dirichletAlpha && opts.dirichletFrac && rootNode.cands.length > 1) {
    addDirichlet(rootNode.P, opts.dirichletAlpha, opts.dirichletFrac);
  }

  for (let s = 0; s < opts.sims; s++) {
    let node = rootNode;
    const path: [Node, number][] = [];
    let value: number[];
    for (;;) {
      if (node.terminal) {
        value = node.termValues!;
        break;
      }
      if (!node.expanded) {
        value = expand(node, evaluator, players);
        break;
      }
      const ci = selectChild(node, cPuct);
      path.push([node, ci]);
      if (node.children[ci] === null) node.children[ci] = makeNode(step(node.g, node.cands[ci]));
      node = node.children[ci]!;
    }
    for (const [n, ci] of path) {
      n.N[ci] += 1;
      n.totalN += 1;
      const w = n.W[ci];
      for (let p = 0; p < players; p++) w[p] += value[p];
    }
  }
  return { cands: rootNode.cands, visits: rootNode.N.slice(), rootValues };
}

// Pick a candidate index from visit counts. temperature 0 = argmax; >0 = sample ∝ N^(1/temp).
export function pickFromVisits(visits: number[], temperature: number): number {
  if (visits.length === 0) return 0;
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
