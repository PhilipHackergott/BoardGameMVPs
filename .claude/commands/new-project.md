---
description: Scaffold and register a new board-game adaptation project from templates.
argument-hint: "Game Title"
---

Create a new project for the title: **$ARGUMENTS**

Steps (you are the operator — follow `docs/orchestration-and-gates.md`):
1. Derive a lowercase kebab-case `slug` from the title (e.g. "Forest Shuffle" → `forest-shuffle`).
   If `projects/<slug>/` already exists, stop and report it.
2. Create `projects/<slug>/` and copy the templates from `templates/` into it:
   - `project-CLAUDE.md` → `projects/<slug>/CLAUDE.md`
   - `project-state.json` → `projects/<slug>/project-state.json`
   - `01-candidate-brief.md` (stub) → `projects/<slug>/01-candidate-brief.md`
3. Fill in `project-state.json`: `slug`, `title`, `created`/`updated` = today, `stage: discovery`,
   `status: in-progress`, `source: manual-seed`, default `targets`, `stack: react-ts-pixi`,
   `ip.status: unknown`. Append a `created` history entry.
4. Add an entry to `registry/projects.json` (create the file if missing) and bump its `updated`.
5. Report the new project path and tell the user the next step is `/find <slug>` (or to seed the
   candidate brief manually). Do not run discovery automatically — stop here.
