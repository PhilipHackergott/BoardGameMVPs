# Stage 2 — Analysis

**Command:** `/analyze`  **Agent:** `market-analyst`  **Output:** `02-market-analysis.md`
**Gate question:** *"Is the case strong enough to spec an MVP? Confirm the IP decision."*

## Purpose

Decide whether the title is worth building by examining market position, competition, audience,
monetization, and — critically — **IP/rights**. Analysis answers **"should this exist as a
product, and can we ship it responsibly?"**

> **Original video-game concepts:** compare against **competitor *video games*** (Steam/itch
> comparables, genre/community interest, search trends) instead of BGG stats. IP is usually
> *clean by design* (original IP) but still recorded — and real-world brands must become generic
> stand-ins. After analysis, an original concept produces a **`game-design-document.md`** (the
> design foundation that `/spec` consumes) since there is no rulebook to adapt. See the root
> `CLAUDE.md` → "The original-concept track".

## Inputs

- `01-candidate-brief.md` and `project-state.json`.
- `knowledge/index.md` + prior `02-market-analysis.md` files (comparable titles already analyzed).
- BGG stats and web research.

## What to produce

### 1. Market position
- Audience size & engagement signals (BGG ratings/owners/comments, communities, search interest).
- Existing digital adaptations: do they exist, are they good, what do reviews complain about?
  A mediocre-but-popular existing adaptation is an opportunity, not a wall.
- Trend: rising/stable/declining interest.

### 2. Competitive landscape
- Direct (same game digitally) and indirect (similar mechanics/feel) competitors.
- The **gap**: what an MVP could do better/cheaper/more accessibly.

### 3. Audience & positioning
- Who is this for (board-game fans of the title? abstract-strategy players? casual mobile?).
- Natural play mode and what this audience wants. A multiplayer-only game is a first-class
  candidate — the MVP delivers it as local hot-seat / pass-and-play; vs-AI or online are added
  later only if they fit the audience. Don't down-rank a title for lacking a solo mode.

### 4. Monetization sketch (directional, not a business plan)
- Plausible model: paid, free + IAP, ad-supported, free portfolio piece. Note what fits the audience.

### 5. IP / rights assessment (gating)
- Apply `docs/legal-and-ip.md`. Determine `ip.status` ∈ `clear | risky | blocked` with reasoning.
- If `risky`, list the required mitigations (alt title, original assets, no branding).
- If `blocked`, recommend pivot (clean-room original inspired by the mechanics) or drop.

### 6. Verdict
- **Build / shelve / pivot**, with the 2–3 reasons that drove it.
- A rough **MVP ambition level**: tiny (one loop, vs simple AI) → standard (full ruleset, decent AI, polish).

## Process

1. Crawl knowledge + comparable prior analyses.
2. Research market, competitors, existing adaptations (cite sources + dates; mark unverified).
3. Run the IP assessment; set `ip.status` and draft the decision.
4. Write `02-market-analysis.md`; set state `awaiting-approval`; stop.

## Output: `02-market-analysis.md`

Sections matching the six items above, each tight and evidence-backed, ending with the verdict
and the proposed `ip` block to be recorded in `project-state.json`.

## Gate criteria

Advance to specification when the human accepts the verdict **and** records the IP decision
(`ip.decision` + `decided_by: human`). If `ip.status` is `blocked` and no pivot is chosen, the
project is archived. The build gate later re-checks that this decision exists.

## Self-learning hooks

- Save reusable market patterns ("abstract 2-player titles with no good app = strong gap") to
  `knowledge/playbooks/market.md`.
- Save IP precedents (how a given publisher tends to react) to `knowledge/patterns/ip-precedents.md`.
