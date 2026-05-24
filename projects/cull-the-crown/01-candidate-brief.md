# Candidate Brief — Cull the Crown

> Stage 1 (Discovery). Run inline from a user-supplied design blueprint + the base Regicide
> rulebook (`RegicideRulesA4.pdf`). See `../../docs/01-discovery.md`.
> Real-world market facts are marked `unverified` — not fabricated.

## Title & identity
- **Working title:** Cull the Crown (original; for the app)
- **Source A (combat):** *Regicide* — Designers Paul Abrahams, Luke Badger, Andy Richdale;
  Publisher Badgers from Mars; released under Creative Commons (free print-and-play).
- **Source B (structure):** *Balatro* — roguelike deckbuilder; only its non-copyrightable run
  *structure* is borrowed (shop/jokers/consumables/escalating blinds).
- This is a **mashup / original design**, not an adaptation of a single existing product.

## At a glance
- **Players / time / weight:** 1 player; ~20–40 min per run; medium weight.
- **BGG rank / rating:** n/a — *unverified* (Regicide itself reviews well as a co-op/solo card
  game, but this is a new mashup with no existing rating).

## The core loop
On each turn you play a card (or a combo) at the current corrupted royal to deal damage; the
card's suit fires a power (Hearts heal, Diamonds draw, Clubs double, Spades shield). If the royal
survives, it strikes back and you must discard cards to cover the hit — fail and the run ends. Beat
12 royals (Jacks → Queens → Kings) to win. Between fights you spend gold in a shop on "jokers"
(guild-members/relics that passively warp the rules), consumables (recruit a card into an Animal
Companion, train a suit, cull a card), and rerolls — building an escalating synergy engine.

## Why digital
Regicide's solo play is bookkeeping-heavy (shuffling cards under the deck to "heal", tracking
cumulative shields, recomputing combo/companion math). A computer adjudicates all of it instantly
and *perfectly* — which is exactly what unlocks the Balatro layer: stacked passive modifiers that
rewrite damage/heal/draw resolution are tedious by hand but trivial and thrilling on screen.

## Scoring (1–5; see discovery rubric)
| Criterion | Score | Note |
|-----------|:----:|------|
| Digital fit | 5 | Heavy hidden bookkeeping + stacking modifiers = ideal for code. |
| MVP scope | 2 | Full-roguelike target is large; combat slice is small. Staged by milestones. |
| Rules clarity | 4 | Base Regicide rules are exact and in hand; roguelike layer is a clear blueprint. |
| Visual feasibility | 4 | Cards + enemy + shop; 2D, sprite-light. Original suit icons needed. |
| Demand signal | 4 | Roguelike deckbuilders are a hot genre; Regicide has a known audience. *(unverified sizing)* |
| **Total** | **19/25** | Strong concept; scope is the watch-item. |

## Top risk
Scope creep — "full roguelike" is far larger than a typical MVP; content (jokers/consumables) must
be data-driven so a thin first library can grow without re-architecting.

## Top opportunity
The mashup is genuinely novel and the resolution-stack architecture is reusable factory IP for any
future "modifier-stacking" card game.

## Natural player mode (note, not scored)
Single-player **solo** — adapts Regicide's solo mode. No opponent AI: enemies are deterministic
(fixed stats + a flat counter-attack).

## IP first impression (note, not scored)
Favorable. Regicide is **Creative-Commons** licensed and Balatro contributes only mechanics;
residual risk is trademark (the names) + publisher art. Reimplement with an original title and
original assets; credit the Regicide designers. Analysis stage records the decision.

## Recommendation
**Pursue** — distinctive concept, excellent digital fit, low IP risk; manage scope via milestones.
