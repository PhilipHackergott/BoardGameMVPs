# Build Plan — Roomies

> Stage 3 (Specification), the *how*. Operator-run, 2026-05-21. Implements `03-mvp-spec.md` against
> `../../docs/stack-and-conventions.md`. References the Lacuna engine (pure seeded engine +
> simulation/replay tests) and Magical Athlete (data-driven trigger/effect resolver) as the patterns
> to copy — see `../../knowledge/index.md`.

## Stack
Factory default, confirmed: **Vite + React + TypeScript (strict) + PixiJS v8** for the tableau,
**Zustand** for UI/session state, **Vitest** for the engine, **Playwright** scaffolded for Stage 5.
No deviations. The board here is a card tableau (zones + cards), which Pixi handles well; React owns
menus/HUD/pass-device screens.

## Engine design (pure, deterministic — the heart)

Files under `app/src/engine/`:

- **`cards.ts`** — the static **data tables** (the single source of truth for the design), driving
  everything. Three definition maps keyed by card-kind id:
  - `ENV_DEFS`: `{ id, raum, multiplier, qty, biomes: Biome[] }` (intrinsic biome per D8).
  - `ANIMAL_DEFS`: `{ id, raum, types: AnimalType[], base, qty, keywords: {security?, schaf?},
    effect: EffectId }` where `EffectId` selects the scoring rule (hossiMikel, mikelHossi, sheep,
    leo4, dalaiAlone, martySecurity, none) and the optional `draft: 'rotate' | 'swap'` intercept.
  - `IMPROVEMENT_DEFS`: `{ id, qty, kind: 'ausbau'|'dekoration'|'biome'|'verkleidung', biome? }`.
  - `buildDeck(): CardDef[]` expands by `qty` into 94 instances (D1). Counts asserted in tests.
- **`types.ts`** — domain types:
  - `Biome = 'zuhause'|'stadt'|'natur'`; `AnimalType = 'firma'|'stoner'|'greyer'|'herde'|'joker'`.
  - `PlayerId = number`; `CardId = number`.
  - `EnvInstance { id, defId, ausbau: boolean, dekoration: boolean, extraBiomes: Biome[],
    animalIds: CardId[] }`.
  - `AnimalInstance { id, defId, jokered: boolean }` (Verkleidung sets `jokered`).
  - `Card = { id, kind: 'env'|'animal'|'improvement', defId }`.
  - `PlayerState { id, environments: EnvInstance[], animals: Record<CardId, AnimalInstance>,
    discard: CardId[] }`.
  - `GameState { config, seed, players: PlayerState[], hands: CardId[][] /*index = seat*/,
    deck: CardId[], round, pick, current: PlayerId, passDir, phase: 'draft'|'ended',
    pending?: PendingChoice, scores?: ScoreBreakdown[], log: Action[] }`.
  - `PendingChoice = { type:'placeAnimal'|'placeImprovement'|'martySwap', cardId, options }` — drives
    the UI's "choose a target" step without leaking UI into the engine.
- **`rng.ts`** — `mulberry32(seed)` + `shuffle(array, rng)` (Fisher–Yates). Only used at deal/shuffle.
- **`setup.ts`** — `createGame(config, seed): GameState` — build & shuffle deck, empty tableaus,
  deal round 1 hands of 6, set seat order / pass direction.
- **`legalMoves.ts`** — pure validators/generators:
  - `legalEnvironmentsFor(player, animalDefId): envId[]` (free Raum ≥ animal.raum).
  - `legalImprovementTargets(player, improvementDefId)`: env list, or animal list for Verkleidung.
  - `canPlay(state, cardId)`: which play options exist (drives "play vs. must-discard").
- **`rules.ts`** — pure transitions, `applyAction(state, action) → state`:
  - Actions: `{type:'play', cardId, target?}`, `{type:'discard', cardId}`,
    `{type:'resolvePending', choice}` (pick the Environment/animal/swap target),
    `{type:'martySwap', withPlayer|null}`.
  - `play` routes by kind: env → push EnvInstance; animal → if `target` env legal, place + mark
    Raum; improvement → apply (ausbau/dekoration/biome tag/verkleidung). Illegal/again-unplaceable →
    requires a discard. Sets `pending` when a target choice is needed.
  - **Draft intercepts** fire post-play: `dalai → rotateHands(+1)`; `marty → pending martySwap`.
  - `advance()`: after the active player resolves, move to next seat; when all picked, **pass hands**
    one seat; when hands empty, end round / deal next / move to scoring after round 3.
  - Guards: never exceed Raum, never act out of phase; every rejection returns a reason string.
- **`scoring.ts`** — the calculator the design is really about:
  - `scoreEnvironment(env, animals): { perAnimal: {id, base, adj, reasons[]}[], subtotal, total }`
    — computes each animal's adjusted points from the **co-located set** (Schaf count incl. Jokers;
    Security presence incl. Jokers; Hossi/Mikel pairing; Leo==4; Dalai alone; Marty per-Security),
    applies the **Dekoration ≥0 clamp** per animal (D11), then `subtotal × multiplier` (D15).
  - `biomeSetBonus(player)`: tags = intrinsic (D8) + improvement-added; `+6 × completeSets` (D7).
  - `scorePlayer(player)` and `scoreGame(state): ScoreBreakdown[]` (sorted, tie-break per D13).
- **`index.ts`** — public API: `createGame`, `canPlay`, `legal*`, `applyAction`, `scoreGame`,
  selectors (`handOf`, `runningTotal`, `roundPick`).

Determinism: only shuffle/deal consume the PRNG; replays from `{config, seed, log}` reproduce exactly.

## Render plan (PixiJS v8)
- `render/tableau.ts` — a `TableauView` class (`init/update/destroy`) drawing the **active player's**
  Environments as zones: capacity meter, ×multiplier badge, biome tags, attached Improvements, and
  contained animal cards; each zone shows its live sub-score. Highlights legal drop-targets during a
  placement; greys illegal ones.
- `render/handStrip.ts` — the current hand as selectable cards (only shown after the pass-device
  gate). Emits `onSelectCard(id)`; target selection emits `onChooseTarget(envId|animalId)`.
- Pixi v8 async `Application.init`, created once and reused (the known React-lifecycle gotcha — guard
  it; see `knowledge/patterns/build-gotchas.md`). No game rules in render — it calls store actions.

## UI plan (React)
- `state/store.ts` (Zustand): holds `GameState` + ephemeral `selection`/`pendingTargetUI` + messages.
  Actions wrap engine pure fns: `newGame(config, seed?)`, `selectCard(id)`, `chooseTarget(id)`,
  `play()`, `discard()`, `resolveMarty(withPlayer|null)`, `ackPassDevice()`.
- Components: `App` (routes title/draft/end), `TitleScreen` (player count + seed), `PassDeviceScreen`
  (hides hands between seats), `DraftScreen` (mounts `TableauView` + `HandStrip`), `HUD`
  (round/pick/turn + all players' running totals), `TargetPrompt` (choose env / animal / Marty swap),
  `EndScreen` (per-player breakdown + winner). Keyboard handlers (Tab/Enter/number/D/N).

## AI plan
**None in the MVP** — hot-seat only (the human chose the full multiplayer game). The engine is built
AI-ready (pure `legalMoves` + `applyAction` + `scoreGame`), so a fast-follow heuristic AI ("draft the
card that most increases my projected `scoreGame`, with light jitter") drops in without engine changes
— mirroring Lacuna/Magical Athlete's "AI as pure choosers through real store actions".

## Test plan
- **Vitest (engine, headless, exhaustive):**
  - `cards.test` — deck expands to the itemized counts (D1); every def well-formed.
  - `scoring.test` — **one focused test per synergy** and the worked combinations:
    Hossi+Mikel together/apart (both directions); Sheeps with 2/3/4 Schafe and with/without Security
    (incl. both modifiers at once); Leo at 3/4/5 Schafe; Dalai alone vs. not; Marty with 0/1/2
    Security; Joker counting as Schaf and as Security; Dekoration ≥0 clamp; ×2 multipliers
    (Café/Reisetasche); biome-set bonus at 0/1/2 complete sets; Ausbau capacity.
  - `rules.test` — play/discard routing, Raum guard, seat-order picking, hand-passing, round/3-round
    progression, **Dalai rotate** and **Marty swap** intercepts (incl. empty-hand no-ops).
  - `simulation.test` — randomized full games over many seeds: always terminates in 3 rounds; never
    illegal state (Raum never exceeded; cards conserved across hands/tableaus/discard = deck);
    determinism (same `{config, seed, log}` → same final `scoreGame`).
- **Playwright (e2e):** config + one happy-path placeholder (new game → play a few cards → reach end
  screen) added but **deferred to Stage 5**. Use a dev-seam (fixed seed + scripted picks) like Lacuna's
  to make the canvas game e2e-able.

## Milestones (each independently demoable)
1. **Engine + data tables + scoring + tests** — rules correct, fully simulatable headless. The gate
   for everything else; this is also the "scoring calculator" the design centers on.
2. **Static render** — a fixed tableau (one player, a few populated Environments) draws with live
   sub-scores.
3. **Interactive hot-seat draft** — deal, pick/play/discard, target prompts, pass-device screens,
   hand-passing, Dalai/Marty intercepts, 3 rounds, end + full scoring.
4. **HUD / end-screen breakdown / accessibility** — running totals, why-annotations, keyboard, palette.
5. **Acceptance pass** — every criterion in `03-mvp-spec.md` met.
(vs-AI deferred — fast-follow.)

## Risks / unknowns (and how the build resolves them)
- **⚑ Open design items D1–D15** — all have defaults so the build can proceed; the spec gate may
  change any. The engine isolates them as **config constants / data-table values** (deck counts, the
  `+6` biome value, env→biome map, Joker semantics, Dekoration clamp mode) so a gate change is a data
  edit, not a refactor. **Build M1 against the defaults; re-run on gate feedback.**
- **Biome economy (D7)** is a placeholder — keep `BIOME_SET_BONUS` and the scoring shape behind one
  constant + one function so retuning is trivial.
- **Draft intercepts** (rotate/swap) interacting with end-of-round empty hands — covered by explicit
  no-op tests.
- **Pixi v8 async init + React lifecycle** — known gotcha; init once, destroy on unmount, guard.
- **Hot-seat hidden information** — the pass-device interstitial must fully clear the previous player's
  hand from screen before revealing the next.

## Targets & wrapping
Web only for this MVP. Tauri/Capacitor wrapping deferred; the codebase stays wrap-ready (pure engine,
static Vite build, no Node-only client APIs).
