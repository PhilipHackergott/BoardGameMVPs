# Playtest Report — Lacuna / "Nightweave"  (round 1)

> Stage 5 (Test & iterate). Operator-run, 2026-05-20. Screenshots in `playtest/round-1/`.
> Checked against `03-mvp-spec.md` and the Lacuna rules.

## Acceptance checklist (from the MVP spec)
| Criterion | Pass? | Note |
|-----------|:-----:|------|
| 49 stars (7×7), non-overlapping, in field; seed determinism | ✅ | Engine test + screenshot 02. |
| Same-color clear pair selectable; line + beacon preview render | ✅ | Screenshot 05. |
| Different-color pair rejected with visible reason | ✅ | Screenshot 03 ("Pick a star of the same color"). |
| Blocked line rejected with visible reason | ✅* | Engine-tested (`geometry`/`rules`); same path drives the UI message. Not separately screenshotted. |
| Placing removes the two stars, credits the tally | ✅ | Screenshot 06: stars gone, beacon placed, cyan P1=2. |
| Strict alternation; 6 beacons each; ends after the 12th | ✅ | 06 (P1→P2, P1 6→5), 08 (P1:0 P2:0, all placed). |
| No-move pass; two passes end the game | ✅* | Engine-tested (`rules`). Not exercised in this game (all 12 placed). |
| End territory to nearest beacon; equidistant discard | ✅* | Engine-tested (`scoring`). This game had 0 discards (every color sums to 7). |
| Per-color majority; overall most colors; tie-break; draw | ✅ | 08: P1:6 / P2:1, splits 4-3/5-2/3-4 all sum to 7. Draw path engine-tested. |
| Live per-color tallies match engine | ✅ | 06: cyan P1=2 immediately after the placement. |
| Keyboard-operable; colors distinguishable beyond hue | ⚠️ partial | 7 distinct shape glyphs confirmed (02). Actions are keyboard-bound (Enter/Esc/N) but **star selection is pointer-only**. |

\*Verified by automated engine tests rather than a dedicated screenshot.

## Visual playtest (Playwright headless Chrome)
Drove a full deterministic game (seed 12345): title → start → illegal attempt → select pair →
position/place beacon → played all 12 beacons → end. **Zero console/page errors.**

| State / screenshot | Looks right? | Issue | Suggested fix |
|--------------------|:-----------:|-------|---------------|
| 01-title | ✅ | rules + seed field render | — |
| 02-initial-board | ✅ | 49 stars, 7 glyphs, HUD, scoreboard 0s | — |
| 03-illegal-different-color | ✅ | reason shown; reselects new star + partners | — |
| 04/05 select + preview | ✅ (minor) | pair ringed, line + P1 beacon preview, Place enabled | After the 2nd star is chosen, other legal partners of the 1st star stay ring-highlighted — slightly noisy. Clear `selection.partners` once `bStarId` is set. |
| 06-after-first-placement | ✅ | turn→P2, P1 6→5, stars removed, cyan P1=2 | — |
| 07-midgame | ✅ | board thins, beacons accumulate | — |
| 08-end-screen | ✅ | "Player 1 wins!", per-color 4-3/5-2/3-4 (all =7), colors 6–1 | — |

## Defects (ranked)
| # | Severity | Description | Repro | Suggested fix |
|---|----------|-------------|-------|---------------|
| 1 | minor | Legal-partner rings of the first star persist after the second star is selected. | Select star A, then a valid B; A's other partners stay outlined. | In `store.selectStar`, set `partners: []` when assigning `bStarId`. |
| 2 | minor | "Fully keyboard-operable" not met — star selection requires pointer. | Try to select a star via keyboard. | Out of MVP scope; add keyboard star-cycling later, or amend the criterion. |

No **blocker** or **major** defects found. Correctness (rules, scoring, termination, determinism)
is covered by 25 passing engine tests incl. a 40-seed simulation; the visual playtest confirms the
rendering and the full interactive loop work and match the rules.

## Automated results
- `lint` (tsc --noEmit): clean.
- `test` (Vitest): 25/25 pass (setup, geometry, rules, scoring, full-game simulation, determinism).
- `build` (vite build): success.
- `test:e2e` (Playwright visual playtest): 1/1 pass, 0 console/page errors, 8 screenshots captured.
- Determinism: replaying the action log reproduces the final state (engine test).

## Verdict
**PASS** for the MVP scope, with two **minor** polish items (above). Recommend either accepting the
minors and shipping the MVP, or a quick round-2 to clear defect #1. Handing off to the user for
manual debugging per their instruction.

---

# Ship-review pass (round 4) — 2026-05-21

> Clears the standing **visual-verification debt**: the powers/affinities/AI + watchability/UX waves
> were tsc + 58-test green but had never been seen rendered. Screenshots in `playtest/round-4/`.

First the e2e specs were repaired (they predated the main menu and waited for the board canvas
before a game existed) and a new `ship-review.spec.ts` was added to screenshot the wave-2/3 surfaces,
driving setup through the store via the dev seam.

## Visual review (Playwright headless Chrome) — every surface looks correct
| State / screenshot | Looks right? | Note |
|--------------------|:-----------:|------|
| 02-04 core lines / snap-preview / placement | ✅ | green guide lines, snapped pawn, placement land |
| 08-lens / 09-lens-hover | ✅ | influence Voronoi zones + reactive hover |
| 08-victory / 09-victory-dismissed | ✅ | confetti + "WINS!!" + ✕ dismiss reveals the final board |
| 10-menu | ✅ | main menu renders |
| 11-draft-dual | ✅ | both Powers + Affinities zones with blurbs |
| 12-draft-affinities-only | ✅ | Powers zone correctly **absent** (config-gated), single column |
| 13-panels-affinity | ✅ | affinity name + info blurb in each player panel |
| 14-flowers-collapsed | ✅ | "Flowers ▸" collapse toggle hides the breakdown |
| 15-fourplayer-layout | ✅ | 4 boards flank the pond (2 per side), never beneath |
| 16-game-log | ✅ | per-player timeline with inline flower icons |
| 17-allai-pause | ✅ | Pause/Play control shows only in all-AI matches |

**No blocker/major/minor visual defects found.**

## Automated results (this pass)
- `lint` (tsc --noEmit): clean.
- `test` (Vitest): 58/58 pass.
- `build` (vite build): success.
- `test:e2e` (Playwright): **7/7 pass**, 0 console/page errors, 19 screenshots captured.

## Verdict
**PASS.** The visual-verification debt is cleared — the full feature set (base game, lens, 18 powers,
7 colour affinities, configurable AI with watchable pacing + pause, game log, 2–4-player flanking
layout) renders correctly and matches the rules. Ready for a ship decision (a human gate).
