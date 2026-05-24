# Stage 5 — Test & Iterate

**Command:** `/test`  **Agent:** `qa-playtester`  **Output:** `05-playtest-report.md`
**Gate question:** *"Ship it (mark shipped + `/learn`), or iterate again?"*

## Purpose

Verify the MVP is **correct** (rules right, no breakage) and **fun/usable** (the experience the
spec promised), then drive iteration until it passes — and capture what was learned.

## Inputs

- The built `app/`, `03-mvp-spec.md` (acceptance criteria), `04-build-plan.md` (test plan).
- `knowledge/` for known failure modes to check proactively.

## Three kinds of testing

### 1. Correctness (objective, automated)
- Run `npm run lint`, `npm run test` (Vitest), `npm run build` — must be green.
- Run `npm run test:e2e` (Playwright) for the happy path; add e2e for each acceptance criterion
  that's UI-observable.
- **Engine simulation**: run many randomized full games to assert invariants never break
  (no illegal states, score conserved, game always terminates, win conditions fire correctly).
- Determinism check: same `{config, seed, action-log}` reproduces the same final state.

### 2. Visual playtest (Playwright + headless Chrome — the agent actually plays the game)

The QA agent drives the **running app** in headless Chromium via Playwright, plays through real
turns, and captures screenshots at every meaningful state. Because the agent is multimodal, it
then *looks at* those screenshots and judges them against `03-mvp-spec.md` **and the authoritative
rules manual** — catching UI and rules bugs that pass/fail assertions miss.

1. Serve the built app (`npm run build` then `npm run preview`, or `npm run dev`). Install the
   browser if needed (`npx playwright install chromium`).
2. Drive a full play-through with headless Chrome: setup → several turns including **deliberately
   illegal moves** → an end-game. For an AI title, play a game to completion against the AI; for a
   hot-seat title, alternate both seats. Screenshot each state (and on any error) into
   `projects/<slug>/playtest/round-<n>/`.
3. **Read the screenshots** and check each against the spec (screens/flow, required player
   feedback) and the rules manual:
   - Is the board rendered correctly? Components in the right places?
   - Is it clear whose turn it is? Are legal moves indicated? Are illegal moves rejected *with a
     visible reason*?
   - Is the score correct per the rules? Does the end/win screen fire correctly?
   - UI quality: overlapping/clipped elements, unreadable or off-palette text, broken layout at the
     target viewport(s), missing feedback.
4. Log every visual/rule discrepancy as a defect with the offending screenshot referenced.
5. **Suggest a concrete fix for each finding** (the file/area and the change) so the build agent
   can act on it directly in the iterate round — this stage proposes fixes, it doesn't just report.

### 3. Experience (qualitative)
- Walk the spec's acceptance criteria one by one; mark pass/fail, using the screenshots from the
  visual playtest as evidence.
- Heuristic read: is the core loop actually engaging? Where's the friction or confusion?
- Accessibility spot-check: keyboard operability, colorblind-safe tokens, text scaling.
- Note "not fun" findings — these matter as much as bugs.

## Output: `05-playtest-report.md`

- **Acceptance checklist**: every criterion from the spec → pass/fail + note.
- **Visual playtest findings**: per-screenshot observations (link `playtest/round-<n>/*.png`),
  spec/rules discrepancies, and UI problems — each with a **suggested fix**.
- **Defects**: ranked (blocker / major / minor), each reproducible, mapped to a concrete fix.
- **Experience findings**: usability/fun issues with suggested changes.
- **Automated results**: lint/test/build/e2e/simulation outcomes (paste key results).
- **Verdict**: `pass` (ready to ship) or `iterate` (with the prioritized fix list).

## The iterate loop

```
/test → report (iterate) → /build (revision, fixes the list) → /test → ... → report (pass) → GATE → ship
```

- On `iterate`, the operator feeds the prioritized list back to `/build` in revision mode.
- Each round is recorded in `project-state.json` history (round number, defects closed).
- Stop iterating when acceptance criteria all pass and no blocker/major defects remain. Minor
  issues can be accepted with a recorded human decision.

## Gate criteria

Advance to `shipped` when the human accepts the `pass` verdict. The operator then prompts `/learn`.
`shipped` is **not terminal** — a shipped title can re-enter `build → test → learn` for a polish
round (no re-spec), bumping its `version` each shipped round. See the post-ship polish loop in
`orchestration-and-gates.md`. Only `archived` is terminal.

## `/learn` — closing the loop (self-improvement)

`/learn` is **incremental**: run it on each shipped milestone (v1.0, then each polish round), not
once at end-of-life. Each run appends to `retrospective.md` and distills new lessons into the
knowledge base:

- **`retrospective.md`** (per project): what was built, time/rounds taken, what worked, what was
  painful, decisions we'd change, reusable assets produced — a dated section per shipped version.
- **Distillation** into `knowledge/`:
  - generalizable engineering patterns → `knowledge/patterns/`
  - process/market/spec lessons → `knowledge/playbooks/`
  - update `knowledge/index.md` so future agents can find them.
- Update `project-state.json` + `registry/projects.json` → `stage: shipped` and bump `version`.

This is the mechanism that makes the factory compound: the next project's agents crawl this
before they start, so each title ships faster and cleaner than the last.

## Self-learning hooks

- Recurring defects across projects → a checklist item the build agent runs proactively.
- Playtest heuristics that caught real problems → `knowledge/playbooks/playtest.md`.
