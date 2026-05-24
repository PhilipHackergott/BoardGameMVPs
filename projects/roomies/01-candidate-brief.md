# Candidate Brief — Roomies

> Stage 1 (Discovery). **Original design supplied by the user**, not a third-party title — so this
> brief records the design as given rather than scouting/scoring an existing published game. Market
> demand signals are therefore N/A (no third-party comparables researched at this stage).

## Title & identity
- **Name:** Roomies (working title; user-chosen)
- **Designer:** the user / factory operator (original design)
- **Publisher:** none (unpublished original)
- **Year:** 2026 (in development)

## At a glance
- **Players / time / weight:** 2–4 (target), ~20–30 min, light-medium (a tableau-drafter with a
  combo-y scoring layer). ⚑ Player count and length are design targets, not fixed by the source.
- **BGG rank / rating:** N/A — original design.

## The core loop
Players draft cards from rotating hands (à la 7 Wonders / Sushi Go) and build a personal tableau of
**Environments** (drop-zones with a space capacity "Raum" and a score multiplier). Drafted **Animals**
are placed into your Environments — they occupy Raum and earn points, modified by co-location
synergies (paired buddies, "Security" guards, sheep herds, isolation bonuses). **Improvements** upgrade
Environments (more capacity, no-minus protection, biome tags, type changes). After a fixed number of
rounds, each player scores their tableau (animal points × environment multiplier) plus biome
set-collection bonuses; highest total wins.

## Why digital
The scoring is the draw and the chore: every animal's value depends on what else shares its
environment (Hossi↔Mikel, sheep counts, Security presence, isolation, Marty's per-guard bonus), then
gets multiplied per environment and topped with biome sets. Tallying that by hand is error-prone and
slow. A digital version computes the exact live score as you place cards — turning the bookkeeping
into instant feedback and letting the combo puzzle shine.

## Scoring (1–5; operator estimate for an original design — not market-researched)
| Criterion | Score | Note |
|-----------|:----:|------|
| Digital fit | 5 | Conditional, multiplicative scoring is exactly what software does better than people. |
| MVP scope | 3 | Components + scoring fully specified; full-game flow must be designed (see spec ⚑ items). |
| Rules clarity | 3 | Scoring synergies are crisp; draft/round structure and biomes are undefined in the source. |
| Visual feasibility | 4 | Card tableau + drop-zones; 2D, sprite/icon-driven, no complex board geometry. |
| Demand signal | — | N/A — original design, no comparables researched. |
| **Total** | — | Pursued by user request; advanced straight to specification. |

## Top risk
The game **flow** (draft mechanism, rounds, win condition) and **biome scoring** are not in the source
and had to be designed — wrong guesses there waste build effort. Mitigated by flagging every invented
rule (`⚑`) in the spec for confirmation at the spec gate.

## Top opportunity
The conditional scoring engine is the heart and is fully specified — a correct, well-tested pure
engine is highly reusable and makes the build nearly mechanical (and doubles as a "scoring calculator"
for tuning the design).

## Natural player mode (note, not scored)
Multiplayer drafter; the source's draft effects ("Rotiere Hände", "Tausche Hand") imply hand-passing
among ≥2 players. MVP ships as **hot-seat** (pass-and-play on one device) per the user's choice.

## IP first impression (note, not scored)
**Original** — designed by the user. No third-party expression, trademark, or art involved. Names are
the designer's own. `ip.status: clear`.

## Recommendation
**Pursue.** Original IP (no rights risk), strong digital fit, and a fully-specified scoring core.
Advanced directly to specification at user request; market analysis waived for an original design.
