# Plan — Remodel the combat screen after Balatro

Goal: lay out the battle screen like Balatro — a fixed **left sidebar** of run/round state, a wide
**play field** on the right, the **hand** fanned along the bottom, the **action buttons centred
below the hand**, and the **deck as a card-back pile at the bottom-right** (with "View Deck" + the
hover peek table). Re-skinned in Cull the Crown's palette (see `art-style.md`), not Balatro's art.

## Current state (what we're changing)

- `CombatScreen` (`app/src/ui/App.tsx`) renders a **full-bleed Pixi board** (`<PixiBoard>`) with
  DOM HUD **floating over it** in islands: `.ov-stats` (top-left: gold / royal / hand), `.ov-turn`
  (top-centre: turn banner + intent + decrees), `.ov-left` (Jester + held tray), `.ov-right` (guild
  slots), `.ov-bottom` (the hover info box + the compact Play/Clear bar + hint).
- The Pixi stage (`render/combatStage.ts`) is an internal **480×270** canvas, CSS-upscaled to fill
  `.pixi-host`. Inside it: enemy at `(240,70)`, hand fan at `y≈224`, **deck pile** at `x=32` and
  **discard pile** at `x=448` (both `y≈226`), play-zone above `y=182`.
- So today everything is centre-stacked and the HUD floats in the corners. Balatro instead commits
  the left quarter to a chrome sidebar and gives the rest to the felt.

## Target layout (Balatro → Cull the Crown mapping)

```
┌───────────────┬───────────────────────────────────────────────┐
│  SIDEBAR ~26% │                 PLAY FIELD ~74%                 │
│ ┌───────────┐ │   deck:remaining ◄                  ► used      │
│ │ ROYAL     │ │                                                 │
│ │ banner    │ │              ♛  ROYAL (enemy)                   │
│ │ HP/disable│ │              HP bar · decree                    │
│ │ /decree   │ │                                                 │
│ ├───────────┤ │            (resolution cascade)                 │
│ │ progress  │ │                                                 │
│ ├───────────┤ │     ♣ ♥ ♦ ♠  ← hand fan (bottom)               │
│ │ DMG × ... │ │            8/8                                  │
│ │ (preview) │ │   ┌────────┐ ┌──────────┐ ┌────────┐  ┌─────┐  │
│ ├───────────┤ │   │  Play  │ │ Sort R/S │ │ Jester │  │DECK │  │
│ │ Descent / │ │   └────────┘ └──────────┘ └────────┘  │back │  │
│ │ Options   │ │                                        │44/52│  │
│ │ Jesters $ │ │                                        └─────┘  │
│ │ Royal x/12│ │                                       View Deck │
│ └───────────┘ │                                                 │
└───────────────┴───────────────────────────────────────────────┘
```

### Left sidebar (the chrome column) — maps Balatro's blind panel
A fixed-width DOM `<aside class="combat-sidebar">` (~min(340px, 30vw)), stacked panels in CtC
parchment/brass styling:

1. **Royal panel** (= Balatro's Blind banner + "score at least"): the current royal's tier
   (JACK / QUEEN / KING) as a header, its **per-suit portrait sprite**, its **HP** (the "score to
   beat"), the suit it **Disables**, and its **Decree(s)**. The gold **bounty** shown as the reward.
2. **Progress panel** (= "Round score"): a bar of damage dealt to this royal so far
   (`damageTaken / maxHealth`) + accumulated **shield**.
3. **Play preview** (= the big score × mult): when cards are selected/hovered, show the computed
   **damage** big, with heal/draw/shield chips and the resolution trace folded under it. This is the
   info that currently lives in the floating `.action-pop` — it moves into the sidebar.
4. **Controls row** (= Run Info / Options): **The Descent** (run/royal overview) and **Options**
   (pause → settings/rules/save). Plus the run-state readouts: **Jesters ×N** (the discard-equivalent
   resource), **Gold ◆N**, **Royal X/12** + act/tier.

### Play field (the felt) — the right ~74%
- **Pixi board** moves into the right column and sizes to it. The internal enemy/hand/cascade layout
  stays self-consistent (still centred in its own 480×270 space), so no per-element Pixi math is
  needed for enemy/hand — only the board's container changes.
- **Hand** fans along the bottom (unchanged in Pixi).
- **Action buttons centred below the hand** (new DOM bar in the play column): **Play ▸** (commit the
  selected combo), **Sort: Rank | Suit** (re-order the hand — new), **Jester** (discard hand & redraw
  — the "Discard" analog), and in the defend sub-phase **Auto / Block**. These replace the floating
  `.ov-bottom` Play/Clear bar and the `.ov-left` Jester card.
- **Deck = card-back pile, bottom-right** (new DOM): render the deck variant's **`<DeckArt>`
  card-back sprite** (the request — signifies which deck), with the **count ("44/52")** and a
  **"View Deck"** label. Click → opens the full deck view (`setPileModal("all")`); **hover → the
  remaining-cards peek table** already built (`DeckPeek`). The **used pile** mirrors it (bottom-left
  of the field or beside the deck), click → `setPileModal("discard")`.
- The deck/discard **move from Pixi to DOM**; the Pixi deal-in/þfly-out origins update to the new
  pile screen positions (the one piece of real Pixi geometry work).

## Implementation phases (each its own gate)

**P1 — Shell split (no behaviour change).** Wrap `.screen.combat` as a flex row: `.combat-sidebar`
(empty for now) + `.combat-field` holding `<PixiBoard>` and the existing overlays. Size the board to
the field column; confirm input still works (the e2e `cardScreenPos` reads the live canvas bbox, so
it adapts). Ship + eyeball.

**P2 — Sidebar.** Build the four sidebar panels and move the HUD data into them (gold, royal, hand,
jesters, guild slots, intent, decree, and the play preview/trace from `.action-pop`). Remove the now-
empty floating islands. Style panels per `art-style.md`.

**P3 — Centre action bar.** Move Play/Clear + add Sort(Rank/Suit) + Jester into a centred DOM bar
below the hand; wire Sort to reorder `run.hand` (engine helper or a view-only sort). Keep the defend
Auto/Block flow.

**P4 — Deck & used piles to DOM.** Replace the Pixi deck/discard piles with DOM `<DeckArt>` card-back
(bottom-right, count, "View Deck", click+hover) and a used pile; update the Pixi deal-in/discard
origins to those screen points. Move `onDeckClick`/`onDeckHover` from Pixi to the DOM elements (the
`DeckPeek` hover already exists — just retarget its trigger).

**P5 — Polish.** Spacing, the CRT, responsive clamp (sidebar collapses gracefully on narrow widths),
keyboard operability, and update the playtest screenshots.

## Files touched
- `app/src/ui/App.tsx` — `CombatScreen` restructure (sidebar + field + action bar + DOM piles).
- `app/src/styles.css` — `.combat-sidebar`, `.combat-field`, `.combat-actions`, `.field-deck`/`.field-used`,
  retire `.ov-stats/.ov-turn/.ov-left/.ov-right/.ov-bottom` (or repurpose into the sidebar).
- `app/src/render/combatStage.ts` + `PixiBoard.tsx` — board sizing in the field column; in P4, remove
  the Pixi piles and re-point deal-in/fly-out origins; move `onDeck*` triggers to DOM.
- `app/src/ui/DeckPeek.tsx` — unchanged logic; trigger now from the DOM deck element.
- New tiny helper for hand sort (Rank/Suit) in the store or `engine/index`.

## Decisions
- **Hands/Discards counter — DECIDED: drop the Hands counter for now.** Sidebar shows **Jesters** as
  the discard-equivalent resource; no "Hands" counter.
- **Sort Hand — DECIDED: add it** (Rank / Suit), to match Balatro.
- **Board aspect ratio — OPEN, needs your pick.** The Pixi board renders at a fixed internal
  **480×270 (16:9)**; the new play-field column is taller/narrower than 16:9, so the board can't fill
  it without a choice:
  - **(A) Letterbox** — keep 480×270, scale to the column width, centre it (felt bands above/below).
    *Implication:* **zero Pixi geometry work** — enemy/hand/piles/cascade keep their positions; fast
    and low-risk; but the play area is shorter than Balatro's full-height felt and the cards stay
    smallish. The e2e `cardScreenPos` helper keeps working unchanged.
  - **(B) Re-fit the stage** — change the internal stage to the column's aspect (taller) and
    reposition every element (enemy higher, hand lower, piles, play-zone, resolution). *Implication:*
    looks properly Balatro (felt fills the space, bigger cards), but it's **more work + risk**:
    re-tuning all Pixi positions and updating the e2e geometry helper (`STAGE_W/STAGE_H` + hand math).
  - *Recommendation:* ship **(A)** in P1 (fast, correct), then do **(B)** as a polish pass if the
    letterbox bands bother you.
- **e2e:** P4 moves deck click/hover to DOM → update `enemy`/`input`/`packs` specs that poke the deck;
  `cardScreenPos` keeps working since it reads the canvas bbox.

## Out of scope (for this remodel)
Engine/combat rules, the shop screen, the setup overlay (already Balatro-styled). Sidebar is chrome
only — all mutations still go through the pure engine.
