# Project: Cull the Crown

This is one board-game adaptation project inside the BoardGameMVPs factory. It is self-contained:
its state, stage artifacts, and `app/` code all live in this folder.

- **Slug:** cull-the-crown
- **Current stage/status:** see `project-state.json` (source of truth).
- **Factory rules:** the root `../../CLAUDE.md` and `../../docs/` govern how this project advances.

## What this is

A single-player **roguelike** mashup: **Regicide**'s tactical card-combat re-cast in a
**Balatro**-style run (a gauntlet of 12 royal "blinds", a between-fight shop, "joker"
guild-members/relics, and Tarot/Planet-style deck-manipulation consumables). "Cull the Crown" is
the original **working title**; the source titles *Regicide* and *Balatro* are trademarks and are
tracked internally only — never used to brand the app. See `02-market-analysis.md` for the IP
decision.

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

## Note on provenance

Brought into the factory with a user-supplied design blueprint; the early stages (discovery →
analysis) were run inline against that blueprint and the base **Regicide** rulebook
(`RegicideRulesA4.pdf`). The Legacy rulebook's relic/guild content is taken from the blueprint
(its PDF is image-only). Treat any external rating/market figure as `unverified` unless cited.
