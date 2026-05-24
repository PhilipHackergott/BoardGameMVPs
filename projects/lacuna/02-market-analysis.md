# Market Analysis — Lacuna

> Stage 2 (Analysis). Operator-run, 2026-05-20. Builds on `01-candidate-brief.md`.
> Sources at the footer; unconfirmed items flagged inline.

## 1. Market position
- **Reception:** Strongly reviewed 2023 release (BGG avg ~7.5), repeatedly described by reviewers
  in superlatives ("a wonder", "something special") and as a game that "stays on the table." Sold
  by mainstream retailers and marketed as an "award-winning abstract" (specific award titles
  _unconfirmed_ — verify before using in marketing).
- **Segment:** Quick (10–15 min), light, 2-player **abstract** — the "evening digestif" niche.
  Devoted but not mass-market: abstracts rarely reach the install base of party/family hits.
- **Existing digital adaptation of the board game:** **none found.** (Search noise is an unrelated
  "Lacuna" sci-fi noir video game — a different product.) The lane is open.
- **Trend:** Stable/positive — still actively reviewed into 2025/2026; no sign of decline.

## 2. Competitive landscape
- **Direct (a digital Lacuna):** none.
- **Indirect (quick digital 2p abstracts competing for the same attention):** the digital
  abstract niche is well-populated by classics and modern hits with good apps — e.g. Hive,
  Santorini, Onitama, Reiner Knizia titles, plus chess/go. These set player expectations for
  polish and a competent AI but are **not substitutes** for Lacuna's specific geometric/area-control
  feel.
- **The gap:** Lacuna's core friction on tabletop — adjudicating whether a line between two flowers
  is truly uninterrupted, "fought over millimeters" — is precisely what software removes. A clean
  digital version offers exact line-validation, legal-pair highlighting, and perfect nearest-pawn
  scoring. No competitor occupies *this* game's space.

## 3. Audience & positioning
- **Who:** existing Lacuna/abstract fans wanting a fast device version; couples/pairs wanting a
  10-minute head-to-head; abstract-strategy players hunting the next clean two-player game.
- **Play mode:** 2-player only, no solo in the base game — **fine** per factory rules. MVP ships as
  **local hot-seat / pass-and-play**; a **vs-AI** mode is the highest-value fast-follow (the small,
  deterministic state space makes a genuinely strong AI achievable), with online deferred.
- **Positioning:** "the pure two-player abstract you can finish before your tea goes cold" — fast,
  beautiful, exact. Mobile- and web-first fits the session length.

## 4. Monetization sketch (directional)
- **Best-fit:** low-price **premium** (one-time unlock), or **free with a single IAP** that unlocks
  vs-AI / extra modes — typical for quality 2p-abstract apps. Ads don't suit the calm, premium feel.
- **Reality check:** a niche 2p abstract is a **portfolio / proving-ground** play, not a revenue
  engine. Value here is proving the factory end-to-end and (if licensed) an official, sellable app.
- An **official licensed** version is worth materially more than an unlicensed clone and is safer.

## 5. IP / rights assessment  (gating)
- **Classification: `risky`.** Lacuna is a current commercial title (CMYK, 2023) — **not** public
  domain. Game *mechanics* are generally not copyrightable, but the **name (trademark)**, the
  flower-pond **theme/art**, and rulebook expression are protected.
- **Important upside:** CMYK is demonstrably **digital-friendly** — it runs an official app program
  (Wavelength: 4M+ downloads, Apple Design Award finalist). An official Lacuna app is plausibly
  something CMYK would welcome, making a **licensing conversation a realistic, preferred path.**
- **If proceeding without a license (clean reimplementation), required mitigations:**
  1. **Distinct working title** — do not ship under "Lacuna" (also avoids the existing sci-fi-game
     namespace collision). Track the real title internally only.
  2. **Original assets only** — reimplement the abstract from scratch; an original theme (the
     mechanic is theme-agnostic: any "connect two matching points" skin works). No CMYK art/branding.
  3. **No publisher branding or rulebook text.** Credit the designer where appropriate, without
     implying endorsement.
- **Not `blocked`:** we can build responsibly via clean reimplementation today, and pursue a license
  in parallel.

### Proposed `ip` block for project-state.json
```json
"ip": {
  "status": "risky",
  "decision": "PROPOSED — build MVP as a clean reimplementation (mechanics-only, original theme + assets, distinct working title); pursue a CMYK license in parallel and, if granted, re-skin to the official Lacuna. Awaiting human decision at the analysis gate.",
  "decided_by": null,
  "date": null,
  "notes": "Mechanics not copyrightable; name/art/theme are. CMYK is digital-friendly (official Wavelength app), so licensing is a realistic preferred path."
}
```

## 6. Verdict
- **Decision: BUILD.** High digital fit, an open lane, tiny scope, and a strong proving-ground for
  the factory. Modest commercial ceiling (niche 2p abstract) — treat as portfolio/learning value,
  with licensing as the path to a sellable official product.
- **MVP ambition level: tiny→standard.** MVP = full ruleset + hot-seat + exact geometry/scoring.
  vs-AI is the first fast-follow, not MVP-blocking.
- **Decision needed at the gate:** which IP path — (a) **reach out to CMYK for a license** before/while
  building, or (b) **proceed as a clean reimplementation now** (recommended for an MVP), or both.

---
**Sources:** [CMYK – Lacuna](https://www.cmyk.games/products/lacuna) ·
[About CMYK](https://www.cmyk.games/pages/about-cmyk) ·
[BGG – Lacuna](https://boardgamegeek.com/boardgame/386937/lacuna) ·
[Wavelength press kit (app stats)](https://www.wavelength.zone/presskit) ·
[Meeple Mountain review](https://www.meeplemountain.com/reviews/lacuna/) ·
[Bards & Cards (retail listing)](https://bardsandcards.com/products/lacuna)
