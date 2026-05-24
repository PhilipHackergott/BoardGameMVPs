// State -> tensor features. Browser-safe (no tfjs): produces plain Float32Arrays the network
// layer turns into tensors. The board is rasterised to a GRID x GRID map; play is perspective
// -relative (the player to move is always "me") so the same weights serve every seat.

import { beaconsLeft } from "../engine";
import type { GameState, PlayerId } from "../engine";
import { MAX_PLAYERS } from "./types";
import type { Candidate, Evaluation } from "./types";

export const GRID = 24; // board raster resolution (cell ~ 25 engine units across a 600-wide field)
export const CHANNELS = 9; // 7 star-colour planes + my beacons + rival beacons
export const NN = GRID * GRID;
export const POLICY_SIZE = NN + 1; // one logit per cell + a single "pass / other" logit
export const OTHER_INDEX = NN;

const COLLECT_SCALE = 8; // rough cap for per-colour collected counts (normalisation)

// Map an origin-centred board coord to a grid cell index (row-major), clamped to the field.
export function cellIndex(x: number, y: number, fieldR: number): number {
  const u = (x + fieldR) / (2 * fieldR);
  const v = (y + fieldR) / (2 * fieldR);
  const c = Math.min(GRID - 1, Math.max(0, Math.floor(u * GRID)));
  const r = Math.min(GRID - 1, Math.max(0, Math.floor(v * GRID)));
  return r * GRID + c;
}

// Where a candidate lands in the policy head: its grid cell, or the shared "other" logit.
export function candidatePolicyIndex(
  kind: "claim" | "place" | "pass" | "other",
  x: number,
  y: number,
  fieldR: number,
): number {
  if (kind === "pass" || kind === "other") return OTHER_INDEX;
  return cellIndex(x, y, fieldR);
}

export interface Features {
  grid: Float32Array; // CHANNELS * NN, channel-major
  scalars: Float32Array;
}

export const SCALAR_SIZE = 7 /*mine*/ + 7 /*rival max*/ + 1 /*beacons left*/ + 1 /*progress*/ + 1 /*setup*/ + 3 /*players one-hot*/;

export function encodeState(g: GameState, perspective: PlayerId): Features {
  const fieldR = g.config.fieldR;
  const grid = new Float32Array(CHANNELS * NN);
  for (const s of g.stars) {
    const idx = cellIndex(s.x, s.y, fieldR);
    const ch = Math.min(6, s.color); // 7 colour planes
    grid[ch * NN + idx] += 1;
  }
  for (const b of g.beacons) {
    if (b.phantom) continue;
    const idx = cellIndex(b.x, b.y, fieldR);
    const ch = b.owner === perspective ? 7 : 8;
    grid[ch * NN + idx] += 1;
  }

  const players = g.config.players;
  const colors = g.config.colors;
  const scalars = new Float32Array(SCALAR_SIZE);
  let k = 0;
  for (let c = 0; c < 7; c++) {
    scalars[k++] = c < colors ? (g.collected[perspective]?.[c] ?? 0) / COLLECT_SCALE : 0;
  }
  for (let c = 0; c < 7; c++) {
    let mx = 0;
    if (c < colors) for (let p = 0; p < players; p++) if (p !== perspective) mx = Math.max(mx, g.collected[p][c]);
    scalars[k++] = mx / COLLECT_SCALE;
  }
  const totalBeacons = g.config.beaconsPerPlayer + (g.bonusBeacons[perspective] ?? 0);
  scalars[k++] = beaconsLeft(g, perspective) / Math.max(1, totalBeacons);
  scalars[k++] = g.order.length > 0 ? g.turnIndex / g.order.length : 0;
  scalars[k++] = g.phase === "setup" ? 1 : 0;
  scalars[k++] = players === 2 ? 1 : 0;
  scalars[k++] = players === 3 ? 1 : 0;
  scalars[k++] = players === 4 ? 1 : 0;
  return { grid, scalars };
}

// Turn a single network output (policy row over the policy map + perspective-relative value
// row) into an Evaluation: a prior over the legal candidates + an ABSOLUTE per-seat value
// vector. Shared by every backend (Node tfjs / browser tfjs-webgpu) so the conversion is
// identical everywhere.
export function evaluationFor(
  g: GameState,
  cands: Candidate[],
  policyRow: ArrayLike<number>,
  valueRow: ArrayLike<number>,
): Evaluation {
  const fieldR = g.config.fieldR;
  const raw = cands.map((c) => policyRow[candidatePolicyIndex(c.kind, c.x, c.y, fieldR)] ?? 1e-9);
  const sum = raw.reduce((a, x) => a + x, 0) || 1;
  const priors = raw.map((v) => v / sum);
  const players = g.config.players;
  const values = new Array(MAX_PLAYERS).fill(0);
  for (let k = 0; k < players; k++) values[(g.current + k) % players] = valueRow[k];
  return { priors, values };
}
