# Cull the Crown — UI Surface & Modal Catalogue

A complete inventory of every screen and modal in the app, with screenshots, as a starting point for a
design-system cleanup and component generalisation. Screenshots live beside this file (`catalog/*.png`),
captured via [`scripts/verify-catalog.mjs`](../scripts/verify-catalog.mjs) (drives the engine through the
`window.__game` dev seam, so each frame is a real render).

_Last regenerated: 2026-05-25._

> **Big shift since the last pass: the UI has largely migrated from DOM to a unified Pixi kit.** Almost
> every screen and overlay is now drawn on a `<canvas>` (PixiJS), not in the DOM. A single Pixi modal
> shell (`render/ui/modalStage.ts`) backs all the migrated overlays; the felt's sidebar, guild band and
> combat controls are Pixi too. The remaining DOM survivors are the Title menu, the Event/End screens,
> the Rules (Help) overlay, the Compendium, the Deck-Peek and a few corner buttons. Several old DOM
> components are now **orphaned** (see "Orphaned / superseded").

---

## Architecture at a glance

- **`App.tsx`** is the phase **router** + always-mounted global layers + app-wide effects (audio, keymap).
- The felt is **two persistent Pixi canvases** — `PixiSidebar` (run sidebar) + `PixiBoard` (the board) —
  shared across combat ↔ shop, so nothing resets between them.
- **Every overlay/modal is now Pixi** (one `ModalStage` shell) **except** the Rules/Help overlay and the
  Compendium (still DOM) and the Deck-Peek hover (DOM).
- A reusable **Pixi UI toolkit** lives in [`src/render/ui/`](../src/render/ui/): `modalStage`, `pixiButton`,
  `tokens`, `wigglyText`.
- Each Pixi overlay mounts its **own full-window `Application`** (its own WebGL context) while open.

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
| **Compendium** (rules + galleries, sidebar nav) | `Collection.tsx` | DOM | Title / Pause → Compendium | [06-compendium.png](06-compendium.png) |
| **The Descent** (Styles / Opponents / Edicts / Stake tabs) | `PixiRunMap.tsx` | Pixi | ⌖ Run Info / `M` | [08-runinfo-descent.png](08-runinfo-descent.png) |
| **Pause Menu** | `PixiPauseMenu.tsx` | Pixi | ⚙ Options / `Esc` in a run | [09-pausemenu.png](09-pausemenu.png) |
| **Deck / pile view** | `PixiDeckModal.tsx` | Pixi | tap deck/used pile; card-picker | [10-deckmodal.png](10-deckmodal.png) |
| **Deck Peek** (draw-pile hover preview) | `DeckPeek.tsx` | DOM | hover the draw pile | [11-deckpeek.png](11-deckpeek.png) |
| **Combat Gate** (claim spoils / see the end) | `PixiCombatGate.tsx` | Pixi (non-dismissable) | fight won/lost | [12-combatgate-win.png](12-combatgate-win.png) |
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
| `tokens.ts` | `shade()` + shared colour tokens for the kit. |
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
| `placeBeside` | `tipPlace.ts` | **live** | side-placement for tooltips (DOM `TooltipLayer` + Pixi `SideTip`) |
| `packMeta` | `packMeta.ts` | **live** | pack/ware labels + tip-type + chips (`TYPE_CHIP`, `RARITY_CHIP`) |
| `TooltipLayer` | `TooltipLayer.tsx` | **live** | global DOM `data-tip` tooltip (spawns beside the element) |
| `TransitionLayer` | `TransitionLayer.tsx` | **live** | intro/victory/defeat wipes |
| `Modal` | `Modal.tsx` | **live** (Help only) | the old DOM modal shell — now backs just `HelpOverlay` |
| `MuteButton` | `MuteButton.tsx` | **live** | corner mute toggle on the chromeless screens (title/event/end) |
| `ItemArt` | `ItemArt.tsx` | **live** | procedural emblem fallback (used by `CardArt` + the dev demo) |

> `PixelArtDemo.tsx` is a dev-only art preview. `render/pixiFixes.ts` guards a Pixi v8.6 texture-pool bug.

### Orphaned / superseded (0 importers — safe to delete)

The DOM combat chrome and card model were replaced by Pixi equivalents and are no longer imported:
`RunSidebar.tsx` (→ `sidebarStage`/`PixiSidebar`), `HeldTray.tsx` (→ `hudLayer` band), `CardArt.tsx` +
`StyleSprite.tsx` + `WaxSeal.tsx` (→ Pixi `cardFace`/`render` art), and the DOM `CardFace.tsx` is already
**deleted**. (`CardArt` keeps one importer, the orphaned `HeldTray`, so it's effectively dead too.)

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
| Close + sidebar nav items | Compendium | `primary` · `comp-nav-item` (+`active`) | close · nav/tab |
| court-event options | Event | `event-option` | choice |
| New run · Main menu | End | `primary` · _(none)_ | primary CTA · base |
| Close (Rules) | Help | Modal `primary` | close |
| pause ⚙ (event) · mute ♪/🔇 | corner / global | `gear-btn` · `mute-btn` | icon corner |

Base button styling is still global (`button` in `styles.css`); `button.primary` is the only global
variant. The orphaned `.danger`, `setup-*`, `cs-*`, `ca-*`, `wild-suit`, `runinfo-tab`, `pack-pick`,
`field-joker`, `held-item` classes belonged to the now-Pixi surfaces and are dead CSS.

### Pixi buttons (no CSS class — `drawButton`)

Run Setup, Settings, Past Runs, The Descent, Pause, Deck modal, Pack modal, Combat Gate, **and** the felt
sidebar (Run Info / Options / Play / Clear / Sort / defend / wildcard picker) all render their buttons via
`drawButton`. State is conveyed by `accent` colour + hover redraw; tabs/toggles are buttons with an active
accent rather than CSS `.active`/`.on`. This is the single biggest standardisation win of the migration.

### Form controls

| Control | Where | How |
|---------|-------|-----|
| Music & SFX volume | Settings (Pixi) | `ModalStage.slider` (draggable 0–1 track) |
| Per-screen soundtrack pick | Settings (Pixi) | `drawButton` steppers |
| Infinite-gold debug toggle | Settings (Pixi) | `drawButton` toggle |
| Seed string | Run Setup (Pixi) | a small **DOM** text-input overlay floated over the Pixi panel |

### Tooltip surfaces

- **`data-tip`** → global DOM `TooltipLayer` (spawns beside the element via `tipPlace.placeBeside`).
- **Pixi `SideTip`** (in `PixiBoard`) → shop-ware + guild-band hover popups (same `placeBeside`).
- Pixi modals draw their own labels/■hover popups inline via `ModalStage` (no separate tooltip layer).

Both real tooltip surfaces now share `placeBeside`, so they behave identically (right of the card, or left
when there's no room, vertically centred + viewport-clamped).

---

## Design-cleanup findings — status after the Pixi migration

The migration resolved most of the original findings (a unified shell + a single button primitive + shared
tokens replace the competing DOM idioms). Remaining work is mostly cleanup of dead DOM/CSS.

### 1. Shared modal shell — ✓ DONE (in Pixi)
One `ModalStage` now backs Run Setup, Settings, Past Runs, The Descent, Pause, Deck, Pack and the Combat
Gate — consistent backdrop, framed panel, ✕, click-outside + `Esc`, `dismissable` flag, accent tint.
**Remaining:** Help & Compendium are still DOM (`Modal` / bespoke `comp-panel`); fold them in (or keep the
two long-form rules views on DOM deliberately).

### 2. Two near-identical sidebars — ✓ DONE
The run sidebar is one Pixi `sidebarStage`/`PixiSidebar` for both combat and shop.

### 3. Card model duplicated DOM vs Pixi — ✓ MOSTLY DONE
The DOM `CardFace.tsx` is deleted; the card model is now one Pixi `render/cardFace.ts`. **Remaining:** the
DOM art helpers (`CardArt`, `StyleSprite`, `WaxSeal`) are orphaned — delete them.

### 4. Two Pixi stages repeat structure — ✓ DONE
One `CombatStage` owns the felt for both combat and the shop (embedded `ShopStage` layer, `setMode`).

### 5. Pack/shop label maps defined 3× — ✓ DONE
Centralised in `packMeta.ts` (now also `TYPE_CHIP` + `RARITY_CHIP`).

### 6. Tooltip mechanisms — ◑ STARTED
Down to two: the DOM `TooltipLayer` and the Pixi `SideTip`, **both** using `tipPlace.placeBeside`. The Pixi
modals draw inline labels instead of a shared tooltip. **Remaining:** unify the modal-internal hover popups
onto the same surface if/when needed.

### 7. `App.tsx` monolith — ✓ DONE
Phase router + global layers only; every screen/overlay is its own file.

### 8. One token source — ○ OPEN (and now wider)
Colours are defined in **three** places: `render/theme.ts` (felt Pixi ints), `render/ui/tokens.ts` (modal
kit), and the CSS custom properties in `styles.css` (the remaining DOM). **Fix:** a single token source
feeding all three.

### 9. Dead DOM + CSS — ○ NEW
The migration left orphaned components (`RunSidebar`, `HeldTray`, `CardArt`, `StyleSprite`, `WaxSeal`) and a
large amount of now-unused CSS (the `cs-*`, `ca-*`, `setup-*`, `wild-*`, `pack-pick`, `field-joker`,
`held-item`, `runinfo-tab`, `.danger`, modal `*-panel`/`help-backdrop` rules). **Fix:** prune both.

---

## Notes for the next pass

- **Migration is in progress.** Run Setup was the most recent overlay migrated to Pixi; Help & Compendium
  are the last DOM holdouts. Expect this catalogue to shift again as those move.
- **Each Pixi overlay is its own `Application`/WebGL context.** The catalogue sweep had to capture the shop
  in a **fresh browser context**: after opening several modal canvases in one session, a same-page reload
  did not free the dead WebGL contexts and the shared felt rendered **blank** in shop mode. Worth watching
  whether long real-play sessions (many modal opens, then shopping) hit the same starvation — if so, pool
  one modal `Application` instead of one-per-overlay.
