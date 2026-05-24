# Rights & IP

Board games are intellectual property. Adapting one digitally without thinking about rights is
the single biggest non-technical risk this factory carries. This stage is **not legal advice** —
it is a structured risk check that produces an explicit, recorded decision before any code ships.

## What is and isn't protected (working model)

- **Game mechanics / rules** are generally **not** protected by copyright (ideas/systems). You
  can usually implement how a game *plays*.
- **Expression is protected**: the name/trademark, box art, board art, card illustrations,
  iconography, rulebook text, character/world lore, distinctive graphic design.
- **Trademarks** cover the title and branding. Using the game's name to market your app is the
  classic infringement trap.
- Lines are fuzzy and jurisdiction-dependent. When unsure, treat as risky.

> This is a heuristic for triage, not a legal opinion. High-value or commercial launches need a
> real lawyer. The factory's job is to flag, classify, and force a conscious decision.

## Classification (`ip.status` in project state)

| Status | Meaning | Effect on pipeline |
|--------|---------|--------------------|
| `unknown` | Not yet assessed | **Build gate cannot be approved.** |
| `clear` | Public domain, or we hold/obtained a license, or it's an original design | Proceed freely. |
| `risky` | Likely OK to implement mechanics with all-original assets + non-infringing name, but carries trademark/expression risk | Proceed **only** with a recorded human decision accepting the risk and the mitigations below. |
| `blocked` | Active license needed and not held; rights owner litigious; cannot ship responsibly | Stop. Archive or pivot to a clean-room/original design. |

The analysis stage (`/analyze`) sets `ip.status` and records the reasoning in
`02-market-analysis.md`. The human's decision is recorded at the analysis gate and again,
explicitly, before the build gate.

## Default mitigations (the "clean reimplementation" path)

When proceeding under `risky`, the MVP must by default:

1. **Use a different working title** for the app; do not market with the publisher's trademark
   without permission. Track the real title internally only.
2. **Original assets only.** Reimplement board, pieces, icons, and typography from scratch. Never
   copy the publisher's art, rulebook text, or files.
3. **No publisher branding, logos, or lore.** Mechanics yes; expression no.
4. **Attribution/credit** of the original designer where appropriate and where it doesn't imply
   endorsement — decided case by case.
5. **Prefer reaching out** to the publisher/designer for a license when the title has real
   commercial upside. A licensed adaptation is worth more and is safe.

## Public-domain & licensed fast lane

Titles whose rules and (sufficiently old) expression are in the public domain — or where we
secure a license — are `clear` and skip the mitigations. The discovery stage should actively
surface public-domain and license-friendly candidates as lower-risk, higher-velocity options.

## Required record before build

`project-state.json` → `ip` block must contain:

```json
"ip": {
  "status": "risky",
  "decision": "Proceed with original assets + alt working title; revisit licensing if it gains traction.",
  "decided_by": "human",
  "date": "2026-05-20",
  "notes": "Mechanics-only; no publisher art/branding. Real title kept internal."
}
```

No `decision` recorded → the build gate stays closed. This is enforced in the operator routing
checklist (`orchestration-and-gates.md`).
