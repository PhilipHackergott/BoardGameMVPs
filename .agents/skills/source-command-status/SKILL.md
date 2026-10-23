---
name: "source-command-status"
description: "Show every in-flight project, its stage/status, and which ones are waiting on you."
---

# source-command-status

Use this skill when the user asks to run the migrated source command `status`.

## Command Template

Show the factory board.

1. Read `registry/projects.json`. If a project's registry entry looks stale, reconcile it against
   that project's `project-state.json` (state file wins; fix the registry).
2. Print a table: slug | title | stage | status | ip | updated.
3. Then call out the **action queue** — the projects with `status: awaiting-approval` (a gate is
   waiting on the human) and any with `status: blocked` (and why). For each, state the exact next
   command (e.g. "Lacuna: discovery awaiting approval → review `01-candidate-brief.md`, then
   `/analyze lacuna`").
4. Keep it scannable. This is the operator's at-a-glance view across parallel projects.
