# Project: Lacuna

This is the factory's first board-game adaptation project (manually seeded). It is
self-contained: its state, stage artifacts, and `app/` code all live in this folder.

- **Slug:** lacuna
- **Current stage/status:** see `project-state.json` (source of truth).
- **Factory rules:** the root `../../CLAUDE.md` and `../../docs/` govern how this project advances.

## Artifacts (created stage by stage)

| Stage | File |
|-------|------|
| 1 Discovery | `01-candidate-brief.md` (seeded stub — facts unverified) |
| 2 Analysis | `02-market-analysis.md` |
| 3 Specification | `03-mvp-spec.md`, `04-build-plan.md` |
| 4 Build | `app/` + `app/README.md` |
| 5 Test | `05-playtest-report.md` |
| Close | `retrospective.md` |

## Working in this folder

- Advance only via the stage commands (`/find /analyze /spec /build /test /learn`) — each stops at
  a human gate. Never skip or bundle stages.
- The `app/` follows `../../docs/stack-and-conventions.md` (pure `engine/` + thin UI/render).
- Keep `project-state.json` and the root `registry/projects.json` in sync after every change.

## Note on Lacuna facts

This was seeded by hand. Do **not** treat any rules, ratings, designer, or publisher data as
confirmed until the analysis stage verifies them from a source. The candidate brief stub
currently marks these as `unverified` on purpose.
