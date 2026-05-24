# BoardGameMVPs

A **Claude Code-native software factory** that turns board games into playable digital
MVPs — web-first, then wrapped for desktop and mobile.

It finds candidate titles, analyzes their market position, writes an MVP spec, builds the
app, and playtests/iterates — running multiple projects in parallel with a human approval
gate between every stage.

> **Operating the factory?** Read [`CLAUDE.md`](CLAUDE.md) — that's the operator's manual.
> **Designing/understanding it?** Start at [`docs/00-architecture.md`](docs/00-architecture.md).

## The pipeline

| # | Stage | Command | Agent | Output |
|---|-------|---------|-------|--------|
| 1 | Discovery | `/find` | `game-scout` | `01-candidate-brief.md` |
| 2 | Analysis | `/analyze` | `market-analyst` | `02-market-analysis.md` |
| 3 | Specification | `/spec` | `spec-writer` | `03-mvp-spec.md`, `04-build-plan.md` |
| 4 | Build | `/build` | `mvp-builder` | `app/` + build notes |
| 5 | Test & iterate | `/test` | `qa-playtester` | `05-playtest-report.md` (loops to build) |

Plus orchestration commands: `/new-project`, `/status`, `/learn`.

A **gate** sits after every stage: the agent produces its artifact and stops; you approve to
advance or send feedback to revise. Nothing crosses a gate automatically.

## Repo layout

```
BoardGameMVPs/
├── CLAUDE.md                 # Operator's manual (auto-loaded by Claude Code)
├── README.md                 # You are here
├── docs/                     # The factory's specifications
├── .claude/
│   ├── agents/               # One subagent per stage
│   └── commands/             # Slash commands driving the pipeline
├── templates/                # Copied into each new project
├── knowledge/                # Accumulated, crawlable lessons (self-learning)
├── registry/
│   └── projects.json         # Index of all projects + state
└── projects/
    └── lacuna/               # First title (seeded)
```

## Quick start

```text
/new-project "Some Game"   # scaffold + register a new project
/find some-game            # (or seed manually) → candidate brief → GATE
/analyze some-game         # market analysis → GATE
/spec some-game            # MVP spec + build plan → GATE
/build some-game           # build the web MVP → GATE
/test some-game            # playtest report; iterate → GATE
/learn some-game           # distill retrospective into knowledge/
/status                    # see every in-flight project at a glance
```

## Tech the factory builds with

Web-first: **React + TypeScript + Vite**, **PixiJS** for board rendering, a **pure
framework-agnostic game engine** module, **Vitest** + **Playwright** for tests. Wrapped for
desktop via **Tauri** and mobile via **Capacitor** from the same codebase. Details in
[`docs/stack-and-conventions.md`](docs/stack-and-conventions.md).

## Self-learning

Finished projects don't just sit there — each ends with a retrospective that `/learn` distills
into [`knowledge/`](knowledge/). Every stage agent crawls that knowledge base (and prior project
folders) before starting, so the factory gets better with each title it ships.

## First title

[Lacuna](projects/lacuna/) — seeded manually as the proving-ground project.
