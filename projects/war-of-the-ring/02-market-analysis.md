# Market Analysis — War of the Ring

> Stage 2 (Analysis). Operator-run, 2026-05-22. See `../../docs/02-analysis.md` and
> `../../docs/legal-and-ip.md`. Sources cited inline; popularity figures flagged _approx_.

## 1. Market position
- **Audience size & engagement:** War of the Ring is a flagship hobby title — a perennial BGG
  Top-strategy game with a rating ≈ 8.4 and a very large, devoted owner/fan base (_approx, per
  BGG_). It has sustained two editions, multiple expansions (*Lords of Middle-earth*, *Warriors of
  Middle-earth*, *Kings of Middle-earth*), a card game, and an anniversary edition — a strong
  signal of durable demand.
- **Existing digital adaptations:** There is **no widely-loved, faithful, official digital version
  of the full board game** that the operator can simply play. The game is most commonly played
  digitally via tabletop-simulator-style sandboxes (manual rules enforcement — i.e. the friction
  isn't removed). _A genuinely rules-enforcing adaptation is the gap._ (Other LOTR digital games
  exist but are different products.)
- **Trend:** Stable-to-rising; the IP is evergreen and the title is regularly reprinted.

## 2. Competitive landscape
- **Direct:** Tabletop Simulator / Tabletopia mods (no rules enforcement, no hidden-info
  automation, no AI). That's the bar to clear, and it's low on *experience* even if high on
  *fidelity-by-hand*.
- **Indirect:** Other asymmetric two-player war/strategy digital games and 4X titles compete for
  the same "deep solo/duel strategy session" time.
- **The gap:** a **rules-refereed, hidden-information-honest, save/resume** digital WotR — the
  upkeep and the Hunt automated, the Fellowship genuinely secret — is exactly what the sandbox
  versions can't do. Engine-first fidelity is the wedge.

## 3. Audience & positioning
- **Who it's for:** existing WotR / heavy-strategy players (this build's primary user is the
  operator). Not a newcomer-onboarding product.
- **Play mode:** the game is a **two-player duel**; MVP delivers it as **local hot-seat /
  pass-and-play** with engine-enforced hidden information (Fellowship, Corruption, Guide). vs-AI is
  a hard, valuable fast-follow (asymmetric goals + hidden info make it a real project); online async
  is deferred. Per factory convention, being multiplayer-only is **not** a down-rank.

## 4. Monetization sketch (directional)
Not applicable — **non-commercial personal prototype** (see IP). No monetization; this is a
portfolio/play piece for the operator. If it were ever to be commercial, it could only ship as a
**licensed** product (see §5).

## 5. IP / rights assessment (gating)
- **Classification:** `clear` — **but only by virtue of the operator's non-distribution decision.**
- **Reasoning:** Mechanics themselves aren't copyrightable, but *War of the Ring* layers two
  protected expressions: the **Ares Games** product (board/card art, rulebook text, trade dress,
  the "War of the Ring" trademark) **and** the **Tolkien / Middle-earth** world (names, characters,
  places, lore — controlled by the Tolkien Estate / Middle-earth Enterprises). For any **public
  release**, this is squarely `blocked` without a license. The operator has explicitly chosen to
  build an **unpublished, non-distributed personal prototype** and to use the **real LOTR /
  Middle-earth IP and naming directly** (no neutral reskin, no swappable theme layer). On the basis
  of non-distribution, the build can proceed; this is a conscious, recorded risk acceptance, **not**
  a license and **not** legal advice.
- **Mitigations (operator-directed deviation from the default `risky` path):** the standard
  clean-reimplementation mitigations (alt title, original assets, no lore) are **waived by operator
  decision** because the artifact will not be distributed. The single binding mitigation is the
  hard one: **do not publish, host publicly, or distribute.** If that ever changes, `ip.status`
  reverts to `blocked` pending a license.

### Proposed `ip` block for project-state.json
```json
"ip": {
  "status": "clear",
  "decision": "Proceed using the real War of the Ring / Tolkien Middle-earth IP and naming directly. Justified ONLY by non-distribution: this is an unpublished personal prototype, never to be hosted, shared, or sold. Not a license; if it is ever published, IP reverts to blocked pending licensing from Ares Games and Middle-earth Enterprises.",
  "decided_by": "human",
  "date": "2026-05-22",
  "notes": "Operator override of the default risky clean-room path. Real assets/lore/title permitted because non-distributed. Binding mitigation: do not distribute."
}
```

## 6. Verdict
- **Decision:** **Build.**
- **Top reasons:** (1) near-perfect digital-fit case — the friction this game carries is exactly
  what software removes; (2) top-tier, durable demand with no faithful rules-enforcing version to
  play; (3) IP cleanly resolved for this context by the non-distribution decision.
- **MVP ambition level:** **Standard, but large** — full base-game ruleset is the target (the game
  doesn't reduce to "one loop" cleanly), delivered hot-seat with an engine-first build and a
  ruthless deferral list (no expansions, no AI, no online, schematic visuals first). Scope is the
  headline risk and the spec must manage it with milestones.
