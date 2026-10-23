# Candidate Brief — Food Chain Magnate

> Stage 1 (Discovery). Operator-run (manual seed), 2026-05-25. Facts below were researched from
> public rules sources (UltraBoardGames official-rules mirror, Splotter materials, Wikipedia) and
> BGG roll-ups; popularity/weight figures are approximate and flagged. BGG itself blocks automated
> fetch (known factory issue), so rank/rating are carried as _approx_ and re-checked at analysis.
> Rules numbers are carried into the spec; anything not pinned this stage is flagged `[VERIFY]`.

## Title & identity
- **Name:** Food Chain Magnate
- **Designers:** Jeroen Doumen & Joris Wiersinga
- **Publisher:** Splotter Spellen (2015). One expansion — *The Ketchup Mechanism & Other Ideas*
  (2019); a Special/Deluxe reprint line has since appeared (Lucky Duck involvement). _This
  adaptation targets the **base game**._

## At a glance
- **Players / time / weight:** **2–5 players** (sweet spot widely cited as **3–4**); ~**120–240 min**
  (Splotter lists up to 240+; some sources 180–420); **very heavy**, BGG weight ≈ **4.15–4.2 / 5**
  — one of the heaviest mainstream economic games. _approx._
- **BGG rank / rating (source, date):** rating ≈ **8.4**; a perennial BGG **Top-strategy** title
  (overall rank historically ~**top 30–60**). _approx, per BGG; exact current figures unverified —
  confirm at analysis._
- **Chance:** **none after setup** — no dice, no shuffled draws in play; every outcome is
  deterministic from player decisions (key for digital fit).

## The core loop
Each player runs a fast-food company built as a **CEO-rooted org chart of employee cards**. A turn
runs through fixed phases: **Restructuring** (simultaneously pick which staff "go to work" and slot
them under the CEO/managers), **Order of Business** (turn order = who has the most *open* slots →
acts first), **Working 9-to-5** (spend each working card's action: recruit from the shared job
market, train staff up their tracks, produce burgers/pizzas & buy drinks, run marketing campaigns,
place/move restaurants, set prices), **Dinnertime** (marketed houses generate demand; each house
buys its *full* order from the **closest chain that can fulfil it at the lowest price + distance**),
**Payday** (pay $5 per salaried card; fire who you can't afford), then **marketing resolution** &
cleanup. One-time **milestones** ("first to train", "first billboard", "first $100"…) hand out
**permanent** bonuses. The game ends when the **bank empties (twice)**; the **richest player wins**.

## Why digital
Food Chain Magnate is a famously **brain-burning but admin-heavy** game, and almost all of that
admin is exactly what software removes: re-slotting the org chart and validating who can report to
whom; computing **Dinnertime** sales (every house finds the closest qualifying restaurant by road
distance, compares unit-price+distance across chains, applies waitress/turn-order tie-breaks, doubles
for gardens); tracking **marketing ranges** (billboard/mailbox/radio/airplane footprints across a
tile map); running **payday** salary math; and policing the **milestone** race. It has **no hidden
randomness** (no dice, no decks-in-play) — a pure deterministic referee. Digital also kills the
2–4-hour setup/teardown and slow human turns, and unlocks **instant scoring, AI opponents,
save/resume, and async play**.

## Scoring (1–5; see discovery rubric)
| Criterion | Score | Note |
|-----------|:----:|------|
| Digital fit | 5 | Deterministic, dice-free, but enormous distance/price/marketing/payday bookkeeping → a near-perfect "computer is the referee + calculator" case. |
| MVP scope | 2 | Very heavy: a tile map, ~40+ employee cards with a training tree, the demand-resolution economy, marketing geometry, milestones, and an org-chart engine all interlock. |
| Rules clarity | 3 | Deterministic and well-documented, but Splotter rules are terse and **famously edge-case-laden** (the Dinnertime tie-breaks and legality rules are where the game lives). |
| Visual feasibility | 4 | Tile/road map + iconographic cards + wooden-token goods — schematic-friendly, clean 2D; no lavish art needed to feel right. |
| Demand signal | 5 | Top-tier, durable hobby demand; devoted fanbase; **no great free, rules-enforcing digital version** to just play. |
| **Total** | **19/25** | Strong desirability; scope + rules subtlety are the dominant risks. |

## Top risk
**Scope × rules subtlety.** The Dinnertime selling resolution and org-chart legality are intricate
and edge-case-heavy; a faithful engine is a large, exacting build (comparable in size to War of the
Ring), and "almost right" economy rules ruin the game.

## Top opportunity
**The bookkeeping *is* the friction** — a perfect referee + instant Dinnertime resolution + fast
turns + AI opponents turns a beloved-but-fiddly heavyweight into something you can actually play
often, with **no good free digital version** currently filling that gap.

## Natural player mode (note, not scored)
**Multiplayer, 2–5, sweet spot 3–4.** The job market and the map's restaurant/marketing geography
are *contested resources*, so the game **shines at 3–5 players** and is thinner at 2. MVP can ship
**2-player (hot-seat + vs-AI)** as a tractable first scope, but **whether to target ≥3 players for
the first build is a real decision, not a default** — flagged as a top open question for the spec
gate (it materially changes map size, AI count, and UI). Per factory convention, being a
multiplayer game is **not** a down-rank.

## IP first impression (note, not scored)
**Licensed property:** Food Chain Magnate is © **Splotter Spellen**. Mechanics aren't copyrightable,
but the name/trademark, card art, board art, and rulebook text are protected expression. For any
public release this is `blocked` without a license. **Operator decision (to be recorded at
analysis):** an unpublished, non-distributed personal prototype using the real IP/naming directly →
treated as `clear` **on the basis of non-distribution only** — the same basis as War of the Ring.

## Recommendation
**Pursue.** Top-tier demand and a near-perfect digital-fit case (deterministic, dice-free, admin-
heavy); proceed with eyes open that this is a **large, exacting engine-first build** that must be
scoped ruthlessly, and settle the player-count question at the spec gate.
