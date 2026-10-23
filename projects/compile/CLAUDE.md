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

## Provenance & the card data

- Brought in from the user's **rulebook PDF** (`compile-main-1-rulebook.pdf`); the extracted text is
  kept here as `rulebook-extracted.txt`. The PDF defines the **full rules system** but **no card texts**.
- **The card-data gap is now RESOLVED by web research** (2026-05-26). All 72 cards' real **names,
  values, and box texts** were sourced and cross-checked against the official rulebook + BGG — see
  **`card-reference.md`** for the full data, citations, and the `[VERIFY]` checklist. They are
  encoded in `app/src/engine/cards.ts`.
- Remaining gap is **effect-logic fidelity**, not data: 24/72 effects run faithfully; the other 48
  have real text but a **simplified** effect (tagged `SIMPLIFIED` / `placeholder: true`) pending new
  runtime primitives. Closing that is a **build-stage** task (see `app/README.md` + `card-reference.md`).
- Treat any external rating/market figure as `unverified` (no analysis stage was run).

## Artifacts

| Stage | File |
|-------|------|
| 4 Build | `app/` + `app/README.md` |
| (ref) | `card-reference.md` — the sourced 72-card data + citations + `[VERIFY]` checklist |
| (ref) | `rulebook-extracted.txt` — text dump of the user's rulebook PDF |

Discovery/analysis/spec artifacts were intentionally skipped at the user's direction.

## Working in this folder

- The `app/` follows `../../docs/stack-and-conventions.md`: a pure, unit-tested `engine/` and a thin
  `render/` + `ui/` that consume it. Game rules never live in the UI.
- Card data (names/values/texts) lives in `app/src/engine/cards.ts`; the sourced reference is
  `card-reference.md`. Raising effect-logic fidelity beyond the current 24/72 means extending the
  runtime (`engine/*`), which is a build-stage change, not a data edit.
- Keep `project-state.json` and the root `registry/projects.json` in sync after every change.

## IP note

Compile © 2024 Flat River Group, LLC. This is a faithful, user-directed personal adaptation that
uses the real title and protocol names — **higher IP exposure than a mechanics-only reskin**. Fine
as an internal prototype; a public/commercial release would need a licensing decision (see
`../../docs/legal-and-ip.md`). Recorded in `project-state.json` as `ip: risky`.
