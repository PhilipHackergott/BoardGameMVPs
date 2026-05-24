// The neural net (AlphaZero-lite, TensorFlow.js): a small conv trunk over the rasterised
// board + the scalar features, with a spatial POLICY head (a logit per grid cell + one "other"
// logit) and a per-seat VALUE head. Node-only (tfjs). The forward pass is exposed as a pure
// `Evaluator` so the browser-safe MCTS in src/rl can use it unchanged.
//
// NOTE: this file lives in the tsconfig-excluded `rl/` dir and runs through vitest/esbuild, so
// tfjs's loose layer typings are tolerated; runtime correctness is what matters.

import * as tf from "@tensorflow/tfjs";
import { createRequire } from "node:module";
import {
  CHANNELS,
  GRID,
  NN,
  POLICY_SIZE,
  SCALAR_SIZE,
  candidatePolicyIndex,
  encodeState,
  evaluationFor,
} from "../src/rl/features";
import type { Features } from "../src/rl/features";
import { MAX_PLAYERS } from "../src/rl/types";
import type { BatchEvaluator, Evaluator } from "../src/rl/types";
import type { ArchSpec, SerializedWeights } from "../src/rl/checkpoint";

// Select the compute backend. WASM (CPU SIMD + threads) is far faster than the pure-JS CPU
// backend and needs no native build. Falls back to plain cpu if WASM init fails. Set
// RL_BACKEND=cpu to force pure JS, RL_WASM_THREADS to tune the WASM thread pool.
export async function initBackend(): Promise<string> {
  const want = process.env.RL_BACKEND ?? "wasm";
  if (want === "wasm") {
    try {
      const wasm = await import("@tensorflow/tfjs-backend-wasm");
      const require = createRequire(import.meta.url);
      const path = require("node:path") as typeof import("node:path");
      const dir =
        (path.dirname(require.resolve("@tensorflow/tfjs-backend-wasm/package.json")) + "/dist/").replace(/\\/g, "/");
      wasm.setWasmPaths(dir);
      const threads = Number(process.env.RL_WASM_THREADS ?? 8);
      try {
        wasm.setThreadsCount(threads);
      } catch {
        /* threads unavailable — single-thread SIMD still works */
      }
      await tf.setBackend("wasm");
      await tf.ready();
      return `${tf.getBackend()} (threads≈${threads})`;
    } catch (e) {
      console.warn("WASM backend init failed, falling back to cpu:", (e as Error).message);
    }
  }
  await tf.setBackend(want === "cpu" ? "cpu" : "cpu");
  await tf.ready();
  return tf.getBackend();
}

export const DEFAULT_ARCH: ArchSpec = {
  grid: GRID,
  channels: CHANNELS,
  scalarSize: SCALAR_SIZE,
  policySize: POLICY_SIZE,
  maxPlayers: MAX_PLAYERS,
  hidden: Number(process.env.RL_HIDDEN ?? 512), // trunk width
  layers: Number(process.env.RL_LAYERS ?? 3), // trunk depth
  valueHidden: Number(process.env.RL_VALUE_HIDDEN ?? 128),
};

// A dense MLP (no conv → trains on WASM): flatten the board raster, fuse the scalar features,
// run a shared trunk of `layers` × `hidden` ReLU layers, then an AlphaZero-style policy head
// (softmax over the policy map) and a per-seat value head (sigmoid). Wide enough to have real
// capacity on a GRID×GRID board.
export function buildModel(arch: ArchSpec = DEFAULT_ARCH, lr = 2e-3): tf.LayersModel {
  const gridIn = tf.input({ shape: [arch.grid, arch.grid, arch.channels], name: "grid" });
  const scalarIn = tf.input({ shape: [arch.scalarSize], name: "scalars" });
  const flat: any = tf.layers.flatten().apply(gridIn);
  let h: any = tf.layers.concatenate().apply([flat, scalarIn]);
  for (let i = 0; i < arch.layers; i++) {
    h = tf.layers.dense({ units: arch.hidden, activation: "relu" }).apply(h);
  }
  const policy = tf.layers.dense({ units: arch.policySize, activation: "softmax", name: "policy" }).apply(h);
  let v: any = tf.layers.dense({ units: arch.valueHidden, activation: "relu" }).apply(h);
  const value = tf.layers.dense({ units: arch.maxPlayers, activation: "sigmoid", name: "value" }).apply(v);

  const model = tf.model({ inputs: [gridIn, scalarIn], outputs: [policy as any, value as any] });
  model.compile({
    optimizer: tf.train.adam(lr),
    loss: { policy: "categoricalCrossentropy", value: "meanSquaredError" },
    lossWeights: { policy: 1.0, value: 1.0 },
  });
  return model;
}

// Build the [B,H,W,C] grid tensor from per-sample channel-major (C,H,W) arrays + the scalars.
function inputTensors(feats: Features[]): [tf.Tensor4D, tf.Tensor2D] {
  const B = feats.length;
  const chw = new Float32Array(B * CHANNELS * NN);
  const sc = new Float32Array(B * SCALAR_SIZE);
  for (let b = 0; b < B; b++) {
    chw.set(feats[b].grid, b * CHANNELS * NN);
    sc.set(feats[b].scalars, b * SCALAR_SIZE);
  }
  const gridCHW = tf.tensor4d(chw, [B, CHANNELS, GRID, GRID]);
  const gridHWC = gridCHW.transpose([0, 2, 3, 1]) as tf.Tensor4D;
  gridCHW.dispose();
  const scalars = tf.tensor2d(sc, [B, SCALAR_SIZE]);
  return [gridHWC, scalars];
}

export interface BatchPrediction {
  policy: number[][]; // [B, POLICY_SIZE]
  value: number[][]; // [B, MAX_PLAYERS]
}

export function predictBatch(model: tf.LayersModel, feats: Features[]): BatchPrediction {
  return tf.tidy(() => {
    const [g, s] = inputTensors(feats);
    const out = model.predict([g, s]) as tf.Tensor[];
    return { policy: out[0].arraySync() as number[][], value: out[1].arraySync() as number[][] };
  });
}

// The pure Evaluator the MCTS / agents consume: encode the position from the player-to-move's
// perspective, run a single forward pass, turn the policy map into a prior over the legal
// candidates, and de-rotate the perspective-relative value vector back to absolute seats.
export function toEvaluator(model: tf.LayersModel): Evaluator {
  return (g, cands) => {
    const feats = encodeState(g, g.current);
    const pred = predictBatch(model, [feats]);
    const pol = pred.policy[0];
    const valRel = pred.value[0];
    const fieldR = g.config.fieldR;
    const raw = cands.map((c) => pol[candidatePolicyIndex(c.kind, c.x, c.y, fieldR)] ?? 1e-9);
    const sum = raw.reduce((a, b) => a + b, 0) || 1;
    const priors = raw.map((v) => v / sum);
    const players = g.config.players;
    const values = new Array(MAX_PLAYERS).fill(0);
    for (let k = 0; k < players; k++) values[(g.current + k) % players] = valRel[k];
    return { priors, values };
  };
}

// Conv ResNet — MUST mirror the browser trainer's buildConvModel EXACTLY (same layer-creation
// order → same getWeights/setWeights order) so a checkpoint trained in the browser loads here
// for arena rating. filters/blocks default to the values used by the WebGPU run (48 / 4).
export function buildConvModel(lr = 2e-3): tf.LayersModel {
  const F = Number(process.env.RL_FILTERS ?? 48);
  const blocks = Number(process.env.RL_BLOCKS ?? 4);
  const conv = (f: number, k: number, act?: "relu"): any =>
    tf.layers.conv2d({ filters: f, kernelSize: k, padding: "same", activation: act });
  const relu = (): any => tf.layers.activation({ activation: "relu" });
  const gridIn = tf.input({ shape: [GRID, GRID, CHANNELS] });
  const scalarIn = tf.input({ shape: [SCALAR_SIZE] });
  const sProj: any = tf.layers.dense({ units: 64, activation: "relu" }).apply(scalarIn);
  let x: any = conv(F, 3, "relu").apply(gridIn);
  for (let b = 0; b < blocks; b++) {
    const y1 = conv(F, 3, "relu").apply(x);
    const y2 = conv(F, 3).apply(y1);
    x = relu().apply(tf.layers.add().apply([x, y2]));
  }
  let p: any = relu().apply(conv(8, 1).apply(x));
  p = tf.layers.concatenate().apply([tf.layers.flatten().apply(p), sProj]);
  const policy = tf.layers.dense({ units: POLICY_SIZE, activation: "softmax", name: "policy" }).apply(p);
  let v: any = relu().apply(conv(4, 1).apply(x));
  v = tf.layers.concatenate().apply([tf.layers.flatten().apply(v), sProj]);
  v = tf.layers.dense({ units: 64, activation: "relu" }).apply(v);
  const value = tf.layers.dense({ units: MAX_PLAYERS, activation: "sigmoid", name: "value" }).apply(v);
  const model = tf.model({ inputs: [gridIn, scalarIn], outputs: [policy as any, value as any] });
  model.compile({ optimizer: tf.train.adam(lr), loss: { policy: "categoricalCrossentropy", value: "meanSquaredError" } });
  return model;
}

// A BATCH evaluator (for the batched self-play coordinator): score many positions in one
// forward pass. Backend-agnostic conversion via `evaluationFor`.
export function batchEvaluator(model: tf.LayersModel): BatchEvaluator {
  return (items) => {
    const feats = items.map((it) => encodeState(it.g, it.g.current));
    const pred = predictBatch(model, feats);
    return items.map((it, b) => evaluationFor(it.g, it.cands, pred.policy[b], pred.value[b]));
  };
}

export interface TrainSampleArrays {
  grid: Float32Array;
  scalars: Float32Array;
  policy: Float32Array; // POLICY_SIZE
  valueRel: Float32Array; // MAX_PLAYERS
}

// One supervised step on a batch (policy = cross-entropy to the search distribution, value =
// MSE to the perspective-relative outcomes). Returns the total loss.
export async function trainOnBatch(model: tf.LayersModel, batch: TrainSampleArrays[]): Promise<number> {
  const feats: Features[] = batch.map((b) => ({ grid: b.grid, scalars: b.scalars }));
  const [g, s] = inputTensors(feats);
  const B = batch.length;
  const polData = new Float32Array(B * POLICY_SIZE);
  const valData = new Float32Array(B * MAX_PLAYERS);
  for (let b = 0; b < B; b++) {
    polData.set(batch[b].policy, b * POLICY_SIZE);
    valData.set(batch[b].valueRel, b * MAX_PLAYERS);
  }
  const polY = tf.tensor2d(polData, [B, POLICY_SIZE]);
  const valY = tf.tensor2d(valData, [B, MAX_PLAYERS]);
  const res = (await model.trainOnBatch([g, s], [polY, valY])) as number[] | number;
  g.dispose();
  s.dispose();
  polY.dispose();
  valY.dispose();
  return Array.isArray(res) ? res[0] : res;
}

export function exportWeights(model: tf.LayersModel): SerializedWeights {
  const ws = model.getWeights();
  return { shapes: ws.map((w) => w.shape as number[]), data: ws.map((w) => Array.from(w.dataSync())) };
}

export function importWeights(model: tf.LayersModel, sw: SerializedWeights): void {
  const tensors = sw.data.map((d, i) => tf.tensor(d, sw.shapes[i]));
  model.setWeights(tensors);
  tensors.forEach((t) => t.dispose());
}
