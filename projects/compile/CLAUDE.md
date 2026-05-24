# Project: Compile

One board-game adaptation project inside the BoardGameMVPs factory. Self-contained: state, stage
artifacts, and `app/` code live in this folder.

- **Slug:** compile
- **Current stage/status:** see `project-state.json` (source of truth).
- **Factory rules:** the root `../../CLAUDE.md` and `../../docs/` govern how this project advances.

## What this is

A **1:1 digital adaptation** of *Compile: Main 1* (Greater Than Games / Flat River Group, designer
Michael Yang) — two rogue AIs racing to compile three protocols. Built **directly to build stage on
the user's instruction** (discovery/analysis/spec deliberately skipped; "the game is quite simple,
implement 1:1"). **Hot-seat multiplayer + Easy/Medium/Hard AI.** Look: futuristic neon-arcade
(synthwave), techniques borrowed from `../cull-the-crown`.

## Provenance & the card-data gap

- Brought in from the user's **rulebook PDF** (`compile-main-1-rulebook.pdf`); the extracted text is
  kept here as `rulebook-extracted.txt`.
- The PDF defines the **full rules system** but **no individual card texts**. Per the user's choice
  ("I'll provide data"), the engine + UI + draft + AI are built against a documented card schema and
  ship with **clearly-flagged placeholder cards**. Dropping in the published 72-card data
  (`app/src/engine/cards.ts` only) makes it truly 1:1. See `app/README.md`.
- Treat any external rating/market figure as `unverified` (no analysis stage was run).

## Artifacts

| Stage | File |
|-------|------|
| 4 Build | `app/` + `app/README.md` |
| (ref) | `rulebook-extracted.txt` — text dump of the user's rulebook PDF |

Discovery/analysis/spec artifacts were intentionally skipped at the user's direction.

## Working in this folder

- The `app/` follows `../../docs/stack-and-conventions.md`: a pure, unit-tested `engine/` and a thin
  `render/` + `ui/` that consume it. Game rules never live in the UI.
- The single file to edit for card fidelity is `app/src/engine/cards.ts`.
- Keep `project-state.json` and the root `registry/projects.json` in sync after every change.

## IP note

Compile © 2024 Flat River Group, LLC. This is a faithful, user-directed personal adaptation that
uses the real title and protocol names — **higher IP exposure than a mechanics-only reskin**. Fine
as an internal prototype; a public/commercial release would need a licensing decision (see
`../../docs/legal-and-ip.md`). Recorded in `project-state.json` as `ip: risky`.
