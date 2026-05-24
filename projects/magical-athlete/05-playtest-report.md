# Playtest Report — Magical Athlete (Round 1)

> Stage 5 (Test & iterate). Operator-run, 2026-05-21. Automated checks + a headless-Chrome visual
> play-through of a full 3-player match (seed 389626338). Screenshots: `playtest/round-1/`.

## Verdict: **pass** (after round 2)
Round 1 found only visual/UX defects (rules were already correct). Round 2 fixed **all four** and
re-verified — the game is rules-correct, fully playable, and now visually clean. Ready to ship.

### Round 2 — fixes verified (screenshots in `playtest/round-2/`)
- **#1 standee labels (was MAJOR)** — removed the colliding per-standee name tags; standees fan out with a
  vertical cascade + z-sorting (identity via body colour/initials + the standings panel). Clean. ✅
- **#2 Dicemonger reroll label** — prompt now reads "Dicemonger lets you reroll" vs "<racer>'s power". ✅
- **#3 finish marker** — a checkered **FINISH** flag drawn just outside the ring (no longer hidden under
  the Start cluster). ✅
- **#4 finished-racer badge** — gold **1** / silver **2** place badge on finished standees (`05-after-race.png`
  shows it). ✅
- **Wild features confirmed** — `06-wild-race.png` shows ★ stars, ▲ rocks, and » « arrows on the Wild track,
  and chip values scale per race (5/3 → 6/4 → 7/5). Closes the round-1 caveat.
No new defects found in round 2. Residual: standee bodies still lightly overlap when many cluster on one
space, but they remain distinguishable (colour + initials + badges) — accepted for the MVP.

---
## Round 1 (initial) — verdict was iterate
The game was **rules-correct and fully playable** — a complete 4-race match ran end to end with correct
draft, reveal, movement, powers, finish detection, and cumulative scoring. The findings were **visual/UX**;
the only one above "minor" was standee label overlap on the board. No rule or correctness defects.

## Automated results
- `npm run lint` (tsc strict) — **clean**
- `npm run test` (Vitest) — **52 passed**, incl. one unit test per implemented power, the rulebook's
  worked-example cascade, and randomized **full-match simulations** (3–4P and 2P) asserting termination,
  legal state, determinism, and replay.
- `npm run build` — **succeeds**
- `npm run test:e2e` (Playwright) — smoke + full-match playthrough **pass**

## Visual playtest (screenshots → judged vs. spec + rules)
- `01-menu.png` — ✅ title, player count (2/3/4), seed, Start. Clean.
- `02-draft.png` — ✅ 3-player draft flips 6 cards (2×players); "Player 1 picks"; per-player hands;
  placeholder standee swatches w/ initials.
- `03-reveal.png` — ✅ "Race 1 of 4 — Mild Mile", chip values 🥇5/🥈3, current player picks from a hand of 4.
- `04-race.png` — ✅ dimetric oval track, MILD MILE label, chip values, turn indicator ("Player 2 — Stickler"),
  Roll button, live standings. ⚠️ **standee name labels overlap** at the shared Start space (jumbled
  "Flip B…monger"); the red finish dot sits under the Start standees.
- `05-power-prompt.png` — ✅ in-race choice works (a Dicemonger-granted reroll: "Reroll (rolled 3)" / "Keep 3").
  ⚠️ labeled "Stickler's power" though it's Dicemonger's grant.
- `06-after-race.png` — ✅ "Race over! 🥇 Player 3 (+5) · 🥈 Player 2 (+3)"; standings show ✓1/✓2 and correct
  totals (5/3/0). Scoring + finish order correct. ⚠️ same label overlap near the top; finished racers not badged on the board.
- `07-end.png` — ✅ "Player 2 wins!" with sorted final standings (19/17/16) and New match. Cumulative scoring correct.

## Defects (ranked, each with a suggested fix)
1. **MAJOR (legibility) — standee name labels collide when racers share/cluster a space.** Bodies fan out
   ~18px but the wider name tags overlap into an unreadable jumble (worst at Start/finish, both near the top
   of the oval). *Fix:* drop per-standee name tags (the body already shows initials + the standings panel
   names everyone), or show the name only for the active racer, or stack tags vertically when co-located.
   _File: `src/render/board.ts` (`makeStandee` nameTag + co-location offset in `update`/`tick`)._
2. **MINOR — Dicemonger reroll mislabeled** as the current racer's power. *Fix:* when `pending.dicemonger`,
   label the prompt generically (e.g. "Reroll? (Dicemonger)"). _File: `src/ui/RaceView.tsx` pending header._
3. **MINOR — finish marker unclear.** The red dot renders at `length-0.5` (adjacent to Start at the top),
   so it hides under the Start cluster. *Fix:* a distinct checkered finish line or a "FINISH" label.
   _File: `src/render/board.ts` (`buildTrackGraphics`)._
4. **MINOR — finished racers aren't badged on the board** (only ✓1/✓2 in standings). *Fix:* a 1st/2nd badge
   on finished standees. _File: `src/render/board.ts`._

## Experience & accessibility
- Core loop reads well: whose turn, the roll, the choice prompts, and the after-race result are all clear in
  the HUD/standings. The board conveys progress; the clustering legibility (defect 1) is the main friction.
- Keyboard: Enter = roll / next race, number keys = power choices, all controls focusable. Zoom enabled.
- Colorblind: identity by text + initials (not colour alone). ✅ The canvas itself isn't screen-reader
  exposed — acceptable for the MVP; an aria-live turn/move announcer is a future nicety.

## Acceptance criteria (from 03-mvp-spec.md)
All pass, with one caveat: **Wild-track features (arrow/rock/star) are unit-tested but not visually
confirmed this round** (race 1 was Mild and the auto-driver took first options) — capture a Wild race next round.

## Next step
**Pass.** All round-1 defects fixed and re-verified in round 2; automated suite green (lint · 52 unit tests ·
build · e2e + full playthrough). Gate: **ship it (mark shipped + `/learn`), or iterate again?**
