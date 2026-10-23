# Food Chain Magnate — app

Web-first digital MVP of *Food Chain Magnate* (real-IP, **non-distributed personal prototype** — do
not distribute). Built per `../03-mvp-spec.md` + `../04-build-plan.md`, milestone by milestone.

## Run

```bash
npm install
npm test         # vitest — the engine test suite (headless)
npm run lint     # tsc --noEmit (strict)
npm run dev      # vite dev server (UI shell lands at M5; until then the engine is headless)
npm run build    # tsc --noEmit && vite build
npm run sim      # AI-vs-AI balance sweep (arrives at M4; tests/sim/ not present yet)
```

## Architecture (per `../../../docs/stack-and-conventions.md`)

- **`src/engine/`** — pure, deterministic, framework-agnostic game logic. No React/Pixi/DOM/IO; the
  only randomness is a seeded PRNG used at setup. Everything is reconstructable from `{config, seed}`
  plus the (scripted, later actioned) turn inputs. The UI/AI consume only `src/engine/index.ts`.
- **`src/render/`** (Pixi) + **`src/ui/`** (React/DOM) — the two-zone substrate from the spec
  (Pixi City board / DOM company layer). Arrives at M5.
- **`tests/engine/`** — Vitest specs. (`tests/sim/` = the AI balance sweep, M4. `tests/e2e/` =
  Playwright, M5.)

## Milestone status — M1→M8 built (see `../build-report.md`)

- **M1 ✅** sell loop (map/distance, Dinnertime resolution, pricing, payday, bank two-break end).
- **M2 ✅** company: employee registry + training tree, org-chart capacity, working actions, job market, 7-phase machine.
- **M3 ✅** marketing (footprints + demand) + all 18 milestones (hook vocabulary).
- **M4 ✅** full-turn orchestrator + heuristic AI (tiers + personalities) + `npm run sim` sweep. *(AI ladder is flat — tuning debt.)*
- **M5 ✅** playable UI vs AI: DOM + **SVG board** (D4 fallback), menu/setup/shell/end; Playwright happy-path.
- **M6 ✅ (partial)** synth Web Audio + mute. *(Pause/Settings/Continue/history not built.)*
- **M7 ⚙ engine-only** campaign objectives + scenarios + `applyScenario` + medals, tested. *(Campaign UI not wired.)*
- **M8 ✅** acceptance: 62 Vitest + 2 Playwright + clean build, all green.

**Verified:** `npm test` 62 pass · `npm run sim` terminating/legal/reproducible · `npm run test:e2e` 2 pass · `npm run build` clean.
Known gaps + decisions: `../build-report.md`.
