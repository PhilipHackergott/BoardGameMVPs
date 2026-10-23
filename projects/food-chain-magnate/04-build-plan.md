# Build Plan — Food Chain Magnate

> Stage 3 (Specification), the *how*. Operator-run, 2026-05-25. Implements `03-mvp-spec.md` against
> `../../docs/stack-and-conventions.md`. **Engine-first**: this is a large, exacting economy, so the
> plan is a strict milestone ladder where each rung is independently demoable and headlessly testable.
> FCM is **deterministic & dice-free** — the engine is pure calculation, which makes exhaustive unit
> testing and a strong AI both unusually tractable.

## Stack
Factory default: **Vite + React + TypeScript (strict) + PixiJS v8**, **Zustand** for UI/session
state, **Vitest** for engine tests, **Playwright** for the later test stage. Pure `engine/` + thin
`render/`/`ui/`. **One deliberate deviation, decided up front (spec D4):** a **two-zone UI substrate**
— **Pixi for the City board**, **DOM/React for the Company & management layer** — split along a clean
board-vs-panels seam (justified in the UI plan against `knowledge/playbooks/ui-architecture.md`; this
is *not* DOM-over-canvas-then-migrate). No free-form physics → no Phaser.

## Content as data (the heart of fidelity)
All rules *content* lives in versioned data modules the engine interprets — never hard-coded in logic
or UI. This is what lets the long tail (employee deck, map, milestones) be filled/corrected
incrementally, and lets a wrong `[VERIFY]` value be a one-line fix.

```
app/src/engine/data/
├── map.ts          # tiles[], roads (graph), houseLots[{id,number,garden?}], gardens, layout      (PROCEDURAL 5×5 tiles — exact 20-tile art not in rulebook; map is random anyway)
├── employees.ts    # full card deck: { id, track, entry, salaried, slots, action, trainsInto[], topSymbol }  (tree+abilities+slots+entry/salary SOURCED -> 06-card-reference.md; [VERIFY] = per-card copy counts only)
├── milestones.ts   # all tiles: { id, name, trigger, effect, shared? } — the enumerated set         ([VERIFY] count/wording; effects sourced)
├── marketing.ts    # campaign types: { id, footprint, productScope, tierRequired, duration, range }  ([VERIFY] durations/tier→unlock)
├── goods.ts        # burgers/pizzas + 3 drinks; production sources & quantities                      ([VERIFY] per-card qty)
├── pricing.ts      # base $10; price -1 / discount -3 / luxury +10                                   (sourced)
├── bank.ts         # $50×players; reserve-card values; two-break end                                ([VERIFY] reserve values)
├── setup.ts        # starting CEO/cash, job-market seed, reserve deal, initial map; per seat-count     ([VERIFY] — transcribe 2–4p; the 5p row is deferred & purely additive)
├── aiProfiles.ts   # named AI personalities = evaluator-weight presets × tier (campaign + skirmish)   (tuned via sim)
├── scenarios/      # campaign: ScenarioDef[] — setup + rivals + objectives + fails + medals + flavor  (authored content)
└── campaign.ts     # the arc: scenario order, unlock graph, what each clear awards (content, NOT power) (authored)
```

## Data sourcing & the `[VERIFY]` pass (the FCM analog of WotR's card sourcing)
Unlike WotR (96 card texts), FCM's data volume is modest but **exacting**. **Almost fully resolved:**
the operator supplied the **official rulebook** (`FCM_Rules_EN_v3.pdf`); we transcribed the text **and
rendered the p.5 card-layout image to PNG** (MuPDF-WASM) to read it precisely → **`06-card-reference.md`**.
Now **sourced:** the full training tree (3 self-tracks + the resolved management tree, slots 2/3/4/5/10),
every ability, entry/salary status (CEO + all 8 entry cards free; trained = $5), all **18** milestones,
marketing tiers/footprints/durations, production quantities, drink ranges, component counts, setup
scaling, action order, bank/break/slot rules, and the **reserve value×slot distribution** (6×{$100/2,
$200/3, $300/4}). The **only residual `[VERIFY]`** is **per-card deck counts** (the 222 breakdown — not
in the rulebook, needs the physical cards/BGG file; build impact minor) and the **map-tile art** (only
a sample tile is printed → the MVP **procedurally generates** rules-legal tiles; the map is random
anyway). A `data.coverage` test asserts the deck/milestone/marketing tables are structurally
complete and reports any value still carrying a `[VERIFY]` sentinel, driving completion to zero. The
**balance sim** then validates the pinned numbers against real play. **Nothing is fabricated** — an
un-sourced value ships as an explicit, flagged placeholder, never an invented "real" number.

## Engine design (pure, deterministic — `app/src/engine/`)

- **`rng.ts`** — serializable seeded PRNG (`mulberry32`-style, state threaded through state), used
  **only at setup** (map layout, job-market seed, reserve deal). No `Math.random`. In-play is
  fully deterministic.
- **`types.ts`** — domain types:
  - `CompanyId`; `Card { id, defId, atWork, reportsTo: CardId | null }` (org chart is a parent-pointer tree);
    `Company { id, name, color, kind: 'human'|'ai', aiLevel?, cash, cards: Card[], reserveCardId, claimedMilestones: Set, priceMods, restaurants: RegionId[], stock: { burgers, pizzas, soft, lemonade, beer }, freezer? }`.
  - `Phase = 'restructure'|'orderOfBusiness'|'working'|'dinnertime'|'payday'|'marketing'|'cleanup'`.
  - `MarketingPiece { id, type, product, ownerId, regionId, turnsLeft|permanent }`.
  - `HouseLot { id, number, regionId, garden, demand: { burgers, pizzas, drinkType→qty } }`.
  - `GameState { config, rng, turn, phase, turnOrder: CompanyId[], companies: Record, jobMarket: CardId[], bank: number, bankBreaks: 0|1|2, milestones: Record<id,{claimedBy}>, map, marketing: MarketingPiece[], pendingPicks?, winner: null|{companyId}, log: Action[] }`.
  - `Action` (discriminated union) — `setRestructure(picks, tree) | revealRestructure | chooseTurnSlot | recruit(cardId,target) | train(cardId,intoDef) | placeMarketing(type,product,regionId) | produce(cardId,good) | buyDrinks(cardId,...) | placeRestaurant(regionId) | moveRestaurant | setPrice | fire(cardId) | endActions | advancePhase`.
- **`map.ts`** — the road graph + **`distance(fromRegion, toHouse)` via BFS** (tile-borders crossed),
  road-connectivity queries, and the **spatial footprint queries** marketing needs (orth-adjacent,
  no-road-cross flood, 3×3 tiles, row/column sweeps). This module is security-critical for selling.
- **`orgchart.ts`** — legality: CEO 3 slots, manager 2–10, only CEO/managers have reports,
  one-of-each top-symbol; `legalArrangements` + validation with human-readable reasons.
- **`phases.ts`** — the 7-phase state machine: `advancePhase(state)`; enforces phase-legal actions,
  the simultaneous-then-revealed Restructuring, Order-of-Business slot choice, per-company
  action completion in Working.
- **`working.ts`** — dispatch one action per working card to the right subsystem; enforce
  one-action-per-card and any intra-phase ordering `[VERIFY]`.
- **`production.ts`** — produce food / buy drinks at buyer range; apply cart-operator milestone range.
- **`marketing.ts`** — place a campaign; compute its footprint via `map`; schedule demand; tick durations.
- **`selling.ts`** — **the heart**: `resolveDinnertime(state)` — for each house in number order, gather
  road-connected chains that can serve the full order, score `unitPrice + distance`, apply tie-breaks
  (waitresses → turn order), sell all items, apply garden-double / CFO +50% / waitress bonus, pay from
  bank. Returns a **step-by-step resolution log** the UI replays (and an immediate `bankBreak` signal).
- **`pricing.ts`** — effective unit price from a company's price/discount/luxury staff + milestone.
- **`payday.ts`** — fire/keep, $5 per salaried card, force-fire on shortfall, decrement bank.
- **`bank.ts`** — `$50×players`; detect breaks; first break reveals/adds reserves + slot adjust;
  second break ends the game after phase 4 → winner = max cash.
- **`milestones.ts`** — after each relevant action, check triggers; claim/lock (shared-on-same-turn);
  apply effects via a small **scripted-hook vocabulary** (`onSell`, `onProduce`, `salaryMod`,
  `rangeMod`, `priceMod`, `slotMod`, `grantCard`, …) so all ~18 are pure data, not bespoke code.
- **`objectives.ts`** *(campaign)* — pure `evaluateObjectives(state, scenario)` + `evaluateFails(state,
  scenario)` over a small **composable predicate vocabulary** (cash/turn, bankrupt-rivals, employees,
  milestones, monopoly, market-share, survive-until + a recession modifier), combined AND/OR with a
  turn limit; returns per-objective progress, win/lose, and a medal tier. **Same hook-vocabulary
  pattern as `milestones.ts`** — campaign objectives are *data*, evaluated by the phase loop, not bespoke code.
- **`scenario.ts`** *(campaign)* — `applyScenario(scenarioDef, seed) => GameState`: seeds the curated
  map / rival roster / starting org-chart / cash / pre-seeded market / milestone subset / enabled
  rules onto `createGame`. **Skirmish is the trivial "default" scenario**, so there's one code path.
- **`campaign.ts`** *(campaign)* — the serializable, **balance-neutral** `CareerState
  { company, stats, clearedScenarios, medals, unlocks }`, the unlock graph, and `awardOnClear(...)`.
  Pure; persistence is the store's job. **By construction, no field here feeds an in-game value** —
  unlocks gate content, never modify the economy (enforced by a test).
- **`jobmarket.ts`** — the shared offer; recruiter reach; replenish `[VERIFY]`.
- **`rules.ts`** — `legalActions(state, companyId)` + `apply(state, action) => state` (pure). The
  single public reducer the UI **and** the AI both drive.
- **`index.ts`** — public API: `createGame`, `legalActions`, `apply`, `view(state, asCompany)`
  (hides others' un-revealed Restructuring picks + face-down reserve cards), selectors
  (`cashOf`, `effectivePrice`, `reachableHouses`, `marketingFootprint`, `projectedPayday`, `bankClock`).

Determinism invariant: `apply` is pure; all randomness is setup-only `rng` state inside `GameState`.
Replay from `{config, seed, log}` reproduces any state exactly; **undo-to-decision** = truncate the
log and re-fold (mirrors Lacuna's engine + replay tests).

## Content spine (how the catalog is modeled + the hook points)
The three catalogs (employees, milestones, marketing/goods) are **data on a registry the engine reads
at fixed hook points** (default-off ⇒ base game; variants are additive data):
- **Employee defs** carry their `action` + `trainsInto[]` edges → `working.ts`/`orgchart.ts` read them; the
  training tree is data, not a switch.
- **Milestone defs** carry `trigger` + `effect` hooks fired from the relevant subsystems → no milestone
  is special-cased in logic.
- **Marketing defs** carry `footprint` + `tierRequired` + `duration` → `marketing.ts` + `map.ts` read them.
- **Scenario / objective defs** *(campaign)* carry a `setup` + `objectives`/`fails` predicate list +
  `unlocksOnClear` → `scenario.ts` seeds the game and `objectives.ts` evaluates from the phase loop.
  **Same registry + hook pattern** — so campaign is *content on the base engine*, not a fork.
This is the skeleton that makes the full catalog affordable and makes both the *Ketchup* expansion and
the **campaign scenario arc** later data drops, not rework.

## Render plan (PixiJS v8) — the City board (spec D9)
- `render/board.ts` — `BoardView`: a clean top-down **suburban-plat / blueprint** city; tiles + roads
  from `data/map`; **per-company restaurant markers**, numbered **house/garden lots**, placed
  **marketing pieces**. `init/update(view)/destroy`; Pixi v8 async init guarded (known factory gotcha —
  init once, never rebuilt on React render).
- `render/overlays.ts` — **the legibility headline**: marketing-footprint overlay (preview before
  commit), **road-distance & reachable-house** highlight for a selected restaurant, and **Dinnertime
  delivery routes** (animated) — these turn FCM's invisible spatial math into something you can see.
- `render/tokens.ts` — restaurant/house/garden/marketing/goods sprites behind an **asset manifest**
  (Magical Athlete pattern) so richer art slots in later without touching layout/logic.
- `render/theme.ts` — the canvas palette/token set (kept in sync with the DOM `:root` tokens in
  `art-direction.md`) — the 50s-diner palette.
- `render/fx/` — copy **Cull the Crown's `fx/` kit** wholesale (springs, particles, shake, staggered
  pops, animated backdrop) for the cash-register Dinnertime beat, milestone stamps, marketing plant,
  the bank-clock pulse, and the living suburb background.
- Render emits **intents** only (`onRegionClick`, `onRestaurantPlace`, `onMarketingPreview`) → store →
  engine. No rules in render.

## UI plan (React + Zustand — the Company & management layer)
Justification vs. `ui-architecture.md`: FCM has **two domains with a clean seam** (spatial board vs.
tabular company management). The board is Pixi; everything text/form/card/a11y-heavy is DOM — and they
do **not** re-encode the same component (the trap the playbook warns about), so there's no expensive
two-substrate interim. **Both kits are committed at milestone 2.**
- `state/store.ts` — holds `GameState` + ephemeral selection/targeting + the per-seat `view`; all
  mutations go through `engine.apply`. Actions mirror the engine `Action` union.
- **Shared DOM primitives (built before screens):** `<Modal>`/overlay shell, `<EmployeeCard>` (the ONE
  card model), `<CardSlot>` (drag-drop target), `<Button>`, `<Panel>`, `data-tip` tooltips.
- **Components:** `App` (menu/game/end routing + phase loop), `MainMenu`, `NewGameSetup` (2–4 seats,
  each Human/AI + AI difficulty/personality; seed; variants), `GameShell` (mounts `BoardView` + the phase-active panel), `OrgChartPanel`
  (drag-drop slotting), `RestructuringView` (private-pick gate), `JobMarketPanel`, `TrainingView`,
  `MarketingView` (footprint preview), `ProductionView`, `RestaurantPlacement`, `PricingControl`,
  `DinnertimeView` (step-through "why each house bought here" + cash-count-up), `PaydayView`,
  `MilestoneBoard`, `StandingsHUD` + `BankClock`, `LogModal` (action-log replay, à la Lacuna),
  `EndScreen`, `PauseMenu`, `SettingsMenu`, `Rules/Tutorial`; **campaign:** `CampaignHub`,
  `ScenarioBriefing`, `ScenarioDebriefing`, `CareerDossier`, `UnlocksGallery`, and an in-game
  `ObjectivesTracker`. Keyboard handlers throughout; colorblind-safe.

## AI plan (included — the determinism makes it strong)
A **pure chooser** over `legalActions`, dispatched through the same store actions (the Lacuna pattern),
consuming `view` (never raw state). **One shared evaluator** — `value = cash + assetValue +
positionValue + milestoneValue − projectedSalaryLiability`, with a deterministic Dinnertime simulation
for lookahead — drives **three tiers**:
- **Low** — greedy on this-turn projected Dinnertime profit; light jitter; no lookahead.
- **Medium** — 1-turn lookahead (simulate Dinnertime to value marketing/production/price/hire plays);
  pursue reachable milestones.
- **Hard** — multi-turn marketing-payoff valuation, rival-demand & milestone contesting, bank-clock
  awareness. Same evaluator, more search/weight.
**Acceptance for "AI-ready":** a chooser plays a complete legal game through the public API in tests
(it already does — the sim *is* the driver). **Ladder must be sim-verified to climb.**

**AI personalities** (`ai/personalities.ts` reading `data/aiProfiles`) are named **evaluator-weight
presets** on this one evaluator × a difficulty tier — *Burger Baron* (production weight), *Ad-Man*
(marketing weight), *Discounter* (price-war), *the Suit* (milestone/management), *Logistics Tycoon*
(range/drinks), plus a pushover tutorial tier. They give **campaign** its rivals and **skirmish** its
flavor with **no new AI code** — just weights + an optional opening book, sweep-checked to play distinctly.

## Test plan
- **Vitest (engine, headless, exhaustive)** — the safety net for an exacting economy:
  - `phases.test` — 7-phase order; simultaneous-then-revealed Restructuring; Order-of-Business slot rule; per-company action completion.
  - `orgchart.test` — CEO/manager slot limits, only-managers-have-reports, one-of-each top-symbol; illegal arrangements rejected with reasons.
  - `working.test` — each card's action; one-action-per-card; intra-phase ordering.
  - `production.test` — food production; **drink-buyer ranges** (errand/cart/truck/zeppelin) + cart-op milestone +1 range.
  - `marketing.test` — **footprints exact**: billboard orth-adjacent, mailbox no-road-cross flood, radio 3×3, airplane rows/cols; durations; demand seeding.
  - `selling.test` — **the heart**: min(price+distance), road-connectivity, full-order requirement, tie-breaks (waitresses→turn order), garden-double, CFO +50%, waitress bonus, cash-from-bank. **Encode worked examples from rules/FAQ as integration tests** (the Magical Athlete practice).
  - `pricing.test` — price/discount/luxury stacking + milestone; effect on the selling tie-break.
  - `payday.test` — $5/salaried card, force-fire on shortfall, bank decrement.
  - `bank.test` — $50×players; first break reveals+adds reserves; second break ends after phase 4; winner = max cash.
  - `milestones.test` — **every milestone**: trigger fires once, shared-on-same-turn, locks, applies its permanent effect.
  - `view.test` — `view` hides others' un-revealed Restructuring picks + face-down reserve cards.
  - `data.coverage.test` — employee deck / milestone / marketing tables structurally complete; reports any remaining `[VERIFY]` sentinel.
  - `objectives.test` *(campaign)* — each predicate + composition (AND/OR, turn limits); win/lose/medal resolution on crafted states.
  - `scenario.test` *(campaign)* — `applyScenario` produces the specified setup; every shipped scenario loads & is structurally valid.
  - `campaign.test` *(campaign)* — Career state round-trips (persist/restore); the unlock graph resolves; **balance-neutrality: no unlock mutates any in-game value** (asserted).
  - `simulation.test` — randomized full-game AI-vs-AI over many seeds and **all 2–4 seat counts**: always terminates (bank empties), never reaches an illegal state (slots, ranges, stock, bank), determinism (`{seed,log}`→identical), undo-to-decision restores exactly.
- **`npm run sim` (balance harness)** — AI-vs-AI win-rate sweeps; milestone-claim distribution; strategy-archetype win-rates; game-length pacing → compress the spread; pin `[VERIFY]` numbers to play-validated values. Also **campaign scenario solvability**: every shipped scenario is clearable (Hard AI or a scripted line) & its fail condition reachable; medal thresholds tuned off the distributions; personalities verified to play distinctly.
- **Playwright (e2e):** config + a happy-path scaffold now; **deferred to Stage 5** for the
  screenshot-driven visual playtest — including **board-overlay legibility** screenshots (marketing
  footprint, reachable-houses, delivery routes) and **org-chart drag-drop** via a real pointer.

## Milestones (each independently demoable — the scope ladder)
1. **Engine core I — the sell loop (D8).** Map data + setup + restaurants + a hand-built demand +
   **Dinnertime resolution** + pricing + payday + bank-end. Headless, fully simulatable. *Demo: a
   scripted game that sells to houses and ends on the second bank-break with a richest-wins result.*
   ✅ this proves the heart before anything else. 
2. **Engine core II — the company.** Org chart + restructuring + Working actions (recruit/train/
   produce/buy/place) + job market + Order-of-Business. *Demo: a full hire→produce→sell→pay loop.*
3. **Marketing, pricing & milestones.** Marketing footprints + demand generation + the **full
   milestone board** (all triggers/effects via the hook vocabulary) + pricing staff. **Also seed the
   `objectives.ts` predicate vocabulary + the `ScenarioDef` model now** — it's the same hook pattern,
   so it's cheap here and unblocks campaign later. *Demo: a marketing-driven game with milestone claims
   changing the math; a sample scenario objective evaluates.*
4. **Content catalog + AI ladder.** Fill the **full employee deck + training tree** on the spine;
   build **Low/Med/Hard** off the one evaluator + the **AI personality presets** (evaluator-weight
   rosters ride here). *Demo: AI-vs-AI full games; `npm run sim` runs; ladder climbs; personalities differ.*
5. **UI/render — interactive.** Pixi **City board + overlays**, the DOM **org-chart drag-drop** +ALL
   spec screens, the **Dinnertime step-through**, milestone board, bank-clock, shell + save/continue/
   history, log/replay, end screen. *Demo: a human plays a full game vs AI on one device.*
6. **Feel + sound + balance pass.** fx kit/cascade, outcome gates + cash-count-up + milestone stamps,
   audio engine (diner loop + SFX + mixer + mute); `npm run sim` tuning pass (compress spread, verify
   ladder, pin `[VERIFY]` numbers).
7. **Campaign mode — *Rise of a Fast-Food Empire*.** The campaign shell + flow (Career Hub, Scenario
   Briefing/Debriefing, Career Dossier, Unlocks gallery, the in-game Objectives tracker), the
   **authored ~12-scenario arc** + the AI personality rosters, Career persistence + the unlock graph.
   Built on M3's objective vocabulary + M4's AI + M5's screens, so it's mostly **content + flow UI**,
   not new engine. *Demo: play the arc start→finish; medals + unlocks persist across sessions.*
8. **Acceptance pass.** Every criterion in `03-mvp-spec.md` (incl. the campaign criteria) + the
   visual-first-try checklist + the target-state self-check.

## Risks / unknowns & how the build resolves them
- **Scope is the headline risk** (comparable to WotR). The milestone ladder exists precisely so each
  rung ships a playable increment; the **sell loop (M1)** is the deliberate first playable, not the
  whole game.
- **Dinnertime resolution correctness (the render+rules headline).** The tie-break chain and "serve
  the *full* order" rule are where FCM lives; "almost right" ruins it. Mitigation: build `selling.ts`
  first (M1), **encode rulebook/FAQ worked examples as tests**, and make the resolution a visible,
  step-through UI so errors are obvious.
- **`[VERIFY]` data tables — now essentially resolved** by the rulebook + p.5 image render
  (`06-card-reference.md`): the full training tree (incl. management edges + VP 4-slot), abilities,
  entry/salary (CEO + 8 entry free), 18 milestones, marketing tiers/durations, production quantities,
  drink ranges, action order, bank/break/slot rules, **reserve value×slot distribution**, setup scaling
  = **sourced**. **Only two residuals, both physical-only:** (1) **per-card deck counts** (222 breakdown
  not published; sensible config counts flagged — minor, only the "deck ran out" rule cares); (2)
  **map-tile art** — the MVP **procedurally generates** rules-legal 5×5 tiles (the map is randomly
  assembled anyway), with a later scan swappable via data. `data.coverage` tracks any remaining sentinel
  to zero; the **balance sim** validates the tuned numbers against play.
- **Player count (spec D1 — LOCKED: 2–4 seats).** Skirmish = 2–4, any mix of humans/AI, all three seat
  counts tuned & tested; campaign = solo, 1 human + 1–3 AI per scenario. The engine stays
  **player-count-generic** (`config.seats`-parameterized; `config.maxSeats = 4` is a **lobby/config cap,
  not an engine branch** — no logic hard-codes a max or assumes a 5th seat), so the cardboard's
  **5-player mode is a clean later add**: lift the cap + transcribe the 5p setup row (`[VERIFY]` data) +
  a tuning pass, **no refactor**. **Verified: 4p vs 5p changes nothing material in the build ladder** —
  if anything marginally *less* work than 5p (one fewer seat count to tune, no 5p setup data). The
  ladder is seat-count-agnostic until the M4/M6 AI + balance tuning, which now sweeps **2–4**.
- **AI strength.** A weak AI makes balance read wrong (the known trap). Mitigation: the shared
  evaluator + 1-turn deterministic-Dinnertime lookahead is genuinely informative here (open info, no
  RNG); build/verify the ladder in M4 before the M6 balance pass; flag AI-blind content for `/test`
  rather than "buffing broken".
- **UI two-zone seam.** Mitigated by construction: the split is board-vs-panels (not DOM re-encoding a
  canvas component), each domain has one home, and **both kits land at M2** — exactly what
  `ui-architecture.md` prescribes. The all-DOM/SVG board (D4 alt) is the recorded escape hatch.
- **Campaign authoring & objective tuning.** ~12 bespoke scenarios is real content + tuning work, and a
  bespoke objective must be *achievable but not trivial*. Mitigation: seed the predicate vocabulary +
  `ScenarioDef` model early (M3); **sim-check every scenario's solvability** (Hard AI / scripted line
  clears it; fail reachable) and set medals off the distributions; the arc is data, so cuts/reorders are cheap.
- **No power-creep (campaign balance integrity).** Earned unlocks must never buff a balanced economy.
  Mitigation: unlocks are **content / cosmetic / challenge only** by construction; `campaign.test`
  asserts no unlock touches an in-game value; scenario asymmetry is **authored & tuned, never player-stacked**.
- **Pixi v8 async init + React lifecycle** — known factory gotcha; init once, guard, destroy on unmount.

## Targets & wrapping
Web only for this MVP. Tauri/Capacitor deferred; codebase stays wrap-ready (pure engine, static Vite
build, no Node-only client APIs). The state model + action log are built **online-ready** so async
multiplayer is a later add, not a rewrite.
