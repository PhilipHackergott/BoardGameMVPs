# Retrospective — Lacuna

> First title through the factory. Web MVP, hot-seat, React + TS + PixiJS v8, pure seeded engine.

## Outcome
- **Shipped / archived:** playable web MVP (not published — IP deferred, see project-state.json).
- **Targets delivered:** web (desktop/mobile wrap not attempted).
- **Build→test rounds:** 1 scripted Playwright round, then many human-driven UX iterations.

## What was built
Full base game (place pawns between same-color flowers on clear lines, nightfall territory
harvest, majority-of-colors win) plus, by user request: free-point placement along the guide
line; red/green connection lines with hover-snap; an influence lens (Voronoi zones); end-game
harvest animation + flying-flower collection; main menu with persistent scoreboard; 2–4 players
(snake draft, plurality scoring); chess clock; and a full special-powers draft mode (10 powers,
draft screen, ward zones/barriers/gravity, victory confetti).

**Second build wave (powers + affinities + AI).** Expanded the power catalog to 18 (added the
interactive trio Repeller/Nomad/Catalyst and more); added **configurable AI opponents** per seat
(Human/Low/Med/Hard); and built **Colour Affinities (PART II)** — a second variant axis of 7
affinities (Ember/Frost/Verdant/Aureate/Dusk/Chalk/Abyss), each triggered by collecting its
colour, drafted in a dual-zone draft screen alongside powers. New mid-turn sub-phases (Dusk steal,
Abyss banish) and an inter-player flower-transfer animation. Shipped tsc-clean + 58 vitest green;
UI not yet visually verified (Playwright skipped per user — see playtest debt).

**Third wave (watchability, UX & tooling).** Made all-AI matches watchable: an extra post-placement
beat, a two-beat AI move that drives the *human* placement path (select → reveal lines/preview →
~0.5s → commit), and a Pause/Play gate (shown only when every seat is an AI). Added a **Game Log**
(a modal that replays the engine action log into a per-player, flower-icon timeline), a dismissable
victory overlay, affinity info text + a collapsible flower breakdown in player panels, and
config-gated draft zones (only the enabled axes show). Switched 3–4-player turn order from snake to
plain round-robin (on request) and unified the layout so every player count flanks the board
left/right (never beneath). Still tsc-clean + 58 vitest green; UI still visually unverified.

## What worked
- **Pure seeded engine** (`app/src/engine/`, mulberry32, `reduce(state, action)`). Enabled
  replay/determinism tests and a 40-seed simulation that never needed the UI.
- **Dev-seam playtest** (`window.__nightweave` in `main.tsx`): Playwright drove canvas clicks by
  mapping engine coords → client px. The only practical way to e2e a canvas game.
- **Memoized per-frame redraws** in the renderer (rebuild flowers/pawns only on real change;
  overlay/lens cheap each frame) kept hover and the lens smooth.
- **Data-driven variant spine** for special powers: powers are per-player flags the engine reads
  at decision points (`effects.ts`), so the base game stayed untouched (default = no powers) and
  adding a power was mostly data + one small hook. **Colour affinities proved the spine extends to
  a second orthogonal axis** with no rework — same default-off contract, same decision points.
- **One sub-phase resolver (`finishOrStay`).** As mid-turn sub-phases multiplied (free picks, Dusk
  steal, Abyss banish, Repeller cone), routing every handler through a single resolver that holds
  the turn until all pendings clear kept "who acts next" correct and in one place — the cleanest
  decision of the second wave.
- **One immunity predicate (`canDisplace`).** Frost/Ember/Verdant/Gravity/Repeller all move
  flowers; checking frozen + shielded immunity in one predicate (rather than per effect) avoided
  divergent rules as displacement effects piled up.
- **AI as pure choosers dispatched through the real store actions.** The AI returns only a choice;
  the App driver feeds it to the same action a human clicks, so flights, sub-phase routing, and
  draft-locking were reused for free and the AI could never desync from the UI. A shared one-ply
  `estimate()` powered medium (greedy) and hard (estimate − best rival); low stayed a cheap
  heuristic + jitter (beatable but not random).
- **Reusable inter-player transfer animation.** An optional `fromPlayer` on a Flight makes the
  flower travel pile→pile (Dusk steal today, any future transfer) using the same DOM `data-pile`
  targets as the board→pile flights.
- **Presentation polish wave (landing menu + living background).** A proper landing menu (New Game /
  Continue / Past Runs / Settings), a `localStorage`-persisted Continue, and a DOM-canvas plasma
  backdrop + fireflies transformed the first impression. The plasma was adapted from Cull the Crown's
  `fx/plasma.ts` — confirming, with Compile's synthwave backdrop, that a **themed living background is
  the cheapest, highest-leverage first-try visual win**. This fed the new
  `knowledge/playbooks/visual-first-try.md` and a presentation baseline in the build agent.

## What was painful
- **2-player assumptions cost a refactor.** `1 - current`, `[p0, p1]` arrays, and `"p0"|"p1"`
  results were baked in; going to 2–4 players touched engine, scoring, store, and every column.
  Should have used `PlayerId = number`, N-sized arrays, and an `order[]`/`turnIndex` turn model
  from day one.
- **PixiJS v8 path/fill semantics** burned time (see build-gotchas).
- **Playwright clicks collided with flower hit-areas** — programmatic "click on the line" landed
  inside a nearby flower's hit circle. Fixed by clicking the point on the segment farthest from
  all flowers.
- **e2e specs drift:** each UX rework (auto-start → menu, claim phase, draft) silently invalidated
  the e2e flow; they now assume the old auto-start and need a menu-aware Start step.

## Reusable assets produced
- Pure engine + seeded RNG + simulation harness — `app/src/engine/`, `app/tests/engine/`.
- Dev-seam pattern — `app/src/main.tsx`, driven by `app/tests/e2e/playtest.spec.ts`.
- PixiJS pond renderer with memoization, blur+mask lens, dashed overlays — `app/src/render/board.ts`.
- Data-driven power/effect system — `app/src/engine/{powers.ts,effects.ts}`.

## Lessons to distill into the knowledge base
- **Engineering → `knowledge/patterns/`:** N-player-from-day-one; data-driven variant spine;
  Pixi v8 path/fill + transparent-canvas hitArea + blur/mask smoothing.
- **Process / playtest → `knowledge/playbooks/`:** dev-seam canvas playtest; safe-point clicking;
  `waitForFunction` on engine state; keep e2e specs in lockstep with UX reworks.
