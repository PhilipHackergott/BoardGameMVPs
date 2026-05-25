# Build Plan — {{TITLE}}

> Stage 3 (Specification), the *how*. Produced by `spec-writer`. See `../../docs/03-specification.md`
> and `../../docs/stack-and-conventions.md`.

## Stack
_Confirm react-ts-pixi, or justify any deviation._

## Engine design (the heart — pure, deterministic)
- **State shape:** _types._
- **Action set:** _the actions a player/AI can take._
- **Reducer contract:** `reduce(state, action) -> state` (pure).
- **Legal-move generation / validation:**
- **Determinism / seed strategy:** _so games are replayable from {config, seed, action-log}._

## Content spine  (crawl `../../knowledge/playbooks/content-depth.md` + `patterns/engine.md`)
_The skeleton that makes a rich catalog affordable — build it in milestone 1, fill it in milestone 4._
- **Content registry:** _the data shape for each piece (cards/powers/relics/enemies/events/variants)._
- **Fixed hook points + resolution order:** _where content acts in the reducer; per-entity content stored clone-safe._
- **Default-off contract:** _no content set ⇒ exactly the base game (base-game tests stay valid)._
- **Shared predicates:** _one predicate per cross-cutting rule (displacement/immunity/etc.)._

## Render plan (Pixi)
_Scene structure; what's drawn; **how input maps to engine actions** — do board input at the stage
level with explicit geometry (Pixi per-object hit-testing is unreliable); support drag-and-drop for
the core action(s)._

## UI plan (React)
_Component tree for menus / HUD / settings. **Build the shared UI shell first**: ONE `<Modal>`/overlay
primitive (backdrop, themed panel, Esc/backdrop close, focus trap, scroll-lock, reduce-motion) + shared
atoms (`<CardFace>`/token, Button, Panel, tooltip), then drop each screen into it — see `target-state.md`._

## Design / art-direction  (crawl `../../knowledge/playbooks/target-state.md`)
_Write `projects/<slug>/art-direction.md` before screens: concept · palette as named tokens (`:root` +
`render/theme.ts`, synced) · one display + one body face · the ONE card/piece model · panel/modal/button
recipes · motion + a11y · a component audit checklist. Exemplar: `cull-the-crown/art-style.md`._

## Presentation & game-feel  (crawl `../../knowledge/playbooks/visual-first-try.md`)
_Bake the look in from milestone 1 — don't ship flat-then-polish. Plan:_
- **Reuse the `fx/` kit** (springs, particles, shake, pops, plasma background) — copy `cull-the-crown/app/src/fx/`.
- **`render/theme.ts`**: palette + fonts (loaded before first `Text`) + icon style; **a themed living background**.
- **Game-feel**: which actions get pops/particles/shake; the resolution cascade driven off a typed UI event.
- **Flow**: no auto-switch on outcomes — defer the engine transition + a Continue/Claim gate; reward-collection animation; intro/win/loss transitions; a turn indicator.
- **Reuse**: outcome gate `cull-the-crown CombatGate.tsx`; transitions `TransitionLayer.tsx`; tutorial/tooltips `HelpOverlay.tsx`.

## Sound  (crawl `../../knowledge/playbooks/audio-and-sound.md`)
- **Reuse** the synthesized audio engine — copy `cull-the-crown/app/src/audio/chiptune.ts`, re-voice.
- Music loop + SFX kit wired to the typed UI event / input callbacks; a generic **capture-phase** button click.
- A **Settings mixer** (Music + SFX sliders + mute, persisted); mute **double-gates**; engine pinned to `globalThis` (HMR-safe).

## Shell, settings & persistence  (crawl `../../knowledge/playbooks/front-of-house-shell.md`)
- **Main menu** (Continue/New/History/Settings/Rules), **Pause** that stops the render ticker, **Settings**, **Rules** — copy `cull-the-crown/app/src/ui/{App,PauseMenu,SettingsMenu,PastRunsOverlay}.tsx`.
- **Persistence** in the UI store: autosave the serializable game state, Continue, run-history; clear on new/end.

## AI plan
_Approach (heuristic / minimax / MCTS as fits); simple but not random. A **difficulty ladder** off one
shared `estimate()` (≥ Low heuristic+jitter / Med greedy / Hard lookahead) — `patterns/ai.md`. The AI
doubles as the balance instrument, so build it well enough to measure content._

## Balance & tuning  (crawl `../../knowledge/playbooks/balance-and-tuning.md`)
- **Sim harness:** a headless AI-vs-AI sweep in `tests/sim/`, `npm run sim` → win-rate table + `balance-sim.json`.
- **Method:** random content→seat assignment; N≥600/category; `winRate=(wins+0.5·draws)/appearances`; alternate seats for the ladder test.
- **Targets:** compress the spread (no auto-win / dead content); the ladder climbs (harder tier wins >50%).
- **First tuning pass** in build; flag AI-blind content for `/test`; write a one-paragraph balance note.

## Test plan
- **Engine (Vitest):** key unit tests + at least one full-game simulation.
- **Sim (Vitest, `npm run sim`):** AI-vs-AI balance sweep (0 errors / 0 non-terminating) + the ladder test.
- **E2E (Playwright):** happy-path play-through + a **real-pointer** input test (tap/drag, not just
  a dev seam); screenshot the **canvas element** for visual checks.

## Milestones (each independently demoable — the target-state shape; see `target-state.md`)
1. **Engine + content spine + tests** — rules + the data registry/hook points; full-game sim green
2. **Design doc + shared shell + static render** — `art-direction.md`, the `<Modal>` primitive + atoms,
   `render/theme.ts` + themed living background
3. **Interactive core loop** (full loop, win/lose) — real-pointer input verified
4. **Content catalog + AI ladder** — fill the full base content set on the spine; Low/Med/Hard off one evaluator
5. **Presentation pass** — fx kit wired (cascade/particles/shake/pops), outcome gates + transitions +
   reward animation, state legibility; **audio engine** (music + SFX + mixer + mute); **front-of-house
   shell** (main menu / pause-that-freezes / settings / rules) + **save/continue/history** (every overlay
   on the shared `<Modal>`); then run the full **visual-first-try checklist** (visuals + sound + shell)
6. **Balance harness + first tuning pass** — `npm run sim`, compress the spread, verify the ladder climbs
7. **Acceptance pass** — all criteria + the visual-first-try checklist + the `target-state.md` pre-gate self-check

## Risks / unknowns
_and how build should resolve them._

## Targets & wrapping
_Web first. Note any Tauri/Capacitor work if `targets` requires it now; otherwise defer._
