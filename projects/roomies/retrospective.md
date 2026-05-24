# Retrospective — Roomies (INTERIM, mid-build)

> Written 2026-05-22 after build round 2, while the project sits at the **build gate** (not shipped).
> Captured early because the build surfaced several generalizable lessons worth banking now.

## What it is
An original hot-seat **animal-housing drafting game** (user's own design, IP clear). Each round:
**DRAFT** (pick-and-pass cards into a personal pool; Dalai rotates hands / Marty swaps a hand) →
**PLACE** (arrange your pool into rooms with capacity + multipliers). After 3 rounds, a conditional
**scoring engine** (paired buddies, Security guards, sheep herds, isolation, Joker wildness, biome
sets) totals each tableau; highest wins.

## Timeline / rounds
- **Spec** (1 round): components + scoring were fully specified by the user; **game flow and biome
  scoring were not**. Designed them, flagged every invented rule with **⚑** in a decision table.
- **Build round 1**: full hot-seat game, pure engine + React-DOM UI, 54 tests, e2e, screenshots.
  Verdict at the gate: correct & playable, but **collapsed draft into instant placement**.
- **Build round 2** (this one): re-architected to an explicit two-phase round, **hot-seat +
  animations** (no AI), and a **major visual overhaul** (animated backdrop, card-flight animations,
  emoji art, phase banners, confetti). Engine scoring unchanged; 54 tests still green.

## What worked
- **Guess-and-flag (⚑) with a decision table at the top of the spec.** Building against explicit
  defaults kept momentum when the source under-specified the flow; the same table served as the
  gate's decision sheet across two rounds.
- **Pure engine / thin UI split paid off twice.** The round-2 rework was almost entirely UI +
  reducer restructure; `scoring.ts` and its 23 tests didn't move. The scoring engine being correct
  and isolated meant a near-total UI rebuild carried no scoring risk.
- **Randomized full-game simulation caught a real bug** the unit tests didn't: Marty's mid-round
  hand-swap left a seat with an empty hand (uneven hand sizes). Fixed by deferring swaps/rotations
  to the pick-round boundary.
- **React-DOM (no Pixi) was the right call** for a card/tableau game — and still hit a high visual
  bar with a CSS animated backdrop + Web-Animations-API card flights + emoji art.
- **Emoji as instant "art"** gave the cozy theme character at zero asset cost.

## What was painful / what we'd change
- **The biggest defect wasn't a bug — it was a missing *phase*.** The engine "drafted" correctly,
  but because draft and placement were merged, the player experience had no visible draft. The
  source literally tagged effects "Draft: …" — that was the signal a distinct phase was intended,
  and the round-1 spec under-weighted it. Lesson banked to spec + playtest playbooks.
- **The visual push broke the e2e** (CSS animations made elements fail Playwright's "stable" check;
  every flow selector also changed). Had to disable animations in the e2e and rewrite the spec.
- **Source is still under-specified** (deck 94≠96, biome values, env→biome map, what Types do,
  Dekoration is a dead card) — tracked in `open-questions.md`; needs the designer's answers.

## Reusable assets produced (for the next project)
- **Two-phase round engine** with a per-player `pool` intermediate zone: `app/src/engine/{types,setup,rules}.ts`.
- **Pick-and-pass draft with boundary-deferred hand swaps/rotations**: `app/src/engine/rules.ts` (`advanceDraft`).
- **DOM card-flight animation layer** (generalized from Lacuna's FlyLayer to any card via a target
  selector + glyph): `app/src/ui/FlyLayer.tsx` + `state/store.ts` (`spawnFlight`).
- **Pure DOM "juice" for card games**: animated backdrop (`ui/Backdrop.tsx`), phase banner + confetti
  (`ui/App.tsx`, `ui/EndScreen.tsx`), emoji glyph art (`ui/cardText.ts`), cozy theme (`styles.css`).
- **Dead-rule detection** as a scoring sanity check (see spec playbook).

## Status
At the **build gate** (round 2), `awaiting-approval`. Not shipped. Open design questions in
`open-questions.md` must be answered before a real balance/ship pass.
