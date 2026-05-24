# Candidate Brief — Magical Athlete

> Stage 1 (Discovery). Scout-run (manual seed: CMYK 2025 edition), 2026-05-21. Facts are sourced (see
> footer); items marked `unverified`/`reported` need confirmation at analysis/spec. No stat fabricated.

## Title & identity
- **Name:** Magical Athlete (CMYK Games 2025 edition)
- **Designer:** Takashi Ishida (original, 2002/2003); **new edition rules refined + new powers by Richard Garfield** (Magic: The Gathering)
- **Artist:** Angela Kirkwood (new edition)
- **Publisher:** CMYK Games — **the same publisher as our Lacuna project**
- **Year:** 2025 (retail 2025-11-07, $29.99). Original first brought to the U.S. by Z-Man Games (~2010).

## At a glance
- **Players:** 2–6 (competitive, social), ages 8+
- **Play time:** ~60 minutes
- **Weight:** light (chaotic family/gateway racer)
- **BGG rating:** average **~7.96 reported** for the new edition (`unverified` — early, small ratings base;
  exact rank/geek rating not confirmed). **Award:** 2026 American Tabletop Awards — *Early Gamers* winner.
- **Mechanics:** open drafting · race · roll-and-move · track movement · **variable player powers**.

## The core loop
Before racing, players **draft a stable of racers** (e.g. four), each with a unique, deliberately
"game-breaking" power (Centaur, Egg, Rocket Scientist…). In each race you pick one racer, **roll a die
and move** — but every racer's power bends the rules (extra movement, shoving others, dice tricks, etc.),
so the track is pure escalating chaos. Races alternate between a "mild" and a "wild" side of the board; a
race **ends once two racers finish, and generally only those two score points**. You run several races and
the **highest cumulative score wins**. (Designer Ishida cites *Cosmic Encounter* as the inspiration.)

## Why digital
The roll-and-move chassis is trivial, but the **powers are the game** — a deck of ~20+ unique,
interacting rule-breakers with timing and edge cases that players forget or mis-resolve at the table. A
digital version **surfaces each power's text, auto-resolves its timing and interactions, applies movement,
and tallies cumulative scoring across races** — i.e. it removes the rules-lookup/arbitration load while
keeping the chaos. It also makes **AI opponents and online/async play** feasible for a game that otherwise
needs a full table.

## Scoring (1–5; see ../../docs/01-discovery.md rubric)
| Criterion | Score | Note |
|-----------|:----:|------|
| Digital fit | 3 | Powers + cross-race scoring are real bookkeeping the computer removes — but the core is luck-driven roll-and-move and the joy is *tableside social chaos*, which is partly at risk on a screen. |
| MVP scope | 3 | One race loop is small, but a faithful build needs many bespoke, **interacting** racer powers (card-game-like content + combinatorial edge cases). MVP can ship a curated roster. |
| Rules clarity | 3 | Core rules are simple (and Garfield-refined), but each power is its own mini-ruleset; ambiguity lives in power *interactions* and timing. |
| Visual feasibility | 4 | Simple 2D: a track (mild/wild), racer tokens, dice, power cards. Charming art exists; functional version is light. Conveying ~20 powers' effects clearly is the UI work. |
| Demand signal | 5 | **Open lane — no digital version exists**, plus a marquee signal stack: cult-classic revival, **Richard Garfield's** name, CMYK's audience, and a **2026 ATA award**. (Fresh edition → small rating base.) |
| **Total** | **18 / 25** | Moderate digital fit, **strong demand/scene** — the inverse profile of our clean abstracts. |

## Top risk
**Soul-on-screen + content load.** The game's magic is luck-fueled social chaos with 2–6 people at a
table; solo/AI could feel like a random roll-and-move unless multiplayer (hot-seat/online) and snappy,
legible power resolutions preserve the fun. Secondarily, ~20+ *interacting* variable powers are genuine
content and edge-case work to implement faithfully.

## Top opportunity
**Unusually strong organic/marketing pull for a tiny game:** open digital lane + Richard Garfield's name +
CMYK's fanbase + a fresh national award + nostalgia. And **CMYK is our Lacuna publisher** — a warm,
already-relevant licensing relationship. The variable powers are modular "content" — ship a small curated
roster as the MVP and expand over time.

## Natural player mode (note, not scored)
**Competitive multiplayer (2–6), luck-forward and social; no native solo mode.** Per factory rules this is
fine — MVP ships as **local hot-seat / pass-and-play**, with **AI opponents** feasible (the engine resolves
powers; an AI just drafts + chooses racers) and online as a strong follow. Note solo-vs-AI is a weaker
intrinsic draw here than for our abstract candidates.

## IP first impression (note, not scored)
Current commercial title — **not** public domain, and notably **multi-stakeholder** (CMYK + original
designer Ishida + Garfield's new design contributions + Kirkwood's art). The specific racer roster and art
*are* the appeal, so a clean reimplementation would gut it — this is a **license-to-do-it-right** title.
Upside: CMYK is a creator-friendly indie publisher (has publicly discussed paying for fan designs) and is
**already our Lacuna partner**, so a conversation is plausible. Provisional — analysis sets `ip.status`.

## Recommendation
**Shortlist → pursue if the goal is a buzzy, partnership-led title.** Magical Athlete is the inverse of our
clean abstracts: only a moderate digital fit and a content-heavy, social/multiplayer build, but the
**strongest demand-and-scene signal** of any candidate so far and an **open lane with a publisher we already
know**. Worth advancing to analysis specifically to (a) test the CMYK licensing path and (b) confirm a
tightly-scoped, multiplayer-first MVP can keep the chaos fun on screen.

---
**Sources (accessed 2026-05-21):**
[CMYK – Magical Athlete](https://www.cmyk.games/products/magical-athlete) ·
[BGG – Magical Athlete (2025 ed.)](https://boardgamegeek.com/boardgame/454103/magical-athlete) ·
[BGG – Magical Athlete (original)](https://boardgamegeek.com/boardgame/24565/magical-athlete) ·
[It's Nice That – CMYK reissue](https://www.itsnicethat.com/articles/angela-kirkwood-cmyk-product-design-project-011025) ·
[ICv2 – Garfield updates rules](https://icv2.com/articles/news/view/60814/richard-garfield-updates-rules-magical-athlete) ·
[BoardGameWire – 2026 American Tabletop Awards](https://boardgamewire.com/index.php/2026/04/14/hot-streak-magical-athlete-race-to-wins-in-this-years-american-tabletop-awards/) ·
[Meeple Mountain review](https://www.meeplemountain.com/reviews/magical-athlete/)
_Note: no digital adaptation surfaced in search as of 2026-05-21 — confirm in analysis._
