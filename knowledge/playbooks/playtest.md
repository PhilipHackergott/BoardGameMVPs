# Playtest Playbook

Heuristics that caught real problems, and recurring defects worth checking proactively. The
qa-playtester reads this before testing.

> Seeded with priors; confirm via `/learn`.

## Working priors (unconfirmed)
- Driving the real app in Playwright headless Chrome and *reading the screenshots* against the
  spec + rules manual catches rendering, layout, and rule-display bugs that headless assertions
  and engine tests never see. Always include illegal-move and end-game screenshots.
- Randomized full-game simulation (hundreds of games) surfaces illegal-state and
  non-termination bugs that scripted tests miss.
- Always check the "why was my move rejected?" feedback — silent rejection is the most common
  usability failure.
- Verify the end-of-game / win screen actually fires; it's the most-skipped path in early builds.
- Determinism check (same seed+actions → same result) catches hidden randomness in the engine.

## Confirmed (Lacuna)
- **Dev-seam to drive a canvas game.** Expose a dev-only `window.__<game>` with `getState`,
  `legalMoves`, `newGame(seed)`, and the canvas `center`; in the test, map engine coords → client
  px via `canvas.getBoundingClientRect()` and click. Without it you can't e2e a `<canvas>` game.
- **Click the safe point on a line.** A piece's *hit radius* often exceeds the rule's *clearance
  radius*, so a click "on the line" can be swallowed by a nearby piece and silently re-select.
  Click the point on the segment farthest from all pieces. (Setup min-distance guarantees one.)
- **Wait on engine state, not timeouts:** `waitForFunction(() => __game.getState().game.phase === "ended")`
  beats arbitrary `waitForTimeout`.
- **e2e specs rot fast under UX reworks.** Every flow change (auto-start → menu, added setup/draft
  phases) silently broke the e2e path. Re-run/repair e2e after each rework, or expect false green.
- **Visual-verification debt is real and accrues silently.** Skipping the screenshot pass to save
  tokens is fine *per rework*, but it compounds: Lacuna's powers + colour-affinities + AI expansion
  is `tsc`-clean and 58-test green yet has **never** been seen rendered — draft zones, sub-phase
  pickers (Dusk/Abyss), affinity tags, and the pile→pile transfer animation are unverified. Track
  it as explicit debt and clear it (one full Playwright pass) before any ship gate; green unit tests
  do not cover layout, z-order, or animation.
- **Recurring defect — optional subsystems rendered regardless of their enable flag.** The draft
  screen showed the Affinities (and Powers) zone even when that axis was toggled *off* in setup;
  unit tests passed because the engine was correct — only the UI gating was wrong. When a feature
  is config-gated, check that its UI is *also* gated, in every player count/option combination.
  Cheap to verify, easy to miss without looking. _Evidence: lacuna `DraftScreen.tsx`._
- **A derived game log is a high-value, cheap playtest/debug aid.** Replaying the engine's action
  log into a readable, per-player timeline (see engine-patterns) lets you reconstruct exactly what
  happened — invaluable when AI plays fast or auto, and far better than watching pixels. Build it
  early. _Evidence: lacuna `LogModal.tsx`._

## Confirmed (Magical Athlete)
- **Add stable `data-testid`s, then a phase-driven Playwright loop that screenshots each state.** A
  single spec that clicks by testid (`start`/`draft-pick`/`reveal-pick`/`roll`/`prompt-option`/
  `next-race`/`end-screen`) and snaps menu→draft→reveal→race→prompt→after-race→end drives a whole match
  with no brittle text/coords. Reading those shots caught the only real defects — all **visual** (board
  legibility), invisible to the 52 green unit tests. _Evidence: magical-athlete `tests/e2e/playtest.spec.ts`._
- **Recurring defect — overlapping piece labels when tokens share a space.** Per-standee name tags
  collided into an unreadable jumble wherever racers clustered (Start/finish). Fix: don't label each
  token; rely on on-token initials/colour + a standings panel, fan tokens out with a vertical cascade +
  z-sort, and badge finishers (1st/2nd). Check the "many pieces on one cell" case explicitly. _Evidence:
  magical-athlete `render/board.ts` round-1 vs round-2 (`playtest/round-1` vs `round-2`)._
- **Force the visually-distinct states in the script.** The auto-driver took the first option each turn
  and never showed a Wild track; adding "screenshot when `Wild Wilds` is visible" surfaced the feature
  tiles (★/▲/» «). Explicitly steer the playthrough to each board variant, not just the happy default.

## Confirmed (Roomies)
- **Heuristic — "mechanically correct" ≠ "the experience the design implies": check that a phase
  the *data* names is a *visible* phase in play.** Roomies' engine drafted correctly (pick-and-pass),
  yet the top playtest complaint was "**there is no drafting phase**" — because draft and placement
  were merged into one instant action, so the player never *saw* a draft. The cards literally said
  "Draft: …". Heuristic: for each phase/timing keyword in the rules, confirm the UI presents it as a
  distinct, legible beat — not just that the engine resolves it. **Evidence:** roomies build round 1→2.
  **Now checked by default? y** (added to the visual/flow read).
- **Recurring defect reconfirmed — e2e specs rot under UX reworks, and the *animation* push adds a
  new failure mode.** The two-phase rework changed every flow selector (broke the e2e), and the new
  CSS animations made elements fail Playwright's "stable" check (clicks time out). Re-run + repair the
  e2e after every rework, and disable CSS animations in the e2e (`addStyleTag` animation:none — see
  build-gotchas). **Evidence:** roomies `tests/e2e/playtest.spec.ts`. **Now checked by default? y.**
- **Practice — interim `/learn` is worth running mid-build after a big rework**, not only on ship:
  bank the generalizable lessons while fresh; just don't mark the project shipped. **Evidence:** this
  cycle (roomies at the build gate). **Now checked by default? y** (when a rework yields cross-project lessons).

## Confirmed (Cull the Crown — Wave 8 sweep harness)
- **Pattern — parallel deck×stake sweep with `workers > 1`.** Each Playwright worker = its own
  browser context = its own WebGL-context budget, so unlike the WebGL-heavy *visual* e2e suite
  (which must be `workers: 1`), the **playtest sweep** harness can safely fan out 2-4 workers.
  Speed-up is ~Nx for the sweep. Cap at `min(4, cores − 2)` — past that the page-setup budget
  thrashes ("Test timeout while setting up page"). **Use a separate `playwright.sweep.config.ts`**
  so the visual suite stays serial. **Evidence:** cull-the-crown `playwright.sweep.config.ts` +
  `tests/playtest/sweep.spec.ts`. **Now checked by default? y** (for any balance-pass round on
  a fast-enough game).
- **Practice — tag harvestable per-test data with a grep-able prefix.** When sweep tests need to
  emit structured per-run data and you want to aggregate later, **`console.log("PLAYTEST_RESULT
  " + JSON.stringify(r))`** and pipe through `grep "PLAYTEST_RESULT" | node analyze.cjs`. Don't
  rely on Playwright reporters to preserve every log line — the **`line` reporter drops parallel
  workers' logs** under TTY overwrites; switch to `list` or `json`. The `package.json` is `"type":
  "module"` by default in most factory projects, so the analyzer should be `.cjs`. **Evidence:**
  cull-the-crown sweep session. **Now checked by default? y.**
- **Recurring defect — cancelled-sweep zombies block re-runs.** Repeatedly killing a Playwright
  sweep mid-run (because something's mistuned) leaves dozens of zombie Chromium processes that
  exhaust the host's page-setup budget on the next attempt. **Reap chrome** between sweeps
  (`Stop-Process -Name chrome -Force` / `pkill -f chromium-browser`). Wire into a pretest hook so
  it's automatic. **Evidence:** this cycle's sweep retries. **Now checked by default? y.**

## Template for a confirmed lesson
- **Heuristic / recurring defect:** **Evidence (project):** **Now checked by default? (y/n):**
