# Retrospective — Cull the Crown (presentation-focused)

> Mid-flight learning cycle (the game is still in **build/iteration**, not shipped — `/test` not yet
> run). Written to distill the heavy **visual / animation / flow** work into the knowledge base so
> future projects start polished. See `../../knowledge/playbooks/visual-first-try.md`.

## Outcome
- **Status:** build (iterating on feel); not shipped.
- **Targets delivered:** web (Vite dev/build + Playwright e2e). Desktop/mobile wrap deferred.
- **Build rounds:** ~7 visual/feel iterations driven by direct user feedback + Playwright screenshots.

## What was built (visual surface)
A Regicide × Balatro roguelike whose **engine stayed pure** while the presentation grew into a
distinct **8-bit arcade-medieval** identity: an animated plasma backdrop, an arcade-cabinet CRT
bezel, pixel fonts, 2.5D cards (pointer-tilt + detaching shadow), a full **resolution cascade**
(damage pops, particle bursts, screen shake, animated HP), an enemy **attack animation**
(wind-up → lunge → slash + blood), real **deck/discard piles** with inspect modals, **outcome gates**
(felled→Claim with itemized spoils + coin-to-purse animation; deferred legible loss), a **turn
indicator**, **immunity legibility** (crown emblem + colour pill + per-card ⊘ + point-of-play
warning), drag-and-drop play & block, and a first-run **tutorial** + tooltips.

## What worked (reuse)
- **A shared, game-agnostic `fx/` kit** (springs, particles, trauma shake, staggered pops, plasma
  background) carried almost all the feel. Copy it wholesale. `app/src/fx/`.
- **Driving juice off a typed store event** (`fxEvent {kind,result,killed,strike,lost}`) kept the
  engine pure and made the cascade declarative. `app/src/ui/{store.ts,PixiBoard.tsx}` + `render/combatStage.ts`.
- **Playwright + canvas-element screenshots as a visual feedback loop** — the single biggest reason
  iterations converged fast. A `window.__game` dev seam drove real runs; I *looked* at frames.
- **Theme isolated in `render/theme.ts`** → the same kit re-skins per game; only the theme is bespoke.

## What was painful (turn into rules so the next project skips it)
- **First build shipped flat** (smooth gradients, serif, instant screen cuts). Polish was bolted on
  over many rounds. → bake the look/flow into the **spec** and **milestone 1**, not "later".
- **Auto-advancing between outcomes was a real bug**: a kill jumped straight to the shop; a death
  hit the game-over screen in ~0.1s, illegible. → **never auto-switch on an outcome**; animate the
  cause, then gate with a Continue/Claim button.
- **Pixi per-card hit-testing silently failed** (taps resolved to the stage) and was masked because
  every test used the dev seam — real clicks were never exercised. → **stage-level geometry input**
  + a **real-pointer e2e** from the start.
- **Full-page Playwright screenshots of the WebGL canvas came back black** (drawing buffer) — I
  nearly chased it as a game bug. → screenshot the **canvas element**.
- **Fonts**: Pixi `Text` rendered a fallback until web fonts were loaded. → `await document.fonts.load(...)`
  before building text.
- **Balance is untuned** (greedy play often loses the first Jack) — a `/test`-stage job, flagged.

## Reusable assets produced
- `app/src/fx/` (kit), `app/src/render/{theme.ts,cardNode.ts,combatStage.ts}` (themed board + 2.5D +
  cascade + enemy attack + piles), `app/src/ui/{CombatGate.tsx,TransitionLayer.tsx,DeckModal.tsx,HelpOverlay.tsx}`
  (outcome gates, transitions, pile-inspect, tutorial), `tests/e2e/{look,input}.spec.ts` (screenshot
  + real-pointer harness).

## Lessons distilled into the knowledge base
- **Engineering → `knowledge/patterns/presentation-fx.md`:** the fx kit; cascade-from-typed-events;
  defer-outcome-behind-a-Continue-gate (win **and** loss); enemy attack animation; reward-claim coin
  flow; immunity/state legibility; stage-level input + drag; the WebGL-screenshot + font gotchas.
- **Process → `knowledge/playbooks/visual-first-try.md`:** living background = #1 win; commit a theme
  + flow up front; **outcome screens never auto-advance and must show what changed** (+ a collection
  animation); **surface plan-relevant state redundantly** (on the actor, on affected pieces, at the
  point of action); **grow+blink elements the player is forced to act on**; verify real input early;
  the pre-ship visual checklist.
- **Pipeline wiring:** spec template now requires a *Look, feel & flow* section; build-plan template
  has a *Presentation & game-feel* section + a Presentation milestone; `docs/03`/`docs/04` require
  crawling `visual-first-try.md` and running its checklist before the build gate.

---

## Second wave — the production layer (2026-05-23, still in build)

After the visual pass, a second long iteration added the things that separate a "polished board" from
a "finished game": **sound**, a **front-of-house shell**, **run persistence**, and a batch of
presentation/legibility refinements — plus several engineering bugs worth never repeating.

### What was added
- **Audio (the biggest gap).** A self-contained Web Audio engine (`audio/chiptune.ts`): a synthesized
  8-bit music loop + a full SFX kit (click/leaf/select/hold/pile/draw/heal/block/damage/strike/kill/
  coin/buy/jester), per-channel **Music/SFX volume sliders**, a **master mute**, all persisted. Zero
  external audio assets (IP-clean). SFX wired to the typed `fxEvent`, input callbacks, and a generic
  capture-phase button click.
- **Front-of-house shell.** A real **main menu** (Continue / New run / Past runs / Settings / Rules),
  a **Pause** screen (gear icon) that **freezes the board**, **Settings** (audio mixer), a structured
  **Rules** menu, and an end-screen path back to the menu.
- **Run persistence.** Autosave + **Continue** + a **Past runs** history, via the JSON-serializable
  `RunState` in localStorage (`store.ts`). Surrender ends a run cleanly into history.
- **Presentation/legibility refinements.** Gilded cabinet frame + corner HUD plaque + edge-mounted
  control racks; the action box now shows **only the previewed card's suit power with a full
  description + a buff-folded resolution trace**; per-suit distinct enemy sprites; minimal-overkill
  auto-block; **card lists sorted by suit then value-descending everywhere**; deck inspected via a
  **button/modal** (not an inline list); larger legible cards; bigger tooltip/menu fonts.

### Bugs that became rules (now in `build-gotchas.md`)
- **HMR spawned duplicate audio engines** → mute/volume looked broken (orphaned loop). Pin the engine
  to `globalThis`. *(This one recurred twice before being correctly diagnosed — the tell is "SFX work,
  music controls don't.")*
- **Pixi v8 texture GC** threw `returnTexture → undefined.push`; disable texture/renderable GC for
  fixed-asset games + guard `Text` re-rasterization.
- **Stale terminal `fxEvent`** re-fired the kill cascade on the next fight's first input after a board
  remount — seed the FX cursor with the current event id on mount.
- **The hand depleted to empty by fight 3** — deal a fresh full hand at the start of *every* fight
  (reshuffle the used pile if low); added a multi-fight regression e2e.
- **Modal `stopPropagation` killed a bubble-phase global click listener** — use capture phase.

### Lessons distilled this wave
- **Audio → new `knowledge/playbooks/audio-and-sound.md`** (synthesized IP-clean engine, mixer, the
  4 hard rules incl. the HMR singleton; checklist) + wired into the spec/build templates and docs.
- **Shell/persistence → new `knowledge/playbooks/front-of-house-shell.md`** (menu/pause/settings/
  rules baseline + autosave/continue/past-runs off a serializable RunState).
- **Engineering → `knowledge/patterns/build-gotchas.md`** (the 5 bugs above).
- **Process → `knowledge/playbooks/visual-first-try.md`** checklist extended with audio + shell +
  persistence as first-build requirements; `templates/03`,`templates/04`,`docs/03`,`docs/04` updated
  so the next game's spec/build *demand* sound, a settings mixer, a pause/menu shell, and save/continue.

### Meta-lesson
The visual pass (wave 1) made it *look* finished; this wave made it *behave* finished. Both were
bolted on after a "correct but flat/silent/shell-less" first build. The fix is the same each time:
**move these into the spec and milestone 1.** A game with sound, a menu, pause, and save reads as a
product before any balance work — and all of it is reusable, near-identical between games.

---

## Wave 3 — the all-Pixi UI migration (2026-05-25, mid-flight; project still at build)

The first build shipped a **hybrid** UI: a PixiJS "felt" (board + cards) with the sidebar, HUD,
combat controls, and **every modal** in React/DOM floating over it. Over many sessions we then
migrated the *entire* UI to Pixi — felt controls, the guild/pouch band, the run sidebar, and all
**nine** modals (Combat Gate, Run Info, Pause, Deck, Pack, Settings, Past Runs, Run Setup,
Compendium) — onto a Pixi UI kit (`render/ui/`: `modalStage`, `pixiButton`, `wigglyText`, `tokens`)
built up *during* the migration. We then stripped the orphaned DOM: ~12 components and **~2800 lines
of dead CSS** (4306 → 1540), and unified the colour palette to a single source (`theme.ts` →
generated `:root` vars). Final: every modal Pixi, the felt has no DOM islands, build + 23/23 e2e green.

**It looked finished after wave 1; this wave made the chrome *cohesive* — but at a cost that should
never have been paid.** The hybrid was the most expensive possible interim: two of every component
(DOM `CardFace` + Pixi `cardNode`, DOM tooltip + Pixi tip-pop, DOM sidebar + Pixi felt), the DOM/canvas
alignment seam, and an e2e suite whose DOM-button clicks **broke on every modal we moved to canvas**.
We paid to build hybrid *and* to migrate off it.

### Meta-lesson (the expensive one)
**Decide the rendering substrate — DOM vs canvas — at spec/build-plan time, and build the reusable UI
kit *in that substrate* from milestone 2.** For a game whose identity is a unified pixel-art/arcade
look (the chrome must read as part of the rendered scene), commit to a Pixi UI kit on day one; for a
text/form/accessibility-heavy game, commit to DOM. **Never "start DOM to move fast, port later."** Now
generalised into `knowledge/playbooks/ui-architecture.md` (wired from `target-state.md`), with the kit
API, the WebGL-context-budget rules, and the seam-driven test approach — so the next canvas game starts
with the kit instead of re-deriving it.

### Other reusable lessons distilled this wave
- **WebGL context budget** — each full-window Pixi modal holds a GL context; browsers cap ~16, and
  `app.destroy()` doesn't free them promptly → the persistent felt eventually renders blank. Always
  `releaseApp()` on close (stop ticker → blank stage → `loseContext()`); order matters. → build-gotchas.
- **Seam-driven e2e for canvas games** — drive `window.__game`, screenshot the canvas, advance gates via
  `dispatch`, start runs via `newRun()`; `workers:1` + `retries:1` for the WebGL-heavy suite. → build-gotchas.
- **Single token source** — generate the CSS brand vars from `theme.ts` (a build prestep); don't
  hand-maintain two palettes. → target-state / ui-architecture.
- **One typed field in a canvas modal** (seed input) — overlay a positioned DOM `<input>`; canvas can't
  take keystrokes. → ui-architecture.
