# Build Plan — TCG Circuit (working title)

> Stage 3 (Specification), the *how*. See `../../docs/03-specification.md` + `../../docs/stack-and-conventions.md`.
> Pairs with `03-mvp-spec.md`. Original concept, **2D Pixi, high-res GBA-era pixel art**.
>
> **▶ MVP RE-SCOPE (user, 2026-05-25): build the CARD GAME, not the world.** This round builds
> **`engine/prism/`** + the duel UI + the deckbuilder + the AI ladder + the balance sim + a thin
> play/iterate harness. **`engine/career/` and the whole JRPG world are designed + concept-arted only
> (deferred).** Sections/milestones tagged **[MVP build]** vs **[Deferred]** accordingly.

## Stack
**Default `react-ts-pixi`** — confirmed. TS (strict) + Vite + React + Zustand + **PixiJS v8** +
Vitest + Playwright. Pixel pipeline: a **fixed low-res logical canvas (~480×320 = 2× GBA)**, integer
**nearest-neighbor upscale**, `antialias:false`, a **pixel font loaded before the first `Text`**
(reuse Cull the Crown's `render/theme.ts` low-res-upscale approach + the Pixi-v8 async-init guard from
`patterns/build-gotchas.md`).

## Engine design (the heart — pure, deterministic)
The MVP heart is **`engine/prism/`**. `engine/career/` is **designed below but deferred** (build later).

### 1) `engine/prism/` — the TCG duel  **[MVP build — the whole game this round]**
- **State shape:** `Duel = { turn, active, players:[P,P], rngState, log[] }`; `P = { nexus:Life,
  maxLight, light, refractUsed:boolean, hand:Card[], deck:Card[], discard:Card[], lanes:[Slot,Slot,Slot] }`;
  `Slot = { unit?: UnitInstance }`; `UnitInstance = { cardId, power, dmgTaken, shield, keywords, justPlayed }`.
- **Action set:** `deployUnit(card,lane)`, `castSpell(card,targets)`, `attachGear(card,target)`,
  `refract(card)`, `declareCombat(laneOrder)`, `endTurn`. + `beginTurn` internal (max-Light++, refill,
  draw, reset refract).
- **Reducer contract:** `reduce(duel, action) -> duel` (pure). Resolution order per the spec
  (deploy/cast/attach → combat lane-by-lane → end-of-turn cleanup: clear dmg, expire Volatile, etc.).
- **Legal-move generation:** `legalMoves(duel, player)` — the single source the UI **and** the AI use
  (affordability, lane occupancy, targeting, refract-once). This is what makes the AI honest + the UI gateable.
- **Determinism / seed:** serializable seeded RNG (shuffle/draw) threaded in `rngState`; a duel replays
  from `{decks, seed, action-log}`. (Reuse `magical-athlete/engine/rng.ts`.)

### 2) `engine/career/` — the scene sim  **[Designed; DEFERRED — not built this round]**
- **State shape:** `Career = { day, slotsLeft, calendar, money, fame, collection:Record<CardId,qty>,
  decks:DeckList[], market:Record<CardId,price>, meta:MetaState, story:{flags}, rngState }`.
- **Action set:** `useTimeSlot(activity)`, `openPack(setId)`, `buySingle/sellSingle(cardId)`,
  `saveDeck(deck)`, `enterTournament(id)` (→ spins up PRISM duels), `advanceDay`.
- **Reducer contract:** pure `reduce(career, action)`; tournaments compose the PRISM engine (run a bracket
  of duels, fold results back into money/fame/collection/story). Deterministic + seeded.

## Content spine (crawl `../../knowledge/playbooks/content-depth.md` + `patterns/engine.md`)
Two registries; both **data, default-off ⇒ base skeleton**.
- **Card registry (`engine/content/cards.ts`):** `CardDef = { id, name, affinity, type, cost, power?,
  keywords[], text, rarity, setId, art }`. **Keyword effects** live as pure handlers at **fixed PRISM
  hook points** (`onDeploy`, `onCombatDealt`, `onDestroyed`, `onTurnEnd`, `modifyCombat`) — one handler
  per keyword, clone-safe per UnitInstance. Spells/Gear declare typed `effects`.
- **World registry (`engine/content/`):** `opponents.ts` (deck + tier + persona), `npcs.ts` + `dialogue`,
  `locations.ts`, `tournaments.ts`, `marketSeed.ts` + the meta-weighting model, `packs.ts` (contents +
  rarity weights + pity ⚑), `events.ts`.
- **Default-off contract:** empty registries ⇒ engines run with no cards/world (base rules + base sim
  still simulate + test). Content is additive.
- **Shared predicates:** one `canPay(light,cost)`, one `isLegalDeck(deck)`, one `affinityOf`, one
  `marketPrice(cardId, meta)`, one `meetsStoryReq` — reused across UI, AI, sim, market.
- **Asset-manifest seam** (like `magical-athlete/assets/manifest.ts`): card art resolves placeholder →
  final pixel art without engine changes.

## Render plan (Pixi)
- **Overworld (`render/overworld/`):** a **tilemap** renderer (16px tiles, the GBA pipeline) + sprite
  NPCs/player with **4-dir walk** + a camera that follows the player; interaction zones (doors, NPCs,
  objects). Input: keyboard/d-pad + pointer; **stage-level hit-testing** for taps (per-object Pixi
  hit-test is unreliable — `build-gotchas.md`).
- **Duel screen (`render/duel/`):** the PRISM board — opponent (top) + you (bottom) Nexus/hand, the
  **3 lanes** center, Light gauge, buttons. **Drag-and-drop** a card to a lane to deploy; tap to
  cast/target; **stage-level geometry hit-testing** for cards/lanes. Projects `Duel` state → board;
  emits engine actions. The resolution **cascade** (deploy → clash → damage pops → shake) is driven off a
  typed FX event from the store.
- Both reuse `render/theme.ts` (palette + per-Affinity ramps + pixel font + tokens).

## UI plan (React)
- **Shared shell first:** ONE `<Modal>`/overlay primitive + atoms — `<CardFace>` (the ONE card model),
  `<DeckRow>`, `Button`, `Panel`, `Tooltip`, `<CurveBar>` (Light curve). Then screens.
- **Component tree:** `App` → `MainMenu` | `Overworld`(Pixi) + `OverworldHUD` | `Duel`(Pixi) + `DuelHUD` |
  `Deckbuilder` | `Binder` | `Market` | `PackOpen` | `TournamentBracket` | `ResultGate` | `PauseMenu` |
  `SettingsMenu` | `HistoryOverlay`. Dense card/list/market UI is **DOM** over the canvas; the boards are Pixi.
- **Zustand store** wires dispatch → both engines, holds session/UI + the typed FX event stream.

## Design / art-direction (crawl `../../knowledge/playbooks/target-state.md`)
Write `projects/tcg-circuit/art-direction.md` **before screens** (M2): the **GBA pixel pipeline**
(low-res canvas + nearest-neighbor + pixel font); palette tokens + **per-Affinity ramps** synced `:root`
↔ `render/theme.ts`; **16px tile spec**, **sprite size/anim spec** (16×24–24×32, 4-dir), **portrait
spec**; **the ONE `<CardFace>` model** (per-Affinity pixel frame + art window + cost gem + power);
panel/menu recipes; a11y; a component audit checklist. Anchor to `concept-art/pixel-style-sample.html`.
(Exemplar pipeline: `cull-the-crown/art-style.md` + `render/theme.ts`.)

## Presentation & game-feel (crawl `../../knowledge/playbooks/visual-first-try.md`)
- **Reuse the `fx/` kit** (`cull-the-crown/app/src/fx/`) — springs/particles/shake/pops/plasma; re-voice
  the plasma bg to a calm duel felt + a parallax overworld.
- **`render/theme.ts`:** the pixel pipeline + palette + per-Affinity ramps + the living backgrounds.
- **Game-feel:** card deal/hover/deploy springs, lane-clash hit + trauma shake + particles, Nexus-damage
  pops, **the pack-rip reveal** (staggered card flips — the dopamine beat), coin-to-wallet on prizes.
- **Flow:** **no auto-switch** — a duel defers its end to a Continue-gated `ResultGate` (prizes itemized +
  collected); tournament rounds via a bracket screen; **legible loss** (animate the lethal, then gate).
  Reuse `cull-the-crown/ui/{CombatGate,TransitionLayer}.tsx`; tutorial/tooltips `HelpOverlay.tsx`.

## Sound (crawl `../../knowledge/playbooks/audio-and-sound.md`)
Reuse the synth engine — copy `cull-the-crown/app/src/audio/chiptune.ts`, **re-voice to GBA chiptune**:
per-screen music (overworld / card-shop / duel / victory-fanfare + menu) and the SFX kit (deal/deploy/
clash/Nexus-hit/refract/draw/**pack-rip+reveal**/coin/UI-click capture-phase/bracket-advance). Music
swaps by screen; **mixer** (Music + SFX sliders + mute, persisted); mute double-gates; engine pinned to
`globalThis` (HMR-safe).

## Shell, settings & persistence (crawl `../../knowledge/playbooks/front-of-house-shell.md`)
Reuse `cull-the-crown/app/src/ui/{App,PauseMenu,SettingsMenu,PastRunsOverlay}.tsx`: main menu (New/
Continue/History/Settings/Rules), **Pause that stops the Pixi ticker** (duel + overworld), Settings
(mixer + a11y), Rules ("How to play PRISM"). **Persistence:** autosave the serializable `Career` state
(slot-based) → Continue + results history; duel restart-safe (⚑ mid-duel resume optional).

## AI plan (crawl `../../knowledge/patterns/ai.md`; full design in `tcg-design.md` §4)
PRISM opponents off **one shared `evaluate(duel, player)`** (Nexus diff + board power + card advantage +
tempo) driven by **one continuous `skill ∈ [0,1]` dial — NOT fixed tiers** (so the career can ramp
difficulty finely). `chooseMove(duel, player, skill, persona)` scales monotonically with skill:
- **softmax move-selection, temperature `T = f(1−skill)`** (high T → loose/blundery; `T→0` → near-optimal),
- **planning budget** (≈0-ply → deep **MCTS-with-determinization**) scaling with skill,
- **eval completeness** (partial/noisy → full + opponent-hand modelling), **Refract/lane craft**, and a
  **decaying blunder floor**. Named bands (Beginner…Worlds-class) are UX labels over points on the scale.
- **persona weights** on `evaluate` are orthogonal (aggro/control/combo) → varied *and* strong at any rating.
AI plays **through the real `legalMoves`/`reduce`** (no cheating) → it's also the **balance instrument**.
Make it **watchable** (two-beat move + pause gate, like Lacuna's AI driver). (Top-of-scale stretch ⚑:
an AlphaZero-lite self-play net — Lacuna RL precedent.)

## Balance & tuning (crawl `../../knowledge/playbooks/balance-and-tuning.md`)
- **Sim harness:** `tests/sim/`, `npm run sim` → archetype win-rate matrix + a **skill-monotonicity sweep**
  + `balance-sim.json`. Method: every archetype deck vs every other, N ≥ 600/pairing, alternating play/draw,
  fixed skill; the skill sweep pits sampled `skill` values across `[0,1]`.
- **Targets:** compress the archetype spread (no auto-win deck, no dead archetype); **no dead cards**;
  the **skill scale is monotone** (higher `skill` beats lower, pairwise + smoothly — the career ramp is
  real). First tuning pass in build (card stats/costs/curve, the play/draw rule); AI-blind cards → `/test`.
  One-paragraph balance note.

## Test plan  **[card-game MVP]**
- **Engine (Vitest):** PRISM rules (Light/Refract, deploy/cast/attach legality, 3-lane combat, keywords,
  win/alt-loss) incl. **a full-duel simulation**. *(Career-sim tests come with that deferred build.)*
- **Sim (`npm run sim`):** the PRISM archetype matrix + the Low/Med/Hard ladder (0 errors / 0 non-terminating).
- **E2E (Playwright):** happy path — boot → menu → build/pick a deck → start a duel → **play a turn via
  real pointer** (drag a card to a lane, end turn) → result gate; a Gauntlet rung advance. Screenshot the
  **canvas** (duel + deckbuilder). Dev seam `window.__tcg` (set seed, set decks, jump into a duel).

## Milestones (each independently demoable — PRISM is the whole MVP this round)
1. **PRISM engine + card spine + tests** — full duel rules + the card registry/keyword hooks; a couple of
   archetypes to test with; full-duel sim green. **No UI.** *(Prove the game is good headless first.)*
2. **Art-direction doc + shared shell + static duel board** — `art-direction.md` + the GBA pixel pipeline
   in `render/theme.ts`, `<Modal>` + `<CardFace>` atoms; the duel board draws from a fixed `Duel` state.
3. **Interactive duel** (full PRISM loop vs a stub AI) — drag-to-deploy, combat, win/lose, **real-pointer verified**.
4. **Full set + gallery + deckbuilder + AI scale + harness** — fill the **~60-card** launch set + ~12–16
   opponent decks + prebuilt decks; the **card gallery** (cards by Set) + **deckbuilder** (30/max-3/affinity/
   curve); the **continuous `skill` scale** (named bands) off one evaluator + personas; the **Free Play /
   Gauntlet / starter** harness (the AI measures the content).
5. **Feel + sound + shell** — fx cascade (clash/shake/pops/Nexus-pops) + outcome gates; the GBA chiptune
   engine (duel music + SFX + mixer + mute); main menu + mode select + pause + settings + deck-save
   persistence; run the visual-first-try checklist.
6. **Balance harness + first tuning pass** — `npm run sim`; compress the archetype spread; verify the
   ladder climbs; **tune PRISM to fun** (the point of this MVP). Balance note.
7. **Acceptance pass** — card-game criteria + visual-first-try checklist + `target-state.md` self-check.
> **[Deferred, later round]** the world: overworld + locations + the `engine/career/` sim (time slots,
> money, **market**, **packs-in-world**, shop **tournaments**, the **rival/career arc**, the **community
> forum/blog**, the regional-qualifier capstone). Designed in the GDD + shown in `concept-art/` now.

## Risks / unknowns
- **Is PRISM actually fun?** — the whole point of this re-scope. Headless-sim it in M1, get it playable in
  M3, and **iterate the ruleset numbers + feel against real play** before any world investment.
- **Original-IP discipline** — original cards/mechanics/art/brand only.
- **Card-art volume** (~90–120) → asset-manifest seam + a single pixel `<CardFace>` model: ship with
  generated/placeholder pixel art keyed by Affinity+motif; commission/AI-pixel finals later. Don't gate MVP on art.
- **Pixel pipeline correctness** (crispness, font-before-Text, Pixi-v8 init) → reuse CtC's known-good
  pattern + the documented gotchas.
- **AI watchability + honesty** → AI through real `legalMoves`; a two-beat move pace.

## Targets & wrapping
Web first (`targets: web, desktop, mobile`). Tauri/Capacitor deferred until the web MVP passes its gate.
Mobile: confirm drag-to-deploy + deckbuilder usability by touch + the pixel canvas scaling on small
screens — a `/test` item, not an MVP blocker.
