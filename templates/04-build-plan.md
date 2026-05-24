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

## Render plan (Pixi)
_Scene structure; what's drawn; **how input maps to engine actions** — do board input at the stage
level with explicit geometry (Pixi per-object hit-testing is unreliable); support drag-and-drop for
the core action(s)._

## UI plan (React)
_Component tree for menus / HUD / settings._

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
_Approach (heuristic / minimax / MCTS as fits); MVP starts simple but not random._

## Test plan
- **Engine (Vitest):** key unit tests + at least one full-game simulation.
- **E2E (Playwright):** happy-path play-through + a **real-pointer** input test (tap/drag, not just
  a dev seam); screenshot the **canvas element** for visual checks.

## Milestones (each independently demoable)
1. Engine + tests
2. Static render — with `render/theme.ts` + the themed living background in place
3. Interactive hot-seat (full loop, win detection) — real-pointer input verified
4. AI opponent
5. Presentation pass — fx kit wired (cascade/particles/shake/pops), outcome gates + transitions +
   reward animation, state legibility; **audio engine** (music + SFX + mixer + mute); **front-of-house
   shell** (main menu / pause-that-freezes / settings / rules) + **save/continue/history**; then run
   the full **visual-first-try checklist** (visuals + sound + shell sections)
6. Acceptance criteria pass

## Risks / unknowns
_and how build should resolve them._

## Targets & wrapping
_Web first. Note any Tauri/Capacitor work if `targets` requires it now; otherwise defer._
