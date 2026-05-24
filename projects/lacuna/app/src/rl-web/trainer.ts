// Browser WebGPU training harness. Runs the SAME pure RL core (env, batched self-play MCTS,
// features, Elo) as the Node trainer, but with the network on tfjs-webgpu so it executes on the
// GPU (e.g. a Radeon 7900 XT). Self-play uses full batched MCTS; the periodic report uses a
// fast 1-ply value-greedy proxy (WebGPU reads are async, so MCTS-via-sync-eval isn't used here
// — download the checkpoint and `npm run arena` for the exact MCTS Elo). This is a SEPARATE
// Vite entry (train.html), so tfjs only bundles here, never into the game.

import * as tf from "@tensorflow/tfjs";
import "@tensorflow/tfjs-backend-webgpu";
import { CHANNELS, GRID, NN, POLICY_SIZE, SCALAR_SIZE, encodeState, evaluationFor } from "../rl/features";
import type { Features } from "../rl/features";
import { MAX_PLAYERS } from "../rl/types";
import type { BatchEvaluator, SelfPlaySample } from "../rl/types";
import { runBatchedSelfPlay } from "../rl/selfplay_batched";
import { legalCandidates, outcomeOf, runGame, settle, step } from "../rl/env";
import { fitElo, rateVsFixed } from "../rl/elo";
import { bcCell } from "../rl/behavior";
import { HeuristicAgent, RandomAgent } from "../rl/agents";
import type { Agent } from "../rl/types";
import { createGame, makeConfig } from "../engine";
import type { GameState } from "../engine";

// ── tiny DOM helpers ────────────────────────────────────────────────────────────────
const logEl = document.getElementById("log")!;
const statusEl = document.getElementById("status")!;
const log = (s: string, cls = ""): void => {
  const line = document.createElement("div");
  if (cls) line.className = cls;
  line.textContent = s;
  logEl.appendChild(line);
  logEl.scrollTop = logEl.scrollHeight;
  // eslint-disable-next-line no-console
  console.log(s);
  // Mirror to the dev server so it's durable + monitorable outside the browser (best effort).
  fetch("/rl-log", { method: "POST", body: s }).catch(() => {});
};
const setStatus = (s: string): void => {
  statusEl.textContent = s;
};

const qp = new URLSearchParams(location.search);
const num = (k: string, d: number): number => Number(qp.get(k) ?? d);
const AUTOSAVE = qp.get("autosave") !== "0"; // persist best to IndexedDB unattended (default on)

// Minimal IndexedDB put — persist the best checkpoint without download prompts (unattended).
function idbPut(key: string, value: unknown): Promise<void> {
  return new Promise((resolve, reject) => {
    const open = indexedDB.open("lacuna-rl", 1);
    open.onupgradeneeded = () => open.result.createObjectStore("ckpt");
    open.onsuccess = () => {
      const tx = open.result.transaction("ckpt", "readwrite");
      tx.objectStore("ckpt").put(value, key);
      tx.oncomplete = () => {
        open.result.close();
        resolve();
      };
      tx.onerror = () => reject(tx.error);
    };
    open.onerror = () => reject(open.error);
  });
}

const ARCH = {
  grid: GRID,
  channels: CHANNELS,
  scalarSize: SCALAR_SIZE,
  policySize: POLICY_SIZE,
  maxPlayers: MAX_PLAYERS,
  hidden: num("hidden", 512),
  layers: num("layers", 3),
  valueHidden: num("valueHidden", 128),
};
const LR = num("lr", 2e-3); // fixed at model build
const PLAYERS = num("players", 2);

// Live-tunable knobs: URL query sets the initial values; the dev server's /rl-control endpoint
// (backed by rl-control.json) overrides them each generation, so throughput can be retuned
// WITHOUT relaunching the browser.
const cfg = {
  concurrent: num("concurrent", 256),
  sims: num("sims", 48),
  batch: num("batch", 512),
  steps: num("steps", 100),
  replay: num("replay", 120000),
  reportEvery: num("reportEvery", 3),
  reportGames: num("reportGames", 12),
};
async function pollControl(): Promise<void> {
  try {
    const r = await fetch("/rl-control", { cache: "no-store" });
    if (!r.ok) return;
    const c = (await r.json()) as Record<string, number>;
    let changed = "";
    for (const k of Object.keys(cfg) as (keyof typeof cfg)[]) {
      if (typeof c[k] === "number" && c[k] !== cfg[k]) {
        changed += ` ${k}:${cfg[k]}→${c[k]}`;
        cfg[k] = c[k];
      }
    }
    if (changed) log(`control update:${changed}`);
  } catch {
    /* ignore */
  }
}

// ── network (browser tfjs; MLP so it trains on WebGPU) ───────────────────────────────
function buildModel(): tf.LayersModel {
  const gridIn = tf.input({ shape: [ARCH.grid, ARCH.grid, ARCH.channels] });
  const scalarIn = tf.input({ shape: [ARCH.scalarSize] });
  let h: any = tf.layers.concatenate().apply([tf.layers.flatten().apply(gridIn) as any, scalarIn]);
  for (let i = 0; i < ARCH.layers; i++) h = tf.layers.dense({ units: ARCH.hidden, activation: "relu" }).apply(h);
  const policy = tf.layers.dense({ units: ARCH.policySize, activation: "softmax", name: "policy" }).apply(h);
  const value = tf.layers
    .dense({ units: ARCH.maxPlayers, activation: "sigmoid", name: "value" })
    .apply(tf.layers.dense({ units: ARCH.valueHidden, activation: "relu" }).apply(h));
  const model = tf.model({ inputs: [gridIn, scalarIn], outputs: [policy as any, value as any] });
  model.compile({ optimizer: tf.train.adam(LR), loss: { policy: "categoricalCrossentropy", value: "meanSquaredError" } });
  return model;
}

// A conv ResNet (spatial inductive bias — the MLP plateaus because it can't model the board's
// geometry). Same I/O as the MLP, so the rest of the pipeline is unchanged. Trains only if the
// active backend implements the conv-gradient kernel (WebGPU may; WASM does not).
function buildConvModel(): tf.LayersModel {
  const F = num("filters", 48);
  const blocks = num("blocks", 4);
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
  model.compile({ optimizer: tf.train.adam(LR), loss: { policy: "categoricalCrossentropy", value: "meanSquaredError" } });
  return model;
}

// Build a conv net if the backend can TRAIN it (test one backward pass); else fall back to MLP.
async function buildBestModel(): Promise<{ model: tf.LayersModel; arch: string }> {
  if (num("mlp", 0) === 1) return { model: buildModel(), arch: "mlp(forced)" };
  try {
    const m = buildConvModel();
    const g = tf.zeros([2, GRID, GRID, CHANNELS]);
    const s = tf.zeros([2, SCALAR_SIZE]);
    const py = tf.zeros([2, POLICY_SIZE]);
    const vy = tf.zeros([2, MAX_PLAYERS]);
    await m.trainOnBatch([g, s], [py, vy]); // throws if the conv-gradient kernel is missing
    g.dispose();
    s.dispose();
    py.dispose();
    vy.dispose();
    return { model: m, arch: "conv" };
  } catch (e) {
    log(`conv training unsupported on ${tf.getBackend()} (${(e as Error).message}) — using MLP.`, "err");
    return { model: buildModel(), arch: "mlp(fallback)" };
  }
}

// Load saved weights into a model (resume after a reload / GPU device-loss). Throws on a shape
// mismatch (e.g. the arch changed), in which case the caller starts fresh.
function importWeightsInto(model: tf.LayersModel, sw: { shapes: number[][]; data: number[][] }): void {
  const tensors = sw.data.map((d, i) => tf.tensor(d, sw.shapes[i]));
  model.setWeights(tensors);
  tensors.forEach((t) => t.dispose());
}

function inputTensors(feats: Features[]): [tf.Tensor4D, tf.Tensor2D] {
  const B = feats.length;
  const chw = new Float32Array(B * CHANNELS * NN);
  const sc = new Float32Array(B * SCALAR_SIZE);
  for (let b = 0; b < B; b++) {
    chw.set(feats[b].grid, b * CHANNELS * NN);
    sc.set(feats[b].scalars, b * SCALAR_SIZE);
  }
  const chwT = tf.tensor4d(chw, [B, CHANNELS, GRID, GRID]);
  const grid = chwT.transpose([0, 2, 3, 1]) as tf.Tensor4D;
  chwT.dispose();
  return [grid, tf.tensor2d(sc, [B, SCALAR_SIZE])];
}

async function predictBatch(model: tf.LayersModel, feats: Features[]): Promise<{ policy: number[][]; value: number[][] }> {
  const [g, s] = inputTensors(feats);
  const out = model.predict([g, s]) as tf.Tensor[];
  // Overlap the two GPU→CPU readbacks (readback latency dominates WebGPU self-play).
  const [policy, value] = (await Promise.all([out[0].array(), out[1].array()])) as [number[][], number[][]];
  g.dispose();
  s.dispose();
  out[0].dispose();
  out[1].dispose();
  return { policy, value };
}

function makeBatchEval(model: tf.LayersModel): BatchEvaluator {
  return async (items) => {
    const feats = items.map((it) => encodeState(it.g, it.g.current));
    const { policy, value } = await predictBatch(model, feats);
    return items.map((it, b) => evaluationFor(it.g, it.cands, policy[b], value[b]));
  };
}

async function trainStep(model: tf.LayersModel, batch: SelfPlaySample[]): Promise<number> {
  const [g, s] = inputTensors(batch.map((b) => ({ grid: b.grid, scalars: b.scalars })));
  const B = batch.length;
  const pol = new Float32Array(B * POLICY_SIZE);
  const val = new Float32Array(B * MAX_PLAYERS);
  for (let b = 0; b < B; b++) {
    pol.set(batch[b].policy, b * POLICY_SIZE);
    val.set(batch[b].valueRel, b * MAX_PLAYERS);
  }
  const polY = tf.tensor2d(pol, [B, POLICY_SIZE]);
  const valY = tf.tensor2d(val, [B, MAX_PLAYERS]);
  const res = (await model.trainOnBatch([g, s], [polY, valY])) as number[] | number;
  g.dispose();
  s.dispose();
  polY.dispose();
  valY.dispose();
  return Array.isArray(res) ? res[0] : res;
}

async function exportWeights(model: tf.LayersModel): Promise<{ shapes: number[][]; data: number[][] }> {
  const ws = model.getWeights();
  const data: number[][] = [];
  const shapes: number[][] = [];
  for (const w of ws) {
    shapes.push(w.shape as number[]);
    data.push(Array.from((await w.data()) as Float32Array));
  }
  return { shapes, data };
}

// ── strength report: 1-ply value-greedy model vs an anchor (async, WebGPU-friendly) ──
const emptyPowers = (n: number): never[][] => Array.from({ length: n }, () => []);
const nullAff = (n: number): null[] => Array.from({ length: n }, () => null);

async function valueGreedyPick(g: GameState, cands: { action: any; x: number; y: number; kind: any }[], batchEval: BatchEvaluator): Promise<number> {
  const me = g.current;
  const children = cands.map((c) => step(g, c as any));
  const vals = new Array(children.length).fill(0);
  const items: { g: GameState; cands: any[] }[] = [];
  const idx: number[] = [];
  children.forEach((cg, i) => {
    if (cg.phase === "ended") vals[i] = outcomeOf(cg).values[me] ?? 0;
    else {
      items.push({ g: cg, cands: legalCandidates(cg) });
      idx.push(i);
    }
  });
  if (items.length) {
    const evals = await batchEval(items);
    idx.forEach((ci, j) => (vals[ci] = evals[j].values[me] ?? 0));
  }
  let bi = 0;
  for (let i = 1; i < vals.length; i++) if (vals[i] > vals[bi]) bi = i;
  return bi;
}

async function headToHead(batchEval: BatchEvaluator, anchor: Agent, games: number): Promise<number> {
  let score = 0;
  let decided = 0;
  for (let gi = 0; gi < games; gi++) {
    const modelSeat = (gi % 2) as 0 | 1;
    let g = settle(createGame((Math.random() * 0xffffffff) >>> 0, makeConfig(2), true, emptyPowers(2), nullAff(2)));
    let guard = 0;
    while (g.phase !== "ended" && guard++ < 4000) {
      const cands = legalCandidates(g);
      if (cands.length === 1 && cands[0].kind === "pass") {
        g = step(g, cands[0]);
        continue;
      }
      const i = g.current === modelSeat ? await valueGreedyPick(g, cands, batchEval) : anchor.act(g, cands);
      g = step(g, cands[i]);
    }
    const r = outcomeOf(g).result;
    decided++;
    if (r === "draw") score += 0.5;
    else if (r === modelSeat) score += 1;
  }
  return decided ? score / decided : 0.5;
}

// ── main training loop ───────────────────────────────────────────────────────────────
let running = false;
let bestCheckpoint: { meta: any; weights: { shapes: number[][]; data: number[][] } } | null = null;

// Single-instance guard: only ONE tab may train (Chrome session-restore loves to resurrect
// duplicates, which fight over the GPU and cause device-loss). Acquire an exclusive Web Lock
// held for the page's lifetime; if another tab holds it, this tab idles.
function acquireTrainerLock(): Promise<boolean> {
  if (!navigator.locks) return Promise.resolve(true);
  return new Promise<boolean>((resolve) => {
    navigator.locks
      .request("lacuna-trainer", { ifAvailable: true }, (lock) => {
        if (!lock) {
          resolve(false);
          return undefined;
        }
        resolve(true);
        return new Promise<void>(() => {}); // hold until the page unloads
      })
      .catch(() => resolve(true));
  });
}

async function main(): Promise<void> {
  if (!(await acquireTrainerLock())) {
    log("another trainer tab already holds the lock — this tab is IDLE (close it or leave it).", "err");
    setStatus("idle — another tab is training");
    running = false;
    return;
  }
  setStatus("initialising WebGPU…");
  let ok = false;
  try {
    ok = await tf.setBackend("webgpu");
    await tf.ready();
  } catch (e) {
    log(`WebGPU init threw: ${(e as Error).message}`, "err");
  }
  if (!ok || tf.getBackend() !== "webgpu") {
    log("WebGPU not active — using CPU fallback (the GPU path needs Chrome/Edge with WebGPU).", "err");
    await tf.setBackend("cpu");
    await tf.ready();
  }
  const adapterInfo = (navigator as any).gpu ? "navigator.gpu present" : "no navigator.gpu";
  await pollControl();
  log(`backend=${tf.getBackend()} | ${adapterInfo} | MLP hidden=${ARCH.hidden}x${ARCH.layers} | concurrent=${cfg.concurrent} sims=${cfg.sims} batch=${cfg.batch}`);

  const { model, arch: netArch } = await buildBestModel();
  log(`architecture: ${netArch}`);
  // Resume from the last autosaved checkpoint so reloads / GPU device-loss don't restart from
  // scratch (weights only; optimizer + replay rebuild quickly).
  try {
    const saved = (await idbGet("best")) as { weights?: { shapes: number[][]; data: number[][] }; meta?: any } | undefined;
    if (saved?.weights?.data?.length) {
      importWeightsInto(model, saved.weights);
      log(`resumed from saved checkpoint (Elo≈${saved.meta?.elo}, games≈${saved.meta?.games}).`);
    }
  } catch (e) {
    log(`no resume — starting fresh (${(e as Error).message}).`);
  }
  const batchEval = makeBatchEval(model);

  // Fixed anchor Elos (sync heuristic-only round robin) to pin the scale.
  const anchors: { name: string; agent: Agent }[] = [
    { name: "random", agent: new RandomAgent() },
    { name: "low", agent: new HeuristicAgent("low") },
    { name: "medium", agent: new HeuristicAgent("medium") },
    { name: "hard", agent: new HeuristicAgent("hard") },
  ];
  const pairs: { i: number; j: number; winsI: number; winsJ: number; draws: number }[] = [];
  for (let i = 0; i < anchors.length; i++)
    for (let j = i + 1; j < anchors.length; j++) {
      let wi = 0;
      let wj = 0;
      let dr = 0;
      for (let gx = 0; gx < 40; gx++) {
        const a = gx % 2 === 0 ? [anchors[i].agent, anchors[j].agent] : [anchors[j].agent, anchors[i].agent];
        const r = runGame(createGame((Math.random() * 0xffffffff) >>> 0, makeConfig(2), true, emptyPowers(2), nullAff(2)), a).outcome.result;
        if (r === "draw") dr++;
        else if (r === (gx % 2)) wi++;
        else wj++;
      }
      pairs.push({ i, j, winsI: wi, winsJ: wj, draws: dr });
    }
  const anchorElo = fitElo(anchors.length, pairs);
  log(`anchor Elo: ${anchors.map((a, i) => `${a.name}=${anchorElo[i]}`).join("  ")}`);

  const replay: SelfPlaySample[] = [];
  let gen = 0;
  let totalGames = 0;
  let bestElo = -Infinity;
  const start = performance.now();

  while (running) {
    gen++;
    await pollControl();
    const t0 = performance.now();
    const sp = await runBatchedSelfPlay({
      evaluate: batchEval,
      modelIndex: 0,
      players: PLAYERS,
      concurrent: cfg.concurrent,
      sims: cfg.sims,
      targetGames: cfg.concurrent,
      dirichletAlpha: 0.5,
      dirichletFrac: 0.25,
      tempMoves: 8,
      seedBase: (Math.random() * 0xffffffff) >>> 0,
    });
    for (const s of sp.samples) replay.push(s);
    if (replay.length > cfg.replay) replay.splice(0, replay.length - cfg.replay);
    totalGames += sp.games;

    let lossSum = 0;
    let lossN = 0;
    if (replay.length >= cfg.batch) {
      for (let s = 0; s < cfg.steps; s++) {
        const batch: SelfPlaySample[] = [];
        for (let b = 0; b < cfg.batch; b++) batch.push(replay[(Math.random() * replay.length) | 0]);
        lossSum += await trainStep(model, batch);
        lossN++;
      }
    }
    const secs = (performance.now() - t0) / 1000;
    const gamesPerHr = Math.round((sp.games / secs) * 3600);
    const totMin = (performance.now() - start) / 60000;
    log(
      `gen ${gen}  +${sp.games} games in ${secs.toFixed(1)}s (~${gamesPerHr.toLocaleString()}/hr)  tot=${totalGames}  replay=${replay.length}  loss=${lossN ? (lossSum / lossN).toFixed(3) : "n/a"}  t=${totMin.toFixed(1)}min`,
    );
    setStatus(`gen ${gen} · ${totalGames.toLocaleString()} games · ~${gamesPerHr.toLocaleString()}/hr`);
    sessionStorage.setItem("rl-reloads", "0"); // made progress → reset the device-loss reload guard

    if (gen % cfg.reportEvery === 0) {
      const wins = [];
      for (const a of anchors) wins.push({ name: a.name, score: await headToHead(batchEval, a.agent, cfg.reportGames), elo: anchorElo[anchors.indexOf(a)] });
      const elo = rateVsFixed(wins.map((w) => ({ elo: w.elo, score: w.score, games: cfg.reportGames })));
      log(
        `ELO UPDATE  gen=${gen}  Elo≈${elo} (value-greedy proxy)  | win% ${wins.map((w) => `${w.name}=${(w.score * 100).toFixed(0)}%`).join(" ")}`,
        "elo",
      );
      const weights = await exportWeights(model);
      const meta = {
        id: `webgpu-gen${gen}`,
        createdAt: new Date().toISOString(),
        elo,
        bc: new Array(5).fill(0.5),
        bcCell: bcCell(new Array(5).fill(0.5)),
        arch: ARCH,
        games: totalGames,
        note: "browser webgpu, value-greedy report",
      };
      // Persist the latest net to disk every report so it can be rated with the full-MCTS arena.
      fetch("/rl-save", { method: "POST", body: JSON.stringify({ meta, weights }) }).catch(() => {});
      if (elo >= bestElo) {
        bestElo = elo;
        bestCheckpoint = { meta: { ...meta, id: "webgpu-best" }, weights };
        if (AUTOSAVE) {
          try {
            await idbPut("best", bestCheckpoint);
            log(`  new best Elo≈${elo} — autosaved to IndexedDB (click Download to export a file).`);
          } catch (e) {
            log(`  new best Elo≈${elo} — IndexedDB autosave failed (${(e as Error).message}); use Download.`, "err");
          }
        } else {
          log(`  new best Elo≈${elo} — click "Download best checkpoint" to save.`);
        }
      }
    }
    await new Promise((r) => setTimeout(r, 0)); // yield to keep the UI responsive
  }
  setStatus("stopped");
}

document.getElementById("start")!.addEventListener("click", () => {
  if (running) return;
  running = true;
  setStatus("starting…");
  main().catch((e) => {
    log(`ERROR: ${e?.stack ?? e}`, "err");
    running = false;
    // Recover from transient WebGPU device-loss by reloading (resumes from IndexedDB). Cap
    // consecutive auto-reloads so a persistent failure doesn't loop forever.
    const n = Number(sessionStorage.getItem("rl-reloads") ?? "0") + 1;
    sessionStorage.setItem("rl-reloads", String(n));
    if (n <= 8) {
      setStatus(`error — auto-reloading to recover (#${n})…`);
      setTimeout(() => location.reload(), 5000);
    } else {
      setStatus("error — too many reloads; stopped. Reload manually to resume.");
    }
  });
});
document.getElementById("stop")!.addEventListener("click", () => {
  running = false;
  setStatus("stopping after this generation…");
});
function idbGet(key: string): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const open = indexedDB.open("lacuna-rl", 1);
    open.onupgradeneeded = () => open.result.createObjectStore("ckpt");
    open.onsuccess = () => {
      const tx = open.result.transaction("ckpt", "readonly");
      const req = tx.objectStore("ckpt").get(key);
      req.onsuccess = () => {
        open.result.close();
        resolve(req.result);
      };
      req.onerror = () => reject(req.error);
    };
    open.onerror = () => reject(open.error);
  });
}

document.getElementById("dl")!.addEventListener("click", async () => {
  const cp = bestCheckpoint ?? (await idbGet("best").catch(() => null));
  if (!cp) {
    log("No checkpoint yet — let it train past the first report.", "err");
    return;
  }
  const blob = new Blob([JSON.stringify(cp)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "webgpu-best.json";
  a.click();
  URL.revokeObjectURL(a.href);
});

log("Ready. Click Start. (Chrome/Edge with WebGPU; keep this tab open for full GPU speed.)");

// Autostart for unattended launching (?autostart=1).
if (qp.get("autostart") === "1") {
  log("autostart=1 → starting…");
  (document.getElementById("start") as HTMLButtonElement).click();
}
