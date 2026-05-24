---
description: Close the loop — write the project retrospective and distill lessons into the knowledge base.
argument-hint: <slug>
---

Run **learn** for project: $ARGUMENTS

As operator:
1. Load `projects/<slug>/project-state.json`. Expected at `test` (passed) heading to `shipped`,
   or being `archived`.
2. Delegate to the **qa-playtester** subagent (`.claude/agents/qa-playtester.md`) in its `/learn`
   mode: write `projects/<slug>/retrospective.md`, then distill generalizable lessons into
   `knowledge/patterns/*` (engineering) and `knowledge/playbooks/*` (process/market/spec/playtest),
   and update `knowledge/index.md` so future agents can find them.
3. Set `stage: shipped` (or `archived`) in `project-state.json` and the registry.
4. Report what was added to the knowledge base. This is how the factory compounds — be specific
   about what the next project should reuse or avoid.
