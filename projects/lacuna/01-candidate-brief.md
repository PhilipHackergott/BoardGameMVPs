# Candidate Brief — Lacuna

> Stage 1 (Discovery). Operator-run, 2026-05-20. Facts below are sourced (see footer); items
> marked _reported_ need confirmation at the specification stage.

## Title & identity
- **Name:** Lacuna
- **Designer:** Mark Gerrits
- **Publisher:** CMYK (2023)
- **Year:** 2023

## At a glance
- **Players:** 2 (head-to-head only)
- **Play time:** ~10–15 minutes
- **Weight:** light (reviewers describe it as light, with real tactical depth)
- **BGG average rating:** ~7.5 (well-received; many reviews). Exact rank not captured — confirm in analysis.

## The core loop
A circle of small wooden flower tokens — _reported_ 7 colors × 7 each (49 total) — is poured onto
a round "pond" mat in a random scatter. On your turn you pick **two flowers of the same color**
with a clear, uninterrupted straight line between them (no token or pawn crossing it), place one
of your **6 pawns** anywhere on that line, and collect both flowers. Each player has 6 pawns; the
game ends when all **12 pawns** are placed. Then every remaining flower goes to the **nearest
pawn** (area control). For each color, whoever holds the majority of that color wins it; whoever
wins the **majority of colors** wins the game.

## Why digital
The defining mechanic is geometric: "is the line between these two flowers truly uninterrupted?"
On the table this is fought out over **millimeters** and invites disputes. A digital version
**auto-validates lines, highlights legal pairs, and resolves nearest-pawn area control exactly** —
removing the fiddliest, most argument-prone part while keeping the spatial tension. It's also a
perfect 10-minute session for web/mobile.

## Scoring (1–5; see ../../docs/01-discovery.md rubric)
| Criterion | Score | Note |
|-----------|:----:|------|
| Digital fit | 5 | Exact line-validation & area control are tedious by hand, trivial+delightful digitally. |
| MVP scope | 5 | Tiny: 12 pawn placements + one scoring pass; small, fully-modelable state. |
| Rules clarity | 4 | Tight ruleset, but the digital build must precisely define geometry edge cases (line blocking, equidistant "nearest pawn", majority ties). |
| Visual feasibility | 5 | Abstract 2D top-down: colored dots, a circular mat, simple pawns. Ideal for PixiJS. |
| Demand signal | 4 | Popular, well-rated 2023 CMYK title; **no existing digital adaptation of the board game** = open lane. Niche 2p-abstract audience caps it below a mass hit. |
| **Total** | **23 / 25** | Strong candidate. |

## Top risk
The tabletop charm is partly tactile ("millimeter" precision and physical scatter). A digital
build must make pawn-on-line placement feel **precise and satisfying** (good zoom/snap/aim input)
or it risks feeling sterile. Secondary: 2-player-only abstract = a smaller niche audience.

## Top opportunity
No digital adaptation of the board game exists, yet the core mechanic is exactly what software
does best. Tiny scope → a fast MVP, and the small, deterministic state space makes a **strong AI
opponent genuinely achievable** even for an MVP.

## Natural player mode (note, not scored)
2-player head-to-head; no solo mode in the base game. Per factory rules this is fine — the MVP
ships as **local hot-seat / pass-and-play**, with a **vs-AI** mode as a high-value fast-follow
(feasible given the small state space) and online deferred.

## IP first impression (note, not scored)
Currently-published commercial title (CMYK, 2023) — **not** public domain. CMYK is an
indie/innovation-friendly publisher, so a licensing conversation is plausible. **Naming flag:** an
unrelated "Lacuna" sci-fi noir video game already occupies the digital namespace, so the app would
need a distinct working title regardless. Analysis sets `ip.status` and decides licensing vs.
clean reimplementation — this is **not** a discovery penalty.

## Recommendation
**Pursue.** High digital fit, tiny MVP scope, an open competitive lane, and a manually-chosen
proving-ground title. Advance to analysis.

---
**Sources:** [CMYK – Lacuna](https://www.cmyk.games/products/lacuna) ·
[BGG – Lacuna](https://boardgamegeek.com/boardgame/386937/lacuna) ·
[Meeple Mountain review](https://www.meeplemountain.com/reviews/lacuna/) ·
[Board Game Review (UK)](https://boardgamereview.co.uk/game-reviews/lacuna-review/) ·
[Opinionated Gamers review](https://opinionatedgamers.com/2023/06/15/dale-yu-review-of-lacuna/)
