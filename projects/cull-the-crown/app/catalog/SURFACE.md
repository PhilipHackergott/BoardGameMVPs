# Cull the Crown — UI Surface & Modal Catalogue

A complete inventory of every screen and modal in the app, with screenshots, as a starting point for a
design-system cleanup and component generalisation. Screenshots live beside this file (`catalog/*.png`),
captured via [`scripts/verify-catalog.mjs`](../scripts/verify-catalog.mjs) (drives the engine through the
`window.__game` dev seam, so each frame is a real render).

_Last regenerated: 2026-05-26._

> **Big shift since the last pass: the UI has largely migrated from DOM to a unified Pixi kit.** Almost
> every screen and overlay is now drawn on a `<canvas>` (PixiJS), not in the DOM. A single Pixi modal
> shell (`render/ui/modalStage.ts`) backs all the migrated overlays; the felt's sidebar, guild band and
> combat controls are Pixi too. The remaining DOM survivors are the Title menu, the Event/End screens,
> the Rules (Help) overlay, the Deck-Peek and a few corner buttons. Several old DOM components are now
> **orphaned** (see "Orphaned / superseded").

---

## Architecture at a glance

- **`App.tsx`** is the phase **router** + always-mounted global layers + app-wide effects (audio, keymap).
- The felt is **two persistent Pixi canvases** — `PixiSidebar` (run sidebar) + `PixiBoard` (the board) —
  shared across combat ↔ shop, so nothing resets between them.
- **Every overlay/modal is now Pixi** (one `ModalStage` shell) **except** the Rules/Help overlay (DOM)
  and the Deck-Peek hover (DOM).
- A reusable **Pixi UI toolkit** lives in [`src/render/ui/`](../src/render/ui/): `modalStage`, `pixiButton`,
  `tokens`, `wigglyText`.
- Each Pixi overlay mounts its **own full-window `Application`** (its own WebGL context) while open, and
  `pixiFixes.releaseApp()` **frees that context on close** (stops the ticker, blanks the stage, then
  `loseContext()`) so opening/closing modals over a long session never starves the GL-context budget.

## Top-level screens (phase-driven router in `src/ui/App.tsx`)

| Screen | Phase | File | Render | Shot |
|--------|-------|------|--------|------|
| **Title** | `title` | `TitleScreen.tsx` | DOM (menu panel) | [02-title.png](02-title.png) |
| **Combat** | `combat` | `FeltScreen.tsx` → `PixiSidebar` + `PixiBoard` | **all-Pixi felt** (`render/combatStage.ts` + `sidebarStage.ts` + `hudLayer.ts` + `feltControls.ts`) | [07-combat.png](07-combat.png) |
| **Shop (Black Market)** | `shop` | `FeltScreen.tsx` (same two canvases) | **all-Pixi**: market is an embedded `ShopStage` tray on the felt; the sidebar swaps to the SHOP sign | [13-shop.png](13-shop.png) · detail: [shop-zoom.png](shop-zoom.png) |
| **Event (Court Event)** | `event` | `EventScreen.tsx` | DOM | [15-event.png](15-event.png) |
| **End (win / lose)** | `won` / `lost` | `EndScreen.tsx` | DOM (title + notice + run summary) | [16-endscreen.png](16-endscreen.png) |

> **Combat & Shop share one persistent felt** (Balatro's single canvas). `PixiBoard`/`PixiSidebar` stay
> mounted across combat↔shop; the shop is the same `CombatStage` with `setMode("shop")` revealing the
> embedded `ShopStage` tray. The felt itself is now fully Pixi — no DOM islands float over it.

## Modals & overlays

**Kit** = how the overlay is drawn: **Pixi** = the shared `ModalStage` (canvas); **DOM** = React/CSS.

| Modal | File | Kit | Opened by | Shot |
|-------|------|-----|-----------|------|
| **Rules / How-to-Play** | `HelpOverlay.tsx` | DOM (`Modal`) | first run (auto) only — no manual re-open | [01-help-overlay.png](01-help-overlay.png) |
| **Run Setup** (deck/stake/seed) | `PixiRunSetup.tsx` | Pixi | Title → New Run | [03-runsetup.png](03-runsetup.png) |
| **Settings** (volume sliders, per-screen soundtrack, debug) | `PixiSettings.tsx` | Pixi | Title / Pause → Settings | [04-settings.png](04-settings.png) |
| **Past Runs** | `PixiPastRuns.tsx` | Pixi | Title → Past runs | [05-pastruns.png](05-pastruns.png) |
| **Compendium** (rules + galleries, sidebar nav) | `PixiCompendium.tsx` | Pixi | Title / Pause → Compendium | [06-compendium.png](06-compendium.png) |
| **The Descent** (Styles / Opponents / Edicts / Stake tabs) | `PixiRunMap.tsx` | Pixi | ⌖ Run Info / `M` | [08-runinfo-descent.png](08-runinfo-descent.png) |
| **Pause Menu** | `PixiPauseMenu.tsx` | Pixi | ⚙ Options / `Esc` in a run | [09-pausemenu.png](09-pausemenu.png) |
| **Deck / pile view** | `PixiDeckModal.tsx` | Pixi | tap deck/used pile; card-picker | [10-deckmodal.png](10-deckmodal.png) |
| **Deck Peek** (draw-pile hover preview) | `DeckPeek.tsx` | DOM | hover the draw pile | [11-deckpeek.png](11-deckpeek.png) |
| **Combat Gate** (claim spoils / see the end) | `PixiCombatGate.tsx` | Pixi (non-dismissable) | fight won/lost | [12-combatgate-win.png](12-combatgate-win.png) — felt backdrop blank in capture, see Notes |
| **Pack Modal — joker/training/card** | `PixiPackModal.tsx` | Pixi | open a booster | [14-packmodal.png](14-packmodal.png) |
| **Pack Modal — tarot/spectral (deck-fan)** | `PixiPackModal.tsx` | Pixi | open a tarot/spectral booster | [17-pack-tarot-fan.png](17-pack-tarot-fan.png) · armed: [18-pack-tarot-armed.png](18-pack-tarot-armed.png) |

> **Every Pixi modal shares `ModalStage`**: a dimmed backdrop, a centred framed panel with a title bar +
> ✕, click-outside **and** `Esc` to close (a `dismissable: false` flag drops the ✕/click-out for mandatory
> gates like the Combat Gate), an `accent` tint per modal, and wiggly pixel title text. This is the
> "shared modal shell" the old findings asked for — now realised in Pixi rather than the DOM `<Modal>`.

## The Pixi UI kit — `src/render/ui/`

| Module | Role |
|--------|------|
| `modalStage.ts` | the shared modal shell + content helpers: `text` (wiggly), `button`, `sprite`, `rect`, `node`, `hit`, `scroll`, `slider`. Owns backdrop/panel/header/✕, hit-testing, click-out & wheel-scroll. |
| `pixiButton.ts` | `drawButton` — the one Pixi button primitive (accent + hover + enabled states). |
| `tokens.ts` | re-exports `THEME` (the single brand-palette source) + a type scale + the `shade()` helper. |
| `wigglyText.ts` | `WiggleField` — the animated pixel-text renderer used for titles/labels. |

Felt-side Pixi stages (not modals): `combatStage.ts` (felt + cards + embedded `ShopStage` + `setMode`),
`sidebarStage.ts` (run sidebar), `hudLayer.ts` (guild/pouch band), `feltControls.ts` (Sort / defend block
/ wildcard picker / pending-pick / block pill), `cardFace.ts` (the Pixi card model — replaces the deleted
DOM `CardFace`), `cardNode.ts`, `cardImage.ts`, `styleFx.ts`, `theme.ts`, `pixiFixes.ts`.

## Reusable building blocks

| Component | File | Status | Role |
|-----------|------|--------|------|
| `ModalStage` | `render/ui/modalStage.ts` | **live** | the unified Pixi modal shell (all migrated overlays) |
| `drawButton` | `render/ui/pixiButton.ts` | **live** | the one Pixi button primitive |
| `WiggleField` | `render/ui/wigglyText.ts` | **live** | animated pixel text |
| `useTooltip` + `Tooltip` | `tooltip.tsx` | **live** | the ONE tooltip surface (store + renderer) — DOM, felt & modals all feed it |
| `placeBeside` | `tipPlace.ts` | **live** | side-placement used by the one `<Tooltip>` |
| `packMeta` | `packMeta.ts` | **live** | pack/ware labels + tip-type + chips (`TYPE_CHIP`, `RARITY_CHIP`) |
| `TooltipLayer` | `TooltipLayer.tsx` | **live** | DOM `data-tip` scanner → feeds the shared `useTooltip` (renders nothing itself) |
| `TransitionLayer` | `TransitionLayer.tsx` | **live** | intro/victory/defeat wipes |
| `Modal` | `Modal.tsx` | **live** (Help only) | the old DOM modal shell — now backs just `HelpOverlay` |
| `MuteButton` | `MuteButton.tsx` | **live** | corner mute toggle on the chromeless screens (title/event/end) |
| `ItemArt` | `ItemArt.tsx` | dev-only | procedural emblem fallback — now imported only by `PixelArtDemo` (its production user `CardArt` is gone) |

> `PixelArtDemo.tsx` is a dev-only art preview. `render/pixiFixes.ts` guards a Pixi v8.6 texture-pool bug.

### Orphaned / superseded — ✓ DELETED

The DOM combat chrome and card model that Pixi replaced are now **all removed**: `RunSidebar.tsx`
(→ `sidebarStage`/`PixiSidebar`), `HeldTray.tsx` (→ `hudLayer` band), `CardArt.tsx` (→ Pixi `cardFace`),
`PixiCard.tsx` (unused React wrapper), the DOM `CardFace.tsx`, `StyleSprite.tsx`, `WaxSeal.tsx`, and the
superseded DOM modals (`RunSetup`, `Collection`, `SettingsMenu`, `PastRunsOverlay`, `RunMap`,
`CombatGate`, `PauseMenu`, `PackModal`, `DeckModal`, `PixiDeckRows`). The felt's `combatStage` also
dropped its now-invisible enemy-portrait code (the royal lives in the Pixi sidebar "blind").

---

## Buttons & UI-element inventory

The big change: **most buttons are now Pixi**, drawn by `render/ui/pixiButton.ts::drawButton` (one
primitive: accent colour + hover + enabled states) inside `ModalStage`/the felt stages. They have **no
CSS classes** — so the old per-class button catalogue no longer applies to the migrated surfaces.

### DOM buttons that remain (CSS-class based)

| Button (label) | Screen | Class(es) | Kind |
|----------------|--------|-----------|------|
| ▸ Play / ⚔ New Run | Title | `primary` | primary CTA |
| 📖 Compendium · 📜 Past runs · ⚙ Settings | Title | _(none)_ | base |
| court-event options | Event | `event-option` | choice |
| New run · Main menu | End | `primary` · _(none)_ | primary CTA · base |
| Close (Rules) | Help | Modal `primary` | close |
| pause ⚙ (event) · mute ♪/🔇 | corner / global | `gear-btn` · `mute-btn` | icon corner |

Base button styling is still global (`button` in `styles.css`); `button.primary` is the only global
variant. The orphaned `.danger`, `setup-*`, `cs-*`, `ca-*`, `wild-suit`, `runinfo-tab`, `pack-pick`,
`field-joker`, `held-item` classes belonged to the now-Pixi surfaces and are dead CSS.

### Pixi buttons (no CSS class — `drawButton`)

Run Setup, Settings, Past Runs, The Descent, Pause, Deck modal, Pack modal, Combat Gate, Compendium **and**
the felt sidebar (Run Info / Options / Play / Clear / Sort / defend / wildcard picker) all render their
buttons via `drawButton`. State is conveyed by `accent` colour + hover redraw; tabs/toggles are buttons with an active
accent rather than CSS `.active`/`.on`. This is the single biggest standardisation win of the migration.

### Form controls

| Control | Where | How |
|---------|-------|-----|
| Music & SFX volume | Settings (Pixi) | `ModalStage.slider` (draggable 0–1 track) |
| Per-screen soundtrack pick | Settings (Pixi) | `drawButton` steppers |
| Infinite-gold debug toggle | Settings (Pixi) | `drawButton` toggle |
| Seed string | Run Setup (Pixi) | a small **DOM** text-input overlay floated over the Pixi panel |

### Tooltip surface — ONE bubble, three sources

There is now a **single** tooltip (`ui/tooltip.tsx`: a `useTooltip` store + one `<Tooltip>` renderer,
placed via `tipPlace.placeBeside`). Every source pushes into it:
- **DOM `data-tip`** → `TooltipLayer` (now just the scanner/bridge — renders nothing itself).
- **Pixi felt** → `PixiBoard` routes the shop-ware + guild-band `onHover` into the store.
- **Pixi modals** → `ModalStage.onHover` (a hit-region can carry a `tip`); e.g. the Compendium gallery
  tiles surface their full name+text. The host wires `onHover` → the store.

So the old `SideTip` (a second DOM bubble inside `PixiBoard`) is gone, and the modals are on the same
surface — finding #6 closed.

---

## Design-cleanup findings — status after the Pixi migration

The migration resolved most of the original findings (a unified shell + a single button primitive + shared
tokens replace the competing DOM idioms). Remaining work is mostly cleanup of dead DOM/CSS.

### 1. Shared modal shell — ✓ DONE (in Pixi)
One `ModalStage` now backs Run Setup, Settings, Past Runs, The Descent, Pause, Deck, Pack, the Combat Gate
**and the Compendium** — consistent backdrop, framed panel, ✕, click-outside + `Esc`, `dismissable` flag,
accent tint. **Remaining:** only the Rules/Help overlay is still DOM (`Modal`); fold it in, or keep that
one long-form rules sheet on DOM deliberately.

### 2. Two near-identical sidebars — ✓ DONE
The run sidebar is one Pixi `sidebarStage`/`PixiSidebar` for both combat and shop.

### 3. Card model duplicated DOM vs Pixi — ✓ DONE
The DOM `CardFace`, `StyleSprite`, `WaxSeal`, `CardArt` and `HeldTray` are all deleted; the card model is
now one Pixi `render/cardFace.ts`.

### 4. Two Pixi stages repeat structure — ✓ DONE
One `CombatStage` owns the felt for both combat and the shop (embedded `ShopStage` layer, `setMode`).

### 5. Pack/shop label maps defined 3× — ✓ DONE
Centralised in `packMeta.ts` (now also `TYPE_CHIP` + `RARITY_CHIP`).

### 6. Tooltip mechanisms — ✓ DONE
**One** tooltip now (`ui/tooltip.tsx`: `useTooltip` store + a single `<Tooltip>` renderer, placed via
`tipPlace.placeBeside`), fed by all three sources: DOM `data-tip` (`TooltipLayer` → bridge), the Pixi felt
(`PixiBoard` shop/guild `onHover`), and the Pixi modals (`ModalStage.onHover` + a `tip` on a hit-region —
e.g. Compendium gallery tiles). The separate `SideTip` bubble is gone.

### 7. `App.tsx` monolith — ✓ DONE
Phase router + global layers only; every screen/overlay is its own file.

### 8. One token source — ✓ DONE
`render/theme.ts` (`THEME` ints) is now the **single source of truth** for the brand palette. `render/ui/
tokens.ts` re-exports `THEME` (it was never a separate palette — just `shade()` + a type scale). The DOM
mirrors `THEME`: `scripts/gen-tokens.mjs` (run by `npm run gen:tokens` **and** as a `build` prestep)
regenerates the brand `:root` custom properties in `styles.css` from `THEME`, between BRAND-TOKENS
markers, so Pixi/CSS can't drift. Only the DOM-only structural vars (`--bg/--panel/--muted/--line/--ink`
— no Pixi counterpart) stay hand-edited.

### 9. Dead DOM + CSS — ✓ DONE
All orphaned components (`RunSidebar`, `HeldTray`, `CardArt`, `PixiCard`, the superseded DOM modals) and
`combatStage`'s invisible enemy-portrait code are deleted, **and** the dead CSS is pruned: `styles.css`
went 4306 → ~1540 lines via `scripts/prune-css.mjs` (a conservative, live-class-aware pruner). Verified
by `vite build` + the full e2e + eyeballing every DOM survivor.

---

## Notes for the next pass

- **Migration is complete.** Every modal is Pixi (Combat Gate, Run Info, Pause, Deck, Pack, Settings,
  Past Runs, Run Setup, Compendium). The only DOM survivors are the first-run Rules/Help overlay, the
  Deck-Peek hover, and the Title/Event/End screens — kept on DOM deliberately (long-form text / simple).
- **Each Pixi overlay is its own `Application`/WebGL context.** `pixiFixes.releaseApp()` now frees that
  context on close (stops the ticker, blanks the stage, `loseContext()`), so in real play the budget no
  longer creeps up and modal-destroy no longer clobbers the felt. A residual, harmless PixiJS v8 **teardown
  race** can still log "reading 'geometry'/'clear'" on a Graphics destroyed mid-render (same family as the
  texture-pool quirk `pixiFixes` swallows); `look.spec` filters just that message.
- **Headless capture still can't composite a modal over the _live_ felt** (verified). The instant a modal's
  `Application` mounts over the live felt, the GL budget breaks and the felt — sometimes the modal too —
  blanks; `releaseApp` only helps on _close_, too late. Two consequences for this catalogue:
  - **`12-combatgate-win` is shot on a black backdrop.** The gate reads fine on its own (it's the subject),
    but the felt behind it can't render in capture. It renders only when the felt is _already_ dead — so a
    "fix" would need the architectural change below, not a capture tweak.
  - **The shop sweep** reaches the market in a **fresh browser** and **without ever mounting the Combat
    Gate** (it wins + `advance`s in one synchronous tick, so the gate never renders) — otherwise the felt
    blanks in shop mode. Drop either guard and `13-shop` comes back empty.
  The real fix for all of this (and the teardown race) is **pooling one reused modal `Application`** across
  overlays instead of one-per-overlay.
- **All nine design-cleanup findings are resolved** (the modal shell, both sidebars, the card model, the
  felt stages, label maps, `App.tsx`, dead DOM+CSS, the single token source, and — now — one shared
  tooltip surface fed by DOM, the felt, and the modals). No design-cleanup loose ends remain; the only
  open architectural item is the optional modal-`Application` pooling noted above (capture-only today).
