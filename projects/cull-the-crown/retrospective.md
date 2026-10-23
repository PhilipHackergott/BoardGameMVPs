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

---

## Wave 8 — Balatro-fidelity pack/enhancement/balance pass (2026-05-30)

A focused polish + balance round driven by point-by-point user feedback against the Balatro reference.
Captures pack-opening take-over fidelity, whole-card visual enhancements, pendingPick safety, the
one-shot Remove economy, gate-reveal timing, and a multi-epoch playtest harness lesson.

### What changed
- **Pack opening is now a full felt take-over against a recoloured plasma**, not a dim modal over
  the shop. Shop tray slides DOWN off the felt while the pack is open (`ShopStage.setCovered`),
  plasma palette swaps to a cooler purple (`PLASMA_PALETTE_PACK`), and the picks render at the
  exact battle-card display size (compensating for the felt-canvas's logical-vs-CSS scale).
  Bottom-tray layout: title + "Choose N" left, Skip button right. `src/render/{combatStage,shopStage}.ts`,
  `src/fx/plasma.ts`, `src/ui/PixiPackModal.tsx`.
- **Whole-card visual enhancements (Balatro Mult/Bonus/Steel/etc.)** — every sigil draws a tinted
  overlay across the *whole face* (red streaks for keen, green diagonals for honed, silvery sheen
  for steel, glass shimmer, gold flecks, …); seals draw an edge halo. Drawn ABOVE the parchment +
  BELOW the rank/suit glyph so the card still reads. Exported from `cardFace.ts` and reused by the
  in-combat `cardNode.ts` so the look is identical everywhere a card appears.
- **Enhancement tooltips (hand + joker)** — hovering a hand card with sigils/seal/twin-suit
  surfaces an explanation panel; the joker tooltip now also explains the edition (prismatic,
  burnished, haloed, shadow) as its own block via a new `EDITION_INFO` lookup. `src/engine/content.ts`,
  `src/render/hudLayer.ts`, `src/ui/PixiBoard.tsx`.
- **PendingPick modals are non-dismissable + explicit Cancel** — clicking outside the panel rect
  while a Remove or targeting tarot is armed used to dismiss the modal and burn the action. Now
  `dismissable: !picking` keeps the picker open until the player either picks a card or hits
  Cancel. `src/ui/PixiDeckModal.tsx`.
- **Remove is once-per-shop, with a visible "USED" backside** — engine tracks `shop.removeSpent`,
  the coin renders dim + ✓ + "USED THIS SHOP" once spent. Run-cumulative `× N` badge tracks
  cross-shop usage. `src/engine/{types,run}.ts`, `src/render/shopStage.ts`, `src/ui/PixiBoard.tsx`.
- **Pouch is view-only outside combat / pack-openings** — `usable` flag on `HudHeldVM`; non-usable
  tiles render dim (alpha 0.55) with a fallback-tint and tap is a no-op. Tooltip notes
  "(Held — usable in combat or while opening a pack.)". `src/render/hudLayer.ts`, `src/ui/PixiBoard.tsx`.
- **Combat-gate reveal shortened** from 1150 ms → 450 ms (won) / 1500 ms → 900 ms (lost). The old
  delay read as "stuck after killing the royal" — players quit before the gate appeared.
- **Engine balance for doubled enemy HP** — Jack 20→40, Queen 30→60, King 40→72; attack scaled
  sub-linearly (Jack 10→7, Queen 15→9, King 20→11) so longer fights don't drain the hand. Max
  combo value 10→16. **Per-turn auto-draw was prototyped (+3) and then REVERTED on design
  guidance:** the game's power curve has to come from **buying combo jokers and refresh
  consumables in the shop**, not from a baseline freebie. The mid-fight hand-economy stays "your
  starting hand + whatever you pay for" — Balatro's draws-per-round refill is the wrong analog
  here; CTC is a deck-management game, not a refill-each-round game.
  `src/engine/{cards,combat,resolution}.ts`.
- **Card aspect ratio unified** — `buildCardFace` used 58/40 (1.45), `CardNode` used 62/44 (1.41).
  Pack-revealed cards looked subtly wrong next to deck cards. Both now use 62/44 sourced from the
  `CardNode` constants. `src/render/cardFace.ts`.
- **Shop tray flicker on shop-entry** — `reset()` set `slide=0` but didn't snap `tray.y` off-felt,
  so the first frame after re-entering shop showed the previous shop's tray at its old position
  before the animation took over. Snap the tray to its off-felt resting position + `alpha=0` inside
  `reset()` so the ticker animates from a *known* off-stage start. `src/render/shopStage.ts`.
- **Pack-modal subscribe loop** — the modal now re-paints on every store change so back-to-back
  packs (or a state mutation mid-pack) update the title/picks correctly without a remount.

### Multi-epoch playtest harness (lessons from the attempt)
A deck × stake parallel sweep harness was built (`tests/playtest/sweep.spec.ts` +
`playwright.sweep.config.ts`) to drive multi-epoch balance passes. We only completed epoch 1
(28 logged runs) before infrastructure issues forced a pivot back to the simpler `playtest-fullrun`
spec. **Lessons for the next factory project:**
- **Playwright `line` reporter drops `console.log` lines** under parallel workers because of TTY
  cursor-up overwrites. The fix is the **`list` reporter** *or* the JSON reporter; line is great
  for interactive runs but unfit for harvesting structured per-test data.
- **Cancelled-sweep Chrome zombies** block subsequent runs by exhausting the page-setup budget.
  Always reap (`Stop-Process -Name chrome -Force`) between sweeps; do it as a `pretest` script.
- **Parallel workers each carry their own browser** so the WebGL-context limit doesn't apply
  cross-worker — but workers > CPU-cores - 2 thrashes the host and tests time out in page-setup.
  Default to `workers: min(4, cores - 2)`; dial down if you see "Test timeout while setting up page".
- **The simpler 5-seed `playtest-fullrun` spec** was the right tool for the iteration loop. The
  giant matrix sweep is great for a *single* end-of-build report; not for tight balance rounds.

### Balance findings worth carrying forward
- Doubled enemy HP without compensation collapses the AI's hand by mid-fight. We prototyped a
  Balatro-style +3 draw per turn and confirmed it works *mechanically* (the AI then consistently
  reached the Kings) — but **design rejected the pattern**: the power curve has to come from the
  shop (combo jokers, refresh consumables), not from a baseline draw. So the correct compensation
  for doubled HP in CTC is **economic** (more gold / better shop selection / more potent
  consumables) plus the **sub-linear attack scaling** (which we kept), not a baseline draw.
- Queens are the typical wall in HP-doubled play — they're the first tier with non-trivial
  suit-immunity matter (mid-game cliff). King HP is the *climactic* dial, but Queens are where
  most weak-AI runs ended in our sweep (~50% of all deaths).
- Sub-linear attack scaling (≈ 75% of HP/6) keeps defence affordable as fights get longer.
- The shop AI in tests matters: a no-shop AI ends most runs at the first Queen; a buy-one-relic AI
  consistently reaches the final King. Real players shop more — so a balance tuned to the no-shop
  AI is probably too easy for real play, and tuned to a strong shopping AI is probably too hard.
