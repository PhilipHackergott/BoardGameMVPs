---
description: Stage 2 Analysis — assess market, competition, audience, and IP for a candidate.
argument-hint: <slug>
---

Run **analysis** for project: $ARGUMENTS

As operator, follow `docs/orchestration-and-gates.md` routing:
1. Load `projects/<slug>/project-state.json`. Precondition: `stage: discovery` with the
   `discovery` gate `approved` (or this is an analysis revision). If not met, explain and stop.
2. Delegate to the **market-analyst** subagent (`.claude/agents/market-analyst.md`), passing the
   project path, the candidate brief, and `knowledge/index.md`.
3. The agent writes `02-market-analysis.md`, sets `ip.status` with reasoning, updates state
   (status → awaiting-approval) and the registry.
4. Relay the verdict + IP picture and the gate question: "Is the case strong enough to spec an
   MVP? Confirm the IP decision." When the human confirms, record `ip.decision`, `decided_by`,
   and `date` in `project-state.json`. Do not start specification. Stop at the gate.
