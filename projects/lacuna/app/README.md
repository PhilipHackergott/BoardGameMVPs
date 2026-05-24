# Lacuna (MVP)

Digital adaptation of the board game **Lacuna** — pond + flower theme, Gold vs Silver. Artwork is
drawn from scratch (no publisher illustrations/logo reproduced). **Unpublished prototype** — see
the project's IP decision in `../project-state.json` (revisit licensing before any release).

## Stack
Vite + React + TypeScript (strict) + PixiJS v8. Pure deterministic game engine in `src/engine/`
(no framework imports); thin render (`src/render/`) and UI (`src/ui/`). Vitest for the engine,
Playwright for the visual playtest.

## Run

```bash
npm install
npm run dev        # http://localhost:5173
```

## Scripts
- `npm run dev` — dev server.
- `npm run build` — typecheck (`tsc --noEmit`) + production build to `dist/`.
- `npm run preview` — serve the production build.
- `npm test` — engine unit tests + full-game simulation (Vitest).
- `npm run lint` — typecheck (eslint deferred for the MVP).
- `npm run test:e2e` — Playwright visual playtest (needs `npx playwright install chromium` once).

## How to play
Start from the **main menu**: choose 2–4 players, name them, and optionally set a per-player
**chess clock** (1–10 min; run out and you forfeit your remaining pawns). The menu also keeps a
**scoreboard of past runs** (saved locally). Total pawns are always 12 (split evenly), 3–4 players
place in **snake-draft** order, and you win by a **plurality of colours** (ties broken by total
flowers).

Hot-seat on one screen. On your turn, click a flower: **green** lines fan out to
same-kind flowers with a clear path, **red** dashed lines mark blocked ones. Glide the cursor along
a green line — the pawn preview snaps to it — and **click anywhere on the line to drop your pawn**
(or press **Enter**). You claim both flowers at its ends. After all 12 pawns are placed, each
leftover flower drifts to its nearest pawn, revealed one by one. Win the most of a flower to win it;
win the most flowers to win the game.

Toggle the **Influence Lens** (button under the pond) to shade the water by which pawn is
nearest — a live Voronoi map that updates as you glide a new pawn into place, so you can see how a
placement reshapes each player's territory before committing.

## Layout
```
src/engine/   pure rules: types, rng, geometry, setup, rules, scoring, index
src/render/   PixiJS board view (presentation only)
src/state/    Zustand store wiring UI <-> engine
src/ui/       React components (header, Gold/Silver score columns, action banner, controls, rules modal, footer, canvas host)
tests/engine/ Vitest specs (setup, geometry, rules, scoring, simulation)
tests/e2e/    Playwright (smoke + visual playtest) — Stage 5
```

## MVP scope / not yet done
Hot-seat only (no AI/online), web only (no desktop/mobile wrap), no sound/persistence. Star
selection is pointer-based; menus/actions are keyboard-accessible (Enter=place, Esc=cancel,
N=new game). See `../03-mvp-spec.md` for the full scope and acceptance criteria.
