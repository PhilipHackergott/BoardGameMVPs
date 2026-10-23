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

## 3D concepts (the `render/` substrate can be 3D)

Most titles are 2D (Pixi or DOM). **Original video-game concepts** may need 3D — and the factory
supports it **without breaking any rule above**:

| Layer | 3D choice | Why |
|-------|-----------|-----|
| Board/scene rendering | **React Three Fiber** (Three.js + React) | Slots into the *exact* stack (Vite/TS/React/Zustand). The pure `engine/` is untouched; `render/` simply becomes an R3F `<Canvas>` instead of a Pixi scene. R3F beats Babylon.js *here* because Babylon isn't React-native. |
| Physics (if needed) | `@react-three/rapier` | Matured 2025; wraps Rapier. |
| Character controller | `ecctrl` | Drop-in first/third-person movement. |
| Helpers | `drei` | Cameras, loaders, controls, common abstractions. |

Rules that **still apply** to a 3D title:
- **Engine purity is unchanged.** Game/sim logic stays in pure `engine/`; the R3F scene only
  *projects* engine state to 3D and translates input to engine actions. Determinism + seeded RNG
  still required.
- **Lazy-load the 3D.** Three.js + R3F is a heavy bundle — boot the React shell first, then
  `React.lazy` the `<Canvas>`. For mobile: glTF + Draco compression, LOD, instancing.
- **The asset pipeline is the real constraint, not rendering.** The zero-asset model doesn't
  extend to 3D models/textures/animations. Use **CC0 low-poly packs** (Kenney, Quaternius, KayKit,
  Poly Haven) + **procedural primitive geometry** (build rooms/props from boxes/extrusions in code)
  + synthesized audio. A **stylized low-poly** look is in scope; **photoreal / bespoke character
  animation is out of scope** (needs an art team). Record `stack: "react-ts-r3f"`.

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
│   ├── sim/                # Vitest: headless AI-vs-AI balance sweep (`npm run sim`)
│   └── e2e/                # Playwright: load app, play a turn, assert UI
├── public/
└── README.md               # how to run/build/test/sim THIS app
```

Plus, alongside the stage artifacts (not under `app/`): **`projects/<slug>/art-direction.md`** — the
written design/art-direction doc that keeps every screen visually cohesive (palette tokens, the one
card/piece model, panel/modal/button recipes, an audit checklist). See `knowledge/playbooks/target-state.md`.

## Standard scripts (every `app/package.json`)

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:e2e": "playwright test",
    "lint": "eslint . && tsc --noEmit",
    "sim": "vitest run tests/sim"
  }
}
```

The build and test stages rely on these script names existing. Keep them stable. `sim` runs the
headless AI-vs-AI balance sweep (see `knowledge/playbooks/balance-and-tuning.md`); it's how the build
stage verifies content balance + the difficulty ladder without a browser.

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
- **Content is data-driven from day one**: a content registry + pure hooks read at fixed decision
  points, default-off ⇒ the base game. This is what makes a rich catalog affordable — see
  `knowledge/playbooks/content-depth.md` and `knowledge/patterns/engine.md`.
- **Visual cohesion is decided, not discovered**: commit an `art-direction.md` + a tokenized palette
  (`:root` for DOM and `render/theme.ts` for canvas) up front, and build shared UI primitives — ONE
  `<Modal>`/overlay shell + one card/piece component reused everywhere — before the individual screens.
  See `knowledge/playbooks/target-state.md`.

## Wrapping (defer until web MVP is approved)

The build stage produces a working web app first. Desktop (Tauri) and mobile (Capacitor)
configs are added only after the web MVP passes its gate, unless the project's `targets`
demand otherwise. Wrapping notes go in the build plan.
