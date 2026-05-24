# Cull the Crown — Art Style Guide

The visual identity, written down so every screen reads as the same game. When you build or touch a
UI component, match this. The source of truth for colour tokens is `app/src/styles.css` `:root` (DOM)
and `app/src/render/theme.ts` (Pixi canvas) — they are kept in sync by hand.

## Concept

An **8-bit arcade take on a medieval court**: a gilded arcade-cabinet bezel around a CRT screen, flat
limited-palette pixel art, hard edges, chunky pixel type, parchment playing cards, and a molten
heraldic plasma backdrop. Everything is original / IP-clean. The whole screen wears an **old-tube CRT
skin** (scanlines + vignette "bend" + faint flicker).

## Palette (CSS custom properties — use the token, never a raw hex)

| Token | Hex | Use |
|------|------|-----|
| `--bg` | `#0e0814` | page background (deepest plum) |
| `--bg2` | `#1a1020` | panel / overlay background |
| `--panel` | `#221530` | raised panel |
| `--panel-2` | `#2c1c3c` | inset / secondary panel |
| `--ink` | `#f0e6d0` | **body text** (warm cream — never pure white) |
| `--muted` | `#b09cc0` | secondary text / labels |
| `--gold` | `#f2c14e` | frames, headings, accents |
| `--gold-bright` | `#ffe9a0` | hover/active accent, values |
| `--red` | `#c0273f` | **primary action colour** (buttons, banners) |
| `--blood` | `#e04060` | danger / damage / red suits on dark |
| `--good` | `#7ad06f` | positive (heal, companions) |
| `--blue` | `#5fb0e0` | draw / info only — **never the primary button** |
| `--violet` | `#b070e0` | jesters / spade royal / shields |
| `--line` | `#4a3560` | hairline borders, dividers |
| `--frame` | `#8a6a2a` | structural panel borders (the "brass" frame) |

**Parchment family** (card stock + light "paper" info boxes): `--parch #e8d8a0`, `--parch-lite
#fff0c8` (top highlight), `--parch-edge #8a6a3a` (worn inner edge), `--parch-ink #2a1a12` (dark text
on parchment). Anything that should read as paper/card uses these — not a one-off hex.

**Primary action = red.** Hero buttons (`.primary`, `.setup-play`, `New Run`) are a red gradient with
a `--gold` border and `--gold-bright` label. Blue is reserved for *information* (draw counts, the
Diamonds suit), never for the main call to action.

## Type

- **`"Press Start 2P"`** — titles, headings, big stat numbers, tab labels. Used sparingly; it's heavy.
- **`"Silkscreen"`** — everything else (body, buttons, HUD, tooltips). Falls back to monospace.
- Body text is `--ink` on dark, `--parch-ink` on parchment. Letter-spacing ~0.5px. No anti-aliased
  system fonts anywhere.

## The card model (one model, every screen)

A card is **parchment** with a `--parch-lite` highlight strip at the top and a `--parch-edge` inner
edge, a dark `#1a1020` outline, and rounded corners. Content:

- **rank index in the top-left corner** (the value; `A` for an Animal Companion, `J` for a Jester),
- a **big centred suit glyph** (`♠♥♦♣`, or `★` for a Jester),
- red suits (`H`,`D`) print in `--red`; black suits (`C`,`S`) in `#241f2e`; jesters in `--violet`.

The in-combat hand is Pixi (`render/cardNode.ts`); every DOM context (deck overview, card-pack
reveals, pickers) uses the shared `<CardFace>` (`ui/CardFace.tsx`) which mirrors that model exactly.
**Do not invent a second card look.** Arrayed cards idle with a slight float + sway (see Motion).

### On-card marks
- **Sigils** are raised **wax-seal stamps** — a glossy coloured blob with an embossed glyph, tilted
  like a hand-press (`ui/WaxSeal.tsx`), coloured per sigil.
- **Twin-suit** shows the second suit glyph bottom-left; **companions** tag `PET`.

## Panels, overlays & the cabinet frame

- The board and shop sit in an **arcade-cabinet bezel**: a thick dark border ringed in brass, with a
  layered shadow `0 0 0 3px #000, 0 0 0 6px #3a2a18, 0 0 0 9px #1a120c, inset …`. Reuse this shadow
  recipe for any "screen in a cabinet" surface.
- **Modal/menu panels** (`.menu-panel`, `.setup-panel`, `.deck-view`, `.help-backdrop` children) are
  `--bg2` with a `--frame`/`--gold` border, `border-radius: 10–14px`, and the layered cabinet shadow.
- **Light info boxes** (deck description chip, setup deck/stake cards' text, the "white box") are
  parchment (`--parch`) with `--parch-ink` text — the medieval-paper equivalent of Balatro's white box.
- Backdrops dim with `rgba(6,4,10,0.9)`.

## Buttons

Chunky pixel buttons (`button` base): gradient fill, 2px `--line` border, a hard offset shadow
(`0 3px 0 …, 3px 3px 0 …`) that **collapses on `:active`** (a physical "press"). Hover → `--gold`
border + `--gold-bright` text + 1px nudge. `.primary` / hero = red gradient + gold border. Carousel
arrows and tabs are red. The bottom "Back" of the setup is amber (`--gold`).

## CRT skin (global)

A fixed, pointer-transparent `.crt` overlay over the whole app: fine **scanlines**, a corner-darkening
**vignette** that fakes curved glass, a slow **rolling refresh band**, and a constant **very-slight
flicker**. Sits below tooltips so they stay crisp; disabled under `prefers-reduced-motion`.

## Suits

Two systems, both legible without hue (shape + colour):
- DOM/text: red (`H`,`D`) vs black (`C`,`S`) + the suit glyph.
- Canvas indicators (`render/theme.ts` `SUIT_COLOR`): rose `H`, amber `D`, sky `C`, violet `S` — the
  per-suit royal palettes, immunity pill, and emblems. A royal **disables** (not "is immune to") its
  own suit's power.

## Motion

- Cards: spring-driven deal/fan/lift/tilt in combat; in every screen, **arrayed idle cards float and
  sway gently** (small continuous offset + rotation, staggered so they don't move in lockstep).
- Reward/FX: coin-to-purse, kill cascade, deferred Claim gate. Upgrades flash gold.
- Honour `prefers-reduced-motion` for ambient loops (CRT flicker, idle float).

## Iconography

Original flat SVG emblems in the palette above (`ui/ItemArt.tsx` for relics/consumables,
`ui/WaxSeal.tsx` for sigils, `PackArt` for booster packs). No external icon fonts or stock art.

## Checklist when adding/auditing a component

1. Colours come from tokens (incl. the parchment family) — no stray hexes for chrome.
2. Text is `--ink`/`--muted` on dark, `--parch-ink` on parchment; correct pixel font.
3. Primary action is **red**; blue is info-only.
4. Panels use the `--frame`/`--gold` border + cabinet shadow; light boxes use parchment.
5. Any card uses `<CardFace>` (or the Pixi `CardNode`) — never a bespoke card.
6. Buttons use the chunky press style; sigils use `<WaxSeal>`.
7. It lives under the global CRT and respects reduced-motion.
