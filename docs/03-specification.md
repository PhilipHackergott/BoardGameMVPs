# Stage 3 — Specification

**Command:** `/spec`  **Agent:** `spec-writer`  **Outputs:** `03-mvp-spec.md`, `04-build-plan.md`
**Gate question:** *"Is this the right MVP and the right plan to build it?"*

## Purpose

Turn the approved opportunity into an unambiguous, buildable specification — what the MVP is,
what it explicitly is **not**, and how it will be built. This is the most leverage-heavy stage:
a tight spec makes the build stage almost mechanical.

## Inputs

- `01-candidate-brief.md`, `02-market-analysis.md`, recorded `ip` decision.
- `docs/stack-and-conventions.md` (the build contract) and `knowledge/`.
- The official rules of the game (the human supplies or confirms the authoritative ruleset).

## Two artifacts

### `03-mvp-spec.md` — *what* (product/design spec)

1. **One-line pitch** and the target experience.
2. **Scope line**: the single core loop the MVP delivers. Everything else is out.
3. **Rules to implement** — the authoritative ruleset, written precisely enough to code from:
   - Components & setup, turn structure, actions, win/end conditions, scoring, all edge cases.
   - Explicitly list **rules deferred/cut** for the MVP and why.
4. **Modes**: e.g. vs-AI, hot-seat. AI difficulty levels (start with one).
5. **Screens & flow**: menu → game → end. Wireframe-level board/HUD description, **plus the
   transitions/outcome gates** — outcomes are beats not cuts (no auto-switch; Continue/Claim screens
   that show what changed).
6. **States the player can be in** and how the UI communicates whose turn / legal moves / score,
   and **plan-relevant rules state** (immunities, modifiers) surfaced redundantly.
7. **Look, feel & flow** (crawl `knowledge/playbooks/visual-first-try.md`): theme module (palette,
   fonts, icon style); **a themed living background**; game-feel budget (springs/particles/shake/pops
   + the key "number-go-up" beat); transitions + reward-collection feedback; accessibility
   (colorblind-safe shape≠hue, keyboard, text scaling, reduce-motion). Consistent with the IP decision.
   - **Sound** (crawl `knowledge/playbooks/audio-and-sound.md`): synthesized, IP-clean music + SFX,
     with a Music/SFX **volume mixer** + mute. Don't spec a silent game.
   - **Shell, settings & persistence** (crawl `knowledge/playbooks/front-of-house-shell.md`): a main
     menu (Continue/New/History/Settings/Rules), a **Pause that freezes the game**, settings, and
     **save/continue/history**. These are baseline, not stretch.
8. **Acceptance criteria**: a checklist of observable behaviors that mean "MVP works" (these
   become the playtest stage's test list). Each must be testable.
9. **Out of scope (MVP)**: online multiplayer, accounts, full expansions, monetization plumbing, etc.

### `04-build-plan.md` — *how* (engineering plan)

1. **Stack confirmation** (or justified deviation from `stack-and-conventions.md`).
2. **Engine design**: state shape, action set, the `reducer` contract, legal-move generation,
   determinism/seed strategy. The engine is the heart — spec it well.
3. **Render plan**: Pixi scene structure, what's drawn, how input maps to engine actions.
4. **UI plan**: React component tree for menus/HUD.
5. **AI plan**: approach for the opponent (heuristic / minimax / MCTS as fits the game) — keep
   the MVP's first AI simple but not random.
6. **Test plan**: key engine unit tests (incl. full-game simulations) + Playwright e2e happy path.
7. **Build milestones**: ordered, each independently demoable (see below).
8. **Risks/unknowns** and how the build stage should resolve them.
9. **Targets & wrapping**: web first; note any Tauri/Capacitor work if `targets` requires it now.

## Milestone shape (recommended)

1. **Engine + tests** — rules correct, fully simulatable headless. No UI.
2. **Static render** — board draws from a fixed engine state.
3. **Interactive hot-seat** — full playable loop, two humans, win detection.
4. **AI opponent** — single-player works.
5. **Polish + acceptance** — feel, accessibility, all acceptance criteria pass.

Each milestone is a natural place for the build stage to checkpoint.

## Process

1. Crawl knowledge + prior specs for reusable engine/UI patterns.
2. Pin the authoritative ruleset (ask the human if the source is ambiguous — don't guess rules).
3. Write `03-mvp-spec.md`, then `04-build-plan.md`. Cross-check: every spec'd behavior has a
   build-plan home and an acceptance criterion.
4. Set `awaiting-approval`; stop.

## Gate criteria

Advance to build when the human agrees the scope is right and the plan is sound. Scope-cutting
feedback is expected and healthy here. Re-check the recorded IP decision exists before the
build gate is later opened.

## Self-learning hooks

- Reusable engine state shapes and AI approaches per mechanic graduate to
  `knowledge/patterns/engine.md` and `knowledge/patterns/ai.md`.
- Spec templates that proved tight vs. ones that caused build churn → `knowledge/playbooks/spec.md`.
