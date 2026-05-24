# War of the Ring — web MVP

A two-player hot-seat digital adaptation of *War of the Ring* (2nd ed. base game). Web-first
(Vite + React + TypeScript + PixiJS v8), pure deterministic engine, thin render/UI. **Non-distributed
personal prototype** — real Middle-earth names used directly per the recorded IP decision; do not
distribute.

## Run / build / test

```bash
npm install
npm run dev        # dev server on http://localhost:3005
npm run build      # tsc --noEmit + vite build  → dist/
npm run preview    # serve the built app on 3005
npm test           # Vitest engine suite (43 tests)
npm run test:e2e   # Playwright smoke (real-browser runtime + hidden-info check)
npm run lint       # tsc --noEmit
```

## Architecture (factory convention)

```
src/
├── engine/          PURE, deterministic, headlessly testable. No React/Pixi/DOM.
│   ├── data/        map, nations (political track), dice faces, characters, hunt pool, setup, cards (96)
│   ├── rng.ts       mulberry32 PRNG — the ONLY randomness (threaded through state)
│   ├── types.ts     domain types + the Action union
│   ├── setup.ts     createGame(config, seed)
│   ├── dice/phases/combat/hunt/fellowship/politics/muster/cards/victory.ts  subsystems
│   ├── rules.ts     legalActions(state) + apply(state, action) → state  (the public reducer)
│   ├── view.ts      view(state, asSide) — the hidden-information firewall
│   ├── sim.ts       headless random-playout harness (the AI-ready seam)
│   └── index.ts     public API
├── render/map.ts    MapView (Pixi): perspective map + the RegionStack readout (the headline)
├── state/store.ts   Zustand: holds engine state, derives per-seat view, gates the handoff
├── ui/              React: Title, GameScreen (+ panels), CombatModal, Handoff, EndScreen
├── fx/              reusable juice kit (copied from Cull the Crown)
└── assets/manifest.ts  art seam (placeholder standees → real art later, no logic change)
```

Determinism: every game is reconstructable from `{config, seed, action-log}` — proven by the
`simulation.test` replay test. The same public API (`legalActions` + `apply` over `view`) is what a
future AI driver would consume; `sim.ts` already drives full games headlessly.

## What's implemented (M1–M6)

- **M1 War loop:** 6-phase state machine, FP 4 / Shadow 7 dice (+character bonuses, capped),
  face→action mapping, Eye→Hunt-Box, FP-first one-die-at-a-time alternation, army movement with the
  10-unit stacking limit, **field combat** (≤5 dice, hit 5–6, leadership re-rolls), settlement
  control + VP, **military victory** (Shadow 10 / FP 4).
- **M2 The Ring:** hidden Fellowship Progress, the **Hunt** (level = box dice, success 6, +1/FP-die,
  region re-rolls, tile draw), Corruption 0–12, reveal, the **Mordor track** (auto-draw, Stop on an
  Eye, idle-turn corruption), **Ring victory** (Corruption 12 / Crack of Doom), and the **`view`
  firewall** (Shadow never sees Progress/Guide/Companions/Corruption).
- **M3 Sieges & characters:** retreat-into-siege (attacker 6 / defender 5–6, 5-unit cap, Elite-
  reduction to extend), Companions/Minions, Leadership, Will-of-the-West upgrades (Aragorn / Gandalf
  the White, +1 die) and Minion entries (+1 die).
- **M4 Event cards — all 96:** the full 4×24 deck composition with **real card text** sourced from
  the warofthering.eu Master Events PDFs (extracted via `pdftotext`; raw text + the generator live in
  `../_carddata/`). 13 cards carry a scripted hook the engine automates (draw / heal / advance
  political / Eye-to-box); the rest carry real text resolved by hand. **Nothing is fabricated.**
- **M5 UI/render:** the **2.5D standee map** + the **RegionStack** readout (1–3 individual standees,
  4–10 representative cluster + `R/E · ⚔ · ☆` composition badge, leader/Nazgul silhouettes, character
  markers, Fellowship marker), dice tray, tracks, politics, FP-private Fellowship panel, hand (with
  full card text), combat modal, **blur "pass the device" handoff** (D4), chronicle/log, end screen.
- **M6 Acceptance:** living background (drifting fog + Mordor ember that intensifies with Corruption),
  outcome banners ("beats not cuts"), keyboard-operable buttons, shape+label unit encoding (not
  colour alone). 43 unit tests + 2 e2e + clean build.

## Known gaps / CONFIRM items (one-line data fixes)

- **Map** is a curated, strategically-complete subset of the printed regions (every VP settlement +
  the full Rivendell→Mordor path), with adjacencies built from a symmetric edge list. CONFIRM exact
  graph/positions off the board (`engine/data/map.ts`).
- **Setup placement, political step-counts, hunt-tile counts, character stats** are CONFIRM values
  parameterized in `engine/data/*` — read off the components to finalize.
- **Deck split** (which 24 are Character vs Strategy) follows the cards' nature and is asserted 24/24;
  the exact card-back assignment is the one CONFIRM detail on the cards.
- **Card automation** is intentionally partial: 13/96 scripted, 83/96 real-text-resolved-by-hand
  (the UI shows the full text). Combat-card *effects* are shown as text, not auto-applied.
- Movement At-War gating and multi-army (2-region) moves are simplified to single-stack moves; combat
  advance/retreat is whole-stack. AI / online / expansions are out of MVP (engine is AI-ready).
