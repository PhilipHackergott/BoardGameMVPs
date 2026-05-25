# Stage 4 — Build

**Command:** `/build`  **Agent:** `mvp-builder`  **Output:** `app/` (working web MVP) + `app/README.md`
**Gate question:** *"Is the MVP good enough to playtest?"*

## Purpose

Build a **finished-feeling, content-rich, tuned** version of the spec — a real, runnable web game
that lands at the **target state on the first build**, not a correct-but-flat slice. The bar is the
six rows in `knowledge/playbooks/target-state.md` (correct core · finished feel · not-a-demo ·
content-rich · a real opponent · tuned). Our deepest projects only reached it after days of
hand-driven waves (visual → audio/shell → content → balance); the build's job is to **collapse those
waves into the first pass.** Build follows the milestones in `04-build-plan.md`; it does not redesign
the product. **Read `target-state.md` first.**

## Preconditions (operator-enforced)

- `specification` gate approved.
- `ip.status` is `clear`, or `risky` **with a recorded human decision** (see `legal-and-ip.md`).
  If neither → **blocked**, do not build.

## Inputs

- `knowledge/playbooks/target-state.md` (the definition of done — read first), `03-mvp-spec.md`,
  `04-build-plan.md`, `docs/stack-and-conventions.md`.
- `knowledge/patterns/*` and any prior project's `app/` worth reusing.

## How to build

1. **Scaffold** `app/` per `stack-and-conventions.md` (Vite + React + TS strict + PixiJS,
   Vitest, Playwright). Standard `package.json` scripts **plus `sim`** (see step 7).
2. **Engine + content spine first.** Implement `engine/` to the build plan — *including the
   data-driven content spine* (a content registry + fixed hook points read at decision points;
   default-off must reduce to the base game). Write Vitest *as you go*, incl. ≥1 **full-game
   simulation**. Green before UI. (Crawl `playbooks/content-depth.md` + `patterns/engine.md`.)
3. **Design doc + shared UI shell, before screens.** Write `projects/<slug>/art-direction.md`
   (concept · tokenized palette · one display+body face · the ONE card/piece model · panel/modal/
   button recipes · motion + a11y · audit checklist), then build the reusable **`<Modal>` primitive**
   + shared atoms (`<CardFace>`/token, Button, Panel, tooltip). Every later screen reuses these so
   cohesion is decided, not discovered. Exemplar: `cull-the-crown/art-style.md`.
4. **Render + UI.** Build the Pixi scene and React shell; wire input → engine actions → redraw.
   **Crawl `knowledge/playbooks/visual-first-try.md` and bake the look/flow in from the start** —
   theme module, themed living background, the `fx/` kit, no auto-switching outcomes (gates), state
   legibility. Don't ship flat-then-polish. The "finished, not flat" bar also includes **sound**
   (crawl `playbooks/audio-and-sound.md` — a synthesized music + SFX engine + a volume mixer/mute) and
   the **front-of-house shell + persistence** (crawl `playbooks/front-of-house-shell.md` — main menu,
   a Pause that freezes the board, settings, save/continue/history). Build these in milestone 6, not
   at the very end — every overlay on the shared `<Modal>`.
5. **Content catalog + AI ladder.** Fill the **full base content set** on the spine (cut whole optional
   *modules*, never depth within the core loop). Build a **difficulty ladder** — ≥ Low/Med/Hard off one
   shared `estimate()` (crawl `patterns/ai.md`), not "single difficulty."
6. **Walk the milestones** in order; each should be runnable. Don't jump to polish before the
   loop is playable, but don't stop at "playable" either — the target is the finished state.
7. **Balance harness + first tuning pass.** Add an `npm run sim` AI-vs-AI sweep (crawl
   `playbooks/balance-and-tuning.md`): compress the win-rate spread so nothing is auto-win or dead,
   verify the difficulty ladder actually climbs, and record a one-paragraph balance note.
8. **Acceptance pass.** Implement until every acceptance criterion in `03-mvp-spec.md` is
   demonstrably met, **and the `visual-first-try.md` pre-ship checklist + the `target-state.md`
   pre-gate self-check pass**.
9. **Self-verify before the gate** (see below).
10. Write `app/README.md` (run/build/test/sim instructions) and a short build-notes summary
    (incl. the balance note) into `project-state.json` history.

## Self-verification (required before declaring done)

The build agent must actually run things, not assume:

- `npm run lint` (eslint + `tsc --noEmit`) — clean.
- `npm run test` (Vitest) — all engine tests pass, including full-game simulation.
- `npm run build` — production build succeeds.
- `npm run sim` — the AI-vs-AI balance sweep runs clean (0 errors, 0 non-terminating games), the
  win-rate spread is compressed (no auto-win / dead content), and the difficulty ladder climbs.
- `npm run dev` and confirm the app loads and a full turn can be played. For UI confirmation,
  drive it (Playwright happy-path) **including a real-pointer input test (tap/drag)** — a dev seam
  alone can hide unclickable boards. Screenshot the **canvas element** (full-page WebGL shots can be
  black).
- **Run the `knowledge/playbooks/visual-first-try.md` checklist** — living background, theme, motion,
  no auto-switch outcomes (gates), reward feedback, state legibility, accessibility, **plus the sound
  section** (music + SFX + persisted mixer/mute) **and the shell section** (main menu, pause-that-
  freezes, settings, save/continue/history). A silent or menu-less build is not "done".
- **Run the `knowledge/playbooks/target-state.md` pre-gate self-check** — content-complete &
  data-driven, a sim-verified difficulty ladder, the balance harness ran (+ a one-paragraph note),
  `art-direction.md` exists and the app matches it (tokens, one card/piece model, one primary-action
  colour), and every overlay is built on the shared `<Modal>` primitive. Thin / flat / silent /
  shell-less / untuned are defects, not polish-later.

If the agent cannot verify the UI in this environment, it must **say so explicitly** rather than
claim success — feature correctness is not the same as a green type-check.

## Engine/UI discipline

- No game rules in `ui/` or `render/`. The engine stays pure and deterministic (injected seed).
- Keep it portable: nothing should block a later Tauri/Capacitor wrap.

## Output

- A runnable `app/` (web) at the target state. Optionally Tauri/Capacitor configs **only** if
  `targets` demands it now; otherwise defer wrapping until after the build gate.
- `projects/<slug>/art-direction.md` (the visual-cohesion design doc).
- `app/README.md`.
- Build notes appended to `history` (what was built, what was deferred at the *module* level, the
  one-paragraph balance note, known gaps).

## Gate criteria

Advance to test/iterate when the human agrees the MVP is playable enough to evaluate. Note: this
gate is "good enough to playtest," not "shippable" — that judgment comes after the test stage.

## Iteration with the test stage

`/test` will report defects and fun/usability findings. Those loop back here: re-run `/build`
in revision mode against the playtest report until `/test` passes. Record each build/test round
in `history`.

## Self-learning hooks

- Reusable scaffolding, engine modules, and Pixi/React patterns → `knowledge/patterns/`.
- Build-time gotchas (e.g. Pixi+React lifecycle pitfalls) → `knowledge/patterns/build-gotchas.md`,
  so the next project doesn't rediscover them.
- Reusable UI primitives (the `<Modal>` shell, shared atoms), content-spine shapes, and sim-harness
  scaffolding → `knowledge/patterns/` / the relevant playbook, so the next build clones them.
