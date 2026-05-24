# Build Plan — Magical Athlete

> Stage 3 (Specification), the *how*. Operator-run, 2026-05-21. Implements `03-mvp-spec.md` against
> `../../docs/stack-and-conventions.md`.

## Stack
Factory default: **Vite + React + TypeScript (strict) + PixiJS v8**, **Zustand** for UI state,
**Vitest** for engine tests, **Playwright** scaffolded (run in Stage 5). Pure `engine/` + thin
`render/`/`ui/`. **Justified deviation:** rendering is **2.5D** (dimetric board + standee sprites) — a
*presentation* choice within Pixi, not a stack change. (Optional post-MVP: a react-three-fiber figure
layer for true 3D.)

## Engine design (pure, deterministic — the heart)

Files under `app/src/engine/`:

- **`rng.ts`** — `mulberry32(seed)` PRNG (port from Lacuna) + `rollDie`, `shuffle`. All randomness
  (dice, deck shuffle, roll-offs) goes through an injected seed.
- **`config.ts`** — tunable constants flagged "confirm vs components": `MILD_LEN`, `WILD_LEN`,
  `wildFeatures[]` (placeholder arrow/rock/star positions), `goldValues[4]`, `silverValues[4]`,
  `BRONZE = {one:1, three:3}`. Engine reads these; correcting them is one line.
- **`track.ts`** — builds a `Track` (ordered `Space[]` with `feature?: 'arrow'|'rock'|'star'` and arrow
  vector) for a side; helpers `spaceAt`, `clampToFinish`, `isFinished`.
- **`types.ts`** — `RacerId` (string), `PlayerId` (number); `Racer { id, name, powerId }`;
  `RacerInPlay { racerId, owner, pos, tripped, finished, place?, eliminated }`; `Chip`,
  `MatchConfig { players, schedule:Side[], doubleRacer, seed }`; `RaceState { side, racers, order,
  turnIdx, finishedCount, pendingPrompt?, log }`; `MatchState { config, deck, hands, draft, race,
  raceNo, chips:Chip[][], phase:'draft'|'race'|'afterRace'|'ended', winner? }`; `Action`.
- **`setup.ts`** — `createMatch(config)`: seed deck, build draft, roll-off order.
- **`draft.ts`** — `snakeDraft` pick generation + `applyDraftPick`; player-count flips (3–6) and the
  2P/3P double-racer drafts.
- **`powers/`** — `registry.ts` maps `powerId -> PowerDef { triggers[], optional, condition?, effect }`;
  one small pure module per racer power. `effect(ctx) -> Effect[]`.
- **`resolve.ts`** — the **effect engine**. A deterministic queue applies `Effect` primitives
  (`move(±n)`, `warp`, `trip`, `reroll`, `takeChip`, `loseChip`, `eliminate`, `setTurnOrder`,
  `predictRoll`, `duel`, `copyPower`) and, after each, gathers newly-triggered powers in resolution
  order **racetrack spaces → current player → others (clockwise)**. Enforces once-per-turn for timed
  powers, "warp/move 0 ≠ moving", passing detection, and **loop-breaking** (a visited
  trigger-signature set per resolution; legitimate repeats like Scoocher↔Suckerfish are bounded by a
  hard step cap, not deduped).
- **`rules.ts`** — `legalActions(state)` and `applyAction(state, action) -> state`, pure. Actions:
  `revealRacer`, `roll` (→ main move + feature/power resolution via `resolve`), `resolvePrompt`
  (optional-power use/skip), `endTurn`, `nextRace`, `advanceDraft`. Detects race end on 2nd finisher;
  awards chips; flips track; sets next-race first player; ends match after race 4.
- **`scoring.ts`** — chip award per race (gold/silver by ascending value) and `finalize` (sum → winner;
  ties shared).
- **`index.ts`** — public API + selectors (`positions`, `leadOrder`, `lastPlace`, `whoseTurn`,
  `pointsByPlayer`, `legalActions`).

**Determinism:** `{config, seed, action-log}` reconstructs any match exactly (dice come from the seeded
PRNG at `roll` time). Powers when needed receive an injected RNG slice — never `Math.random`.

## Powers — phased roster
Data-driven so adding a racer = one `powers/<id>.ts` + a registry line + a unit test. **Milestone 2**
implements an initial **~12–16 racers** chosen to span every trigger/effect type and the nastiest
interactions (e.g. Scoocher = "move 1 whenever any power happens"; Banana = trip on pass; Coach =
buff space-mates; Copycat = copy lead; Duelist; Hare; Rocket Scientist; Hypnotist warp; Huge Baby
displacement; Suckerfish coupling). **Milestone 6** expands toward all 36. Each power has a unit test
asserting its effect and at least the interaction tests above.

## Render plan (PixiJS v8, 2.5D)
- `render/board.ts` — `BoardView`: draws the current track in a **dimetric projection** (space → screen
  via a fixed iso transform), finish line, and Wild features. Reads geometry from `track.ts`/`config`.
- `render/figures.ts` — standee sprites per racer (CMYK art via manifest; placeholder shapes until
  then) with drop shadow; tweens: hop-per-space on move, topple on trip, slide/fade on warp.
- `render/fx.ts` — chip-gain and power-label popups.
- Pixi v8 async `Application.init`, created once and reused (the known React-lifecycle gotcha — guard
  init/destroy). No game rules in render; it emits intents (`onRoll`, `onPromptChoice`) to the store.

## UI plan (React)
`state/store.ts` (Zustand): holds `MatchState` + ephemeral prompt/selection; actions call engine pure
fns only. Components: `App` (routes menu/draft/race/end), `MainMenu`, `DraftScreen`, `GameCanvas`
(mounts `BoardView`), `RaceHUD` (turn, race chips, lead order, Roll), `PowerPrompt` (optional-power
use/skip), `PassDevice` (hand-off overlay), `ScoreBoard` (running totals), `EndScreen`. Keyboard:
Enter = roll/confirm, 1/2 = prompt choices, N = new match.

## AI plan
**None in MVP** (hot-seat only, per spec). Engine selectors are AI-ready for a later vs-AI fast-follow.

## Test plan
- **Vitest (engine, headless):** `track`/movement, race-end on 2nd finisher, draft per player count +
  seed determinism, feature resolution (arrow/rock/star), `resolve` ordering + once/turn + loop-break,
  **one unit test per implemented power**, interaction tests for the hard combos, scoring/chip values,
  and a **randomized full-match simulation** over many seeds (always terminates, never illegal state,
  `seed+log` → identical final state).
- **Playwright:** happy-path scaffold added; executed in Stage 5.

## Milestones (each independently runnable)
1. **Engine skeleton + match loop, no powers** — track/movement/race-end/4-race scheduling/scoring/
   seeded dice; headless full-match sim green.
2. **Power engine + initial roster (~12–16)** — registry, triggers, resolution order, once/loop rules;
   per-power + interaction tests.
3. **Static 2.5D render** — board + standees from a fixed `MatchState`.
4. **Interactive hot-seat (3–4P standard)** — draft UI, race turns, optional-power prompts, pass-device,
   full 4-race match to a winner.
5. **2P double-racer variant** (+ optional 3P) — two racers per player per race.
6. **Roster expansion toward all 36 + polish** — remaining powers, animations, accessibility, all
   acceptance criteria green.

## Risks / unknowns
- **Power-interaction correctness** is the dominant risk — the data-driven `resolve` engine + heavy
  unit/interaction/simulation tests are the mitigation; build the resolver before breadth of roster.
- **Loop-breaking vs. legitimate repeats** (Scoocher chains) — bound by a hard per-resolution step cap;
  test explicitly.
- **Unconfirmed component numbers** (track length, feature layout, chip values) — parameterized in
  `config.ts`, flagged; confirm from CMYK board art before the build gate.
- **2P double-racer turn structure** — engine models turn order over (player, racer) units from the
  start so this is additive, not a rewrite.
- **Pixi v8 async init + React lifecycle** — known gotcha; init once, destroy on unmount.

## Targets & wrapping
Web first. Tauri/Capacitor deferred; codebase stays wrap-ready (pure engine, static Vite build, no
Node-only client APIs).
