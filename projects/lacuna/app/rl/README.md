# Lacuna RL — self-play training, Elo rating & matchmaking groundwork

A reinforcement-learning framework that trains Lacuna AI opponents by self-play, rates them on
an **Elo** scale, captures distinct **play-styles** (not just strengths), stores rated
**checkpoints**, and lays the data-plumbing for a future Elo **matchmaking** ladder.

It's an **AlphaZero-lite** design (MCTS + a policy/value network in TensorFlow.js) chosen for
the highest skill ceiling. Because the engine is a pure, deterministic `reduce(state, action)`,
training runs headless in Node and the trained nets — plain JSON weights — can later run
**in the browser with the exact same engine + search code**, no model server.

## Why it fits this codebase

- The engine is pure & seeded → perfect for MCTS rollouts and reproducible self-play.
- `tests/sim/balance.test.ts` already plays full headless AI-vs-AI games; the RL env (`src/rl/env.ts`)
  generalises that loop to any pluggable `Agent`.
- The existing heuristic AI (`src/ai/ai.ts`, low/medium/hard) anchors the Elo scale as reference
  opponents in the arena.

## Layout

Browser-safe, **pure** modules (no tfjs / no fs) — compiled with the app, reused for in-browser
inference later:

| `src/rl/…` | role |
|---|---|
| `types.ts` | `Agent`, `Candidate`, `Evaluator`, `Sample`, `GameOutcome` |
| `features.ts` | state → tensor features: a `GRID×GRID` multi-channel raster + scalar vector; spatial **policy** layout |
| `env.ts` | candidate enumeration + the generalised game loop (`runGame`), sub-phase auto-settling |
| `mcts.ts` | pure **PUCT MCTS**, N-player (max^n) backups, evaluator **injected** |
| `agents.ts` | `RandomAgent`, `HeuristicAgent` (wraps the existing AI), `PolicyAgent`, `MctsAgent` |
| `behavior.ts` | **behavioral-characteristic (BC)** style metrics + MAP-Elites cell keys |
| `elo.ts` | Bradley-Terry / Elo fitting + incremental update |
| `checkpoint.ts` | checkpoint / registry data shapes + arch spec |
| `matchmaking.ts` | pick an opponent near a target Elo (optionally by style); player-rating update |

Node-only, tfjs + fs (tsconfig-**excluded** `rl/` dir, run via vitest/esbuild like `tests/sim`):

| `rl/…` | role |
|---|---|
| `network.ts` | the MLP policy/value model + `initBackend` (WASM): build / predict / `toEvaluator` / train / weight (de)serialise |
| `selfplay.ts` | single-game MCTS self-play (Dirichlet + temperature) |
| `selfplay_batched.ts` | **batched** MCTS self-play — many games in lockstep, one big batched NN pass per sim round (the throughput multiplier) |
| `arena.ts` | round-robin Elo arena + `headToHead` |
| `io.ts` | checkpoint + `registry.json` file I/O; MAP-Elites archive builder |
| `train.test.ts` | small proof-of-training entry point (`npm run train`) |
| `train_long.test.ts` | **the scaled, time-bounded trainer** with periodic Elo reports (`npm run train:long`) |
| `arena.test.ts` | re-rate all stored checkpoints (`npm run arena`) |

Outputs land in `rl-checkpoints/` (`<id>.json` per checkpoint + `registry.json`).

## The network

Input: a `12×12` board raster (7 star-colour planes + my-beacons + rival-beacons) **plus** a
scalar vector (per-colour collected for me & best rival, beacons left, turn progress, phase,
player-count one-hot). Play is **perspective-relative** (the player to move is always "me").

It's a **dense MLP** (flatten the raster → fuse the scalars → a wide ReLU trunk → two heads).
**Why MLP, not conv:** the WASM backend implements conv2d *forward* but **not** the conv
*gradient* (`Conv2DBackpropFilter`), so a conv net can't train on WASM — whereas matmul
gradients are fully supported, so an MLP trains entirely on WASM. On a 12×12 board a wide MLP
(default 512×3 ≈ 1M+ params) that sees the whole board has ample capacity. (If you move to a
native backend, swapping the trunk back to a conv ResNet in `buildModel` is a one-function change.)

- **Policy head** — a logit per grid cell + one "pass/other" logit. A candidate move's prior is
  the policy at its board cell, renormalised over the legal candidates. This cleanly handles
  Lacuna's *variable, continuous* placement action space.
- **Value head** — a per-seat value in `[0,1]` (win 1 / draw .5 / loss 0), de-rotated from the
  perspective-relative output to absolute seats for the max^n MCTS backups.

### Throughput: batched self-play

The single biggest speedup. Naively, MCTS does one tiny `batch=1` forward pass per leaf — the
NN-call overhead dominates. `selfplay_batched.ts` instead runs **G games concurrently** and
steps their searches in lockstep: each simulation round collects one leaf from every live game
and evaluates them in **one batched forward pass**. That turns `G·S` size-1 passes into `S`
size-`G` passes per move — a 50–100× cut in NN calls. Ended games are refilled to keep the
batch full.

## Strength **and** style (variety)

Strength is the training checkpoint ladder (early = weak, late = strong), rated by Elo.

Variety is **not** hand-scripted. The trainer runs a **population/league** of lineages that
cross-play, and every game yields a per-player **style fingerprint** (`behavior.ts`):
`aggression, centrality, hoarding, territory, spread`. Checkpoints are tagged with both Elo and
their average BC vector, and stored in a **MAP-Elites archive** keyed by `(style-cell ×
strength-band)`. Distinct "characters" emerge organically from population diversity; the
matchmaker can then pick by Elo *and* offer stylistic variety.

## Running

```bash
# scaled, time-bounded run on the WASM backend, batched self-play, periodic Elo reports
RL_MINUTES=150 RL_HIDDEN=512 RL_LAYERS=3 RL_SIMS=32 RL_CONCURRENT=128 \
RL_TRAIN_STEPS=80 RL_REPORT_MINUTES=10 RL_PLAYERS=2 npm run train:long

# small proof-of-training (population, multi-count, full arena)
npm run train

# re-rate every stored checkpoint onto one Elo scale
npm run arena
```

Long-run env knobs: `RL_MINUTES` (budget), `RL_HIDDEN`/`RL_LAYERS`/`RL_VALUE_HIDDEN` (net size),
`RL_CONCURRENT` (games in flight = NN batch size), `RL_SIMS`, `RL_GAMES` (per gen), `RL_BATCH`,
`RL_TRAIN_STEPS`, `RL_REPLAY`, `RL_LR`, `RL_REPORT_MINUTES`, `RL_ARENA_GAMES`, `RL_ARENA_SIMS`,
`RL_POP`, `RL_PLAYERS`, `RL_WASM_THREADS`, `RL_BACKEND` (`wasm`|`cpu`).

Each report prints `ELO UPDATE gen=… Elo≈… | win% random/low/medium/hard` and saves a
milestone checkpoint (plus `best-m{n}`), so you can stop anytime and keep the best net.

## GPU training in the browser (WebGPU)

For real GPU compute — including AMD cards, which CUDA/`tfjs-node-gpu` can't use — there's a
**browser trainer** at `train.html` (entry `src/rl-web/trainer.ts`). It runs the *same* pure RL
core (`src/rl/*`) but with the network on `tfjs-backend-webgpu`, so self-play + training execute
on the GPU. The batched self-play coordinator is **async** (`BatchEvaluator` may return a
Promise) precisely so WebGPU's async GPU→CPU readback works.

```bash
npm run dev          # then open the trainer in Chrome/Edge (WebGPU):
#   http://localhost:5173/train.html      (or whatever port Vite prints)
```

Click **Start**. Tune via URL query, e.g.
`train.html?concurrent=256&sims=48&hidden=512&layers=3&batch=512&steps=100`. The page shows
live games/sec and an extrapolated **games/hour** (the 10k+/hr target is reachable with large
`concurrent` on a strong GPU), the training loss, and a periodic `ELO UPDATE`. **Download best
checkpoint** saves a `webgpu-best.json` you can rate precisely with the Node arena.

Notes: the in-browser report uses a fast **1-ply value-greedy** proxy (a lower bound on true
MCTS strength — if it beats hard, MCTS certainly does); for an exact MCTS Elo, rate the
downloaded checkpoint via `npm run arena`. tfjs is bundled only into this entry, never the game.
WebGPU needs Chrome/Edge; keep the tab focused for full speed. If WebGPU is unavailable it falls
back to CPU.

> **Backend reality (this machine).** GPU is **AMD** → no CUDA/`tfjs-node-gpu`. Native
> `@tensorflow/tfjs-node` won't build (Node 24 + no VS build tools). So we run on
> `@tensorflow/tfjs-backend-wasm` (CPU SIMD/threads) — no install, but **inference-only kernels
> for conv** (hence the MLP) and single-process. **For materially more speed** (and a conv
> ResNet): install **Node 20 LTS** and `@tensorflow/tfjs-node` (prebuilt, no build tools), or
> use the AMD GPU via **WebGPU in the browser**. The checkpoint format is backend-independent,
> so trained nets carry over.

## Matchmaking groundwork (wired, not yet surfaced)

`src/rl/matchmaking.ts` + `registry.json` are the data side a future "rated ladder" mode plugs
into: player starts at **1000** (`PLAYER_BASELINE`); `pickOpponent` / `ladderForPlayer` choose
checkpoints near a target Elo (optionally biased toward a desired style); `ratePlayerGame`
applies the standard Elo update after a match. The live game keeps its heuristic AIs until the
in-browser inference path (load a checkpoint's weights into a browser tfjs model → `toEvaluator`
→ the same `MctsAgent`) is turned on.

## Next steps

1. Longer/native training to push checkpoints past `heuristic-hard`.
2. Powers/affinities: add input planes + extend candidate enumeration to the sub-phases (the env
   already auto-settles them via heuristics, so it's incremental).
3. In-browser inference + the rated-ladder UI on top of `matchmaking.ts`.
