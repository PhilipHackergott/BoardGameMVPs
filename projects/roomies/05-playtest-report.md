# Playtest Report — Roomies

> Stage 5 (Test & iterate). Round 1 = 2026-05-21; **Round 2 = 2026-05-22 (major rework)**.

---

## Round 2 (2026-05-22) — two-phase restructure + visual overhaul

**Why:** playtest feedback — "there is no drafting phase" and "turns are instant / not watchable;
upgrade the visuals a lot." Decisions taken (via the design questions): **draft-then-place**
structure, **hot-seat + animated** (no AI), big visual upgrade modeled on lacuna/cull-the-crown.

**What changed:**
- **Engine** re-architected to two phases per round: a **DRAFT** phase (pick-and-pass into a personal
  pool; Dalai rotate / Marty swap fire on the *pick*, applied at the pick-round boundary) then a
  **PLACE** phase (arrange your pool into rooms; unplaced cards discarded). After round 3 → scoring.
- **UI** fully rebuilt: distinct Draft and Place screens, **pass-the-device** between players,
  **card-flight animations** (a glyph flies from hand→pool / pool→room), **phase banners**
  (DRAFT / PLACEMENT), an **animated cozy backdrop**, glassy cards with **emoji "art"** per animal/
  room, end-screen **confetti** + breakdown. Cozy warm palette + Fredoka/Nunito fonts.
- Scoring engine, biome sets, Joker/Security/herd/pair logic **unchanged** (still correct).

**Verification (round 2):** `lint` clean · **54/54** Vitest (scoring unchanged; rules + full-game
**simulation** rewritten for two phases — termination, card conservation incl. pools, Raum, and
deterministic replay all hold across 2/3/4 players × 5 seeds) · `build` OK · Playwright e2e plays a
full two-phase 3-round game to a result · 6 fresh screenshots in `playtest/round-2/` (title, pass,
draft, placement-start, placement-populated, end) visually confirm the rework.

**Still open (unchanged design ⚑):** deck 94 vs 96; biome values/map placeholder; Dekoration no-op;
plus the new note that **unplaced drafted cards are discarded each round** (no carry-over) and **early
rounds with no room drafted lose those animals** — a feel item to playtest. See `open-questions.md`.

---

## Round 1 (2026-05-21)

> Built MVP evaluated against `03-mvp-spec.md` acceptance criteria + the design brief.
> Screenshots in `playtest/round-1/`. *(Superseded by the round-2 rework above; kept for history.)*

## Summary
The MVP is **playable and correct**: a full hot-seat game (2–4 players, 3 rounds) runs end-to-end,
and the conditional **scoring engine — the heart — is demonstrably right** (verified by 54 unit
tests, a randomized full-game simulation, and a hand-checked end-screen breakdown). No blocker or
major defects. The remaining items are **design confirmations** (the ⚑ decisions from the spec),
not build bugs.

## Acceptance checklist (from the MVP spec)
| # | Criterion | Pass? | Note / evidence |
|---|-----------|:-----:|-----------------|
| 1 | New Game 2–4 players, 6-card hands; same seed → identical deal | ✅ | `cards.test` determinism; title screen offers 2/3/4 + seed |
| 2 | Picked Environment added with correct Raum & multiplier | ✅ | `rules.test`; screenshots show Raum bars + ×mult |
| 3 | Animal placeable only if free Raum ≥ its Raum; illegal disabled w/ reason; else discard | ✅ | `rules.test` throws "no room"; `04-illegal-rejected.png` shows greyed "Reisetasche · free 2/2 · full" vs enabled "Park · free 7/7" |
| 4 | Strict seat order; hands pass one seat; round ends when empty; exactly 3 rounds | ✅ | `rules.test` (seat order, passing) + `simulation.test` (3 rounds, hands empty at end) |
| 5 | Dalai → extra rotation; Marty → optional swap; no-ops on empty hands | ✅ | `rules.test` (rotate queued; Marty queue + boundary apply + skip). *Empty-hand no-op covered indirectly by simulation (no dedicated unit test).* |
| 6 | Hossi/Mikel ±1 both directions | ✅ | `scoring.test` |
| 7 | Sheeps +1 (≥3 Schafe) and −1 (no Security), can stack | ✅ | `scoring.test` |
| 8 | Leo +2 only at exactly 4 Schafe | ✅ | `scoring.test` (3/4/5) |
| 9 | Dalai +2 only when alone | ✅ | `scoring.test` |
| 10 | Marty +1 per Security | ✅ | `scoring.test`; end-screen Marty rooms |
| 11 | Joker (Hippo / Verkleidung) counts as Schaf + Security | ✅ | `scoring.test`; `06-end.png` 12-pt Trattoria (Hippo enables the herd & guards it) |
| 12 | Ausbau +2 Raum; Dekoration clamps each animal ≥0 | ✅* | `rules.test` (Ausbau). **Dekoration is a no-op** — see Finding F1. |
| 13 | Env score = Σ adjusted × multiplier; ×2 rooms double | ✅ | `scoring.test`; end screen shows "× 2 = …" |
| 14 | Biome sets score; improvements add tags; scales with sets | ✅ | `scoring.test`; end screen "Biome sets: 1 → +6" |
| 15 | End screen breakdown + biome bonus; highest wins; tie-break; shared win shown | ✅ | `06-end.png` full breakdown + winner; `winners()` returns ties. *Shared-win not visually exercised this round.* |
| 16 | Full loop keyboard-operable; hands hidden between players; not hue-only | ✅* | Keyboard wired (digits/Enter/P/D/Esc/reveal/N); pass-device screen; player glyphs ●▲■◆ + icon/text biome & keyword badges. *Keyboard path not yet e2e-asserted (see F4).* |
| 17 | Reconstructable from {config, seed, action-log} | ✅ | `simulation.test` deterministic-replay case |

## Visual playtest (Playwright headless Chrome)
> Drove the running app with a room-filling policy; screenshots in `playtest/round-1/`.

| State / screenshot | Looks right? | Issue | Suggested fix |
|--------------------|:-----------:|-------|---------------|
| setup `01-setup.png` | ✅ | Clean title; player count + seed | — |
| first turn `02-first-turn.png` | ✅ | Hand shows Raum/points/badges/effects + biome tags; HUD round/pick/turn + live totals | — |
| choose target `03-choose-target.png` | ✅ | Selected card → legal room "free 8/8" + Discard, with deselect | — |
| illegal rejected `04-illegal-rejected.png` | ✅ | Oversized Rocky → "Reisetasche · free 2/2 · full" disabled, "Park · free 7/7" enabled | — |
| mid-game `05-midgame.png` | ✅ | Tableaus with capacity bars, ×mult, biome/improvement tags, live per-room totals | — |
| end `06-end.png` | ✅ | Per-room breakdown (animals → subtotal × mult), biome sets + bonus, ranked winner | — |

No UI defects observed: no clipping/overlap, readable at 1280×920, palette is dark-theme consistent,
turn ownership and per-room "why" annotations are clear.

## Defects (ranked)
| # | Severity | Description | Repro | Suggested fix |
|---|----------|-------------|-------|---------------|
| — | — | **No blocker or major defects found.** | — | — |

## Findings — design confirmations & minor gaps (not build bugs)
- **F1 (design, ⚑ D11) — Dekoration does nothing.** With the given base points and ±1 modifiers, no
  animal can score below 0 (Sheep floors at 0, Mikel at 1, Hossi at 2), so the per-animal ≥0 clamp
  never triggers. **Decide:** change the clamp target (env subtotal), revisit base/penalty values,
  or give Dekoration a different effect. Encoded as a test that documents the no-op.
- **F2 (design, ⚑ D1) — Deck is 94, brief says 96.** Two cards unaccounted. **Decide:** the missing
  2, then bump `buildCardRegistry`.
- **F3 (design, ⚑ D7/D8) — Biome economy is placeholder.** `+6` per complete set and the
  env→biome map are guesses. **Decide:** real values / mapping (single constant + data table).
- **F4 (minor, test coverage)** — Keyboard operation, shared-win display, and the empty-hand
  intercept no-op are implemented but not yet asserted by automated tests. **Suggested fix:** add an
  e2e that completes a game via keyboard only, and unit tests for a tie and an empty-hand intercept.
- **F5 (design/feel, ⚑ D5/D6)** — "Play or discard, no relocation" means an animal drafted before
  you own a fitting room is lost. Early game can feel punishing. **Options:** allow a small bench, or
  accept as-is (it rewards drafting rooms early). Deferred per spec; flag for feel-testing.
- **F6 (feel)** — During your turn you see opponents' totals but not their tableaus. For a reactive
  drafter a peek at rivals' rooms would help planning. Minor; deferred.

## Automated results
- `lint` (tsc --noEmit, strict): **clean**.
- `test` (Vitest): **54/54 pass** — scoring (per-synergy), rules (play/discard/seat-order/passing/
  intercepts), cards (deck counts + determinism), and a full-game **simulation** across players={2,3,4}
  × seeds, asserting termination in 3 rounds, card conservation (all 94), Raum never exceeded.
- `build` (tsc + vite): **success** (166 kB JS / 54 kB gzip).
- `test:e2e` (Playwright/Chromium): **1/1 pass** — a full 3-player game played through the real UI to
  an end-screen result.
- **Simulation invariants**: never threw, always terminated, cards conserved, Raum respected.
- **Determinism**: replaying the action log on a fresh `createGame(seed)` reproduced final scores.

## Verdict
**`pass` on correctness & playability** — the MVP delivers the spec'd loop and the scoring engine is
proven right. **However**, three design decisions (F1 Dekoration, F2 deck count, F3 biome values)
are placeholders the designer should confirm before this is "done." 

Recommended at the gate, your call:
1. **Ship-to-learn** now (`/learn`) — accept the ⚑ placeholders as v1, capture lessons, refine later; or
2. **One quick iterate round** — answer F1–F3 (and optionally F4 test gaps) and I revise; or
3. **Send other feedback** (feel changes like F5/F6) and iterate.
