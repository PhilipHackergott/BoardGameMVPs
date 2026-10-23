# Market Analysis — Food Chain Magnate

> Stage 2 (Analysis). Operator-run, 2026-05-25. See `../../docs/02-analysis.md` and
> `../../docs/legal-and-ip.md`. Sources cited inline; popularity/weight figures flagged _approx_
> (BGG blocks automated fetch — figures corroborated via mirrors/Wikipedia and carried as approx).

## 1. Market position
- **Audience size & engagement:** Food Chain Magnate is a flagship heavy-strategy title — a
  perennial BGG Top-strategy economic game with a rating ≈ **8.4** and a large, devoted owner/fan
  base (_approx, per BGG_). Durable-demand signals are strong: a 2015 release that has stayed in
  print, earned an expansion (*The Ketchup Mechanism & Other Ideas*, 2019), a **Special/Deluxe
  reprint** line, and repeated "best heavy strategy" placements in mainstream press (IGN, CNET).
- **Existing digital adaptations:** There is **no widely-loved, official, rules-enforcing digital
  version** the operator can simply play. It's played digitally mainly via **Tabletop
  Simulator / Tabletopia** sandboxes (manual rules enforcement — the bookkeeping friction is *not*
  removed) and a long-running **fan web prototype** (the "boardgamecore" FCM client, now apparently
  unmaintained / redirecting) that proves demand but isn't a polished, supported product. _A genuinely
  rules-refereed, instant-Dinnertime-resolving adaptation with AI is the gap._
- **Trend:** Stable-to-rising; the reprint/deluxe activity and steady press keep it evergreen in the
  heavy-Euro niche.

## 2. Competitive landscape
- **Direct:** TTS/Tabletopia mods (full fidelity *by hand* — no demand-resolution automation, no AI,
  no instant scoring) and the unofficial fan web client (functional but unsupported). That's the bar,
  and it's low on *experience* even where high on *fidelity-by-hand*.
- **Indirect:** other heavy **economic** digital adaptations compete for the same "deep solo/duel
  economy session" time — e.g. digital *Brass*, *Container*, *Concordia*, plus business/tycoon PC
  sims (*Capitalism*, fast-food tycoon games). FCM's distinctive wedge vs. those is its **org-chart
  company-building + the deterministic, no-luck demand market**.
- **The gap:** a **rules-refereed, instant-Dinnertime-resolution, save/resume, AI-opponent** digital
  FCM — the distance/price/marketing/payday/milestone math automated, turns fast — is exactly what
  the sandbox and fan versions can't deliver. Engine-first fidelity + a real AI is the wedge.

## 3. Audience & positioning
- **Who it's for:** existing FCM / heavy-economic-strategy players (this build's primary user is the
  operator). Not a newcomer-onboarding product; the audience is rules-literate.
- **Play mode:** the game is **multiplayer, 2–5, sweet spot 3–4** — the **job market and the map are
  contested**, so it shines with more players and is thinner at 2. MVP delivers it as **local
  hot-seat / pass-and-play + a vs-AI opponent**; **online async is deferred**. Because the AI and map
  are built parameterized to player count, **supporting 3–4 players is mostly a config/AI-count and
  map-size decision**, which is why the spec flags "first-build player count" as a top gate question
  rather than silently shipping 2-player. Per factory convention, multiplayer is **not** a down-rank.

## 4. Monetization sketch (directional)
Not applicable — **non-commercial personal prototype** (see IP). No monetization; a portfolio/play
piece for the operator. If it were ever commercial it could only ship as a **licensed** product
(see §5), and Splotter is a small, protective publisher — a real licensing conversation, not a
formality.

## 5. IP / rights assessment (gating)
- **Classification:** `clear` — **but only by virtue of the operator's non-distribution decision.**
- **Reasoning:** game mechanics themselves aren't copyrightable, but Food Chain Magnate layers
  protected expression: the **"Food Chain Magnate" name/trademark**, Splotter's **card and board
  art, iconography, and rulebook text**, and the game's trade dress. For any **public release** this
  is squarely `blocked` without a license from **Splotter Spellen**. The operator has explicitly
  chosen to build an **unpublished, non-distributed personal prototype** and to use the **real FCM
  name and IP directly** (no neutral reskin). On the basis of non-distribution, the build can proceed;
  this is a conscious, recorded risk acceptance — **not** a license and **not** legal advice. (Same
  posture as War of the Ring; precedent recorded in that project.)
- **Mitigations (operator-directed deviation from the default `risky` path):** the standard
  clean-reimplementation mitigations (alt title, original assets, no rulebook text) are **waived by
  operator decision** because the artifact will not be distributed. The single binding mitigation is
  the hard one: **do not publish, host publicly, or distribute.** If that ever changes, `ip.status`
  reverts to `blocked` pending a license. (Assets are still reimplemented from scratch in practice —
  code-drawn icons/tiles, synth audio — because the factory builds zero-asset, not because IP requires it here.)

### Proposed `ip` block for project-state.json
```json
"ip": {
  "status": "clear",
  "decision": "Proceed using the real Food Chain Magnate IP and naming directly. Justified ONLY by non-distribution: this is an unpublished personal prototype, never to be hosted, shared, or sold. Not a license; if it is ever published, IP reverts to blocked pending licensing from Splotter Spellen.",
  "decided_by": "human",
  "date": "2026-05-25",
  "notes": "Operator override of the default risky clean-room path (same basis as war-of-the-ring). Real name/mechanics permitted because non-distributed. Binding mitigation: do not distribute. Assets still code-drawn/synth per the zero-asset build model."
}
```

## 6. Verdict
- **Decision:** **Build.**
- **Top reasons:** (1) **near-perfect digital-fit** — a dice-free, fully deterministic game whose
  entire friction is bookkeeping software erases (Dinnertime resolution, marketing geometry, payday,
  milestones); (2) **top-tier, durable demand** with **no faithful, rules-enforcing free version** to
  play; (3) IP cleanly resolved for this context by the non-distribution decision.
- **MVP ambition level:** **Standard, but large** — the full base-game economy is the target (FCM
  doesn't reduce to "one loop" cleanly), delivered hot-seat **plus a real AI opponent** (the game's
  determinism makes a strong heuristic/greedy AI genuinely viable, unlike WotR's hidden-info duel).
  Scope is the headline risk; the spec manages it with a strict milestone ladder, an engine-first
  build, and the **player-count decision** surfaced at the gate.
