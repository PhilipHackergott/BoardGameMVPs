# Stack & Code Conventions

The factory builds **web-first** and wraps the same codebase for desktop and mobile. This doc
is the contract every MVP's `app/` must follow so the build and test stages stay uniform and
the knowledge base stays transferable across projects.

## Target stack

| Layer | Choice | Why |
|-------|--------|-----|
| Language | **TypeScript** (strict) | One language across engine, UI, and tests. |
| Bundler/dev | **Vite** | Fast dev server, simple static build. |
| UI | **React** | Menus, lobby, HUD, settings — not the board itself. |
| Board rendering | **PixiJS** (2D canvas/WebGL) | Most board games are 2D with lots of sprites/animation; Pixi handles this far better than DOM. Use Phaser only if a title needs a full game loop/physics. |
| State (UI) | **Zustand** | Minimal store for UI/session state. Game state lives in the engine. |
| Game rules | **Pure TS `engine/` module** | Framework-agnostic, deterministic, headlessly testable, portable to every wrapper. |
| Unit/logic tests | **Vitest** | Fast, Vite-native; tests the engine exhaustively. |
| E2E/UI tests | **Playwright** | Drives the real web build for the playtest stage. |
| Desktop wrap | **Tauri** | Small binaries, Rust shell around the web app. |
| Mobile wrap | **Capacitor** | Wraps the same web build for iOS/Android. |
| Web deploy | Static host (any) | `vite build` → static assets. |

Deviations are allowed but must be **justified in the build plan** (`04-build-plan.md`) and,
if generally useful, written back to `knowledge/`.

## The engine/UI split (most important rule)

```
app/src/
├── engine/          # PURE. No React, no Pixi, no DOM, no I/O, no randomness w/o injected seed.
│   ├── state.ts     #   Game state types.
│   ├── rules.ts     #   reducer(state, action) -> state ; pure functions only.
│   ├── setup.ts     #   Initial state from config + seed.
│   ├── legalMoves.ts#   Move generation / validation.
│   └── index.ts     #   Public API of the engine.
├── ui/              # React components: menus, HUD, lobby, settings.
├── render/          # Pixi scene that draws engine state and emits actions.
├── ai/              # Optional opponent(s); consume engine only.
└── main.tsx         # Composition root: wires render + ui to engine.
```

Rules:
- The **engine never imports** from `ui/`, `render/`, React, or Pixi. Enforce with lint/path rules.
- The engine is **deterministic**: any randomness takes an injected seed, so games are
  replayable and tests are stable.
- UI/render are **thin**: they project engine state to pixels and translate input to engine
  actions. No game rules leak into components.
- This split is what makes the same code ship to web/desktop/mobile and makes rules testable
  without a browser.

## Per-project `app/` layout

```
projects/<slug>/app/
├── package.json
├── vite.config.ts
├── tsconfig.json           # strict: true
├── index.html
├── src/                    # (engine/ ui/ render/ ai/ main.tsx as above)
├── tests/
│   ├── engine/             # Vitest: rules, setup, legal moves, full-game simulations
│   └── e2e/                # Playwright: load app, play a turn, assert UI
├── public/
└── README.md               # how to run/build/test THIS app
```

## Standard scripts (every `app/package.json`)

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:e2e": "playwright test",
    "lint": "eslint . && tsc --noEmit"
  }
}
```

The build and test stages rely on these script names existing. Keep them stable.

## Conventions

- **Slugs** are lowercase kebab-case (`forest-shuffle`, not `Forest Shuffle`). Folder name =
  slug = registry key.
- **Determinism**: every game must be reconstructable from `{config, seed, action-log}`. This
  powers replay, debugging, and the playtest stage.
- **Accessibility floor**: keyboard-operable menus, colorblind-safe palette for game tokens,
  text scales. Cheap to do early, expensive to retrofit.
- **Local play in the MVP, no network required**: single device. Multiplayer-only games ship as
  hot-seat / pass-and-play; single-player games as vs-AI. *Online* multiplayer (servers, accounts,
  matchmaking) is the deferred piece — out of MVP scope unless a spec argues otherwise. Being a
  multiplayer game is never a reason to skip a title.
- **Assets**: original or properly licensed only. The board/components are reimplemented, not
  copied from the publisher's files. See `legal-and-ip.md`.

## Wrapping (defer until web MVP is approved)

The build stage produces a working web app first. Desktop (Tauri) and mobile (Capacitor)
configs are added only after the web MVP passes its gate, unless the project's `targets`
demand otherwise. Wrapping notes go in the build plan.
