# Cull the Crown — Joker Illustrations

Original joker art for the "Balatro Patch." These are **brand-new, true pixel-art illustrations** in
*Cull the Crown's own* arcade-medieval style — **not** copies of Balatro's art (the project is
deliberately IP-clean: original assets only, no Balatro/Regicide art or branding).

## How these are made (proper pixel art, not vector "beta art")
The `.svg` files here are **generated** by `app/scripts/pixel-art.mjs`, which draws each card onto a
real **60 × 84 integer pixel grid** with rasterizing primitives (`disc`/`tri`/`line`/`rect`), then
emits one run-length `<rect>` **per pixel** with `shape-rendering=crispEdges`. So every curve is a
genuine stair-stepped pixel edge — limited palette, hand-placed ink outlines, and highlight/shadow
passes — rather than a smooth bezier. Edit the **sprite functions in `pixel-art.mjs`**, not the SVGs.

Pipeline: `node scripts/pixel-art.mjs` (regenerate SVGs) → `node scripts/raster-jokers.mjs`
(rasterize each `.svg` to a matching `.png` for viewing, upscaled nearest-neighbour).

## Why originals (and not Balatro's pictures)
- The build is committed to **all-original assets** (see `02-market-analysis.md` IP decision).
- Balatro's joker art is copyrighted; reproducing it would break that commitment.
- So each illustration is an **original take on the joker's *theme*** (what it does), framed like a
  collectible card, in our palette — the same family as the in-game `ui/ItemArt.tsx` emblems.

## Style guide
- **Format:** portrait card on a `60 × 84` pixel grid (Balatro card ratio ≈ 2.5 : 3.5). Every card is
  a **physical card object**: a cream edge (`#efe6cf`) → thin white bevel (`#f7f2e6`) → a themed dark
  face — like a real trading card on the table. Pure pixels (no gradients) so they stay crisp when
  nearest-neighbour upscaled.
- **The "JOKER" wordmark** runs **vertically up both side margins** (mirrored, `Press Start 2P`),
  the way the title runs up the edge of a Balatro joker — it's the single strongest "this is a
  joker card" cue.
- **Three illustration modes** (so the set has range, mirroring the references):
  1. **Filigree card-back** *(à la The Family)* — a symmetric crimson+gold branching pattern around
     a central medallion. Used for `the-phalanx`.
  2. **Trading-card portrait** *(à la the Baseball Card)* — a character bust in a "photo window"
     with radiating banners, a frame, a title-pip and a faux signature. Used for `court-jester`,
     `headsmans-pride`.
  3. **Bold object on a sunburst** *(à la 8 Ball)* — one big iconic object centred on an alternating
     radial sunburst. Used for `war-chest`, `bloodletter`, `prospector`. (`mirror-knight` is a
     symmetry showpiece: two helms meeting at a glowing mirror seam.)
- **Palette** (from `src/styles.css`): gold `#f2c14e` / bright `#ffe9a0`, blood `#e04060` / red
  `#c0273f`, green `#7ad06f`, blue `#5fb0e0`, violet `#b070e0`, parchment `#f0e6d0`, frame `#8a6a2a`,
  ink `#120a1c`. The **card face is tinted to the joker's theme** (crimson for blood, teal for the
  prospector, slate-gold for the war chest, violet for the mirror) rather than using a rarity-colored
  border — closer to Balatro, where the border is uniform and the art carries the identity.

## Index (this batch)
| File | Joker | Archetype | Mode |
|---|---|---|---|
| `the-phalanx.svg` | The Phalanx | Combo (four-of-a-kind) | Filigree card-back |
| `court-jester.svg` | Court Jester | Meta (disable a decree) | Portrait |
| `headsmans-pride.svg` | Headsman's Pride | Suit specialist (♠ damage) | Portrait |
| `war-chest.svg` | War Chest | Economy / scaling (gold) | Bold object |
| `bloodletter.svg` | Bloodletter | Suit specialist (♥ heal) | Bold object |
| `prospector.svg` | Prospector | Economy (♦ gold) | Bold object |
| `mirror-knight.svg` | Mirror Knight | Meta (copy a joker) | Symmetry showpiece |

The full adapted joker list is in `../JOKER-ADAPTATIONS.md`. This batch establishes the elevated
style; the rest can be generated on the same three-mode template once the set is approved. Run
`node scripts/raster-jokers.mjs` from `app/` to regenerate the PNG previews.
