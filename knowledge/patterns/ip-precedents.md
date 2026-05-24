# IP Precedents

How specific publishers/designers tend to treat fan/derivative digital adaptations, and any
licensing outcomes the factory has encountered. Informs the analysis stage's IP classification.

> This is operational memory, not legal advice. See `../../docs/legal-and-ip.md`.
> Empty until we gather real precedents. Never state an unverified precedent as fact.

## Observed
- **Publisher / designer:** CMYK Games.
- **Title(s):** Lacuna (first factory candidate); Magical Athlete (their 2025 Garfield-updated reissue
  of Takashi Ishida's design).
- **Observed stance / outcome:** Indie, creator-/innovation-friendly; publicly discussed *paying to
  include fan designs* in releases (BoardGameWire, 2025-12-16). For Magical Athlete, the **operator
  recorded a license** (`ip.status: clear`, "CMYK approved the adaptation — per operator", 2026-05-21)
  — recorded on the operator's word, **not independently verified**; confirm scope in writing before
  any commercial launch.
- **Implication for `ip.status`:** CMYK is plausibly licensable, so a recorded license can put a title
  in the `clear` lane; absent a license, treat as `risky`-but-reimplementable (mechanics are not
  protected; their art/title are). Either way, never bundle their illustrations from the rulebook PDF
  or the web — use the licensor's official asset files (decouple via an asset manifest so art is a
  late, swappable input). _See magical-athlete `src/assets/manifest.ts`._

## Template for an entry
- **Publisher / designer:**
- **Title(s):**
- **Observed stance / outcome (with source + date):**
- **Implication for `ip.status`:**
