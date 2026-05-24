# Build Plan — War of the Ring

> Stage 3 (Specification), the *how*. Operator-run, 2026-05-22. Implements `03-mvp-spec.md`
> against `../../docs/stack-and-conventions.md`. **Engine-first**: this game is large, so the plan
> is organized as a strict milestone ladder where each rung is independently demoable and testable.

## Stack
Factory default: **Vite + React + TypeScript (strict) + PixiJS v8**, **Zustand** for UI/session
state, **Vitest** for engine tests, **Playwright** for the later test stage. Pure `engine/` + thin
`render/`/`ui/`. No deviations. The map is a **fixed region graph** rendered over a static map
image — Pixi draws tokens/overlays snapped to region anchors (no free-form physics → no Phaser).

## Content as data (the heart of fidelity)
All rules *content* lives in versioned data modules the engine interprets — never hard-coded in
logic or UI. This is what lets the long tail (cards, map) be filled incrementally and lets a wrong
`CONFIRM` value be a one-line fix.

```
app/src/engine/data/
├── map.ts          # regions[]: { id, name, nation, terrain, settlement: none|town|city|stronghold, vp, adjacency[] }   (CONFIRM)
├── nations.ts      # FP/Shadow nations, political-track layout + start states (Elves active)        (CONFIRM step count)
├── dice.ts         # die-face arrays for FP & Shadow; pool sizes + growth triggers                  (verified)
├── huntPool.ts     # standard tiles [{value|eye, reveal?}] ×16 + special blue/red tiles             (CONFIRM counts)
├── characters.ts   # companions, minions, upgrades: level, leadership, abilities, entry conditions   (CONFIRM)
├── cards/          # all 96 records: { id, side, deck, dieToPlay, event, combat, when, placeholder? }  (deck fixed; text sourced — see Card sourcing)
└── setup.ts        # starting unit placement, deck assignment, Fellowship start                     (CONFIRM)
```

## Card sourcing & extraction (all 96 — decision D1)
Full text for the 96 base-game cards is available online; populating `data/cards/` is a bounded
transcription task, not a coverage gap. Sources, in priority order:
1. **warofthering.eu Master Events PDFs** — `fp_master_events.pdf`, `sa_master_events.pdf` (complete authoritative text).
2. **BGG "WotR 2nd ed. — Base Game Card Reference"** filepage (full list, corroboration).
3. **Steam Workshop full-art card mods** + Dized card-layout reference.

*Extraction:* the Master PDFs are **image-based**, so transcription needs OCR (`pdftoppm` + tesseract,
or a PDF render step) or reading them in a browser; BGG blocks automated fetch. Budget a build-time
data pass. **Placeholder policy:** every card occupies its slot from day one (`{id, side, deck,
dieToPlay, placeholder:true}`); a placeholder is **inert or best-effort, flagged, and never
fabricated**. A `cards.coverage` test reports how many real vs. placeholder, driving completion to zero.

## Engine design (pure, deterministic — `app/src/engine/`)

- **`rng.ts`** — serializable seeded PRNG (`mulberry32`-style, state threaded through actions, as in
  Magical Athlete `engine/rng.ts`). Every roll/shuffle/draw goes through it. No `Math.random`.
- **`types.ts`** — domain types:
  - `Side = 'fp' | 'shadow'`; `Region`, `Unit { nation, kind: 'regular'|'elite', }`, `Leader`,
    `Character`, `ArmyStack { regionId, units[], leaders[], characters[] }`.
  - `Die = 'character'|'army'|'muster'|'armyMuster'|'event'|'will'|'eye'`.
  - `Fellowship { progress, guideId, companions[], corruption, revealed, onMordorTrack, mordorStep, lastDeclaredRegion }` — **the hidden block**.
  - `Politics { [nation]: { active: boolean, step: number, atWar: boolean } }`.
  - `GameState { config, rng, turn, phase, current: Side, dice: { fp: Die[], shadow: Die[] }, huntBox: { shadowDice, fpDice, eye }, regions: Record<id,ArmyStack>, control: Record<regionId,Side>, fellowship: Fellowship, politics: Politics, hands: { fp: CardId[], shadow: CardId[] }, decks, huntPool, reinforcements, vp: { fp, shadow }, winner: null|{side,path}, log: Action[] }`.
  - `Action` (discriminated union) — `recoverAndDraw | declareFellowship | changeGuide | heal | allocateHunt | rollDice | useDie(dieIndex, action) | moveArmy | attack | resolveCombatRound | moveFellowship | separateCompanion | muster | advancePolitical | bringCharacter | drawCard | playCard | passDie | endPhase`.
- **`phases.ts`** — the 6-phase state machine: `advancePhase(state)`; enforces phase-legal actions,
  alternation (FP first, one die at a time in resolution), and the Eye→Hunt-Box move at roll time.
- **`dice.ts`** — roll pools from `data/dice`; map a die result to its **legal action set**; pool
  growth on character entry.
- **`combat.ts`** — `resolveRound(state, attacker, defender, cards)`: strength→dice (≤5), hit 5–6
  (siege: atk 6 / def 5), leadership re-rolls (≤leadership, ≤5), apply hits, retreat/siege choice,
  Elite-reduction to extend a siege. **Outcome deferred** (returns a `pendingOutcome` the UI gates
  on — "beats not cuts", per Cull the Crown).
- **`hunt.ts`** — `huntRoll(state)`: dice = Hunt-Box level (≤5), success 6, +1/FP-die-in-box,
  region re-rolls (stronghold/army/nazgûl); `drawHuntTile`; `applyHuntDamage` (corruption,
  companion absorption, reveal); Mordor auto-draw + Stop handling + idle-turn corruption.
- **`fellowship.ts`** — move/declare/hide/guide/separate; Progress; Mordor entry + 5-step track;
  the **view filter** that strips hidden data for the Shadow side.
- **`politics.ts`** — activation triggers, advance (muster/event/auto), At-War gating of
  muster/movement.
- **`muster.ts`** — reinforcements (At-War only), bringing characters/minions/upgrades into play.
- **`cards.ts`** — interpret a card record: legality (`dieToPlay`, `when`), apply `event`/`combat`
  effect via a small scripted-hook vocabulary; draw/discard/hand-limit.
- **`victory.ts`** — `checkMilitary(state)` (phase 6) + immediate Ring checks (corruption 12 / Crack
  of Doom <12).
- **`rules.ts`** — `legalActions(state, side)` + `apply(state, action) => state` (pure). The single
  public reducer the UI **and** a future AI both drive.
- **`index.ts`** — public API: `createGame`, `legalActions`, `apply`, `view(state, asSide)`,
  selectors (`vpFor`, `huntLevel`, `armyAt`, …).

Determinism invariant: `apply` is pure; all randomness is `rng` state inside `GameState`. Replay
from `{config, seed, log}` reproduces any state exactly (mirrors Lacuna's `engine/` + replay tests).

## Render plan (PixiJS v8) — 2.5D standees (decision D9)
- `render/map.ts` — `MapView`: a **perspective-tilted** Middle-earth map; region anchors from
  `data/map`; **2.5D standee sprites** for units (billboarded, depth-sorted), per the Magical
  Athlete `render/board.ts` standee pattern + Cull the Crown 2.5D tilt. Control shading, the Hunt
  Box, and edge highlights for legal moves. `init/update(view)/destroy`; Pixi v8 async init guarded
  (known gotcha — Magical Athlete/Lacuna), created once, never rebuilt on React render.
- `render/stack.ts` — **the headline render component**: a `RegionStack` that renders a region's
  contents legibly from **1 to 10 units** + Leaders/Nazgûl/Characters/Fellowship. Behavior:
  - 1–3 units → individual fanned standees; 4–10 → a depth-sorted **representative cluster** plus a
    **composition/strength/leadership badge** (`4×Reg 2×Eli · ⚔7 · Ldr 3`) — never 10 discrete minis.
  - **Leaders/Nazgûl** = distinct standee silhouettes; **named Characters** = portrait-marker
    overlays pinned to the region; **Fellowship** = its own distinct (last-known) marker.
  - **Hover/select expands** the region into the authoritative full unit list (a DOM/Pixi popover).
  - Built and screenshot-tested **at max density first** (visual-playtest pattern). This is the
    single most important UI artifact for playability — design it before the prettier map dressing.
- `render/tracks.ts` — Political (per nation), Corruption, Mordor, VP tracks as Pixi overlays.
- **Asset seam:** placeholder standee sprites behind an asset manifest (Magical Athlete
  `assets/manifest.ts` pattern) so richer art slots in later without touching layout/logic.
- `render/fx/` — copy the **Cull the Crown `fx/` kit** wholesale (springs, particles, trauma shake,
  staggered pops, animated backdrop) for dice/combat/hunt beats and the living map background.
- Render emits **intents** only (`onRegionClick`, `onDieDrop`, `onConfirm`) → store → engine. No rules in render.

## UI plan (React + Zustand)
- `state/store.ts` — holds `GameState` + ephemeral selection/targeting + the per-seat `view`; all
  mutations go through `engine.apply`. Actions mirror the engine `Action` union.
- Components: `App` (title/game/end routing + phase loop), `TitleScreen`, `GameCanvas` (mounts
  `MapView`), `PhaseBar`, `DiceTray` (per side; drag a die to a target/action), `FellowshipPanel`
  (FP-private), `CombatModal` (the resolver: dice, re-rolls, card play, step log), `HandPanel`,
  `TracksPanel`, `LogModal` (action-log replay, à la Lacuna), `HandoffOverlay` (blur-screen pass),
  `EndScreen`. Keyboard handlers throughout.

## AI approach (out of MVP — engine built to accept a driver)
No AI ships in the MVP, but the engine is **built to accept an AI driver with zero rules changes**.
The contract: the public API `legalActions(view, side)` + `apply(state, action)` is sufficient to
drive a full game **headlessly**, with no UI and no access to hidden state — which is exactly what
the `simulation.test` harness already does. A later AI plugs in as a **pure chooser** over
`legalActions`, dispatched through the same store actions (the Lacuna pattern), consuming `view`
(never raw state, so it can't see the Fellowship), starting heuristic before anything search-based.
**Acceptance for "AI-ready":** a random/scripted chooser can already play a complete game through
the public API in tests. Do not build the AI now.

## Test plan
- **Vitest (engine, headless, exhaustive)** — the safety net for a big ruleset:
  - `dice/phases.test` — pool sizes, face→action mapping, 6-phase order, Eye→Hunt-Box, alternation, draw/discard (turn-1 vs later, hand limit 6).
  - `combat.test` — field hit 5–6 & ≤5 dice; leadership re-roll cap; **siege** atk-6/def-5, 5-unit cap, Elite-reduction extra round; stacking ≤10.
  - `hunt.test` — Hunt level/dice cap, success 6, +1/FP-die, region re-rolls, tile draw, corruption apply, reveal; **Mordor** auto-draw/Stop/idle-corruption.
  - `politics.test` — Passive-except-Elves, every activation + advance trigger, At-War gating of muster.
  - `victory.test` — military 10/4 with City-1/Stronghold-2; immediate corruption-12 and Crack-of-Doom-<12.
  - `view.test` — Shadow `view` **never** leaks Fellowship Progress/Guide/hidden corruption.
  - `cards.test` — the card-effect interpreter on each defined card; encode any rulebook **worked
    example** as an integration test (the Magical Athlete practice).
  - `cards.coverage.test` — asserts **4 decks × 24 = 96 slots**, each with valid deck/die metadata;
    reports real vs. **placeholder** counts (placeholders must be inert/flagged, never fabricated).
  - `simulation.test` — randomized full-game sims over many seeds: always terminates, never reaches
    an illegal state (stacking, dice counts, track bounds), determinism (`{seed,log}`→identical end).
- **Playwright (e2e):** config + a happy-path scaffold added now; **deferred to Stage 5** for the
  screenshot-driven visual playtest (the Magical Athlete/Cull the Crown pattern) — including
  **`RegionStack` density screenshots** (1, 3, 7, 10 units + leaders/characters/Fellowship) to
  prove the stacking readout stays legible.

## Milestones (each independently demoable — the scope ladder)
1. **Engine core I — the war loop.** Map data + setup + dice + phases + army movement + **field
   combat** + political + **military victory**. Headless, fully simulatable. *Demo: a complete
   military-only game vs. scripted inputs.* ✅ gate for everything else. *(D8: war path first.)*
2. **Engine core II — the Ring.** Fellowship + Hunt + corruption + reveal + **Mordor track** +
   Ring victory + the **`view` hidden-info firewall**. *Demo: a full game won by the Ring.*
3. **Sieges & characters.** Siege combat, Companions/Minions, Leadership, the Will-of-the-West
   upgrades (Aragorn / Gandalf the White) and Minion entries (+dice). *Demo: a siege of Minas Tirith.*
4. **Event cards — framework + all 96 slots.** The data-driven interpreter + the **complete 96-card
   deck composition** (24×4), text sourced online (Card sourcing); cards draw/play via Event dice
   with combat-card use. Unsourceable cards ship as **flagged placeholders** (correct slot/deck/die,
   inert) so the decks are always complete. *Demo: full decks in play; `cards.coverage` placeholder
   count tracked toward zero.* (Card data entry runs as a parallel track; it does not block M1–M3.)
5. **UI/render — interactive hot-seat, 2.5D.** The **2.5D standee map** + the **`RegionStack`
   readout** (the headline render task — built and screenshot-tested at max density first), dice
   tray, tracks, combat modal, FP-private panel, handoff overlay, log/replay, end screen.
   *Demo: two humans play a full game on one device with legible 1–10 unit stacks.*
6. **Acceptance pass.** Every criterion in `03-mvp-spec.md` met; living background + game-feel beats
   per Visual identity; accessibility floor. Long-tail cards continue to be populated as data.

## Risks / unknowns
- **Scope is the headline risk.** The milestone ladder exists precisely so each rung ships a
  playable increment; do **not** attempt the whole game before the first demo. Military-only (M1) is
  the deliberate first playable.
- **Event cards — all 96 required (operator decision).** This is a bounded **transcription** task,
  not a coverage gap: full text is available online (warofthering.eu Master Events PDFs, BGG
  Base-Game Card Reference, full-art mods). Mitigations: it's a **parallel data track** that doesn't
  block M1–M3 (the engine is built in M4); any card whose text can't be reliably pinned ships as a
  **flagged placeholder**, never fabricated; `cards.coverage` tracks completion. **Tooling note:**
  the Master PDFs are image-based — extraction needs OCR/`pdftoppm`+tesseract or browser reading;
  budget for it.
- **2.5D stacking legibility (the render headline — decision D9).** A region can hold 10 units +
  Leaders/Nazgûl/Characters/Fellowship; literal per-unit minis don't read. Mitigation: design the
  `RegionStack` readout (representative standees + composition/strength/leadership badges + named-
  character/Fellowship overlays, hover-to-expand) **first**, prototype at **max density**, and
  screenshot-test it early in M5. Legibility beats figure fidelity for this game.
- **`CONFIRM` data tables (map, setup, hunt-pool counts, political steps, characters, cards).** These
  are transcription tasks off the components, not design — flagged in the spec's data-table section;
  parameterized so a correction is a one-line edit. Transcribe the map + setup early (M1 needs them).
- **Hidden-info correctness.** The `view` filter is security-critical for any later online mode and
  must be unit-tested from day one (M2), not retrofitted.
- **Pixi v8 async init + React lifecycle** — known factory gotcha; init once, guard, destroy on unmount.

## Targets & wrapping
Web only for this MVP. Tauri/Capacitor deferred; codebase stays wrap-ready (pure engine, static
Vite build, no Node-only client APIs).
