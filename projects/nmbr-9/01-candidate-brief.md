# Candidate Brief — NMBR 9

> Stage 1 (Discovery). Scout-run (criteria-based find), 2026-05-20. Facts are sourced (see footer);
> items marked `unverified` need confirmation at the analysis/specification stage. No stat fabricated.

## Title & identity
- **Name:** NMBR 9
- **Designer:** Peter Wichmann _(reported across BGG/reviews)_
- **Publisher:** Z-Man Games / ABACUSSPIELE (2017)
- **Year:** 2017

## At a glance
- **Players:** 1–4 (scales higher with extra copies); plays well **solo** as a high-score chase
- **Play time:** ~20 minutes
- **Weight:** light / gateway abstract
- **BGG rank / rating:** _exact figure unverified_ — a popular, well-reviewed gateway abstract with a
  large ratings base (source + date in footer).

## The core loop
A deck of number cards (**0–9, each twice = 20 draws**) is flipped one at a time. Every player
**simultaneously** takes the matching number-shaped polyomino tile and adds it to their own tableau.
A tile placed on the table is **level 0** and scores nothing; you may **stack** a tile on top of others
only if it rests **fully flat on at least two tiles with no overhang and no gap underneath**. A tile on
level 1 scores its number × 1, level 2 → its number × 2, and so on. After all 20 tiles are placed, each
player sums **number × level**; **highest total wins**.

## Why digital
Two chores vanish on screen. First, **validating a legal stack** — "does this tile rest fully on the
tiles below, with no floating overhang?" — is fiddly and dispute-prone on a table; software checks it
exactly. Second, the **level-weighted score** (number × elevation, across a stack) is tedious to total
by hand and the computer does it instantly with a live running score. Simultaneous, low-interaction play
also makes **async multiplayer and a strong solo high-score mode** natural. The state is tiny and fully
deterministic — a great fit for a tight engine and a capable AI.

## Scoring (1–5; see ../../docs/01-discovery.md rubric)
| Criterion | Score | Note |
|-----------|:----:|------|
| Digital fit | 5 | Stack-legality validation + number×level scoring are exactly the chores software removes. |
| MVP scope | 5 | 20 tiles, one tableau, one scoring pass. Small, deterministic, fully modelable. |
| Rules clarity | 4 | Clean rules, but the "rests on ≥2 tiles, fully supported, no overhang/gap" geometry must be precise. |
| Visual feasibility | 4 | Abstract number polyominoes on a grid; the one challenge is communicating **stack elevation clearly in 2D** (shading/offset). |
| Demand signal | 4 | Popular gateway abstract, **no digital adaptation found** = open lane. Abstract niche caps mass appeal. |
| **Total** | **22 / 25** | Strong candidate — tiny scope, strong AI/solo potential; presentation of stacking is the one wrinkle. |

## Top risk
**Conveying elevation in 2D.** Players must instantly read which level a tile sits on and whether a
placement is legally supported; if the stacking visualization is unclear the game feels confusing.
Secondary: the "fully supported, no overhang/gap" placement rule must be implemented exactly.

## Top opportunity
A **tiny, fully deterministic** state with simultaneous play → a genuinely strong **AI opponent** and a
trivial **async/online** mode are both achievable even in an MVP, plus a solo high-score loop. Abstract
art needs are minimal, so grid/engine patterns (cf. Lacuna) likely transfer.

## Natural player mode (note, not scored)
**Competitive (simultaneous) + solo high-score.** MVP ships as **solo + local hot-seat**; because turns
are simultaneous and non-interactive, **async online multiplayer** is an unusually cheap fast-follow.

## IP first impression (note, not scored)
Current commercial title — **not** public domain. Published under Z-Man Games (Asmodee group), a large
publisher, so licensing is likely harder than with an indie. Provisional only; analysis sets `ip.status`
and weighs licensing vs. a clean reimplementation of an abstract ruleset.

## Recommendation
**Pursue.** Tiny scope, excellent digital fit, and the best AI/online upside of the shortlist; the only
real design problem to solve is a clear 2D elevation view. Advance to analysis.

---
**Sources (accessed 2026-05-20):**
[BGG – NMBR 9](https://boardgamegeek.com/boardgame/217449/nmbr-9) ·
[Meeple Mountain review](https://www.meeplemountain.com/reviews/nmbr-9/) ·
[Board Game Quest review](https://www.boardgamequest.com/nmbr-9-review/) ·
[Board Game Review (UK)](https://boardgamereview.co.uk/game-reviews/nmbr-9-review/)
_Note: no official digital adaptation surfaced in search as of 2026-05-20 — confirm in analysis._
