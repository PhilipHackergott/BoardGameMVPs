# Project: Roomies

This is one board-game adaptation project inside the BoardGameMVPs factory. It is self-contained:
its state, stage artifacts, and `app/` code all live in this folder.

- **Slug:** roomies
- **Current stage/status:** see `project-state.json` (source of truth).
- **Factory rules:** the root `../../CLAUDE.md` and `../../docs/` govern how this project advances.

## Artifacts (created stage by stage)

| Stage | File |
|-------|------|
| 1 Discovery | `01-candidate-brief.md` |
| 2 Analysis | `02-market-analysis.md` (waived — see brief) |
| 3 Specification | `03-mvp-spec.md`, `04-build-plan.md` |
| 4 Build | `app/` + `app/README.md` |
| 5 Test | `05-playtest-report.md` |
| Close | `retrospective.md` |

## Working in this folder

- Advance only via the stage commands (`/find /analyze /spec /build /test /learn`) — each stops at
  a human gate. Never skip or bundle stages.
- The `app/` follows `../../docs/stack-and-conventions.md` (pure `engine/` + thin UI/render).
- Keep `project-state.json` and the root `registry/projects.json` in sync after every change.

## Note on origin

**Roomies is an original design supplied by the user** (the factory operator), not an adaptation of a
third party's published game. Discovery and market analysis were therefore short-circuited: the
candidate brief records the design as given, `ip.status` is `clear` (original work), and no
third-party market study was performed. The spec is the first substantive artifact.

The source design specifies **components and a scoring engine** in full but leaves the **game flow**
(draft model, rounds, turn order, win condition) and **biome scoring** undefined. The spec designs
these explicitly; every invented rule is flagged `⚑` and listed for confirmation at the spec gate.
