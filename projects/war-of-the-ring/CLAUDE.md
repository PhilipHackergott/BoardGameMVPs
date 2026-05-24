# Project: War of the Ring

This is one board-game adaptation project inside the BoardGameMVPs factory. It is self-contained:
its state, stage artifacts, and `app/` code all live in this folder.

- **Slug:** war-of-the-ring
- **Current stage/status:** see `project-state.json` (source of truth).
- **Factory rules:** the root `../../CLAUDE.md` and `../../docs/` govern how this project advances.

## Artifacts (created stage by stage)

| Stage | File |
|-------|------|
| 1 Discovery | `01-candidate-brief.md` |
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

## IP note (operator decision, recorded 2026-05-22)

The operator has decided this is an **unpublished, non-distributed personal prototype**, and to
implement the real *War of the Ring* / Tolkien Middle-earth IP and naming **directly** — no
neutral reskin, no swappable theme layer. `ip.status` is recorded as `clear` **on the basis of
non-distribution only**. This is not a license and not legal advice; if this app were ever to be
published or shared, the IP must be re-assessed (it would be `blocked` without a license — the
game is © Ares Games and the underlying world is Tolkien Estate / Middle-earth Enterprises IP).
