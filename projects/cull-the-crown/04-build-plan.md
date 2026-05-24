# Build Plan — Cull the Crown

> Stage 3 (Specification), the *how*. Operator-run inline, 2026-05-21. Implements `03-mvp-spec.md`
> against `../../docs/stack-and-conventions.md`. **Build order: combat engine first** (user choice).

## Stack
Factory default: **Vite + React + TypeScript (strict) + PixiJS v8**, **Zustand** for UI/session
state, **Vitest** for engine tests, **Playwright** scaffolded for Stage 5 (not run in this build).
Pure `engine/` + thin `render/`/`ui/`. No deviations.

## Engine design (pure, deterministic — the heart)

Files under `app/src/engine/`:

- **`types.ts`** — domain types:
  - `Suit = 'H'|'D'|'C'|'S'`; `Rank = 2..10 | 'A'(animal companion=1) | 'J'esterValue(0)`; royals
    `'JACK'|'QUEEN'|'KING'` exist only as enemies, not hand cards in the MVP.
  - `Card { id, suit, value, kind:'number'|'companion'|'jester' }`.
  - `Enemy { tier:'jack'|'queen'|'king', health, attack, immuneSuit:Suit, immunityCancelled:boolean, damageTaken, shield }`.
  - `Joker { id, name, slotCost:1, price, sellValue, hooks: Partial<Record<Phase, ModFn>> }`.
  - `SuitUpgrades { H:number, D:number, C:number, S:number }` (from Class Training).
  - `RunConfig { startGold, handMax, interestPer, interestCap, exactKillMult, fightReward:{jack,queen,king}, rerollBase, ... }`.
  - `RunState { config, seed, rngCursor, deck:Card[], hand:Card[], discard:Card[], gold, slots:Joker[], suitUpgrades, castle:Enemy[], enemyIndex, combat:CombatState|null, shop:ShopState|null, phase:'title'|'combat'|'shop'|'won'|'lost', log:Action[] }`.
  - `CombatState { enemy, yieldedLastTurn, firstAttackDone }`.
  - `Action` union: `{type:'newRun',seed}` · `{type:'play', cardIds:Id[]}` · `{type:'yield'}` ·
    `{type:'buyJoker', offerId}` · `{type:'sellJoker', slotId}` · `{type:'useConsumable', offerId, targetCardId?}` ·
    `{type:'reroll'}` · `{type:'nextFight'}`.
- **`rng.ts`** — reuse the **`mulberry32(seed)`** pattern from
  `../../lacuna/app/src/engine/rng.ts`; add `shuffle(arr, rng)` (Fisher–Yates). Determinism: the
  RNG state lives in `RunState` (seed + cursor) so reducers stay pure and replay is exact.
- **`resolution.ts` — the resolution stack** *(the technically hard part the user flagged)*:
  - A pure pipeline `resolvePlay(combat, selection, jokers, upgrades) -> ResolutionResult`
    where `ResolutionResult { damage, heal, draw, shield, goldDelta, trace: Step[] }` (the `trace`
    feeds the UI's step-by-step readout).
  - **Ordered phases** (named so jokers hook precisely):
    1. `PARSE` — validate the selection → base value, contributing suits (combo: equal rank, sum ≤ 10;
       companion pairing: value 1 + one card; jester: value 0).
    2. `AGGREGATE` — combine values (combo/companion summed value `v`).
    3. `BASE_POWERS` — compute per-suit base effects at `v` applying `SuitUpgrades`
       (Hearts heal `v+upg.H`; Diamonds draw `v+upg.D`; Spades shield `v+upg.S`;
       Clubs damage `2*(club portion)+upg.C`; non-club damage = its value).
    4. `JOKERS` — run each active joker's hook for the current phase, **in slot order**; jokers are
       pure `ModFn = (ctx) => ctx`. (Bloodstained Shield adds spade damage = shield; Opportunist
       adds an extra club-double for multi-card combos; Field Medic +2 heal; Duelist doubles damage
       if `!firstAttackDone`; etc.) Phase-tagged so e.g. Bloodstained runs **after** shield exists.
    5. `IMMUNITY` — if `enemy.immuneSuit` is in the play and not cancelled, **zero that suit's
       power** (heal/draw/shield/double) but **keep its raw damage**.
    6. `FINALIZE` — sum to `ResolutionResult`; emit `trace`.
  - This module is **the** unit-test target; ordering is explicit and locked by tests.
- **`combat.ts`** — `applyCombatAction(run, action) -> run` for `play`/`yield`:
  - `play`: run `resolvePlay`; apply heal (shuffle discard, `heal` cards under deck via rng), draw,
    add shield to enemy, add damage to `enemy.damageTaken`; move played cards to discard. Then
    **defeat check**: `damageTaken >= health` → defeat; `== health` → exact-kill gold bonus; reveal
    next enemy / win; killer skips Step 4. Else **Step 4**: enemy attacks `max(0, attack - shield)`;
    auto/asserted discard to cover; if hand can't cover → `phase:'lost'`. Jester sets
    `immunityCancelled=true`.
  - `yield`: enforce no-double-yield → if forced and impossible, `lost`; else go to Step 4.
- **`run.ts`** — run lifecycle & shop:
  - `createRun(seed, config?)`: build 54-card deck + 12-royal castle (within-rank shuffle), deal
    opening hand, `phase:'combat'`.
  - On fight win: compute gold (tier reward × exact-kill mult + interest), open shop.
  - Shop reducers: `generateShop(rng)` (offers from `content.ts`), `buyJoker`, `sellJoker`,
    `useConsumable` (recruit→swap card to companion; train→bump `suitUpgrades`; cull→remove card),
    `reroll` (escalating cost), `nextFight` (deal fresh hand vs next enemy).
- **`content.ts`** — the **joker & consumable library as data** (so the "full roguelike" content
  grows without engine changes): the 8 jokers in the spec + the 3 consumable types, each as a
  record with metadata + hook functions.
- **`index.ts`** — public API: `createRun`, `applyAction` (routes combat/shop), selectors
  (`legalPlays(hand)`, `previewPlay(run, cardIds)` → `ResolutionResult` for the staging area,
  `currentEnemy`, `runSummary`). Determinism: only the engine touches the PRNG; replay from
  `{seed, action-log}` reproduces state exactly.

## Render plan (PixiJS v8)
- `render/combatView.ts` — a `CombatView` class (`init/update/destroy`): draws the enemy panel
  (HP/attack/immunity/shield), the hand (card sprites, original suit icons w/ shape accents), the
  staging area, and the **resolution readout** animating `ResolutionResult.trace` step by step.
  Emits intents via callbacks (`onSelectCard`, `onPlay`, `onYield`); no rules here.
- `render/shopView.ts` — lighter `ShopView`: offers, prices, slot tray, deck list, reroll/next.
- Pixi v8 async `Application.init`; created **once** and reused, destroyed on unmount (the lacuna
  gotcha — guard React lifecycle).

## UI plan (React)
- `state/store.ts` (Zustand): holds `RunState` + ephemeral `selection { cardIds }` + messages.
  Actions wrap engine pure fns: `newRun(seed?)`, `selectCard(id)`, `play()`, `yield()`,
  `buy/sell/useConsumable/reroll/nextFight()`. All game mutation goes through `applyAction`.
- Components: `App` (router: title/combat/shop/end), `TitleScreen`, `CombatScreen`
  (`GameCanvas` mounting `CombatView` + `StagingPanel` + `RunHud`), `RunHud` (gold, 5 guild slots,
  gauntlet progress, deck/discard counts), `ShopScreen` (`ShopPanel` + `DeckList` + slot tray),
  `EndScreen` (victory/defeat + run summary + New Run). Keyboard handlers (Enter=Play, etc.).

## AI plan
**None.** Enemies are deterministic (fixed health/attack + a flat Step-4 counter-attack); there is
no decision-making opponent to search. Documented here as an explicit non-requirement so the test
stage doesn't expect an AI.

## Test plan
- **Vitest (engine, headless, exhaustive):**
  - `resolution.test` — **the core**: each suit power at value & with upgrades; clubs doubling;
    immunity zeroing power-but-not-damage; Jester cancel; **each joker's** delta (Bloodstained adds
    spade damage; Opportunist double-triggers clubs in a combo; Jester's Twin draw 3 + value 5;
    Field Medic/Quartermaster/Duelist/Tithe/Sapper); **phase-ordering** assertions.
  - `combat.test` — combos (equal rank, ≤10) & companion pairing math; Hearts-before-Diamonds;
    defeat detection; **exact-kill** bonus vs over/under-kill; Step-4 shield subtraction; can't-cover
    → loss; killer skips Step 4; no-double-yield.
  - `run.test` — deck/castle construction & seed determinism; gold (reward + tier + exact-kill +
    interest); shop buy/sell/reroll accounting; each consumable's **persistent** deck mutation;
    12th-King → win.
  - `simulation.test` — **randomized full-run simulation** over many seeds with a simple greedy
    policy: always terminates (win or loss), never illegal state (hand ≤ max, slots ≤ 5, gold ≥ 0,
    deck/discard conserve cards minus culls), and `{seed, log}` replays to an identical final state.
- **Playwright (e2e):** config + one happy-path placeholder added but **deferred to Stage 5**.

## Milestones (each independently demoable; combat-engine-first)
1. **Combat engine + resolution stack + tests** — `types/rng/resolution/combat` + the
   resolution/combat/`simulation` tests. Fully playable headless (one fight, scripted plays). ✅
   gate for the rest. *(This is where the "complex suit-trigger math" lives.)*
2. **Static render** — `CombatView` draws a fixed combat state (enemy + hand + staging).
3. **Interactive single fight** — select/play/yield, resolution readout animates, win/lose a fight.
4. **Run layer** — `run.ts` + `content.ts`: gauntlet sequencing, shop, gold/interest, jokers &
   consumables & cull integrated end-to-end (a full 12-royal run is playable). Start with a **thin
   joker/consumable library**, expand as data.
5. **Polish + accessibility + acceptance** — every criterion in `03-mvp-spec.md` passes; keyboard,
   colorblind-safe suits, legible resolution readout; CC-BY credits.

## Risks / unknowns
- **Scope (top risk):** "full roguelike" is large for an MVP. Mitigation: data-driven content so
  milestone 4 ships a thin library that grows; milestones 1–3 are a *complete* single-fight slice
  that's valuable on its own and de-risks the hard combat math early.
- **Resolution-stack ordering** with multiple stacked jokers (e.g. Bloodstained after shield,
  Opportunist on combos, Duelist on first attack): pin the named phases in `resolution.ts` and lock
  every interaction with `resolution.test`. The `trace` doubles as a debugging aid.
- **Determinism of Hearts heal-shuffle & draws:** route *every* shuffle/draw through the seeded RNG
  cursor in `RunState`; never call `Math.random`.
- **Hand/auto-discard UX in Step 4:** decide whether the player chooses discards or the engine
  auto-covers (recommend: player chooses, with an "auto-cover cheapest" helper) — resolve in M3.

## Targets & wrapping
Web first. Tauri/Capacitor wrapping deferred; the codebase stays wrap-ready (pure engine, static
Vite build, no Node-only client APIs).
