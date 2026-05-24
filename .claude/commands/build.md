---
description: Stage 4 Build — build the smallest playable, correct web MVP (or run a revision round).
argument-hint: <slug>
---

Run **build** for project: $ARGUMENTS

As operator, follow `docs/orchestration-and-gates.md` routing:
1. Load `projects/<slug>/project-state.json`. Preconditions:
   - `stage: specification` with the `specification` gate `approved` (or this is a build revision
     driven by a `05-playtest-report.md`).
   - `ip.status` is `clear`, OR `risky` WITH a recorded `ip.decision`. If neither → set
     `status: blocked`, explain what's needed (an IP decision), and stop. Do not build.
2. Delegate to the **mvp-builder** subagent (`.claude/agents/mvp-builder.md`), passing the spec,
   build plan, `docs/stack-and-conventions.md`, and `knowledge/patterns/*`.
3. The agent scaffolds/extends `projects/<slug>/app/`, builds engine-first with tests, then
   render/UI/AI, and self-verifies (lint, test, build, run). It records build notes + known gaps.
4. For long builds you may run the agent in the background so other projects' gates can advance.
5. Relay what was built/deferred and the gate question: "Is the MVP good enough to playtest?"
   Do not start testing. Stop at the gate.
