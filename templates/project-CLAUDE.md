# Project: {{TITLE}}

This is one project inside the BoardGameMVPs factory — either a board-game adaptation or an
original video-game concept (`source` in `project-state.json` says which; original concepts also
carry a `game-design-document.md`). It is self-contained: its state, stage artifacts, and `app/`
code all live in this folder.

- **Slug:** {{SLUG}}
- **Current stage/status:** see `project-state.json` (source of truth).
- **Factory rules:** the root `../../CLAUDE.md` and `../../docs/` govern how this project advances.

## Artifacts (created stage by stage)

| Stage | File |
|-------|------|
| 1 Discovery | `01-candidate-brief.md` |
| 2 Analysis | `02-market-analysis.md` |
| Design (original concepts only) | `game-design-document.md` |
| 3 Specification | `03-mvp-spec.md`, `04-build-plan.md` |
| 4 Build | `app/` + `app/README.md` + `art-direction.md` (visual-cohesion design doc) |
| 5 Test | `05-playtest-report.md` |
| Close | `retrospective.md` |

The build target is the "definition of done" in `../../knowledge/playbooks/target-state.md`:
finished-feeling, content-rich, and tuned on the first build — not a flat, thin slice.

## Working in this folder

- Advance only via the stage commands (`/find /analyze /spec /build /test /learn`) — each stops at
  a human gate. Never skip or bundle stages.
- The `app/` follows `../../docs/stack-and-conventions.md` (pure `engine/` + thin UI/render).
- Keep `project-state.json` and the root `registry/projects.json` in sync after every change.
