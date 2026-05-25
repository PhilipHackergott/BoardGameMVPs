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
2. **Scope line**: the core loop the MVP delivers, **with its full base content set** — cut whole
   optional *modules* (extra modes, expansions, online), **not depth within the core loop**. A
   roguelike with 2 relics is a tech demo, not an MVP. See `knowledge/playbooks/target-state.md` +
   `content-depth.md` for the "cut modules, not depth" line.
3. **Rules to implement** — the authoritative ruleset, written precisely enough to code from:
   - Components & setup, turn structure, actions, win/end conditions, scoring, all edge cases.
   - Explicitly list **modules deferred/cut** for the MVP and why (cut at the module level).
4. **Content catalog & depth** (crawl `knowledge/playbooks/content-depth.md`): the full base content
   set that makes the loop replayable (cards/powers/enemies/relics/events/variants), specified as
   **data on a data-driven spine** with the design axes it spans; flag any under-served axis worth
   opening. This is the reason-to-play — spec it, don't leave it to "polish later".
5. **Modes & AI**: e.g. vs-AI, hot-seat. A **difficulty ladder** (≥ Low/Med/Hard off one shared
   evaluator), not a single difficulty — and a note that it must be **sim-verified** to actually climb.
6. **Screens & flow**: menu → game → end. Wireframe-level board/HUD description, **plus the
   transitions/outcome gates** — outcomes are beats not cuts (no auto-switch; Continue/Claim screens
   that show what changed).
7. **States the player can be in** and how the UI communicates whose turn / legal moves / score,
   and **plan-relevant rules state** (immunities, modifiers) surfaced redundantly.
8. **Look, feel & flow** (crawl `knowledge/playbooks/visual-first-try.md` + `target-state.md`): commit
   a **design/art-direction doc** (palette as tokens, one display + one body face, the ONE card/piece
   model, panel/modal/button recipes, icon style) and **reusable UI primitives** (one `<Modal>` shell +
   shared card/button/panel atoms) up front — cohesion is decided, not discovered. Plus **a themed
   living background**; game-feel budget (springs/particles/shake/pops + the key "number-go-up" beat);
   transitions + reward-collection feedback; accessibility (colorblind-safe shape≠hue, keyboard, text
   scaling, reduce-motion). Consistent with the IP decision.
   - **Sound** (crawl `knowledge/playbooks/audio-and-sound.md`): synthesized, IP-clean music + SFX,
     with a Music/SFX **volume mixer** + mute. Don't spec a silent game.
   - **Shell, settings & persistence** (crawl `knowledge/playbooks/front-of-house-shell.md`): a main
     menu (Continue/New/History/Settings/Rules), a **Pause that freezes the game**, settings, and
     **save/continue/history**. These are baseline, not stretch.
9. **Balance & tuning** (crawl `knowledge/playbooks/balance-and-tuning.md`): note the headless
   AI-vs-AI sim harness the build will stand up (`npm run sim`), the balance target (compress the
   win-rate spread; no auto-win / dead content), and the difficulty-ladder verification.
10. **Acceptance criteria**: a checklist of observable behaviors that mean "MVP works" (these
    become the playtest stage's test list). Each must be testable — include content-completeness,
    a sim-verified ladder, and "matches `art-direction.md`".
11. **Out of scope (MVP)**: online multiplayer, accounts, **separate expansions / secondary modes**,
    monetization plumbing. (Out = whole modules; the base game ships content-complete.)

### `04-build-plan.md` — *how* (engineering plan)

1. **Stack confirmation** (or justified deviation from `stack-and-conventions.md`).
2. **Engine design**: state shape, action set, the `reducer` contract, legal-move generation,
   determinism/seed strategy. The engine is the heart — spec it well.
3. **Content spine**: how the catalog is modeled as data + the fixed hook points it reads
   (default-off ⇒ base game). The skeleton that makes the full catalog affordable — spec it explicitly.
4. **Render plan**: Pixi scene structure, what's drawn, how input maps to engine actions.
5. **UI plan**: React component tree for menus/HUD — including the **shared `<Modal>`/overlay shell +
   atoms** built before the individual screens.
6. **AI plan**: approach for the opponent (heuristic / minimax / MCTS as fits the game) and the
   **difficulty ladder off one shared evaluator** (≥ Low/Med/Hard) — simple but not random.
7. **Test plan**: engine unit tests (incl. full-game simulations) + the **sim harness** (AI-vs-AI
   balance sweep, `npm run sim`) + Playwright e2e happy path (incl. a real-pointer test).
8. **Build milestones**: ordered, each independently demoable (see below).
9. **Risks/unknowns** and how the build stage should resolve them.
10. **Targets & wrapping**: web first; note any Tauri/Capacitor work if `targets` requires it now.

## Milestone shape (recommended — the target-state shape that collapses the polish/content/balance waves)

1. **Engine + content spine + tests** — rules correct, the data registry/hook points in place, fully
   simulatable headless. No UI.
2. **Design doc + shared shell + static render** — `art-direction.md`, the `<Modal>` primitive +
   atoms, `render/theme.ts` + themed living background; board draws from a fixed engine state.
3. **Interactive core loop** — full playable loop, win detection, real-pointer input verified.
4. **Content catalog + AI ladder** — fill the full base content set on the spine; build Low/Med/Hard
   off one shared evaluator (these go together — the AI is how you'll measure the content).
5. **Feel + sound + shell** — fx kit/cascade, outcome gates + transitions + reward animation, state
   legibility; audio engine (music + SFX + mixer + mute); front-of-house shell + save/continue/history.
6. **Balance harness + first tuning pass** — `npm run sim`, compress the spread, verify the ladder climbs.
7. **Acceptance** — all acceptance criteria + the visual-first-try checklist + the target-state self-check pass.

Each milestone is a natural place for the build stage to checkpoint. (Full rationale +
the "definition of done": `knowledge/playbooks/target-state.md`.)

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
