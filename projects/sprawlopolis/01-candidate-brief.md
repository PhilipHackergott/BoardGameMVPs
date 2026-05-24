# Candidate Brief — Sprawlopolis

> Stage 1 (Discovery). Scout-run (criteria-based find), 2026-05-20. Facts are sourced (see footer);
> items marked `unverified` need confirmation at the analysis/specification stage. No stat fabricated.

## Title & identity
- **Name:** Sprawlopolis
- **Designer:** Steven Aramini, Danny Devine, Paul Kluka _(unverified — credited across reviews/store)_
- **Publisher:** Button Shy Games (2018)
- **Year:** 2018

## At a glance
- **Players:** 1–4, **cooperative** (plays equally well solo)
- **Play time:** ~15–20 minutes
- **Weight:** light (a wallet-sized micro game; depth comes from the variable scoring)
- **BGG rank / rating:** _exact figure unverified_ — widely regarded as one of the best-rated
  18-card micro/PnP games; strong, sustained interest on BGG and review sites (source + date in footer).

## The core loop
The whole game is **18 cards**. Three cards are drawn at random to become the **scoring conditions**,
and the sum of their numbers is your **target score**. The remaining cards are played one at a time to
build a single contiguous city: each new card overlaps part of the existing layout, and the four
quadrants of every card are one of four zone types (residential, commercial, industrial, parks) with
**road segments** running across the borders. After all cards are placed you tally points from the
three random conditions (e.g. largest block of a zone type) **plus** road-network scoring, and try to
**beat the target**. You win or lose together (or against your own best score solo).

## Why digital
Scoring is the chore: you must measure the **largest contiguous block** of each zone type and count
**connected road networks** by eye, every game, against three conditions that change each play. That's
exactly what software does instantly and without dispute — and it can **highlight legal placements,
show a live score, and validate overlaps**. The variable goal-deck makes it endlessly replayable, it's
a perfect ~10-minute mobile session, and it's **solo/co-op from the box** — an ideal single-player MVP
with daily-puzzle potential.

## Scoring (1–5; see ../../docs/01-discovery.md rubric)
| Criterion | Score | Note |
|-----------|:----:|------|
| Digital fit | 5 | Contiguous-block + road-network scoring is tedious and error-prone by hand; trivial and delightful digitally. |
| MVP scope | 5 | 18 cards, one shared tableau, one scoring pass. Tiny, fully modelable state. |
| Rules clarity | 4 | Placement/overlap rules are tight, but each of the ~18 goal cards is a unique scoring rule the engine must encode correctly. |
| Visual feasibility | 5 | Abstract grid of four colored zone types + road lines. Ideal for 2D/PixiJS; no art dependency. |
| Demand signal | 4 | Beloved micro game, **no official digital adaptation found** (PnP/sandbox only) = open lane. Micro/PnP niche caps mass appeal. |
| **Total** | **23 / 25** | Strong candidate — smallest scope of the three, fully solo-playable. |

## Top risk
The scoring **content**: roughly 18 distinct goal-card rules (plus road scoring and overlap geometry)
must each be encoded and validated exactly, or the game is subtly wrong. Correctness work is real even
though the footprint is tiny.

## Top opportunity
Co-op/solo from the box → a genuinely complete **single-player MVP** (high-score / daily-puzzle modes),
with the smallest build footprint of the three and high replayability from random goal combinations.

## Natural player mode (note, not scored)
**Cooperative / solo.** Per factory rules this is ideal — the MVP can ship as a polished single-player
experience first, with pass-and-play co-op trivial to add.

## IP first impression (note, not scored)
Current commercial title — **not** public domain. Button Shy is a small, community- and PnP-friendly
indie publisher, so a licensing conversation is plausible. Provisional only; analysis sets `ip.status`
and decides licensing vs. clean reimplementation.

## Recommendation
**Pursue.** Highest digital fit + smallest scope of the shortlist, an open competitive lane, and a
built-in solo mode that maps cleanly to a fast MVP. Advance to analysis.

---
**Sources (accessed 2026-05-20):**
[BGG – Sprawlopolis](https://boardgamegeek.com/boardgame/251658/sprawlopolis) ·
[Button Shy – Sprawlopolis](https://buttonshygames.com/products/sprawlopolis) ·
[Meeple Mountain review](https://www.meeplemountain.com/reviews/sprawlopolis/) ·
[There Will Be Games review](https://therewillbe.games/articles-boardgame-reviews/8767-sprawlopolis-review)
_Note: no official standalone digital adaptation surfaced in search as of 2026-05-20 — confirm in analysis._
