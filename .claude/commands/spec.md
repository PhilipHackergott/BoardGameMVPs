---
description: Stage 3 Specification — produce the MVP product spec and engineering build plan.
argument-hint: <slug>
---

Run **specification** for project: $ARGUMENTS

As operator, follow `docs/orchestration-and-gates.md` routing:
1. Load `projects/<slug>/project-state.json`. Precondition: `stage: analysis` with the `analysis`
   gate `approved` and an `ip.decision` recorded (or this is a spec revision). If not, stop.
2. Delegate to the **spec-writer** subagent (`.claude/agents/spec-writer.md`), passing the
   project path, the brief + analysis, `docs/stack-and-conventions.md`, and `knowledge/`.
3. The agent writes `03-mvp-spec.md` and `04-build-plan.md`, updates state (status →
   awaiting-approval) and the registry. If the ruleset is ambiguous it will ASK rather than guess.
4. Relay the scope + plan summary and the gate question: "Is this the right MVP and the right
   plan to build it?" Do not start the build. Stop at the gate.
