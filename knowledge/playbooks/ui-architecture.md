# UI architecture — pick the rendering substrate up front, then build the kit *in it*

> Why this exists. **Cull the Crown's UI was built DOM-first** — a DOM sidebar, HUD, modals and buttons
> floating over a Pixi "felt" — and then **migrated to Pixi piece by piece over many sessions**: felt →
> sidebar → HUD → cards → each modal, with a shared Pixi kit extracted only at the very end. The
> migration cost (re-deriving every component, fighting the DOM/canvas seam, rerouting every e2e test)
> *dwarfed* any early speed DOM bought. The fix is the same shape as the rest of `target-state.md`:
> **decide the substrate at spec/build-plan time and build the reusable UI kit in that substrate from
> milestone 2 — don't retrofit it.** This is the canvas-game companion to target-state §"Reusable UI
> primitives", which assumed DOM.

## The decision (make it in the build plan, not by drift)

- **Default to DOM** for text-heavy / form-heavy / accessibility-critical UIs (Lacuna, Roomies): native
  scroll, inputs, focus and a11y for free; the DOM `<Modal>` + `data-tip` primitives in
  `target-state.md` apply as written.
- **Commit to a canvas (Pixi) UI kit from day one** when the game's identity is a **unified pixel-art /
  arcade / Balatro-style look** — where the chrome must read as part of the rendered scene (crisp pixel
  text, wiggle, the board *and* the sidebar/HUD/modals all one aesthetic). Cull the Crown is this case.
- **The trap to design out: "start DOM to move fast, port to canvas later."** Don't. The two-substrate
  interim is the *most* expensive state — you maintain two of everything and fight the seam (below), and
  then pay the full migration anyway. Pick once, at the start.

## Why DOM-over-canvas is the expensive interim

When DOM chrome floats over a Pixi scene you hit these, repeatedly:

- **Two of every component** — DOM `CardFace` *and* Pixi `cardNode`; DOM tooltip *and* a Pixi tip-pop;
  DOM sidebar *and* the Pixi felt — each re-encoding the same model, colours and tip text.
- **The alignment seam** — `object-fit: contain` letterboxing, z-index, and pointer pass-through between
  a DOM overlay and the canvas beneath. Mapping a DOM element to a logical canvas coordinate is fiddly
  and re-breaks on every resize.
- **Test churn** — every DOM→Pixi migration *deletes the DOM selectors your e2e specs click*; each one
  must be rerouted to the dev seam. (We did this for the gate, run-info, deck, pause… one at a time.)
- **Dead-code debt** — when the migration finishes, the DOM half is *orphaned*: CTC shed ~12 dead
  components **and ~2800 lines of dead CSS** (`styles.css` 4306 → 1540). It's harmless but huge, and
  pruning it safely is its own careful task: a conservative live-class-aware pruner
  (`scripts/prune-css.mjs` — over-approximate the live set incl. dynamic `prefix-${…}` classes; keep all
  `@media`/`@keyframes`/element/`:root` rules; drop only rules whose every selector is a dead class).
  Choosing the substrate up front means **none of this debt is ever created.**

## The Pixi UI kit (a milestone-2 deliverable) — copy CTC's `app/src/render/ui/`

- **`wigglyText.ts` — the typeface.** A `WiggleField` splits each label into **per-character glyphs that
  bob/tilt on a staggered phase** ("living text", Balatro-style). A surface owns one field, rebuilds its
  labels each redraw, and ticks it once per frame; wrapped paragraphs stay a single `Text`.
- **`tokens.ts`** — `shade(color, amt)` + a `TYPE` size scale; it **re-exports `THEME`** (it is *not* a
  second palette). Make `THEME` the **single source of truth** and *generate* the DOM side: a tiny
  `scripts/gen-tokens.mjs` (run as a `build` prestep) rewrites the brand `:root` custom properties in the
  CSS from `THEME` between markers, so the canvas and DOM palettes **can't drift**. Don't hand-maintain
  two lists — that was finding #8. (DOM-only structural colours with no canvas counterpart — `--bg`,
  `--panel`, `--muted` — stay hand-edited in the CSS.)
- **`pixiButton.ts` — `drawButton`** — tinted-accent fill + accent stroke + a wiggle label, with
  hover/disabled states. The **host owns the hit-testing** (it knows the bounds + `onTap`).
- **`modalStage.ts` — `ModalStage`** — full-window dimmed backdrop + centred framed panel + title bar +
  ✕, content drawn by a callback via `m.text/button/sprite/rect/node/hit/slider/scroll/para`,
  click-outside/✕ dismiss, `dismissable` + `accent` options, resize-aware. **Each modal mounts its OWN
  full-window Pixi app while open** — modals are blocking, so capturing every pointer event is correct,
  and it never destabilises the persistent felt/sidebar apps — **but it MUST free its WebGL context on
  close** (`releaseApp`: stop ticker → blank stage → `loseContext()`), or the ~16-context browser budget
  leaks and the felt goes blank (build-gotchas). CTC migrated **all nine** modals onto this one shell
  (Pause, Combat Gate, Run-Info, Deck, Pack, Settings, Past Runs, Run Setup, Compendium) — each an
  ~80–200-line file. Copy any of them.

## Conventions that make a canvas UI actually work

- **Stage-level geometry hit-testing, not per-object Pixi interactivity.** Per-object `eventMode` proved
  unreliable through a CSS-upscaled canvas; instead the stage keeps a `hits[]` list (`{x,y,w,h,fn}`) +
  one `pointertap`/`globalpointermove` handler and finds the hit itself (**topmost-first**, so
  overlapping cards win). Buttons restyle on hover; plain hit regions (cards) don't — so dragging across
  a big grid never forces a full rebuild.
- **One offscreen rasteriser for repeated art** — `render/cardImage.ts` rasterises the *one* card model
  to cached data-URL textures, so DOM and canvas show the identical face and you never spin a WebGL
  context per card.
- **Sharpness/feel** — render `resolution: 2–3` for crisp pixel text; `scaleMode:"nearest"` on art;
  `image-rendering: pixelated` on the canvas; per-character wiggle on headlines/labels.
- **Tabs = styled buttons** (active accent vs dim; React holds the tab state, rebuild on change).
- **The text-heavy-menu widgets now exist in the kit — reuse them:** `slider` (drag, for volume),
  `scroll` (a masked region that **measures its own content height** so wrapped prose/galleries scroll
  without you computing it), and `para` (a wrapped `Text` that returns its height so blocks flow). With
  these, even the Compendium (long rules + galleries) and Past Runs migrate cleanly.
- **A typed field inside a canvas modal** (e.g. a seed input) — canvas can't accept keystrokes, so
  overlay a positioned **DOM `<input>`** on the canvas (fixed-position, styled to match), shown only
  while that field is active. The one sanctioned DOM island in a canvas modal.

## Testing a canvas UI (you lose DOM selectors)

- Drive state through the `window.__game` dev seam; assert a modal mounted via its host
  (`.pixi-modal-host canvas` visible) + a screenshot, and that it tears down on close
  (`toHaveCount(0)`).
- **Migrating a DOM modal to Pixi removes its DOM buttons** — grep the e2e suite for the button labels
  and reroute those clicks to the seam (`dispatch` / a store action). Pixi modal-app init is async
  (WebGL + fonts), so use **generous `toBeVisible` timeouts** or it flakes under parallel load.

## The rule

Decide the substrate in the build plan. If the look is canvas-native, **the UI kit is a milestone-2
deliverable built in Pixi**, exactly as the DOM `<Modal>` is for DOM games — not a thing you retrofit.
`target-state.md` §"Reusable UI primitives" then applies in whichever substrate you chose.

## Reference

- **Cull the Crown** — the kit lives in `app/src/render/ui/` (`wigglyText`, `tokens`, `pixiButton`,
  `modalStage`); modals on the shell in `app/src/ui/Pixi{PauseMenu,CombatGate,RunMap,DeckModal}.tsx`;
  felt chrome in `app/src/render/{sidebarStage,hudLayer,combatStage}.ts`; the shared rasteriser in
  `app/src/render/cardImage.ts`. Its `project-state.json` history is the blow-by-blow of the DOM→Pixi
  migration this playbook tells you to skip by choosing the substrate first.
- **Lacuna / Roomies** — the DOM path done right when the substrate choice *is* DOM
  (`front-of-house-shell.md`, `target-state.md` §"Reusable UI primitives").
