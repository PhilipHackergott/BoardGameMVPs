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
├── render/          PixiJS felt — the WHOLE combat surface is drawn here (uses fx/)
│   ├── theme.ts        the per-game visual identity (palette/type/iconography)
│   ├── cardNode.ts · cardFace.ts   a spring-driven card + its face model (rank/suit/sigils)
│   ├── combatStage.ts  the felt: fanned hand, resolution cascade, deck/used piles; owns the layers below
│   ├── shopStage.ts    the market tray that rides up over the SAME felt (single canvas)
│   ├── sidebarStage.ts the run sidebar (royal "blind" + Fighting-Style read-out) — its own felt-side canvas
│   ├── hudLayer.ts     the joker/pouch HUD band on the felt
│   └── feltControls.ts the combat action controls on the felt (sort, defend block, wildcard picker, …)
├── ui/              React + Zustand: title/setup/end screens, modals, and the thin Pixi mount wrappers.
│   ├── store.ts        the only mutable session state (+ fxEvent for the cascade)
│   ├── PixiBoard.tsx · PixiSidebar.tsx   mount Pixi (v8 async-init + StrictMode guard), sync from the store
│   ├── FeltScreen.tsx  combat + shop: <PixiSidebar/> + <PixiBoard/> (no DOM overlays float over the felt)
│   └── App.tsx         the phase router + global layers + keyboard support
├── styles.css
└── main.tsx
```

The engine never imports from `ui/`/`render/`/`fx/`. Every reducer is pure (`applyAction` clones,
then mutates a draft), so a run is fully reproducible from `{ seed, action-log }` — `RunState` is
JSON-serializable (jokers are stored by id, resolved against the library).

## Rendering: one Pixi felt, React for the surrounding shell

The whole combat surface is **PixiJS v8** on a single persistent felt: the fanned hand and resolution
cascade (floating damage/heal/draw pops, screen shake, particle bursts), the run sidebar (the royal
"blind" + the live Fighting-Style read-out), the joker/pouch HUD band, the market tray, **and** the
combat action controls (Sort, the defend block prompt, the wildcard suit-picker, the pending-pick
banner, the block pill). Combat and the shop share one mounted board, so the felt never resets across
them. Only the surrounding shell is React/DOM — the title/setup/end screens, the modals (Compendium,
The Descent, Deck/Pack, Settings…), the global tooltip layer, and a couple of transient combat hints —
because DOM is better for scrollable, text-heavy, accessible chrome. The motion toolkit in `fx/` stays
game-agnostic and is published as a reusable factory pattern; only `render/theme.ts` is Cull-the-Crown-specific.

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
