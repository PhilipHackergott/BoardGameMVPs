# 00 — Architecture

## Purpose

A factory that converts game concepts into playable digital MVPs with minimal human effort,
while keeping a human in control at every decision point. It is optimized for **throughput
across many titles in parallel** and for **compounding improvement** — every shipped project
makes the next one cheaper to build.

Two intake tracks feed the same pipeline: **board-game adaptations** (digitize an existing
tabletop game) and **original video-game concepts** (a green-field design with no rulebook).
The stages and gates are identical; the original-concept track adds a Game Design Document as
the design foundation and may target a 3D substrate. See the root `CLAUDE.md` → "The
original-concept track".

## Design principles

1. **Stage = agent = command = artifact.** Each pipeline stage has exactly one subagent, one
   slash command that invokes it, and one durable artifact it produces. This 1:1:1:1 mapping
   keeps the system legible and debuggable.
2. **Gates over autonomy.** The factory is "fully automated" in execution but **never** in
   judgment. Every stage ends at a human gate. This is deliberate: board-game adaptation
   involves taste, legal risk, and market bets that should not be made unattended.
3. **Files are the database.** State lives in version-controllable JSON/Markdown, not a
   running service. Any project's full history is reconstructable by reading its folder.
4. **Projects are isolated.** Each title is a self-contained folder. Parallelism is free
   because projects never share mutable state (only the read-mostly `knowledge/` base).
5. **The repo is the training set.** The whole factory, including finished projects, is one
   crawlable corpus. Agents learn from it before acting. See `docs/05-test-iterate.md` and
   `knowledge/README.md`.
6. **Portable core.** Every MVP separates pure game logic (`engine/`) from presentation, so
   the same rules ship to web, desktop, and mobile. See `docs/stack-and-conventions.md`.

## Component map

```
┌─────────────────────────────────────────────────────────────────────┐
│ Operator session (Claude Code, root CLAUDE.md loaded)                 │
│   reads registry → routes /commands → enforces gates                  │
└───────────────┬───────────────────────────────────────────────────────┘
                │ invokes per-stage
        ┌───────▼────────┬────────────┬───────────────┬──────────────┐
        │ game-scout     │ market-    │ spec-writer   │ mvp-builder  │ qa-playtester
        │ (discovery)    │ analyst    │ (spec)        │ (build)      │ (test)
        └───────┬────────┴─────┬──────┴──────┬────────┴──────┬───────┴────┬─────
                │ writes       │             │               │            │
        ┌───────▼──────────────▼─────────────▼───────────────▼────────────▼─────┐
        │ projects/<slug>/   01..05 artifacts + app/ code + project-state.json   │
        └───────────────────────────────────┬───────────────────────────────────┘
                                             │ rolled up into
                                  ┌──────────▼───────────┐      ┌──────────────────┐
                                  │ registry/projects.json│◀────▶│ knowledge/  (R/W) │
                                  └────────────────────────┘      └──────────────────┘
```

## The five stages (summary)

| Stage | Question it answers | Doc |
|-------|---------------------|-----|
| 1. Discovery | "Which game should we adapt, and why this one?" | `01-discovery.md` |
| 2. Analysis | "Is there a market, and what's the competitive/IP picture?" | `02-analysis.md` |
| 3. Specification | "Exactly what MVP are we building, and how?" | `03-specification.md` |
| 4. Build | "Build it to the target state — finished-feeling, content-rich, tuned." | `04-build.md` |
| 5. Test & iterate | "Does it work and is it fun? What did we learn?" | `05-test-iterate.md` |

Cross-cutting concerns:
- **Orchestration, state, gates, parallelism** → `orchestration-and-gates.md`
- **Tech stack & code conventions** → `stack-and-conventions.md`
- **Rights & licensing** → `legal-and-ip.md`

## Lifecycle of one title

1. `/new-project "Title"` scaffolds `projects/<slug>/` from `templates/` and registers it.
2. `/find` (or a manual seed) produces a candidate brief → **gate**.
3. `/analyze` produces market analysis incl. an IP/rights decision → **gate**.
4. `/spec` produces the MVP spec + build plan → **gate**.
5. `/build` produces working `app/` code, web-deployable → **gate**.
6. `/test` produces a playtest report; iterate against build until it passes → **gate**.
7. `/learn` distills the retrospective into `knowledge/`; state → `shipped`.

## Non-goals (MVP of the factory)

- No central server, queue daemon, or web dashboard — the operator session + registry is enough.
- No automated publishing to app stores. Wrapping configs are produced; submission stays manual.
- No fully unattended runs. If you want lights-out batch processing, that's a later evolution
  layered on top — the gates stay.
