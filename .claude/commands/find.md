---
description: Stage 1 Discovery — find candidates or evaluate a seeded title; produce a candidate brief.
argument-hint: <slug> | criteria (e.g. "2p abstract, light, no good app")
---

Run **discovery** for: $ARGUMENTS

As operator, follow `docs/orchestration-and-gates.md` routing:
1. If given a slug, load `projects/<slug>/project-state.json` and confirm it's at `discovery`.
   If given criteria with no project yet, surface/shortlist candidates first, then proceed on the
   chosen one (scaffold via the new-project flow if needed).
2. Delegate to the **game-scout** subagent (see `.claude/agents/game-scout.md`), passing the
   project path and a pointer to `knowledge/index.md`.
3. The agent writes `01-candidate-brief.md`, updates `project-state.json` (status →
   awaiting-approval) and `registry/projects.json`.
4. Relay the agent's verdict summary and the gate question: "Pursue this title (advance to
   analysis), or reject/replace?" Do not start analysis. Stop at the gate.
