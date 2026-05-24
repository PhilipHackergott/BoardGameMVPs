# Build Plan — Lacuna / "Nightweave"

> Stage 3 (Specification), the *how*. Operator-run, 2026-05-20. Implements `03-mvp-spec.md`
> against `../../docs/stack-and-conventions.md`.

## Stack
Confirmed factory default: **Vite + React + TypeScript (strict) + PixiJS v8**, **Zustand** for UI
state, **Vitest** for engine tests, **Playwright** scaffolded for the later test stage (not run in
this build). Pure `engine/` + thin `render/`/`ui/`.

## Engine design (pure, deterministic — the heart)

Files under `app/src/engine/`:

- **`types.ts`** — domain types:
  - `ColorId = 0..6`; `PlayerId = 0 | 1`.
  - `Star { id, color, x, y }`; `Beacon { id, owner, x, y }`.
  - `GameConfig { colors:7, perColor:7, beaconsPerPlayer:6, fieldR, starR, beaconR, edgeInset, minGap }`.
  - `GameState { config, seed, stars: Star[], beacons: Beacon[], collected: number[][] /*[player][color]*/, current: PlayerId, passesInARow, phase: 'play'|'ended', winner, colorWinners, log: Action[] }`.
  - `Action = { type:'place', aStarId, bStarId, x, y } | { type:'pass' }`.
- **`rng.ts`** — `mulberry32(seed)` deterministic PRNG; helpers `nextFloat`, `range`.
- **`geometry.ts`** — pure math:
  - `dist(ax,ay,bx,by)`, `pointSegDistance(p, a, b)` (distance + whether projection is interior).
  - `segmentClear(a, b, stars, beacons, starR, beaconR)` → boolean (no blocking star/beacon).
  - `nearestBeaconOwner(star, beacons)` → `{ owner | null }` (null = equidistant tie).
- **`setup.ts`** — `createGame(seed, config?) : GameState`. Rejection-samples 49 non-overlapping
  star positions inside the field (seeded); assigns 7×7 colors; empties collections; P0 to move.
- **`rules.ts`** — pure transitions:
  - `legalPartners(state, starId) : starId[]` (same color + clear line).
  - `legalMoves(state) : {aStarId,bStarId}[]` (deduped pairs) and `hasLegalMove(state)`.
  - `isLegalPlacement(state, a, b, x, y)` → ok | reason (same color, clear line, point interior &
    on segment within inset).
  - `applyAction(state, action) : GameState` — pure; returns a new state. `place` removes the two
    stars, adds the beacon, credits the color, advances player, resets passes; `pass` increments
    passes. Triggers end when 12 beacons placed or two passes in a row.
- **`scoring.ts`** — `finalize(state)`: award remaining stars to nearest beacon owner (tie →
  discard), compute per-color totals, per-color winner (majority; equal → tie), overall winner
  (most colors; tie-break total stars; else draw). Returns ended state with `winner`/`colorWinners`.
- **`index.ts`** — public API: `createGame`, `legalPartners`, `legalMoves`, `hasLegalMove`,
  `isLegalPlacement`, `applyAction`, `finalize`, selectors (`scoreByColor`, `beaconsLeft`).

Determinism: only `setup` uses the PRNG. Replays from `{seed, log}` reproduce state exactly.

## Render plan (PixiJS v8)
- `render/board.ts` — a `BoardView` class: `init(container, app)`, `update(state, selection)`,
  `destroy()`. Draws the field circle, stars (color + shape accent), beacons (per-player style),
  the active selection (selected star, highlighted legal partners, preview line + draggable beacon).
- Emits intents via callbacks: `onStarClick(id)`, `onSegmentClick(x,y)` (project to segment),
  `onConfirm()`. No game rules here — it calls into the store/engine.
- Pixi v8 async `Application.init`; created once and reused; never rebuilt on React render.

## UI plan (React)
- `state/store.ts` (Zustand): holds `GameState` + ephemeral `selection { aStarId, bStarId, beaconXY }`
  + messages. Actions: `newGame(seed?)`, `selectStar(id)`, `positionBeacon(x,y)`, `confirmPlace()`,
  `deselect()`, `pass()`. All game mutations go through the engine's pure functions.
- Components: `App` (routes title/game/end), `TitleScreen`, `GameCanvas` (mounts `BoardView`,
  subscribes to store), `HUD` (turn + beacons left + message), `ScoreBoard` (7 colors × P1/P2),
  `EndScreen` (color winners + result + New Game). Keyboard handlers (Enter/Esc/N).

## Test plan
- **Vitest (engine, headless, exhaustive):**
  - `setup.test` — 49 stars, 7×7 color counts, non-overlap, in-bounds, seed determinism.
  - `geometry.test` — point-segment distance, clear/blocked lines (collinear blocker, near-miss).
  - `rules.test` — legal partners, color/clearance rejection, applyAction effects, alternation,
    pass logic, end trigger at 12 beacons.
  - `scoring.test` — territory by nearest beacon, equidistant discard, per-color majority, overall
    winner + tie-break + draw.
  - `simulation.test` — **randomized full-game simulation** over many seeds: always terminates,
    never illegal state (no off-field stars, beacon counts ≤ 6, color totals conserve to ≤ 7),
    determinism (same seed+log → same final state).
- **Playwright (e2e):** config + one happy-path placeholder added but **deferred to Stage 5**.

## Milestones (each independently demoable)
1. **Engine + tests** — rules correct, fully simulatable headless. ✅ gate for the rest.
2. **Static render** — board draws from a fixed engine state.
3. **Interactive hot-seat** — select pair, place beacon, full loop, end + scoring.
4. **HUD/scoreboard/end polish** — live tallies, messages, keyboard, accessibility pass.
5. **Acceptance pass** — every criterion in `03-mvp-spec.md` met.
(vs-AI deferred — fast-follow.)

## Risks / unknowns
- **Beacon placement UX** (positioning along the segment) is the trickiest interaction; start with
  click-to-position + Confirm, keep it simple.
- **Clearance tolerances** (`starR`/`beaconR` vs. actual sprite sizes) need tuning so the visual
  matches the rule; engine constants are the single source of truth, render reads them.
- Pixi v8 async init + React lifecycle (init once, destroy on unmount) — known gotcha; guard it.

## Targets & wrapping
Web only for this MVP. Tauri/Capacitor wrapping deferred (the codebase stays wrap-ready: pure
engine, static Vite build, no Node-only APIs in the client).
