# Stage 4 — Build

**Command:** `/build`  **Agent:** `mvp-builder`  **Output:** `app/` (working web MVP) + `app/README.md`
**Gate question:** *"Is the MVP good enough to playtest?"*

## Purpose

Build the smallest **playable and correct** version of the spec — a real, runnable web app.
Build follows the milestones in `04-build-plan.md`; it does not redesign the product.

## Preconditions (operator-enforced)

- `specification` gate approved.
- `ip.status` is `clear`, or `risky` **with a recorded human decision** (see `legal-and-ip.md`).
  If neither → **blocked**, do not build.

## Inputs

- `03-mvp-spec.md`, `04-build-plan.md`, `docs/stack-and-conventions.md`.
- `knowledge/patterns/*` and any prior project's `app/` worth reusing.

## How to build

1. **Scaffold** `app/` per `stack-and-conventions.md` (Vite + React + TS strict + PixiJS,
   Vitest, Playwright). Standard `package.json` scripts.
2. **Engine first.** Implement `engine/` to the build plan and write Vitest tests *as you go*,
   including at least one **full-game simulation** test. The engine must be green before UI.
3. **Render + UI.** Build the Pixi scene and React shell; wire input → engine actions → redraw.
   **Crawl `knowledge/playbooks/visual-first-try.md` and bake the look/flow in from the start** —
   theme module, themed living background, the `fx/` kit, no auto-switching outcomes (gates), state
   legibility. Don't ship flat-then-polish. The "finished, not flat" bar also includes **sound**
   (crawl `playbooks/audio-and-sound.md` — a synthesized music + SFX engine + a volume mixer/mute) and
   the **front-of-house shell + persistence** (crawl `playbooks/front-of-house-shell.md` — main menu,
   a Pause that freezes the board, settings, save/continue/history). Build these in milestone 5, not
   at the very end.
4. **AI** per the plan (single difficulty for MVP).
5. **Walk the milestones** in order; each should be runnable. Don't jump to polish before the
   loop is playable.
6. **Acceptance pass.** Implement until every acceptance criterion in `03-mvp-spec.md` is
   demonstrably met, **and the `visual-first-try.md` pre-ship checklist passes**.
7. **Self-verify before the gate** (see below).
8. Write `app/README.md` (run/build/test instructions) and a short build-notes summary into
   `project-state.json` history.

## Self-verification (required before declaring done)

The build agent must actually run things, not assume:

- `npm run lint` (eslint + `tsc --noEmit`) — clean.
- `npm run test` (Vitest) — all engine tests pass, including full-game simulation.
- `npm run build` — production build succeeds.
- `npm run dev` and confirm the app loads and a full turn can be played. For UI confirmation,
  drive it (Playwright happy-path) **including a real-pointer input test (tap/drag)** — a dev seam
  alone can hide unclickable boards. Screenshot the **canvas element** (full-page WebGL shots can be
  black).
- **Run the `knowledge/playbooks/visual-first-try.md` checklist** — living background, theme, motion,
  no auto-switch outcomes (gates), reward feedback, state legibility, accessibility, **plus the sound
  section** (music + SFX + persisted mixer/mute) **and the shell section** (main menu, pause-that-
  freezes, settings, save/continue/history). A silent or menu-less build is not "done".

If the agent cannot verify the UI in this environment, it must **say so explicitly** rather than
claim success — feature correctness is not the same as a green type-check.

## Engine/UI discipline

- No game rules in `ui/` or `render/`. The engine stays pure and deterministic (injected seed).
- Keep it portable: nothing should block a later Tauri/Capacitor wrap.

## Output

- A runnable `app/` (web). Optionally Tauri/Capacitor configs **only** if `targets` demands it
  now; otherwise defer wrapping until after the build gate.
- `app/README.md`.
- Build notes appended to `history` (what was built, what was deferred, known gaps).

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
