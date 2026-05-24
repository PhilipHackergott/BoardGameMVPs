# AI Patterns

Reusable opponent approaches per game type (heuristic eval, minimax + pruning, MCTS, rule-based).
The MVP's first AI should be simple but not random; this file records what was "good enough" and
what scaled.

> Empty until the first project ships. Add entries via `/learn`.

## Confirmed (Lacuna)
- **Dispatch AI _choices_ through the real store actions, not a parallel code path.** The AI
  module is pure choice functions over engine state (`aiPlace`, `aiClaim`, …) that return only a
  decision; an App driver effect feeds that decision to the *same* store action a human would
  click. All side-effects — flight animations, mid-turn sub-phase routing, draft-pick locking —
  are reused for free, and the AI can never reach a state the UI can't. _Source: lacuna
  `src/ai/ai.ts` + the driver `useEffect` in `src/ui/App.tsx`._
- **A 3-tier difficulty ladder for a low-branching placement game, off one `estimate()`.**
  *Low* = a cheap heuristic with random jitter (favour a colour you already collect + lean
  central) so it's varied and beatable but visibly non-random — "make low better than random"
  needed only colour-focus + centrality + `Math.random()`, no lookahead. *Medium* = greedy
  one-ply: simulate each legal move with the pure engine and keep the best `estimate(me)` (flowers
  held + projected nearest-beacon territory). *Hard* = the same but `estimate(me) − max rival
  estimate` (denial). One `estimate()` shared across tiers; medium/hard reuse `applyAction` on the
  real engine to look ahead. _Source: lacuna `src/ai/ai.ts` (`aiPlace`, `estimate`)._
- **One small pure chooser per sub-phase.** Each mid-turn sub-phase gets its own state→choice
  function (`aiClaim`, `aiFreePick`, `aiRepelPoint`, `aiDusk`, `aiAbyss`, `aiDraftPick`,
  `aiDraftAffinity`); the driver calls whichever the current pending demands. Drafting follows a
  fixed strength tier (random for low). Keeps each decision testable in isolation and mirrors the
  engine's own sub-phase split. _Source: lacuna `src/ai/ai.ts`._
- **Make AI moves _legible_ by driving the human input path in beats.** An instant
  select-and-commit is invisible — you can't see what the AI did. Split the move across timers
  using the same store actions a human triggers: beat 1 selects the piece (reveals the
  connection/legal-move affordances) and shows the snapped preview; after ~0.5s beat 2 commits
  (drops the piece, runs the normal placement animation). Costs nothing extra (reuses the UI) and
  turns an all-AI game into something watchable. _Source: lacuna driver `useEffect` in `src/ui/App.tsx`._
- **Watchability knobs: per-step delay + a pause gate.** Slow the driver's cadence when no human is
  seated (detect "all seats are AI") and add a short post-placement beat so the result registers.
  Make it pausable by adding a `paused` flag to the driver effect's deps and early-returning when
  set; track every `setTimeout` id in the effect and clear them all on cleanup, so toggling pause
  mid-move cancels the pending beat cleanly. Reset the flag on new-game/return-to-menu.
  _Source: lacuna `src/state/store.ts` (`paused`/`togglePause`) + `src/ui/App.tsx`, `Controls.tsx`._

## Template for an entry
- **Game type / branching factor:**
- **Approach that worked for the MVP:**
- **Difficulty knobs:**
- **Cost/perf notes (must stay responsive on-device):**
- **Source project + file to copy:**
