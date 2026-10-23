# Art Direction — TCG Circuit (working title)

> The visual-cohesion contract (per `../../knowledge/playbooks/target-state.md` + `ui-architecture.md`).
> **Revised 2026-05-25 to the user's reference:** the target is **modern top-down ¾ pixel-art RPG**
> (Pokémon HGSS/DS · Dragon Quest), NOT the earlier flat-vector / GBA-low-res / "early-2000s web" idea
> (superseded — see §10). Decide cohesion up front; build the tokens + the ONE card model before screens.

## 1. Concept & target look
A **cozy, lush, modern top-down ¾ pixel-art RPG** — the player walks a town and its interiors the way
you do in HGSS-era Pokémon or Dragon Quest: detailed 16×16-based tiles, a slight ¾ overhead perspective,
rich (not GBA-limited) palettes, expressive little overworld sprites, warm lived-in interiors. The world
is the contemporary TCG scene: the **local game shop**, your **home**, **school**, **tournament venues /
convention halls**, and the streets between them.

**Canonical references (the bar — match this fidelity, don't copy any IP):**
- The user's two reference screenshots (a ¾ top-down pixel town with a tower + game-shop; four cozy
  interiors incl. a shop-lobby and a home) — *this is the north star.*
- [thehorseman007 — Interior Pixel Art](https://thehorseman007.itch.io/interior-pixel-art) (interiors).
- [LimeZu — Modern Interiors / Modern Exteriors](https://limezu.itch.io/moderninteriors) (the definitive
  modern top-down town+interior look; also Modern Office + Modern User Interface).

## 2. Asset reality (the real constraint — read this first)
This fidelity is **authored pixel-art tilesets + character sprites**, not procedural/vector art and not
hand-pixeling in SVG. So, like the 3D asset finding, **the constraint is the asset pipeline, not the
renderer.** The plan:
- **Source a cohesive top-down tileset + sprite set** rather than hand-draw. Best fit for this exact look:
  **LimeZu Modern Interiors + Modern Exteriors + Modern UI** (16×16; cheap **commercial** license w/ credit
  — not CC0) and **thehorseman007 interiors** (per the user). CC0 fallbacks exist on itch/OpenGameArt but
  are less consistent. Pick ONE primary pack so everything matches.
- **Card faces + Affinity frames are bespoke** (the one thing we author/commission — see §5) and slot in
  via an **asset-manifest seam** (placeholder → final), like `magical-athlete/assets/manifest.ts`.
- **Honest note:** Claude can't produce reference-grade pixel art; concept "art" from me is layout only.
  Real art = a sourced/licensed tileset (above) or a commissioned/AI-pixel pass, integrated via the manifest.
- **IP discipline:** evoke the genre's feel; never use Pokémon/DQ tiles, sprites, logos, or trademarked
  signage. A licensed generic-modern tileset (LimeZu) sidesteps this cleanly.

## 3. Rendering pipeline (the pixel contract)
- **16×16 base tiles**, **top-down ¾** perspective; characters ~**16×32** sprites with 4-dir walk cycles.
- **HD pixel art — high logical resolution (FACTORY DEFAULT for all pixel projects).** Logical canvas
  **≈960×540 (recommended; floor 640×360)**, **integer nearest-neighbor upscale**, `antialias:false`.
  The old ~428×240 was **too few pixels** — UI/text became unreadable on big screens. A high logical res
  keeps the crisp-pixel look *and* legible UI/cards at 1080p+ (960×540 ×2 = 1080p, ×4 = 4K). Author assets
  as **HD pixel art** (more detail; tiles may be 16–32px). Camera follows the player; pixel-snapped scroll.
  *(This applies factory-wide — Späti + Cull the Crown too; see memory + `knowledge/playbooks/ui-architecture.md`.)*
- **Pixel font** loaded **before the first Pixi `Text`** (v8 init gotcha). One display + one body face.
- Tokens in **`render/theme.ts`**, mirrored to `:root` for DOM overlays. The world palette comes **from
  the chosen tileset** (don't fight it); the *card/UI* palette + Affinity ramps are ours (§4).

## 4. Palette — Affinity ramps & UI (world palette = the tileset's)
Per-**Affinity** ramp (dark→mid→light→core), used on **cards, FX, and UI accents** (the *world* uses the
tileset's own palette; these are for the card game + HUD so it reads as one brand):
- **Ember** `#7a1f12 · #b6391f · #e0573f · #ffae4a · #ffe49a`
- **Tide** `#0f3a5c · #1d5f8c · #2e7fb8 · #6fb8e0 · #cfeaf8`
- **Verdant** `#134a1c · #1f6b2a · #3a9e3f · #6fc45a · #bfe8a0`
- **Gloom** `#2a1840 · #43295e · #6b4c8a · #9a7cc0 · #d3c2ec`
- **Order** `#7a5a14 · #a8861f · #d8c24a · #f0dc7a · #fff3c4`
**Rarity:** Common = steel `#9aa3b2` · Uncommon = Verdant-mid · Rare = Tide-light · Mythic = Ember-light ·
**Prismatic** = animated palette-cycle. UI base: `ink #14102a` · `panel #1f1838` · `gold #f4c430` ·
`text #f4e9cf` · `line #3a2f60`.

## 5. The ONE card-face model (`<CardFace>`) — bespoke pixel art
The cards are the brand; author/commission these. Anatomy: **frame = the Affinity ramp** (bevel); **cost
gem** TL; **art window** (pixel illustration); **name bar** (display face); **type/keyword line**; **power**
BR (Units); **rarity pip**; **Prismatic** shimmer. Three sizes off ONE model: `hand` / `board` / `list`.
(Card art is the asset-manifest's main job; ship placeholder pixel frames first, fill illustrations later.)

## 6. World & interior recipe (top-down ¾)
- **Overworld:** a walkable town — shop, home, school, tournament hall, streets, the route between — built
  from the tileset; expressive NPC sprites with idle anims; day/time tinting; lots of small readable props.
- **The local game shop (the hub):** glass **singles display cases**, a **booster/box wall**, **play
  tables** where NPCs duel, a counter + shopkeeper, an **events board**, posters. (Like the reference
  shop-lobby interior, themed for a card store.)
- **Interiors** (home/school/venue) follow the tileset's cozy ¾ style; furniture + clutter sell "lived-in."
- **Tournament hall:** rows of play tables, a standings board, a feature-match stage, banners.

## 7. Diegetic UI — the in-game phone/PC (NOT early-2000s web)
The TCG-scene's "internet" lives on an **in-game phone/PC**, rendered as **the game's own pixel UI** (think
a clean handheld-RPG menu / a Pokégear-style app), **not** literal Netscape/phpBB chrome (that framing is
dropped). Keep the **content** ideas the user liked:
- **Deck-tech / metagame forum** (the layout the user liked) — boards → threads → posts w/ avatars + deck
  signatures, reskinned to the in-game pixel UI. Worldbuilding for the living metagame + B&R announcements.
- **Deck-tech / set-review "blog" feed** (the idea the user liked) — articles w/ an embedded decklist + a
  Light-curve readout; how set drops + the metagame are surfaced in-fiction.
- **Singles market app** — listings (card thumb · set · price · trend), watchlist, wallet — as an in-game
  app skin (the earlier early-web mockup is superseded). *(World feature; built when the world is built.)*

## 8. Game-UI recipe (panels / modal / atoms)
ONE `<Modal>`/overlay shell (themed `panel`, pixel border, Esc/backdrop close, focus trap, scroll-lock,
reduce-motion) + atoms: `Button`, `Panel`, `Tooltip`, `<CardFace>`, `<DeckRow>`, `<CurveBar>`. Build before screens.

## 9. Motion, game-feel & accessibility
Card deal/hover/deploy springs; lane-clash hit + trauma shake + particles; Nexus-damage pops; Continue-gated
outcomes (legible loss). Reuse `cull-the-crown/app/src/fx/`. **A11y:** Affinity = glyph **+** hue (spark/
drop/leaf/moon/shield), keyboard-operable menus + deckbuilder, text scaling, reduce-motion.

## 10. Superseded (do not use as the look)
- The flat-vector SVG boards `concept-art/01–05` (overworld/shop/duel/key-art/tournament) and `06` market
  UI, and `pixel-style-sample.html` — **layout reference only; the *style* is superseded** by this doc.
- The "year 2003 / GBA-low-res / early-2000s-web" framing — **dropped.** Era is timeless-contemporary
  (set later). Only the **forum (07)** and **blog (08)** *content concepts* carry forward (reskinned, §7).

## 12. Build substrate (decided at build time — a recorded deviation)
The MVP card-game slice is built in **DOM + a CSS pixel theme + a Canvas2D living background +
DOM/WAAPI juice**, NOT Pixi. The build plan's own split is "dense card/list UI = DOM, boards = Pixi,"
and this slice is *all* the DOM half (text-rich cards, hand, lane slots, deckbuilder, gallery, menus).
DOM gives crisp pixel-font card text, reliable pointer input, and the required a11y (keyboard,
text-scale, reduce-motion) for free, and avoids the WebGL-context/async-init/teardown pitfalls in
`knowledge/patterns/build-gotchas.md`. The pixel identity lives in CSS: `'Press Start 2P'` (display) +
`'Silkscreen'` (body), `image-rendering: pixelated`, the per-Affinity ramp tokens from
`render/theme.ts`, beveled frames, and the ONE `<CardFace>` (3 sizes). This is **not** a
DOM-first-then-migrate trap — the card/list UI is meant to stay DOM; the *deferred* top-down world is
where canvas is load-bearing and will be authored in canvas from the start, with these DOM screens
layered over it. The pure `engine/prism` keeps that future clean.

## 11. Component audit checklist (before the build gate)
- [ ] World built from ONE sourced top-down ¾ tileset (consistent perspective + palette); matches the refs.
- [ ] Every card uses the ONE `<CardFace>` model (3 sizes); Affinity ramp consistent on cards = FX = UI.
- [ ] Pixel pipeline: 16×16, nearest-neighbor, antialias off, pixel font before first Text.
- [ ] Diegetic UIs (forum/blog/market) use the in-game pixel UI, not web chrome.
- [ ] Affinity legible without colour; reduce-motion + text-scale honored.
- [ ] Card art slotted via the asset-manifest seam (placeholder → final), engine unchanged.
