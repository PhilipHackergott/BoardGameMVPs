# MVP Spec — Lacuna (working title: "Nightweave")

> Stage 3 (Specification), the *what*. Operator-run, 2026-05-20.
> Clean reimplementation per the recorded IP decision: original constellation theme + assets,
> distinct working title **Nightweave**, unpublished prototype. Mechanics mirror Lacuna.

## Pitch & target experience
A two-minute, two-player duel of pure spatial tension: connect two stars of the same color across
a clear night sky, drop a beacon on the line, and claim them. A calm, exact, "one more game"
abstract — the geometry the table fights over, adjudicated perfectly by the machine.

## Scope line (the single core loop the MVP delivers)
Local **hot-seat** play of one full game: players alternate connecting same-color star pairs and
placing beacons until all 12 beacons are down, then automatic area-control scoring and a winner.
Everything else (vs-AI, online, accounts, themes) is out of the MVP.

## Theme reskin (original assets)
- Flowers → **stars** (7 colors); pond → circular **night sky**; metal pawns → **beacons**.
- No CMYK names, art, lore, or rulebook text used. Mechanics only.

## Rules to implement

### Components & setup
- A circular play field of radius `R`.
- **49 stars**: 7 colors × 7 stars each, scattered at random (seeded) positions inside the field,
  non-overlapping (centers ≥ `2*starR + gap`) and inset from the edge.
- **2 players**, P1 and P2. Each owns **6 beacons** (12 total). P1 moves first.

### Turn structure (alternating, P1 first)
1. The active player picks **two stars of the same color**.
2. The straight segment between their centers must be **clear**: no *other* star's center lies
   within `starR` of the segment, and no existing beacon lies within `beaconR` of the segment
   (endpoints excluded). This is the "uninterrupted line" rule.
3. The player places **one beacon** at a chosen point strictly between the two stars (along the
   segment). Beacon position matters — it decides end-game territory.
4. The two connected stars are **removed from the sky and added to the player's collection** for
   that color. Turn passes.

### Edge cases (locked for the MVP — digital-medium decisions, flagged where they go beyond canon)
- **No legal move:** if the active player has no legal pair, their turn is **passed**. If **both**
  players pass consecutively while beacons remain, the game ends early and proceeds to scoring.
- **Clearance geometry:** "blocked" = perpendicular distance from a star center to the segment
  `< starR`, or from a beacon to the segment `< beaconR`, with the projection falling between the
  endpoints. (Defines the table's "millimeter" judgment precisely.)
- **Beacon placement:** interior of the segment only (not on either star). UI clamps to a small
  inset from each endpoint.

### Game end & scoring
1. Game ends when **all 12 beacons are placed** (or both players pass with beacons left).
2. **Territory:** each star still in the sky is awarded to the owner of the **nearest beacon**
   (Euclidean, beacon center to star center). If the two nearest beacons (different owners) are
   **equidistant**, the star is **discarded** (scored by neither). *(MVP tie rule.)*
3. **Per color:** each player's total for a color = stars collected in play + stars awarded as
   territory. The player with **more** of a color **wins** that color; an equal split (only
   possible if a star of that color was discarded) is a **tie color**, won by neither.
4. **Winner:** the player who **wins more colors**. Tie-break (only if colors-won are equal):
   most total stars; if still equal, **draw**. *(MVP tie-break.)*

### Determinism
Every game is reconstructable from `{seed, action-log}`. Setup scatter uses a seeded PRNG; no
other randomness exists. This powers replay, tests, and the later playtest stage.

## Modes
- **Hot-seat** (two humans, one device) — the only MVP mode.
- vs-AI is the planned fast-follow (small state space makes it feasible) — **not** in this MVP.

## Screens & flow
- **Title / New Game:** start a game; optional seed field (blank = random). Pick first player (P1 default).
- **Game screen:**
  - Center: the circular sky with stars + placed beacons (PixiJS canvas).
  - Top HUD: whose turn it is (P1/P2, color-coded), beacons remaining per player.
  - Side/bottom: per-color score tally (7 colors × P1/P2 running counts, live).
  - Interaction: click a star → its legal same-color partners highlight → click a partner → a
    beacon preview appears on the segment; click along the segment to position it → **Place** to
    confirm. A **Cancel/Deselect** clears the selection. Illegal selections are rejected with a
    visible reason.
- **End screen:** final per-color winners, territory resolution shown, the winner (or draw),
  and **New Game**.

## Player states & feedback
- Always show: active player, beacons left, current per-color counts.
- On selecting a star: highlight it and outline every legal partner; dim illegal ones.
- On an illegal attempt (wrong color / blocked line): a short visible message ("Line is blocked"
  / "Pick a star of the same color").
- On placement: animate the two stars into the active player's tally.
- End: clearly state who won each color and the overall result.

## Art & feel direction
- Dark night-sky background; 7 distinct, **colorblind-aware** star colors (varied hue *and*
  brightness/shape accents, not hue alone). Beacons drawn in two clearly distinct player styles
  (e.g., filled vs. ringed) — not reliant on color alone.
- Calm, minimal, high-contrast. Keyboard: Enter = confirm placement, Esc = deselect, N = new game.
- Text scales; no essential information conveyed by color only.

## Acceptance criteria (each testable — becomes the playtest checklist)
- [ ] New Game lays out 49 stars (7×7), non-overlapping, inside the field; same seed → identical layout.
- [ ] A same-color pair with a clear line is selectable; the connecting line and beacon preview render.
- [ ] A pair of different colors is rejected with a visible reason.
- [ ] A pair whose line passes through another star or an existing beacon is rejected with a visible reason.
- [ ] Placing a beacon removes exactly the two connected stars and adds them to the active player's tally.
- [ ] Players strictly alternate; each places exactly 6 beacons; the game ends after the 12th.
- [ ] A player with no legal move is passed; two consecutive passes end the game.
- [ ] At end, every remaining star is awarded to the nearest beacon's owner (equidistant → discarded).
- [ ] Per-color winner = majority; overall winner = most colors; tie-break applied; draw possible and shown.
- [ ] Per-color tallies shown during play match the engine state at all times.
- [ ] The full loop is keyboard-operable; star colors are distinguishable without relying on hue alone.

## Out of scope (MVP)
vs-AI, online multiplayer, accounts/profiles, persistence/save, sound, animations beyond basic
feedback, settings menus, multiple themes, monetization, desktop/mobile wrapping (web only for now).
