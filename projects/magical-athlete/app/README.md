# Magical Athlete — app

Digital MVP of Magical Athlete (CMYK). Licensed adaptation. Web-first, local hot-seat.
See `../03-mvp-spec.md` (what) and `../04-build-plan.md` (how).

## Run

```bash
npm install
npm run dev      # dev server
npm run test     # Vitest engine tests
npm run lint     # tsc --noEmit
npm run build    # type-check + production build
```

(Node is at `C:\Program Files\nodejs` on this machine but not on PATH — prepend it if needed.)

## Architecture

Pure `src/engine/` (deterministic, headlessly tested) + thin React `ui/` and Pixi `render/`
(see `../../../docs/stack-and-conventions.md`). Every match is reconstructable from
`{ config, seed, action-log }`.

```
src/engine/
  config.ts     # tunable constants (track length, features, chip values) — CONFIRM vs components
  rng.ts        # mulberry32 seeded PRNG (the only randomness)
  types.ts      # domain types
  track.ts      # Mild/Wild space + feature layout
  movement.ts   # pure track-move resolution (arrows chain, rock=trip, star=chip)
  racers.ts     # the 36 racers (powers wired in milestone 2)
  draft.ts      # snake draft (standard + 2P double-racer)
  setup.ts      # createMatch
  rules.ts      # legalActions + applyAction (draft -> reveal -> race -> afterRace -> ended)
  scoring.ts    # chip totals + winner
  sim.ts        # headless match driver + replay (used by tests)
  index.ts      # public API
```

## Status (build progress)

- [x] **Milestone 1** — engine core: track, movement/features, draft, race loop, race-end on 2nd
      finisher, 4-race scheduling, chip scoring. Deterministic; full-match simulation tests green.
- [x] **Milestone 2** — power engine (`resolve.ts` + data-driven `powers.ts` registry): triggers,
      resolution order, loop-break. **9 mandatory powers** implemented faithfully — Gunk, Coach, Hare,
      Banana, Centaur, Romantic, Lackey, Heckler, Scoocher — with one unit test each plus the
      rulebook's worked example reproduced as an interaction test. 25 tests green; full-match sim runs
      with powers active.
- [x] **Asset manifest** (`src/assets/manifest.ts`) — placeholder standees now; official CMYK art
      slots in by setting `src` (the board has a sprite path; see `src/assets/README.md`).
- [x] **Milestone 3–4** — 2.5D Pixi board (`src/render/board.ts`: perspective loop, standees, active
      highlight, tween) + React hot-seat flow (`src/ui/`): menu → draft → per-race reveal → race with
      Roll → after-race → end. Playable 3–4 players.
- [x] **Milestone 5** — 2-player double-racer variant. Unified player-turn/activation turn model
      (standard 3–4P unchanged): each player runs 2 racers, one on their first turn of a race and both
      after. Reveal-2 flow + 2P scoring tiebreak. Full-match 2P simulation green. *(Per-turn racer
      order is fixed for now; the prompt system can add a chosen order later.)*
- [x] **Milestone 6 — all 36 powers implemented**, plus the mechanics they needed:
  - **Optional-power prompt system** (`beginTurn`/`resumeTurn` pause-resume, `RaceState.pending`,
    `resolvePrompt` action + in-race choice UI; keyboard-selectable) and **post-turn reaction prompts**
    (Suckerfish/Duelist).
  - **Mechanics:** elimination (M.O.U.T.H.), warp (Hypnotist, Flip Flop, Third Wheel, Huge Baby),
    exact-finish (Stickler), power-copying (Copycat = lead; Twin/Egg = a fixed copied power), gravitate
    (Party Animal), reroll (Magician, Dicemonger), turn-order edits (Skipper, Inchworm), leap-over-occupied
    (Leaptoad), predict→extra-turn (Genius), predict-the-winner (Mastermind), double-or-trip (Rocket
    Scientist), chips + warp-to-start (Sisyphus), reactive follow (Suckerfish), dice duel (Duelist),
    position modifier (Blimp).
  - **All 36 racers** have their power; **52 unit tests** (per-power + full-match sims for 3–4P and 2P)
    + a Playwright e2e smoke; lint/build green.
  - **Accessibility:** keyboard-operable (Enter = roll / next race, number keys = choices), zoom enabled,
    turn/identity shown by text+label (not colour alone).
  - **Documented simplifications:** Twin/Egg auto-pick what they copy (rulebook lets the player choose);
    Copycat/Twin/Egg copy *hook* powers only; Suckerfish/Duelist resolve as **post-turn** reactions
    (rather than truly mid-cascade); Blimp's early-bonus value + "second corner" are `CONFIRM`.

### Still open (not powers)
- **`CONFIRM` values** in `src/engine/config.ts`: track length per side, Wild feature layout, gold/silver
  chip values, Blimp's "second corner". Confirm against the physical board.
- **Official CMYK art**: wire real per-asset files through `src/assets/manifest.ts` when provided.
- **Stage-5 `/test`**: the full visual playtest (qa-playtester drives the running app + reviews screens).

### Known placeholders to confirm against components / CMYK assets
Track length per side, Wild feature layout, and gold/silver chip point values are placeholders in
`src/engine/config.ts` (flagged `CONFIRM`). Art is loaded via the manifest (placeholders until CMYK's
official asset pack arrives).
