# Project: TCG Circuit (working title)

This is one **original game concept** project inside the BoardGameMVPs factory (not a board-game
adaptation — see the concept note in `01-candidate-brief.md`). It is self-contained: its state,
stage artifacts, and `app/` code all live in this folder.

- **Slug:** tcg-circuit (provisional working codename — renameable)
- **Working title:** "TCG Tournament Simulator"
- **Current stage/status:** see `project-state.json` (source of truth).
- **Factory rules:** the root `../../CLAUDE.md` and `../../docs/` govern how this project advances.

## What this is

A simulator of the **physical trading-card-game scene**: collecting cards, buying/selling singles
online, building decks, chasing new pack releases, and traveling to tournaments (locals → majors)
as a teenager/college student — wrapped around an **original, playable TCG**. Framed as a
**career story**: discover the game as a kid → grind the local scene → climb to the **World
Championship** and become famous in the scene.

**Direction (2026-05-25): 2D, not 3D.** Rendered as an **old-school top-down JRPG** (Pokémon-/
Mother-style): an overworld you walk, with explorable locations — your **local card shop**, **school**,
**uni**, **tournament venues** (locals → regionals → nationals → Worlds), home, online marketplace.
This is cheaper, more content-scalable, and lets us model the *whole scene* as places you visit. The
TCG duels are a dedicated 2D card-battle screen.

**IP line (hard):** the TCG must be **100% original** — original cards, mechanics, art, and brand.
No Magic/Pokémon/Yu-Gi-Oh card text, names, art, or trademarks, ever. Confirmed at analysis.

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
  Substrate: **2D Pixi** (`react-ts-pixi`) — top-down JRPG overworld + a 2D card-duel screen. The
  3D idea was dropped (2026-05-25) in favour of the more content-scalable, location-rich 2D RPG framing.
- Keep `project-state.json` and the root `registry/projects.json` in sync after every change.
