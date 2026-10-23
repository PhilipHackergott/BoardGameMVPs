// Determinized UCT (a.k.a. Perfect-Information Monte Carlo) for PRISM — the "genuinely deeper play"
// path beyond the greedy+eval AI. Two ideas:
//
//  1. DETERMINIZATION (handles hidden info + makes the AI HONEST). The engine state holds both players'
//     hands/decks, but the AI must not peek. Before searching we sample a plausible world: shuffle our
//     own deck (we don't know our draw order) and reshuffle the opponent's hand+deck together and
//     re-split (we don't know their hand). We search several such determinizations and average — so the
//     chosen move is robust to what the opponent actually holds. (The old 1-ply lookahead simulated the
//     opponent's turn from their REAL hand — a mild cheat this removes.)
//
//  2. UCT WITH EVAL LEAVES (no greedy rollout). A 2-turn *greedy* rollout regressed the skill ladder
//     (biased rollout policy). So instead of rolling out, UCT explores the real action tree and scores
//     leaves with the keyword-aware evaluate(). Exploration + averaging — not a single greedy line — is
//     what makes this stronger. Minimax-flavoured: values are always from the root player's view; at the
//     opponent's nodes UCT minimises that value.
//
// Pure + deterministic (seeded rng). In-browser friendly (bounded iterations). The pure engine makes
// this — and a future learned value/policy net (RL) — tractable; this is the in-between step.

import { Action, Duel } from "../engine/prism/types";
import { legalMoves } from "../engine/prism/legalMoves";
import { reduce, cloneDuel } from "../engine/prism/reduce";
import { evaluate, Persona } from "../engine/prism/evaluate";
import { shuffle } from "../engine/prism/rng";

const other = (s: 0 | 1): 0 | 1 => (s === 0 ? 1 : 0);
const C = 1.4; // UCB exploration constant

/** Squash a raw eval into [-1, 1] so UCB values are comparable; terminals are ±1. */
function leafValue(d: Duel, me: 0 | 1, persona: Persona): number {
  if (d.winner != null) return d.winner === me ? 1 : -1;
  return Math.tanh(evaluate(d, me, persona) / 40);
}

/** Sample a plausible fully-observable world: hide our draw order + the opponent's hand contents. */
function determinize(duel: Duel, me: 0 | 1, seed: number): Duel {
  const d = cloneDuel(duel);
  const opp = other(me);
  let s = seed >>> 0;
  const mine = shuffle(d.players[me].deck, s); d.players[me].deck = mine.arr; s = mine.state;
  const pool = [...d.players[opp].hand, ...d.players[opp].deck];
  const sh = shuffle(pool, s); s = sh.state;
  const handSize = d.players[opp].hand.length;
  d.players[opp].hand = sh.arr.slice(0, handSize);
  d.players[opp].deck = sh.arr.slice(handSize);
  return d;
}

interface Node {
  duel: Duel;
  toMove: 0 | 1;
  untried: Action[];
  kids: { key: string; action: Action; node: Node }[];
  visits: number;
  total: number; // sum of leaf values, ALWAYS from the root player's perspective
  terminal: boolean;
}

function makeNode(duel: Duel): Node {
  const terminal = duel.phase === "over";
  return { duel, toMove: duel.active, untried: terminal ? [] : legalMoves(duel), kids: [], visits: 0, total: 0, terminal };
}

/** One UCT search on a fully-observable (determinized) duel. Returns root child stats keyed by action. */
function uct(root: Duel, me: 0 | 1, persona: Persona, iterations: number, rng: () => number): Map<string, { visits: number; mean: number; action: Action }> {
  const rootNode = makeNode(root);
  for (let it = 0; it < iterations; it++) {
    const path: Node[] = [rootNode];
    let node = rootNode;
    // SELECT
    while (!node.terminal && node.untried.length === 0 && node.kids.length > 0) {
      const sign = node.toMove === me ? 1 : -1; // each player maximises THEIR interest
      let best = node.kids[0];
      let bestU = -Infinity;
      for (const k of node.kids) {
        const mean = k.node.total / k.node.visits; // root-perspective
        const u = sign * mean + C * Math.sqrt(Math.log(node.visits + 1) / k.node.visits);
        if (u > bestU) { bestU = u; best = k; }
      }
      node = best.node;
      path.push(node);
    }
    // EXPAND
    if (!node.terminal && node.untried.length > 0) {
      const idx = Math.floor(rng() * node.untried.length);
      const action = node.untried.splice(idx, 1)[0];
      const child = makeNode(reduce(node.duel, action));
      node.kids.push({ key: JSON.stringify(action), action, node: child });
      node = child;
      path.push(node);
    }
    // EVALUATE leaf (no rollout — keyword-aware eval) + BACKPROP (root perspective everywhere)
    const v = leafValue(node.duel, me, persona);
    for (const n of path) { n.visits++; n.total += v; }
  }
  const stats = new Map<string, { visits: number; mean: number; action: Action }>();
  for (const k of rootNode.kids) stats.set(k.key, { visits: k.node.visits, mean: k.node.total / k.node.visits, action: k.action });
  return stats;
}

export interface MctsOpts {
  determinizations: number;
  iterations: number; // per determinization
  rng: () => number;
  persona: Persona;
}

/** Choose a root action by averaging UCT results across several determinizations (PIMC). */
export function mctsChoose(duel: Duel, opts: MctsOpts): Action {
  const me = duel.active;
  const moves = legalMoves(duel);
  if (moves.length <= 1) return moves[0] ?? { type: "endTurn" };

  const agg = new Map<string, { score: number; visits: number; action: Action }>();
  for (let dz = 0; dz < opts.determinizations; dz++) {
    const det = determinize(duel, me, Math.floor(opts.rng() * 0x7fffffff));
    const stats = uct(det, me, opts.persona, opts.iterations, opts.rng);
    for (const [key, st] of stats) {
      const a = agg.get(key) ?? { score: 0, visits: 0, action: st.action };
      a.score += st.mean;
      a.visits += st.visits;
      agg.set(key, a);
    }
  }
  // Pick the action with the best mean value across determinizations (robust to the hidden hand).
  let best: { score: number; visits: number; action: Action } | null = null;
  for (const a of agg.values()) {
    const mean = a.score / opts.determinizations;
    if (!best || mean > best.score / opts.determinizations) best = a;
  }
  return best ? best.action : moves[0];
}
