# Retrospective — Magical Athlete

> **Ship retrospective** (2026-05-21). `stage: shipped`. All 36 racer powers implemented; `/test`
> passed on round 2 (all defects fixed); served locally on :3002. The "What was built" notes below were
> the mid-build capture; the **Shipped state** + **Lessons that graduated to `knowledge/`** sections at
> the end record the final outcome.

## What was built
A licensed digital MVP of Magical Athlete (CMYK), web-first, local hot-seat.
- **M1 — engine core:** deterministic track/movement/features, snake draft (3–6 + 2P double-racer
  draft), race loop (race ends on 2nd finisher), 4-race scheduling, chip scoring. Full-match
  simulation tests.
- **M2 — power engine:** a data-driven trigger/effect **resolver** (`resolve.ts`) + registry
  (`powers.ts`) with the rulebook's resolution order and a step-cap loop-break. **9 powers** live
  (Gunk, Coach, Hare, Banana, Centaur, Romantic, Lackey, Heckler, Scoocher).
- **Asset manifest** (`assets/manifest.ts`): placeholder standees now; official CMYK art slots in by
  setting a `src` (the board already has the licensed-sprite render path with placeholder fallback).
- **M3–4 — render + UI:** 2.5D PixiJS board (perspective loop, standees, active highlight, tween) +
  React hot-seat flow (menu → draft → per-race reveal → race w/ Roll → after-race → end).

Verified each milestone: `npm run lint` clean, **25 Vitest tests** green, `npm run build` succeeds,
`npm run dev` boots and serves.

## Scope: a full match, 2–4 players (chosen over a vertical slice)
The operator chose the full 4-race match. The 36 interacting, rule-bending powers are the real
engineering core, so the build front-loaded a robust *engine + resolver* and an incremental roster —
the right call: the resolver was proven against the rulebook's own worked example before breadth.

## What worked
- **Engine-first, UI-last.** The pure, deterministic engine (reproducible from `{config, seed,
  action-log}`) made the whole game testable headlessly before any pixels — 25 fast tests, including
  an 80-match randomized simulation, caught logic issues with zero browser.
- **Encoding the rulebook's worked example as a test.** The page-16 cascade (Romantic → Banana trip →
  Scoocher → Romantic) is an authoritative, high-value integration test for the resolver.
- **Data-driven powers.** Adding a racer = one registry entry + one test. Trigger hooks + a small
  `PowerApi` kept cross-racer interactions (pass/stop/power-activation) tractable.
- **Asset manifest seam.** Decoupling art from code let the build proceed at full speed with
  placeholders while the licensed art is sourced — no blocking, no rework when it arrives.

## What was painful / decisions we'd note
- **Image-heavy rulebook PDF (34 MB) → garbled OCR.** First `pdftotext -layout` pass interleaved the
  multi-column racer cards. Fix: re-extract in reading order; implement only the **confidently-decoded**
  powers and explicitly defer the rest (never invent rules).
- **Unstated component values.** The rules text doesn't give track length, Wild feature layout, or
  gold/silver chip values. Parameterized in `config.ts` flagged `CONFIRM` rather than fabricated.
- **Toolchain friction.** Vitest pulled a second nested Vite copy, breaking `tsc` on `vite.config.ts`;
  Node isn't on PATH on this machine. Both resolved (see build-gotchas).
- **Optional ("can …") powers need a prompt UI.** Deferred 9 optional powers + the gnarly interaction
  powers (Copycat/Twin/Suckerfish/Huge Baby/Duelist…) to M6, since they need the player-choice prompt
  that arrives with more UI.

## Reusable assets produced
- `engine/resolve.ts` + `engine/powers.ts` — a **trigger/effect resolver for interacting
  variable-player powers** (see knowledge/patterns/engine.md).
- `engine/rng.ts` (mulberry32, serializable state threaded through actions) and the
  `{config, seed, action-log}` determinism contract.
- `assets/manifest.ts` — art-decoupling seam (placeholder ↔ licensed sprite).
- `render/board.ts` — a perspective-loop 2.5D board with standees (placeholder + sprite paths).

## Shipped state (final)
- **All 36 racer powers** implemented and unit-tested; **52 Vitest tests** (per-power + 3–4P/2P
  full-match sims + determinism/replay), a Playwright e2e smoke + a full-match visual playtest.
- **2–4 players** hot-seat incl. the **2-player double-racer variant**; 2.5D Pixi board; accessibility
  (keyboard + zoom). `/test` passed round 2 (round 1's 4 visual defects all fixed). Served on :3002.
- **What got us from "9 powers" to "all 36":** an optional-power **prompt pause/resume** (`beginTurn`/
  `resumeTurn`), then **post-turn reaction prompts** for the reactive powers (Suckerfish/Duelist), a
  `goNext` **turn-order signal** (Skipper/Inchworm), a `copiedPowerId` seam (Twin/Egg) + dynamic
  lead-copy (Copycat), and small per-power state (Genius prediction, Mastermind pick, Sisyphus chips).

## Open (carried, not blocking)
- `CONFIRM` config values (track length, Wild feature layout, chip values, Blimp's "second corner").
- Official CMYK art via the manifest (placeholders until real files arrive).
- Documented simplifications: Twin/Egg auto-pick; Copycat/Twin/Egg copy hook-powers only;
  Suckerfish/Duelist resolve **post-turn** rather than truly mid-cascade.

## Lessons that graduated to `knowledge/`
- **Engine:** the trigger/effect resolver + the prompt **pause/resume** and **post-turn reaction**
  patterns for interacting variable-player powers (→ `patterns/engine.md`).
- **Playtest:** drive the real app in Playwright with `data-testid`s, screenshot every state, then
  *read* the screenshots multimodally vs. the spec — this is what caught the standee-label overlap that
  unit tests can't see (→ `playbooks/playtest.md`).
- Build-gotchas + spec lessons captured earlier still hold (Vitest/Vite `tsc` clash; parameterize
  unstated component values; test the rulebook's worked example).
