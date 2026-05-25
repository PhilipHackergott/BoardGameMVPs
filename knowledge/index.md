# Knowledge Index

The crawl entrypoint. Agents read this first. Keep it curated and current — link to the best
examples, don't list everything.

_Filling in as projects ship via `/learn`. First title through: **Lacuna**._

## Patterns (engineering)
- [Engine patterns](patterns/engine.md) — reusable state shapes & reducers per mechanic.
- [AI patterns](patterns/ai.md) — opponent approaches per game type.
- [Build gotchas](patterns/build-gotchas.md) — recurring pitfalls (e.g. Pixi + React lifecycle).
- [Presentation FX](patterns/presentation-fx.md) — a **reusable game-feel kit** (springs, particles,
  trauma shake, staggered text pops) for PixiJS; drop-in `fx/` folder + the cascade/lifecycle wiring
  that makes it sing (first built in **Cull the Crown**). Also the **DOM-only juice recipe** for
  card/tableau games with no canvas (animated CSS backdrop, Web-Animations-API card flights, emoji
  art) — from **Roomies**.
- [IP precedents](patterns/ip-precedents.md) — how specific publishers/designers tend to react.

## Playbooks (process)
- ⭐ [Target state](playbooks/target-state.md) — **read first before any build.** The definition of
  "done": the six-row bar (correct core · finished feel · not-a-demo · content-rich · a real opponent ·
  tuned) + the milestone shape that **collapses the polish/content/balance waves into the first build**.
  Also: commit a **design/art-direction doc** + **reusable UI primitives (one `<Modal>` shell)** before
  filling screens. Distilled from the days of hand-driven iteration on Cull the Crown + Lacuna.
- ⭐ [UI architecture](playbooks/ui-architecture.md) — **decide the rendering substrate (DOM vs canvas)
  in the build plan, then build the reusable UI kit *in that substrate* from milestone 2.** The costly
  mistake to design out: building DOM-first then migrating to Pixi piece by piece (CTC did exactly this —
  felt → sidebar → HUD → cards → every modal, extracting the kit only at the end). If the look is
  canvas-native pixel-art, the **Pixi kit** (`render/ui/`: living-text typeface, button, `ModalStage`,
  tokens; each modal mounts its own full-window app) is the milestone-2 deliverable, exactly as the DOM
  `<Modal>` is for DOM games. Companion to Target-state §"Reusable UI primitives".
- [Content depth](playbooks/content-depth.md) — **the catalog is the product.** Ship the full base
  content set, data-driven (a registry + fixed hook points, default-off ⇒ base game) so depth is
  additive; the categories that pay off (run-variants, tiered progression, rarity/downside/scaling
  pieces, events, orthogonal axes); map the design axes and open the empty ones. (CTC + Lacuna.)
- [Balance & tuning](playbooks/balance-and-tuning.md) — **let the AI playtest the content for you.**
  A headless AI-vs-AI sim (`npm run sim`) → win-rate sweeps → compress the spread; verify the difficulty
  ladder climbs; the patch→re-sim loop. The two traps: **balance is relative to AI skill** (re-tune
  against the AI you ship; don't over-fit noise) and **AI-blind content reads low for the wrong reason**
  (fix the AI or flag for `/test`, don't buff it broken). (Lacuna's `07-balance-report.md`.)
- [Discovery](playbooks/discovery.md) — what kinds of games adapt well.
- [Market](playbooks/market.md) — recurring market/positioning patterns.
- [Spec](playbooks/spec.md) — spec practices that kept builds tight.
- [Playtest](playbooks/playtest.md) — heuristics that caught real problems.
- [Visual first-try](playbooks/visual-first-try.md) — **make the MVP look intentional on the first
  build, not flat-then-polished.** Checklist + principles: themed living background (#1 win),
  **outcomes are beats not cuts** (no auto-switch; Continue/Claim screens that show what changed),
  **surface plan-relevant state redundantly**, grow+blink forced choices, verify real input. Read
  with [Presentation FX](patterns/presentation-fx.md) before building any UI. The checklist now also
  covers **sound** and the **shell** (below) — a game that's silent or boots straight into play reads
  as a demo no matter how good the board looks. **Plus the "UI detail craft" notes** — the rework the
  user kept asking for round after round, generalised: focal hierarchy (the central target is the most
  present element), **one model at one size everywhere**, **size up + sharpen text (resolution 2–3) +
  per-character "living-text" wiggle**, budget panels for wrapped text, colour-code state, controls
  beside what they act on, 2.5D stacks.
- [Audio & sound](playbooks/audio-and-sound.md) — **ship games that aren't silent**, IP-clean and
  zero-asset: a synthesized Web Audio engine (looping music + SFX kit), a Music/SFX **volume mixer** +
  mute, wired to game events. The hard rules: gesture-gate, double-gate mute, **pin the engine to
  `globalThis` or HMR spawns uncontrollable duplicate loops**, persist settings. (Cull the Crown.)
- [Front-of-house shell + persistence](playbooks/front-of-house-shell.md) — the menu/pause/settings/
  rules layer + **save/continue/past-runs** that makes an MVP read as a finished game (all DOM, nearly
  identical between games): main menu w/ Continue, a Pause screen that **freezes the board**, a
  settings mixer, autosave to localStorage off the serializable game state. (Cull the Crown.)

## Reference projects (best examples to copy)
- **Lacuna** (`projects/lacuna/`) — web MVP, React + TS + PixiJS v8, pure seeded engine; 2–4
  players, chess clock, configurable AI opponents, and **two orthogonal variant axes** (a
  special-powers draft + colour affinities). Best bits to copy:
  - Pure engine + seeded RNG + simulation/replay tests: `app/src/engine/`, `app/tests/engine/`.
  - Dev-seam to e2e a canvas game: `app/src/main.tsx` + `app/tests/e2e/playtest.spec.ts`.
  - Memoized PixiJS renderer (blur+mask lens, dashed overlays): `app/src/render/board.ts`.
  - Data-driven variant spine — two stacking axes (powers + affinities), default-off ⇒ base game:
    `app/src/engine/{powers.ts,effects.ts}`.
  - **Unified mid-turn sub-phase resolver** (`finishOrStay` keeps the turn on the current player
    until every pending sub-phase clears): `app/src/engine/rules.ts`.
  - **AI as pure choosers dispatched through the real store actions** (low heuristic+jitter /
    medium greedy estimate / hard estimate−rival), made *watchable* via a two-beat move + pause
    gate: `app/src/ai/ai.ts` + driver in `app/src/ui/App.tsx`.
  - Reusable pile→pile **inter-player transfer animation** (optional `fromPlayer` on a Flight):
    `app/src/state/store.ts` + `app/src/ui/FlyLayer.tsx`.
  - **Game log by action-log replay** (reconstruct from `seed`+`config`, re-apply `state.log`,
    attribute each step to `current`): `app/src/ui/LogModal.tsx`.
  - Retrospective: `projects/lacuna/retrospective.md`.
- **Magical Athlete** (`projects/magical-athlete/`, **shipped** — all 36 powers, `/test` passed) — **the**
  example for *interacting variable-player powers* (Cosmic-Encounter-style). Best bits to copy:
  - Pure, data-driven trigger/effect resolver with resolution order + loop-break:
    `app/src/engine/{resolve.ts,powers.ts}`; the rulebook's worked example as a test:
    `app/tests/engine/powers.test.ts`.
  - **Optional-power prompt pause/resume** (`beginTurn`/`resumeTurn` + `pending`/`resolvePrompt`) and
    **post-turn reaction prompts** for reactive powers (Suckerfish/Duelist) — see `patterns/engine.md`.
  - Serializable seeded RNG threaded through actions: `app/src/engine/rng.ts`.
  - Asset-manifest seam (slot in licensed art later, placeholder fallback): `app/src/assets/manifest.ts`.
  - Perspective-loop 2.5D Pixi board with standees: `app/src/render/board.ts`.
  - **Screenshot-driven visual playtest** (`data-testid`s + phase loop): `app/tests/e2e/playtest.spec.ts`
    (→ `playbooks/playtest.md`). Plus Build-Gotchas (Vitest/Vite `tsc` clash; Pixi v8 async-init guard)
    and Spec lessons (parameterize unstated component values; test the rulebook's worked example).
  - Report + retrospective: `projects/magical-athlete/05-playtest-report.md`, `retrospective.md`.
- **Cull the Crown** (`projects/cull-the-crown/`, in build) — **the** example for *presentation,
  game-feel, flow, sound & the front-of-house shell* (a Regicide × Balatro roguelike,
  8-bit arcade-medieval). Best bits to copy:
  - **Audio** — a synthesized, IP-clean Web Audio engine (music loop + full SFX kit + Music/SFX
    volume mixer + mute), wired to game events: `app/src/audio/chiptune.ts` + `ui/SettingsMenu.tsx`
    (→ `playbooks/audio-and-sound.md`).
  - **Front-of-house shell + run persistence** — main menu (Continue/New run/Past runs/Settings/Rules),
    a Pause screen that **freezes the board**, autosave/continue/past-runs off the serializable
    `RunState`: `app/src/ui/{App,PauseMenu,SettingsMenu,PastRunsOverlay}.tsx` + `store.ts`
    (→ `playbooks/front-of-house-shell.md`).
  - The shared **`fx/` juice kit** (springs, particles, trauma shake, staggered pops, plasma bg):
    `app/src/fx/` — game-agnostic, copy wholesale.
  - **Themed 8-bit board** (low-res nearest-upscale, pixel fonts, CRT cabinet, 2.5D pointer-tilt
    cards, enemy attack animation, deck/discard piles): `app/src/render/{theme,cardNode,combatStage}.ts`.
  - **Outcomes are beats, not cuts** — engine defers win/loss (`combat.outcome` + `advance`), UI shows
    a Continue/**Claim** gate with an itemised reward + **coin-to-purse** animation; legible death:
    `app/src/engine/{combat,run}.ts` + `ui/{CombatGate,TransitionLayer}.tsx` + `store.ts`.
  - **State legibility** (immune suit on the actor + per-card ⊘ + point-of-play warning), **drag-to-
    play/block**, **stage-level geometry input** (Pixi hit-test is unreliable): `render/combatStage.ts`.
  - **Tutorial + tooltips**, **real-pointer e2e**, screenshot-driven visual iteration:
    `ui/HelpOverlay.tsx`, `tests/e2e/{look,input}.spec.ts`.
  - Retrospective: `projects/cull-the-crown/retrospective.md`. Read with `playbooks/visual-first-try.md`.
- **Roomies** (`projects/roomies/`, in build — round 2 at the build gate) — **the** example for a
  **card drafting + tableau game done DOM-only** (no Pixi) and for **two-phase rounds**. Best bits to copy:
  - **Two-phase round engine** (`phase: "draft" | "place"`) with a per-player **`pool`** intermediate
    zone; pick-and-pass draft where **hand swaps/rotations are deferred to the pick-round boundary**
    (the Marty empty-hand bug — caught by the full-game simulation): `app/src/engine/{types,setup,rules}.ts`.
  - **Pure-DOM "juice"** — animated CSS backdrop (`ui/Backdrop.tsx`), **card flights via the Web
    Animations API** generalized to any card by `{from,toSel,glyph}` (`ui/FlyLayer.tsx` + `state/store.ts`),
    phase banners + confetti (`ui/{App,EndScreen}.tsx`), **emoji-glyph art** (`ui/cardText.ts`), cozy
    glass theme (`styles.css`). Full recipe: `patterns/presentation-fx.md` ("DOM-only juice").
  - **Spec lessons**: card timing-keywords ("Draft: …") reveal the flow when the rulebook is silent;
    a top-of-spec **⚑ decision table** for invented rules; **dead-rule detection** (Dekoration can
    never fire) — see `playbooks/spec.md`. **Playtest lesson**: a phase the *data* names must be a
    *visible* phase in play — see `playbooks/playtest.md`.
  - Report + retrospective: `projects/roomies/05-playtest-report.md`, `retrospective.md`, `open-questions.md`.
