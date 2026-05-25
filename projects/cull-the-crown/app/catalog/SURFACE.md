# Cull the Crown — UI Surface & Modal Catalogue

A complete inventory of every screen and modal in the app, with screenshots, as a starting point for a
design-system cleanup and component generalisation. Screenshots live beside this file (`catalog/*.png`),
captured via [`scripts/verify-catalog.mjs`](../scripts/verify-catalog.mjs) (drives the engine through the
`window.__game` dev seam, so each frame is a real render).

_Last regenerated: 2026-05-25._

---

## Top-level screens (phase-driven router in `src/ui/App.tsx`)

`App.tsx` is now just the phase **router** + the always-mounted global layers (transitions, tooltips,
the combat gate, the modals) + app-wide effects (audio gestures, the global keyboard map). Each screen
lives in its own file under `src/ui/`.

| Screen | Phase | File | Render | Shot |
|--------|-------|------|--------|------|
| **Title** | `title` | `TitleScreen.tsx` | DOM | [02-title.png](02-title.png) |
| **Combat** | `combat` | `FeltScreen.tsx` | DOM sidebar (`RunSidebar`) + Pixi `PixiBoard` → `CombatStage` (`render/combatStage.ts`, `render/cardNode.ts`) | [07-combat.png](07-combat.png) |
| **Shop (Black Market)** | `shop` | `FeltScreen.tsx` | Same persistent felt: the market is an **embedded tray layer** on the combat felt — `CombatStage.setMode("shop")` toggles a `ShopStage` sub-layer (`render/shopStage.ts`) on the **same** Pixi canvas; only the DOM sidebar swaps. | [13-shop.png](13-shop.png) · detail: [shop-zoom.png](shop-zoom.png) |
| **Event (Court Event)** | `event` | `EventScreen.tsx` | DOM | [15-event.png](15-event.png) |
| **End (win / lose)** | `won` / `lost` | `EndScreen.tsx` | DOM (title + notice + run summary + New run / Main menu) | [16-endscreen.png](16-endscreen.png) |

> **Combat & Shop share one persistent `FeltScreen`/`PixiBoard`** (Balatro's single canvas): `PixiBoard`
> stays mounted across combat↔shop, so the felt and draw pile never reset; the shop is a tray that rides
> up over the same `CombatStage`.

## Modals & overlays

A ✓ in **Shell** means the overlay has been migrated onto the shared `<Modal>` (backdrop + header +
consistent close, `Esc` and backdrop-click). The rest are still bespoke panels — see finding #1.

| Modal | File | Shell | Opened by | Shot |
|-------|------|:-----:|-----------|------|
| **Rules / How-to-Play** | `HelpOverlay.tsx` | ✓ | first run (auto) only — no manual re-open (see audit §F) | [01-help-overlay.png](01-help-overlay.png) |
| **Run Setup** (deck/stake/seed) | `RunSetup.tsx` | — | Title → New Run | [03-runsetup.png](03-runsetup.png) |
| **Settings** | `SettingsMenu.tsx` | ✓ | Title / Pause → Settings | [04-settings.png](04-settings.png) |
| **Past Runs** | `PastRunsOverlay.tsx` | ✓ | Title → Past runs | [05-pastruns.png](05-pastruns.png) |
| **Compendium** (rules + galleries, sidebar nav) | `Collection.tsx` | — | Title / Pause → Compendium | [06-compendium.png](06-compendium.png) |
| **The Descent** (run-info tabs: Fighting Styles / Opponents / Edicts / Stake) | `RunMap.tsx` | — | ⌖ Run Info / `M` | [08-runinfo-descent.png](08-runinfo-descent.png) |
| **Pause Menu** | `PauseMenu.tsx` | ✓ | ⚙ Options / `Esc` in a run | [09-pausemenu.png](09-pausemenu.png) |
| **Deck / pile view** | `DeckModal.tsx` | — | tap deck/used pile; card-picker | [10-deckmodal.png](10-deckmodal.png) |
| **Deck Peek** (draw-pile hover preview) | `DeckPeek.tsx` | — | hover the draw pile | [11-deckpeek.png](11-deckpeek.png) |
| **Combat Gate** (claim spoils / see the end) | `CombatGate.tsx` | — | fight won/lost | [12-combatgate-win.png](12-combatgate-win.png) |
| **Pack Modal — joker/training/card** | `PackModal.tsx` | — | open a booster | [14-packmodal.png](14-packmodal.png) |
| **Pack Modal — tarot/spectral (deck-fan)** | `PackModal.tsx` | — | open a tarot/spectral booster | [17-pack-tarot-fan.png](17-pack-tarot-fan.png) · armed: [18-pack-tarot-armed.png](18-pack-tarot-armed.png) |

## Reusable building blocks (not standalone screens)

| Component | File | Role |
|-----------|------|------|
| `Modal` | `Modal.tsx` | the shared modal shell (backdrop + header + close, `Esc`/backdrop-click) — see finding #1 |
| `RunSidebar` | `RunSidebar.tsx` | the left chrome column shared by combat & shop; owns Run Info + footer (Options + Mute), takes variant content as children |
| `packMeta` | `packMeta.ts` | single source for pack/ware label maps + tip-type + chips (`PACK_LABEL`, `SIZE_LABEL`, `PACK_PICKS`, `LOOSE_TIP_TYPE`, `TYPE_CHIP`, `RARITY_CHIP`) |
| `CardFace` | `CardFace.tsx` | the DOM card model (rank corner + suit glyph + sigil/seal badges) |
| `DeckArt` / `JokerArt` / `TarotArt` | `CardArt.tsx` | `<img>` art with procedural fallback |
| `ItemArt` | `ItemArt.tsx` | procedural emblem fallback (packs/wares) |
| `StyleSprite` | `StyleSprite.tsx` | per-Fighting-Style SVG icon |
| `WaxSeal` | `WaxSeal.tsx` | sigil wax-stamp SVG |
| `HeldTray` | `HeldTray.tsx` | the consumable pouch row (combat + shop) |
| `MuteButton` | `MuteButton.tsx` | the audio mute toggle (corner on chromeless screens; sidebar footer in combat/shop) |
| `TooltipLayer` | `TooltipLayer.tsx` | global `data-tip` tooltip renderer |
| `TransitionLayer` | `TransitionLayer.tsx` | intro/victory/defeat wipes |

> `PixelArtDemo.tsx` is a dev-only art preview, not part of the game flow. `render/pixiFixes.ts` guards a
> Pixi v8.6 texture-pool bug and is applied once before any rendering.

---

## Buttons & UI-element inventory

Every interactive/visual element currently rendered, grouped by kind, with the class(es) it uses. The
point is to expose where the same idiom is hand-rolled more than once. **Base button styling is global**
(`button` in `styles.css:118`); `button.primary` (red CTA) is the only global variant.

### Buttons — by screen

| Button (label) | Screen / context | Class(es) | Kind |
|----------------|------------------|-----------|------|
| ▸ Play / ⚔ New Run | Title | `primary` | primary CTA |
| 📖 Compendium · 📜 Past runs · ⚙ Settings | Title | _(none)_ | base |
| New Run / Continue / Challenges | Run Setup (tabs) | `setup-tab` (+`on`, `disabled`) | tab |
| ‹ › deck · ‹ › stake | Run Setup | `setup-arrow` / `setup-arrow sm` | stepper |
| CONTINUE / PLAY | Run Setup | `setup-play` | primary CTA |
| Back | Run Setup | `setup-back` | close |
| mute · debug · force-defeat | Settings | `setting-mute` (+`is-muted`) · `setting-toggle` (+`on`) · `setting-defeat` | toggle / action |
| Done | Settings | Modal `primary` | close |
| Close | Past Runs | Modal `primary` | close |
| Resume · Cancel | Pause | Modal `primary` · _(none)_ | close · base |
| 📖 Compendium & rules · ⚙ Settings · 💾 Save & quit | Pause | _(none)_ | base |
| 🏳 Surrender run · Yes, surrender | Pause | `danger` | danger |
| Close + nav items | Compendium | `primary` · `comp-nav-item` (+`active`) | close · nav/tab |
| Close + tabs | The Descent | `primary` · `runinfo-tab` (+`active`, `role=tab`) | close · tab |
| Play ▸ · Clear | Combat | `ca-play` · `ca-clear` | CTA · secondary |
| Rank / Suit (sort) · Auto · Cancel | Combat | _(none)_ | base |
| Block (n/m) | Combat (defend) | `primary` | primary CTA |
| wild-suit picker (♥♦♣♠) | Combat | `wild-suit` (+`on`, +`red`/`dark`) | segmented |
| sell joker · held consumable · cards | Combat felt | `field-joker field-joker-sell` · `held-item` · `CardFace` btn | item |
| ⌖ Run Info · ⚙ Options | Run sidebar (combat+shop) | `cs-runinfo cs-panel` · `cs-options cs-panel` | panel-styled |
| Claim ▸ / See the end ▸ | Combat Gate | `primary gate-continue` | primary CTA |
| Remaining / Full Deck (tabs) | Deck/pile modal | **`on` only — no tab class** | tab |
| Cancel / Close | Deck/pile modal | `primary` | close |
| Skip rest / Close | Pack modal | `primary` | close |
| pack picks | Pack modal | `pack-pick` (+`is-card`, +`rarity-*`, +`armed`) | choice card |
| court-event options | Event | `event-option` | choice |
| New run · Main menu | End | `primary` · _(none)_ | primary CTA · base |
| pause ⚙ (event only) · mute ♪/🔇 | corner / global | `gear-btn` · `mute-btn` | icon corner |
| _(orphaned)_ | — | `.help-btn` CSS exists, **no JSX renders it** | dead |

### Form controls (native inputs)

| Control | Where | Element |
|---------|-------|---------|
| Music & SFX volume | Settings | `input[type=range]` ×2 |
| Seeded run | Run Setup | `input[type=checkbox]` |
| Seed string | Run Setup | `input[type=text]` |

### Containers & overlays (modal idioms)

`✓` = uses the shared `<Modal>`. Backdrop/panel/header/close-label show how much each diverges.

| Overlay | Backdrop | Panel | Header | Close label | Shell |
|---------|----------|-------|--------|-------------|:-----:|
| Help | `help-backdrop` | `.help` | `help-head` | Close | ✓ |
| Settings | `help-backdrop` | `.menu-panel` | `help-head` | Done | ✓ |
| Past Runs | `help-backdrop` | `.menu-panel` | `help-head` | Close | ✓ |
| Pause | `help-backdrop` | `.menu-panel` | `help-head` | Resume | ✓ |
| Compendium | `help-backdrop comp-backdrop` | `.comp-panel` | `help-head` | Close | — |
| The Descent | `help-backdrop` | `.descent-modal` | `help-head` | Close | — |
| Run Setup | `help-backdrop setup-backdrop` | `.setup-panel` | bespoke | Back | — |
| Deck / pile | `help-backdrop` | `.pile-modal` | bespoke | Cancel / Close | — |
| Pack | `help-backdrop pack-backdrop` | `.pack-modal` | `help-head` | Skip rest / Close | — |
| Combat Gate | **`.gate`** (own) | `.gate-card` | `gate-title` | Claim ▸ / See the end ▸ | — |
| Pixel demo (dev) | `help-backdrop` | `.help` | `help-head` | Close | — |

> `.gate-card`, `.pile-modal`, `.help`, `.menu-panel` share one border/shadow rule (`styles.css:2779`);
> `.comp-panel`, `.setup-panel`, `.descent-modal`, `.pack-modal` each redefine the shell.

### Status & label chips, banners, badges

| Element | Class | Role |
|---------|-------|------|
| Turn banner | `.turn-banner` (+`play`/`defend`) | ★ YOUR MOVE / ⚔ DEFEND |
| Enemy intent | `.intent-strike` (+`enraged`) | next-strike pill |
| Royal decree | `.decree-pill` | edict pill |
| Suit disable | `.cs-disable` | disabled-power tag |
| Tooltip type chip | `.tip-type` (`TYPE_CHIP`) | Joker / Tarot / … |
| Tooltip rarity chip | `.tip-type` (`RARITY_CHIP`: `tt-common`/`tt-uncommon`/`tt-rare`) | Common / Uncommon / Rare — sits beside the type chip on joker tooltips, in a `.tip-chips` row |
| Zone counts | `.zone-count` | jokers, pouch x/y |
| Edition badge | `.ed-badge` (`ed-*`) | foil/holo/etc. on cards & jokers |
| Past-run result | `.run-result` | ★ Crown Culled / Fell / Surrendered |
| Transient notice | `.toast` | top-screen status |
| Block badge | `.player-block` | block over the felt |

### Tooltip surfaces (still 3 — see finding #6)

- **`data-tip`** → global `TooltipLayer` (DOM hover)
- **`.tip-pop`** (+`tip-top`/`tip-bottom`) → shop-hover popup fed by `PixiBoard`
- **bespoke popups** → fighting-style demo in `RunMap`, the pack-fan label

### Inconsistencies & standardization opportunities

Ordered by payoff. (A–C extend modal finding #1; D–F are new element-level cleanups.)

**A. Close affordances vary 6 ways** — Close / Done / Resume / Back / Cancel / "Skip rest". `<Modal>`
centralises this for 4 overlays, but the label is per-caller and the 5 bespoke modals each invent their
own. **Fix:** standardise on Close/Done; reserve action verbs (Claim, Skip) for genuinely different acts.

**B. `.danger` is not a real variant** — it's defined only as `.menu-list button.danger` (`styles.css:2817`),
so `className="danger"` renders styled *only* inside the pause menu's `.menu-list`. **Fix:** promote to a
global `button.danger` beside `button.primary`.

**C. The "big confirm" CTA has no single class** — it's `.primary` (Title/End/Block), a bespoke class
(`ca-play`, `setup-play`), or both (`primary gate-continue`). **Fix:** one `.primary` (+ optional size
modifier) for every primary CTA.

**D. Tabs are built 4 ways with 2 different active classes** — `comp-nav-item`+`.active`,
`runinfo-tab`+`.active`+`role=tab`, `setup-tab`+`.on`, and the **Deck modal tabs use bare `.on` with no
tab class at all**. Active state alternates `.active` ↔ `.on` (and elsewhere `aria-pressed`,
`is-muted`, `armed`). **Fix:** one `<Tabs>`/`.tab` with a single active convention + `role=tab` everywhere.

**E. Corner icon buttons are 3 bespoke classes** — `gear-btn`, `mute-btn`, and the orphaned `help-btn`
all describe the same fixed circular icon-with-hover-label idiom. **Fix:** one `IconButton`/`.icon-btn`.

**F. Orphaned `.help-btn` + no way to reopen the Rules** — `.help-btn` CSS exists but nothing renders it;
`HelpOverlay` only auto-shows once on first run (`App.tsx:65`). The in-combat `?` the catalogue used to
describe is gone (rules still reachable via Pause → Compendium). **Fix:** either wire a help trigger
(reuse the `IconButton` from E) or delete the dead class.

---

## Design-cleanup findings

Concrete opportunities to unify the surface and cut duplication. Ordered by payoff. Each carries a
**Status** as of 2026-05-25.

**Done since the first pass:** #2 (shared `RunSidebar`), #4 (combat & shop collapsed onto one Pixi
stage), #5 (`packMeta` single source), #7 (`App.tsx` split into per-screen files). **Started:** #1
(shared `<Modal>` shell built, 4 of ~11 overlays migrated), #6 (Pixi now feeds one shared `tip-pop`).
**Open:** #3 (card badge metadata), #8 (two palettes).

### 1. No shared modal shell — three competing idioms — ◑ STARTED
A shared `<Modal>` shell now exists (`Modal.tsx`): backdrop + `.help-head` header + a consistent close
button, with `Esc` and backdrop-click. **Migrated:** Help, Settings, Past Runs, Pause. **Still bespoke:**
Run Setup (`.setup-panel`), Compendium (`Collection`), The Descent (`RunMap`), Pack/Deck modals, Combat
Gate — each still hand-rolls its panel and close affordance (**"Close" / "Done" / "Back" / "Skip rest" /
"Resume"** still vary). **Remaining fix:** migrate the rest onto `<Modal>`.

### 2. Two near-identical sidebars — ✓ DONE
`FeltScreen`'s `CombatSidebar` and `ShopSidebar` now share **`RunSidebar.tsx`** — one `.combat-sidebar`
shell that owns the Run Info button and the footer (Options + Mute), taking the royal/standing or SHOP-sign
content as children.

### 3. Card model duplicated DOM vs Pixi — ○ OPEN
The card visual still exists twice — `CardFace` (DOM) and `render/cardNode.ts` (Pixi) — and each re-encodes
sigil/seal/edition badge colours + tooltips. **Fix:** the badge metadata (colours, glyphs, tip text) should
live in one shared module consumed by both, plus `CardFace.tsx`'s `SEAL_INFO` and the engine `SIGIL_INFO`.
(`packMeta` did exactly this for packs — same pattern applies here.)

### 4. Two Pixi stages repeat structure — ✓ DONE (by unifying)
Resolved by collapsing to **one** stage rather than extracting a base: `CombatStage` now embeds the
`ShopStage` as a visibility-toggled `shopLayer` on the **same** Pixi canvas (`setMode("shop")` /
`syncShop`), so plasma+frame+deck-pile+hover-bridge+slide exist once. `render/shopStage.ts`'s `ShopStage`
is that embedded tray layer; `PixiBoard` only ever creates one `Application`/`CombatStage`.

### 5. Pack/shop label maps defined 3× — ✓ DONE
Centralised in **`packMeta.ts`** (`PACK_LABEL`, `SIZE_LABEL`, `PACK_PICKS`, `LOOSE_TIP_TYPE`, `TYPE_CHIP`),
imported by the pack modal, the shop sidebar and `PixiBoard`. By design the framework-specific tints stay
local: Pixi colour ints in `render/shopStage.ts`, DOM SVG tints in `ItemArt.tsx`.

### 6. Three tooltip mechanisms — ◑ STARTED
The Pixi board now feeds **one shared `tip-pop`** DOM popup for shop-hover (`onShopHover` → screen coords,
with the `TYPE_CHIP` type chip), so the canvas no longer hand-draws its own popup. Still separate: DOM
`data-tip` (`TooltipLayer`) and the bespoke popups (fighting-style demo in `RunMap`, pack fan). **Remaining
fix:** route those through the one surface too.

### 7. `App.tsx` is a monolith — ✓ DONE
`App.tsx` is now just the phase router + global layers + app-wide effects. Each screen is its own file:
`TitleScreen.tsx`, `FeltScreen.tsx` (combat + shop), `EventScreen.tsx`, `EndScreen.tsx`, and `MuteButton`
was extracted to `MuteButton.tsx`. (Files sit directly under `src/ui/`, not a `screens/` subfolder.)

### 8. Two palettes — ○ OPEN
`render/theme.ts` (Pixi colour ints) and the CSS custom properties in `styles.css` still define overlapping
gold/parchment/blood/violet values. **Fix:** a single token source generating both.

---

## Recent rework (context for the above)

**One persistent felt for fight + market.** Combat and the shop now share a single mounted `PixiBoard`
(`FeltScreen`): the market is an embedded `ShopStage` layer that rides up over the same `CombatStage` felt
rather than a separate canvas — the felt and draw pile stay continuous across combat↔shop.

The shop tray (`shopStage.ts`) follows a Balatro layout — a left control column (Next Fight, Reroll, a
flipping **Remove coin**) and three labelled sections (**Cards for sale**, **Edict**, **Booster packs**) —
packs are realistic crimped foil wrappers. The sidebar carries the animated **SHOP sign** (chasing bulbs)
with a `cs-flip` machine flip-in. Tarot/spectral packs open over a **fan of cards drawn from the deck**;
the pack's consumables apply to that fan immediately, then it folds back into the deck. See
[13-shop.png](13-shop.png) and [17-pack-tarot-fan.png](17-pack-tarot-fan.png).
