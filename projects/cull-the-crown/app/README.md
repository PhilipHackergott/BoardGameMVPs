# Cull the Crown — app

A single-player roguelike: Regicide's tactical card-combat wrapped in a Balatro-style run.
Original working title; mechanics-only reimplementation with original assets. See
`../03-mvp-spec.md` (what) and `../04-build-plan.md` (how).

## Run it

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # tsc --noEmit + production build to dist/
npm run preview    # serve the production build
npm run test       # Vitest engine suite
npm run lint       # tsc --noEmit
```

No network, accounts, or backend — a run is a single session in the browser.

## Architecture (engine/UI split)

```
src/
├── engine/          PURE, deterministic, headlessly tested. No React/DOM/randomness w/o seed.
│   ├── rng.ts         mulberry32 in pure-functional form (generator state lives in RunState)
│   ├── types.ts       domain types + Action union
│   ├── cards.ts       deck (36 numbers + 4 companions = 40; Jesters are set-aside charges) + castle
│   ├── resolution.ts  THE RESOLUTION STACK: PARSE→AGGREGATE→BASE_POWERS→JOKERS→FINALIZE
│   ├── combat.ts       Regicide's four steps; heal/draw/shield/damage; solo Jester; defeat & loss
│   ├── content.ts      joker & consumable library (data) + shop generation
│   ├── run.ts          run setup, gold/interest, shop reducers, applyAction (top-level reducer)
│   └── index.ts        public API + selectors (previewPlay, runSummary, deckCount)
├── fx/              REUSABLE, game-agnostic PixiJS juice kit (see knowledge/patterns/presentation-fx.md)
│   ├── spring.ts       critically-damped numeric spring (drives all motion)
│   ├── easing.ts · particles.ts · shake.ts · pops.ts   easings, bursts, trauma-shake, text pops
│   └── index.ts
├── render/          PixiJS combat board (Cull the Crown's distinct look; uses fx/)
│   ├── theme.ts        the per-game visual identity (palette/type/iconography)
│   ├── cardNode.ts     a spring-driven card (hover/tilt/select/deal/exit)
│   └── combatStage.ts  enemy + fanned hand + the resolution cascade
├── ui/              React + Zustand: title/shop/end + combat controls/HUD overlaid on the board.
│   ├── store.ts        the only mutable session state (+ fxEvent for the cascade)
│   ├── PixiBoard.tsx   mounts Pixi (v8 async-init + StrictMode guard), syncs from the store
│   └── App.tsx         screens + keyboard support
├── styles.css
└── main.tsx
```

The engine never imports from `ui/`/`render/`/`fx/`. Every reducer is pure (`applyAction` clones,
then mutates a draft), so a run is fully reproducible from `{ seed, action-log }` — `RunState` is
JSON-serializable (jokers are stored by id, resolved against the library).

## Rendering: hybrid Pixi board + React HUD

The board (enemy, fanned hand, and the resolution cascade — floating damage/heal/draw pops, screen
shake, particle bursts, animated HP) is **PixiJS v8**; menus, shop, action bar and HUD are React
(DOM is better for those — accessible, fast). This matches the factory's "Pixi for the board, React
for the HUD" convention. The motion toolkit in `fx/` is deliberately game-agnostic and is published
as a reusable factory pattern; only `render/theme.ts` is Cull-the-Crown-specific.

## How to play

Beat 12 royals (Jacks → Queens → Kings). Each turn: select a card, a combo (equal rank, total ≤
10), or an Animal Companion + one card, and **Play** — or **Yield** to skip your attack. Hearts
heal, Diamonds draw, Clubs double damage, Spades shield. Each royal is immune to its own suit's
power until you play a **Jester**. If the royal survives it strikes back: discard cards totalling
at least the (shield-reduced) damage, or the run ends. Defeat a royal — **exactly** matching its
health pays a gold bonus — then shop for guild members, relics, and deck upgrades.

Keyboard: select cards with mouse/Enter; **Enter** = Play / Discard, **Y** = Yield, **Esc** =
clear selection (or cancel a shop target), **N** = new run on the end screen.

## How the Jester works (faithful Regicide solo rule)

Jesters are **not** in the deck. You start each run with **2 Jester charges** (set aside). Spend
one — in the play step or before suffering damage — to **discard your whole hand and redraw up to
your hand max**. It does **not** cancel enemy immunity (that's the multiplayer rule; the solo rule
is the panic-button redraw). *The Jester's Twin* relic grants +2 charges.

## Testing & verification status

- `npm run test` — **56 cases** (49 engine + 7 FX). Engine: resolution math (suit powers,
  immunity, combos, companions, every joker, upgrades), combat flow (defend, shield, loss,
  exact-kill, win, heal/draw movement, the solo Jester), shop economy, and a **40-seed full-run
  simulation** (always terminates, never illegal state, deterministic replay). FX: spring
  convergence/stability + easing endpoints. All green.
- `npm run lint` / `npm run build` — clean; production build serves and boots (verified via
  `vite preview` and `vite dev`).
- **Not** automatically verified: the on-screen *feel* of the Pixi presentation (animation,
  particles, shake) — Playwright is excluded by request and there's no automated browser, so the
  visuals need a human eye (Stage 5 playtest). The engine and the FX *math* are covered headlessly;
  runtime rendering is not.

## Credits

Combat mechanics adapt **Regicide** by Paul Abrahams, Luke Badger & Andy Richdale (Badgers from
Mars), used under Creative Commons (CC BY). Roguelike run structure inspired by **Balatro**. All
art, names, and assets here are original; this is an unaffiliated, mechanics-only prototype.
