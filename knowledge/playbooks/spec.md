# Spec Playbook

Specification practices that kept builds tight (and anti-patterns that caused churn). The
spec-writer reads this before drafting.

> Seeded with priors; confirm via `/learn`.

## Working priors (unconfirmed)
- A single explicit "scope line" (the one core loop) prevents scope creep better than a long
  feature list.
- Listing *deferred* rules explicitly is as valuable as listing implemented ones.
- Every acceptance criterion must be observable/testable, or the playtest stage can't use it.
- Specifying the engine state shape in the build plan removes most build-time ambiguity.

## Confirmed (Magical Athlete)
- **Practice:** Parameterize component values the rulebook *text* doesn't state (track length, feature
  layout, chip point values) into a `config` module flagged `CONFIRM`, instead of fabricating them.
  **Evidence:** magical-athlete `src/engine/config.ts`. **Effect:** the engine reads them, so a wrong
  guess is a one-line correction; the build never stalls waiting on the physical components.
- **Practice:** Encode the rulebook's **own worked example** as an integration test. **Evidence:**
  magical-athlete `tests/engine/powers.test.ts` (the page-16 Romantic→Banana→Scoocher cascade).
  **Effect:** an authoritative, unambiguous check for the hardest part (interacting effects) that
  pass/fail assertions on individual powers can't give you.
- **Anti-pattern avoided:** implementing rules from garbled OCR of an image-heavy rulebook PDF.
  **Evidence:** magical-athlete first `pdftotext -layout` pass interleaved multi-column racer cards.
  **Effect:** re-extract in reading order; implement only confidently-decoded rules and *explicitly
  defer* the rest (documented in the README) — never invent a power.
- **Practice:** A power/variant system should split **optional ("can …")** powers (need a player
  prompt) from **mandatory** ones; ship the mandatory set first and gate the optional ones on the
  prompt UI. **Evidence:** magical-athlete shipped 9 mandatory powers in M2, deferred optional ones to
  the UI milestone. **Effect:** real progress without a half-built prompt system.

## Confirmed (Roomies)
- **Practice: when the source gives components + scoring but not the *flow*, mine the cards' own
  keyword tags for the structure.** Roomies' brief had no turn/round/draft rules, but several cards
  read "**Draft:** rotate hands" / "**Draft:** swap a hand" — that keyword is the game telling you a
  **draft phase** exists and what happens in it. Reading those tags as the flow spec (draft phase →
  placement phase) is far safer than inventing a structure from scratch. **Evidence:** roomies spec
  rev 2026-05-22; the round-1 spec under-weighted the "Draft:" tag and shipped a flow with no visible
  draft. **Effect:** the timing keyword is the highest-signal flow clue when the rulebook is silent.
- **Practice: a top-of-spec ⚑ decision table for every invented rule.** When you must design
  unspecified flow/values, list each invented decision (`⚑ D1…Dn`) with the default you chose and the
  alternative, in one table at the top of `03-mvp-spec.md`. Build against the defaults; the same table
  becomes the gate's decision sheet and survives across iterate rounds. **Evidence:** roomies
  `03-mvp-spec.md` (D1–D15) + `open-questions.md`. **Effect:** momentum without silent guessing;
  every assumption is visible and one edit away from corrected. (Extends Magical Athlete's "config
  flagged CONFIRM" from numbers up to *design/flow* decisions.)
- **Practice: dead-rule detection — compute the achievable score range and flag rules that can never
  fire.** Implementing Roomies' scoring revealed **Dekoration ("no minus points") is inert**: with
  the given base points and ±1 modifiers, no card can ever score below 0 (Sheep floors at 0, Mikel at
  1, Hossi at 2), so the clamp never triggers. **Evidence:** roomies `tests/engine/scoring.test.ts`
  (encoded the no-op as a documented finding) + `open-questions.md` F1. **Effect:** a cheap sanity
  pass (min/max per card) surfaces design holes the rulebook author missed — flag them at the gate
  rather than shipping a dead card.

## Template for a confirmed lesson
- **Practice / anti-pattern:** **Evidence (project):** **Effect:**
