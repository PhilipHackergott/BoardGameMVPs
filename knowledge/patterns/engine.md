# Engine Patterns

Reusable, framework-agnostic game-engine knowledge: state shapes, reducer contracts, and
legal-move generation per board-game mechanic. Pull from here before designing a new engine.

> Add entries via `/learn`, keyed by mechanic
> (e.g. "tile-laying", "worker-placement", "set-collection", "point-to-point movement").

## Confirmed (Lacuna)
- **Model N players from day one, even for a 2-player MVP.** Use `PlayerId = number`,
  `collected: number[][]` sized to N, `result: PlayerId | "draw"`, and represent turn order as a
  precomputed `order: PlayerId[]` + `turnIndex` (alternation for 2, snake for 3–4). Hardcoding
  `1 - current` / `[p0,p1]` / `"p0"|"p1"` forced a refactor across engine, scoring, store, and UI
  when 2→4 players was requested. _Source: projects/lacuna `src/engine/{types,setup,rules,scoring}.ts`._
- **Data-driven variant/powers spine.** For optional rules (special powers, factions), store
  per-player flags/params in state and read them at decision points via small pure helpers
  (`hasPower`, `lineClearFor`, weighted `nearestBeacon`) rather than scattering branches. Default
  (no flags) must reduce exactly to the base game so existing tests stay valid. Adding content
  becomes mostly data + one hook. _Source: lacuna `src/engine/{powers,effects}.ts`._
- **Turn order as a sequence makes variants easy.** Snake draft, "start a turn later"
  (move a slot to the end), and "extra/skip turn" (splice the order) are all list edits on
  `order[]`, with `done = turnIndex >= order.length`. _Source: lacuna procrastinator/flexible._
- **Unified mid-turn sub-phase resolver.** When several optional sub-phases can stack within
  one turn (free picks, a steal, a banish, a directional push), do **not** advance the turn from
  each handler. Set a pending flag per sub-phase and route every handler's return through one
  `finishOrStay(state)`: it returns the state unchanged while *any* pending is set (`freePicks`,
  `duskPending`, `abyssPending`, `repelOrigin`), and only when all clear does it bump `turnIndex`
  (finalizing if done). Keeps multi-pending turns correct and the "who acts next?" decision in a
  single place instead of duplicated across handlers. _Source: lacuna `src/engine/rules.ts`
  (`finishOrStay`), used by place + `freePick`/`repel`/`duskSteal`/`abyssVoid`/`abyssSkip`._
- **A second variant axis layers cleanly on the first — with a shared immunity predicate.**
  "Affinities" (one per player, keyed on live game counts — e.g. Chalk's bonus line-budget =
  `collected[player][color]`) sit beside "powers" as an independent per-player axis read at the
  same decision points; both default-off ⇒ base game. Funnel every spatial displacement (Frost
  freeze, Ember/Verdant/Gravity pull, Repeller push) through one predicate
  `canDisplace(state, star)` so immunities (frozen, shielded) are enforced uniformly rather than
  re-checked per effect. _Source: lacuna `src/engine/{powers,effects}.ts` (AFFINITIES, canDisplace)._
- **Derive history/attribution by _replaying_ the action log — don't fatten the log.** Keep the
  log a plain `Action[]` (so a determinism test can feed it straight back into `applyAction`), and
  store enough to recreate the initial state (`seed` + `config` + variant inputs like drafted
  powers/affinities). To build a "who did what" view, reconstruct the start with `createGame(seed,
  config, …)` and re-apply each logged action, reading `current` (and any pre-action context, e.g.
  a flower still on the board) *before* each step. The reducer's purity makes this exact and free —
  no per-entry actor field to maintain or migrate. Generalizes to undo, spectator timelines, and
  replays. _Source: lacuna `src/ui/LogModal.tsx` (`buildLog`) over `state.log`/`state.seed`._

## Confirmed (Magical Athlete)
- **Trigger/effect resolver for *interacting* variable-player powers** (Cosmic-Encounter-style, where
  powers bend the rules and react to each other). Keep it a pure, data-driven registry: each power is
  `{ mainMoveDelta?, beforeMainMove?, onRoll?, onPass?, onStop?, onTurnEnd? }`, and hooks act through a
  small `PowerApi` of primitives (`doMove`, `trip`, `posOf`, `countOnSpace`, `aloneInLead`). The
  resolver fires hooks at fixed points in a turn and applies effects in a defined **resolution order**
  (here: racetrack features → current player → others clockwise). _Source: magical-athlete
  `src/engine/{resolve,powers}.ts`._
- **Reactive "when any power happens" effects need a `notePowerActivation` hook + a hard step cap.**
  Triggered effects call `notePowerActivation(activator)`, which lets reactive powers (Scoocher) fire;
  those are themselves activations, so the chain is naturally recursive — bound it with a global
  per-turn step cap to break loops (the rulebook's "resolve the loop once, then stop"). Distinguish
  *passive* modifiers (auras like -1/+1 to a move) from *triggered* effects so they don't spuriously
  fire reactive powers. _Source: magical-athlete `resolve.ts` (`notePowerActivation`, `RESOLVE_STEP_CAP`)._
- **Serializable RNG state threaded through actions.** mulberry32's state is one uint32; store it as
  `rngState` in `MatchState`, rebuild the RNG per action, save its state back. Randomness is consumed
  *lazily* (only on an actual roll), so `{config, seed, action-log}` reproduces a match exactly even
  with branches that skip the roll. _Source: magical-athlete `src/engine/rng.ts` + `rules.ts`._
- **Confirms the Lacuna prior:** model turn order as indices over a `racers[]`/`order[]` sequence and
  give each unit an `owner` — this made standard 3–6P work and leaves the 2P double-racer variant
  (two racers per owner) additive rather than a rewrite.
- **Optional ("can …") powers: a pause/resume turn split, with prompts strictly *before* the cascade.**
  Split the turn into `beginTurn` → (optional `pending` choice) → `resumeTurn`; put a `pending` on race
  state + a `resolvePrompt` action. Because the choice is resolved before the move cascade runs, the
  cascade itself never has to pause mid-flight (which would need continuations). One mechanism then
  covered pre-roll, post-roll, reroll, and predict choices. _Source: magical-athlete `resolve.ts`/`rules.ts`._
- **Reactive optional powers without a continuation refactor: resolve them as *post-turn* prompts.**
  Powers that react *during another racer's* turn (follow a space-mate, duel a space-mate) are very hard
  to make optional mid-cascade. Instead, after the turn completes, scan for reaction opportunities and
  surface them as `pending` choices that block advancement; re-scan after each (track an `offered` set
  per turn so they aren't re-offered, which also bounds loops). A documented "post-turn, not truly
  mid-move" simplification that's faithful enough and far less risky. _Source: magical-athlete
  `nextReaction`/`advanceOrReact` + `applySuckerfishFollow`/`applyDuel`._
- **Turn-order edits via a tiny signal field, not a resolver rewrite.** A power that says "I go next"
  (Skipper) just sets `race.goNext = owner`; the turn-advancer honours it before its normal loop. The
  resolver stays unaware of the turn model. _Source: magical-athlete `goNext`._
- **Power-copying = a `copiedPowerId` override on the unit + a dynamic hook lookup.** Twin/Egg store a
  fixed copied power at race start; Copycat resolves to the current lead's power live — both via one
  `hooks(idx)` that reads `copiedPowerId ?? lead's power ?? own power`. Guard against copying other
  copy-powers (recursion); note only *registry-hook* powers copy cleanly. _Source: magical-athlete `hooks()`._

## Confirmed (Roomies)
- **Mechanic: card drafting (pick-and-pass) + tableau placement + conditional scoring.**
- **Model a phase that the cards' own text names.** When card effects are tagged with a timing
  keyword ("**Draft:** rotate hands", "Build:", "End:"), that keyword is telling you the game has a
  distinct **phase** — make it explicit in the state machine. Roomies round-1 collapsed draft into
  instant placement; mechanically correct, but it erased the whole draft experience (the #1 playtest
  complaint). Round-2 split each round into `phase: "draft" | "place"` and the intercepts moved to
  fire **on the pick**, where the source always meant them to. _Source: roomies `src/engine/{types,rules}.ts`._
- **Two-phase state shape: a per-player `pool` is the intermediate zone.** DRAFT moves a card from
  the rotating `hands[seat]` into `players[p].pool`; PLACE consumes from `pool` into `environments`;
  unplaced pool cards are discarded at `endPlacement`. Two small reducers (`advanceDraft`,
  `advancePlacement`) advance seat→phase→round→end. Clean, serializable, and the determinism/
  simulation tests extend unchanged. _Source: roomies `src/engine/{types,setup,rules}.ts`._
- **Pick-and-pass: defer mid-round hand mutations to the pick-round boundary.** Any effect that
  swaps or rotates hands *during* a pick-round (Marty swap, Dalai extra-rotate) must be **queued and
  applied only after every seat has picked** — when all hands are equal size. Applying a swap
  immediately mixes a picked-from (shorter) hand with a not-yet-picked (longer) one, and a later seat
  then faces an **empty hand** mid-round. Queue them (`pendingSwaps[]`, `extraRotations`) and drain at
  the boundary. A randomized full-game simulation caught this; unit tests of single picks did not.
  _Source: roomies `src/engine/rules.ts` (`advanceDraft`)._

## Template for an entry
- **Mechanic:**
- **State shape that worked:**
- **Action set & reducer notes:**
- **Determinism/seed handling:**
- **Source project + file to copy:**
