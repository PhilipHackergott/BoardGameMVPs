# Project: Food Chain Magnate

This is one board-game adaptation project inside the BoardGameMVPs factory. It is self-contained:
its state, stage artifacts, and `app/` code all live in this folder.

- **Slug:** food-chain-magnate
- **Current stage/status:** see `project-state.json` (source of truth).
- **Factory rules:** the root `../../CLAUDE.md` and `../../docs/` govern how this project advances.

## Artifacts (created stage by stage)

| Stage | File |
|-------|------|
| 1 Discovery | `01-candidate-brief.md` |
| 2 Analysis | `02-market-analysis.md` |
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

## IP note (operator decision, recorded 2026-05-25)

The operator has decided this is an **unpublished, non-distributed personal prototype**, and to
implement the real *Food Chain Magnate* IP and naming **directly** — no neutral reskin. `ip.status`
is recorded as `clear` **on the basis of non-distribution only** (the same basis as War of the
Ring). This is not a license and not legal advice; if this app were ever to be published or shared,
the IP must be re-assessed (it would be `blocked` without a license — the game is © Splotter
Spellen, designed by Jeroen Doumen & Joris Wiersinga).
