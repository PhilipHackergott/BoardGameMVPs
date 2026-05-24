# Market Analysis — Cull the Crown

> Stage 2 (Analysis). Run inline. See `../../docs/02-analysis.md` and `../../docs/legal-and-ip.md`.
> Market sizing below is directional and `unverified`; the IP section is the gating output.

## 1. Market position
Roguelike deckbuilders are a proven, popular digital genre (the *Slay the Spire* / *Balatro*
lineage). *Regicide* is a well-regarded co-op/solo card game with a dedicated following and an
official companion app, but **no roguelike adaptation** of its combat exists. *(audience sizing
unverified — no figures fabricated.)* The gap: Regicide players who want a meatier solo
progression, and roguelike fans who want a fresh combat core that isn't another poker/STS clone.

## 2. Competitive landscape
- **Direct:** none — a Regicide-combat roguelike is not on the market.
- **Indirect:** *Balatro*, *Slay the Spire*, *Luck be a Landlord* (run + shop + jokers structure);
  the official *Regicide Companion* (pure rules helper, not a game).
- **The gap an MVP fills:** Regicide's distinctive suit-power combat is its moat; wrapping it in a
  run/shop/joker loop is differentiated from poker-hand-based roguelikes.

## 3. Audience & positioning
Single-player, session-length (~20–40 min) runs for the deckbuilder-roguelike audience and
existing Regicide fans. No hot-seat/online needed — it is inherently solo. Positioning: "the
tactical card game where every suit matters, now with a build to craft."

## 4. Monetization sketch (directional)
Premium one-time purchase (genre norm) or free web demo → paid desktop/mobile. No live-service
plumbing in the MVP. Content packs (more jokers/relics) are a natural later add. *(directional.)*

## 5. IP / rights assessment  (gating)
- **Classification:** `risky` (low end of the band — see reasoning).
- **Reasoning:** *Regicide* is released by **Badgers from Mars under Creative Commons** (free
  print-and-play), so its **rules are freely implementable** and even its assets are licensed
  (with attribution). *Balatro* contributes only its roguelike **structure** (shop, jokers,
  consumables, escalating blinds) — game *mechanics/systems are not protected* by copyright. The
  residual risk is therefore narrow: the **trademarks** "Regicide" and "Balatro", and each
  publisher's **art/branding/lore**. We touch neither.
- **If risky — required mitigations (all adopted):**
  1. **Original working title** — "Cull the Crown"; real titles tracked internally only, never
     used to brand or market the app.
  2. **Original assets only** — original suit icons, card faces, enemies, UI; no Regicide or
     Balatro art, rulebook text, or logos.
  3. **No publisher branding/lore** — mechanics yes, expression no.
  4. **CC-BY attribution** to the Regicide designers (Paul Abrahams, Luke Badger, Andy Richdale)
     and Badgers from Mars, in credits, without implying endorsement.
  5. **Revisit licensing** if the title gains commercial traction (a license/partnership is
     cheap insurance and adds value).

### Proposed `ip` block for project-state.json
```json
"ip": {
  "status": "risky",
  "decision": "Proceed: implement mechanics with all-original assets under the original working title 'Cull the Crown'. Regicide is CC-BY (Badgers from Mars); Balatro contributes only non-copyrightable roguelike structure. Credit the Regicide designers per CC-BY; no publisher art/branding/lore. Revisit licensing if it gains commercial traction.",
  "decided_by": "human",
  "date": "2026-05-21",
  "notes": "Risk reduces to trademarks ('Regicide', 'Balatro') and publisher art only. Real titles kept internal. Mechanics-only reimplementation; original suit icons and card faces."
}
```
*(Recorded in `project-state.json`. This is not legal advice; a commercial launch should get a
real review and should seriously consider a Regicide license/partnership given the CC posture.)*

## 6. Verdict
- **Decision:** **build**.
- **Top reasons:** (1) genuinely novel concept with a clear differentiator (suit-power combat in a
  roguelike); (2) **favorable IP** — CC-licensed source + mechanics-only borrowing; (3) excellent
  digital fit (heavy bookkeeping + stacking modifiers).
- **MVP ambition level:** **standard, staged** — user chose the full-roguelike *target*, but the
  build plan delivers it as ordered, demoable milestones (a complete single-fight slice first).
