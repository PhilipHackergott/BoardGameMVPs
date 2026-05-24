---
description: Stage 5 Test — verify the MVP is correct and fun; produce a playtest report and drive iteration.
argument-hint: <slug>
---

Run **test/iterate** for project: $ARGUMENTS

As operator, follow `docs/orchestration-and-gates.md` routing:
1. Load `projects/<slug>/project-state.json`. Precondition: `stage: build` with the `build` gate
   `approved` (or a follow-up test round). If not, stop.
2. Delegate to the **qa-playtester** subagent (`.claude/agents/qa-playtester.md`), passing the
   `app/`, the spec's acceptance criteria, and the build plan's test plan.
3. The agent runs automated checks (lint/test/build/e2e + randomized full-game simulations +
   determinism), then a **visual playtest** — driving the running app in Playwright headless
   Chrome, screenshotting each state into `projects/<slug>/playtest/round-<n>/`, and checking the
   screenshots against the spec and rules manual for UI/rule bugs — and a heuristic experience
   pass. It writes `05-playtest-report.md` with suggested fixes and a verdict (`pass` | `iterate`
   + prioritized fixes), and updates state + registry.
4. If `iterate`: relay the prioritized fix list; the next step is `/build <slug>` in revision mode,
   then `/test <slug>` again. Record each round.
5. If `pass`: relay results and the gate question: "Ship it (mark shipped + /learn), or iterate
   again?" Stop at the gate.
