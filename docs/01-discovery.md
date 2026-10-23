# Stage 1 — Discovery

**Command:** `/find`  **Agent:** `game-scout`  **Output:** `01-candidate-brief.md`
**Gate question:** *"Pursue this title (advance to analysis), or reject/replace?"*

## Purpose

Surface games that are good candidates for a digital MVP and produce a one-page brief
that justifies pursuing a specific title. Discovery answers **"why this game?"** — not whether
it's a business (that's analysis).

> **Original video-game concepts** (the second intake track) run discovery too, with the rubric
> *reinterpreted*: there is no BGG entry, designer, or publisher, so those identity fields are
> repurposed (genre, perspective, comparable *video games*); "digital fit" is a given (the thing is
> born-digital); and the load-bearing axes become **MVP scope, design clarity, visual feasibility,
> and demand signal**. Mark the brief with a concept note saying so. `source: "user-concept"`.
> See the root `CLAUDE.md` → "The original-concept track". Examples: `projects/spaeti/`,
> `projects/tcg-circuit/`.

## Inputs

- A manual seed (a specific title, e.g. Lacuna), **or** discovery criteria (mechanics, weight,
  player count, theme) to search against.
- `knowledge/index.md` and prior `projects/*/01-candidate-brief.md` for what's worked/failed.

## Data sources

- **BoardGameGeek (BGG)** as primary structured source: rank, rating, #ratings, weight
  (complexity), year, player count, playtime, mechanics, categories.
- **Web search** for buzz, awards, availability, publisher, and whether a digital version
  already exists.
- Manual seeds always allowed and always pass discovery if the human asked for them — the brief
  then just documents the rationale.

## What makes a good MVP candidate (scoring rubric)

Score each 1–5; record in the brief.

| Criterion | Good (5) | Poor (1) |
|-----------|----------|----------|
| **Digital fit** | Rules automate cleanly; bookkeeping the computer removes is a real chore on tabletop | Heavily physical/dexterity; loses its soul on screen |
| **MVP scope** | Small state space, few components, one core loop | Sprawling, many subsystems, expansions needed to be fun |
| **Rules clarity** | Tight, unambiguous ruleset | Edge-case-heavy, FAQ-laden |
| **Visual feasibility** | Abstract or simple 2D presentation | Requires lavish art to feel right |
| **Demand signal** | Strong ratings / active interest / no good digital version exists | Obscure with no audience, or already well-served digitally |

Compute a simple total and a one-line verdict. The point isn't precision — it's a transparent,
comparable rationale.

**Not scored at discovery (captured as notes, not penalties):**
- **Player mode.** Multiplayer-only is *not* a strike against a title. Record the natural mode
  (solo/AI, hot-seat, or multiplayer-only); a multiplayer-only game is built *as* a multiplayer
  game — the MVP can ship as local hot-seat / pass-and-play, with online deferred.
- **IP status.** Don't penalize a title for being a current commercial property here. Note only a
  provisional first impression; rights are assessed in analysis, where pursuing a license is just
  as valid an outcome as a clean reimplementation. See `legal-and-ip.md`.

## Process

1. Crawl knowledge + prior briefs.
2. Gather BGG + web data for the seed/candidates. **Do not fabricate stats** — if a number can't
   be confirmed, mark it `unverified`.
3. Score against the rubric; note the standout risk and the standout opportunity.
4. Write `01-candidate-brief.md`. Stop at the gate.

## Output: `01-candidate-brief.md`

Structure:
- **Title & identity**: name, designer, publisher, year (mark unverified items).
- **At a glance**: players, time, weight, BGG rank/rating (with source + date).
- **The core loop** in 3–5 sentences: what you do on a turn, how you win.
- **Why digital**: the chore it removes / the experience it enables.
- **Scoring table** + total + verdict.
- **Top risk** and **top opportunity** (one line each).
- **Natural player mode** (note, not scored): solo/AI, hot-seat, or multiplayer-only.
- **IP first impression** (note, not scored): public-domain? licensed property? original?
  (provisional; analysis confirms and decides licensing vs. reimplementation).
- **Recommendation**: pursue / reject / shortlist, with one sentence why.

## Gate criteria

Advance to analysis when the human agrees the title is worth a deeper market look. Rejection or
replacement is a normal, cheap outcome here — discovery is the funnel.

## Self-learning hooks

- If a candidate is later abandoned, note the early signal that predicted it in the retrospective.
- Recurring "good fit" patterns (e.g. "tile-laying abstracts adapt cleanly") graduate to
  `knowledge/playbooks/`.
