---
description: Stage 4 Build — build a finished-feeling, content-rich, tuned web game to the target state (or run a revision round).
argument-hint: <slug>
---

Run **build** for project: $ARGUMENTS

As operator, follow `docs/orchestration-and-gates.md` routing:
1. Load `projects/<slug>/project-state.json`. Preconditions:
   - `stage: specification` with the `specification` gate `approved` (or this is a build revision
     driven by a `05-playtest-report.md`).
   - `ip.status` is `clear`, OR `risky` WITH a recorded `ip.decision`. If neither → set
     `status: blocked`, explain what's needed (an IP decision), and stop. Do not build.
2. Run the **mvp-builder** flow (`.claude/agents/mvp-builder.md`) against the spec, build plan,
   `docs/stack-and-conventions.md`, `knowledge/patterns/*`, and **`knowledge/playbooks/target-state.md`
   (the definition of done — read first)**. Per the standing preference, do this **inline** unless the
   user asks for a subagent.
3. The flow scaffolds/extends `projects/<slug>/app/`, builds engine-first **with the content spine**,
   writes `art-direction.md` + the shared `<Modal>`/atoms, then fills the **full content catalog**, the
   **AI difficulty ladder**, the feel/sound/shell, and a **balance harness + first tuning pass**. It
   self-verifies (lint, test, build, **sim**, run + the target-state pre-gate self-check) and records
   build notes + the balance note + known gaps.
4. For long builds you may run it in the background so other projects' gates can advance.
5. Relay what was built/deferred (at the *module* level) + the balance note, and the gate question:
   "Is the MVP good enough to playtest?" Do not start testing. Stop at the gate.
