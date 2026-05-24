# Visual quality on the first try

How to make a factory MVP look *intentional* in its first build instead of correct-but-flat. This
is a pre-flight checklist + principles for the **spec** and **build** stages. Crawl it before
building any UI.

> Why this exists: three projects in a row (Lacuna, Cull the Crown, Compile) each independently
> re-discovered the same handful of presentation moves, and the build agent's instructions said
> nothing about looks — so first builds shipped flat and got polished later. Bake these in from
> milestone 1.

## The one move with the highest leverage: a themed living background

Every recent game's biggest visual upgrade was a **self-contained, animated, themed backdrop**. It
is cheap, has zero gameplay risk, and instantly makes a screen read as designed. **Always include
one.** Pick the cheapest variant that fits:

- **DOM 2D canvas, domain-warped sine plasma** — soft drifting colour bands from a tiny buffer,
  CSS-upscaled. Best for menus/React screens (no Pixi needed). _Copy: `lacuna PlasmaBackdrop.tsx`
  (pond palette) ← adapted from `cull-the-crown fx/plasma.ts`._
- **DOM 2D canvas, additive radial "blobs" + gradient + perspective grid** — a synthwave/neon look
  built from large soft `lighter`-composited radial gradients drifting over a vertical gradient,
  plus a horizon grid. _Copy: `compile render/neonBackground.ts`._
- **Pixi sprite plasma** — the same sine field as a nearest-neighbour sprite for an in-game/8-bit
  look. _Copy: `cull-the-crown fx/plasma.ts`._

Always: respect a **reduce-motion** setting (render one static frame), and lay a **vignette/dark
veil** over it so foreground text/panels stay legible.

## Principles

1. **Commit to a theme module up front** (`render/theme.ts`): a limited, intentional **palette**;
   **typography** = one display face + one legible body face, *loaded before first paint* (Pixi
   `Text` and canvas both render fallback if the font isn't ready); an **icon/shape style**. This is
   where each game earns a distinct identity while reusing the shared motion kit.
2. **Polish the frame, not just the board.** A real **landing menu** (title, primary "New Game"
   CTA, Continue, Settings) — never a bare auto-start. A **victory/end screen** with a celebratory
   beat (confetti/pops). **Transitions** between screens, not instant cuts.
3. **Game-feel is motion.** Use the shared `fx/` kit: **springs** so pieces *move* between states
   (reconcile, don't rebuild), **particles** on the key action, **trauma shake** for impact,
   floating **pops** for "number-go-up". (See `patterns/presentation-fx.md`.)
4. **Depth cheaply:** soft glows/halos on tokens, drop shadows that detach on hover/lift, a vignette
   to focus the centre. Translucent dark panels with `backdrop-filter: blur` float legibly over the
   busy background.
5. **Legibility & accessibility are part of "looks good."** Distinguish pieces by **shape + colour,
   not hue alone**; keep contrast high over the animated background; honour reduce-motion.
6. **Menus/HUD/shop/settings = DOM/React; board + cards + FX = Pixi.** DOM is faster, accessible,
   and easier to lay out. Don't render menus in Pixi.

## Flow & transitions: never auto-switch on an outcome (Cull the Crown lessons)

The flat-vs-polished gap is as much about **flow** as pixels. The worst offenders are *outcomes*
that flip the screen instantly — a win that jumps to the shop, a loss that hits game-over in 0.1s
before the player can read what happened. Rules that paid off:

1. **An outcome is a beat, not a cut.** When a stage ends (fight won/lost, round over), **defer the
   state transition in the engine** (`combat.outcome = 'won'|'lost'`, stay in the same phase) so the
   board keeps the final moment; **animate the cause** (the killing blow, the felled enemy); *then*
   show a **blocking gate with a Continue/Claim button**. Apply it to **losses too** — a death must
   be legible. Add one explicit `advance` action that does the real work. (Pattern + code:
   `presentation-fx.md` "Don't auto-advance".)
2. **Outcome screens show what changed.** "Royal felled" isn't enough — itemise the **reward**
   (bounty, bonuses, interest, total) and animate **collecting** it (coins flying into a purse that
   ticks up). The player should *see* the gold arrive, not just find it in the shop.
3. **Intro/▶ beats between fights**, a celebratory **win**, a sombre **loss** — each a short themed
   transition. Brief non-blocking flourishes for entering a stage; blocking Continue for leaving one.

## Surface the state the player must plan around (redundantly)

If a rule changes how a move resolves, the player must see it **before** they waste a card on it.
Show plan-relevant state in **three** places: **on the actor** (e.g. the enemy wears its immune
suit as an emblem + a bold colour-coded label), **on the affected pieces** (mark the cards whose
power is nullified with a ⊘ badge), and **at the point of action** (a warning in the play/staging
panel when the selected move hits it). One indicator is missable; three is legible.

**Direct attention with motion:** when the player is *forced* to act on specific elements (must
block, must discard, must choose), make those elements **grow slightly + blink**. Use colour + a
pulsing border on the active prompt (e.g. a red pulsing "DEFEND — block N" turn banner).

**Show whose turn it is.** A persistent, colour-coded turn indicator ("YOUR MOVE" vs "DEFEND")
removes a whole class of "what do I do now?" confusion for free.

## Full-bleed board + overlay HUD (lay it out like a game, not a webpage)

A centred column with the board on top and a control bar stacked beneath reads as a webpage. Make
the **board fill the screen** and **float the UI over it**: the canvas host is `position:fixed;
inset:0` with `canvas { object-fit:contain }`; a `pointer-events:none` overlay holds the HUD, and
only the interactive bits re-enable pointer events — so empty overlay areas **fall through to the
canvas** and card-dragging still works. Anchor persistent UI to the edges (stats top-left, turn
top-centre, relics/powers down one side, special action like the Jester down the other, draw/discard
piles in the bottom corners). Make per-move **actions contextual pop-ups**: the Play/Clear cluster
appears over the hand only when cards are selected; the block prompt floats over the hand in defend.
Distinct opponents: give each **enemy "set" its own silhouette + palette** (here: per-suit head tint,
eye colour, and crown shape) so the player reads *what* they're fighting at a glance, not just from a
label. Reference: `cull-the-crown/app/src/ui/App.tsx` (CombatScreen overlay) + `render/combatStage.ts`
(`drawRoyal`, `SUIT_ROYAL`).

## Verify real input early (don't let a pretty board be unclickable)

Polished canvas boards are easy to make *unclickable*: Pixi per-object hit-testing can silently
resolve to the stage, and a dev seam that drives the engine directly will hide it. **Do board input
at the stage level with explicit geometry**, support **drag-and-drop** for the core action(s)
(drag a card up to play / onto the block), and add a **real-pointer e2e** (mouse down/move/up) by
milestone 3 — not just seam-driven tests.

## "Finished, not flat" is also SOUND and SHELL — read these companions

Looking intentional is necessary but not sufficient. Two more layers separate a *demo* from a *game*,
and both got bolted on at the end instead of built in — so they're now part of the first-build bar:
- **Sound** — `playbooks/audio-and-sound.md`: a synthesized, IP-clean Web Audio engine (music loop +
  SFX kit + a Music/SFX volume mixer + mute). Silence is the loudest "unfinished" tell.
- **Front-of-house shell + persistence** — `playbooks/front-of-house-shell.md`: a real main menu, a
  Pause screen that freezes the board, Settings, a Rules reference, and autosave/continue/past-runs.

## Pre-ship checklist (the build agent runs this before declaring done)

_Visuals_
- [ ] **Themed living background** present, animated, self-contained, reduce-motion aware.
- [ ] **`render/theme.ts`** — palette + fonts (loaded before first text) + icon style.
- [ ] **End/victory screen** with a celebratory moment.
- [ ] **Motion**: springy piece movement + at least one particle/pop on the key action.
- [ ] **Panels/HUD legible** over the background (translucent dark + blur + vignette).
- [ ] **No outcome auto-switches** — wins/losses animate the cause, then a **Continue/Claim** gate.
- [ ] **Outcome screens show what changed** (itemised reward + a collection animation).
- [ ] **Plan-relevant state surfaced redundantly** (actor + affected pieces + point of action);
      contextual help shows **only the relevant** rule (e.g. the hovered card's own power), in full words.
- [ ] **Forced choices grow + blink**; a **turn/phase indicator** is always visible.
- [ ] **Real-pointer input works** (tap + drag) — proven by a non-seam e2e, not just dev-seam tests.
- [ ] **Colourblind-safe** (shape ≠ hue only), readable font sizes, keyboard-reachable primary actions.

_Sound (see `audio-and-sound.md`)_
- [ ] **Music** (synthesized, looping, starts on first gesture) + **SFX** on the key actions/UI.
- [ ] **Settings mixer**: independent Music + SFX volume sliders **and** a master mute, **persisted**;
      mute double-gates; audio engine pinned to `globalThis` (HMR-safe).

_Shell + persistence (see `front-of-house-shell.md`)_
- [ ] **Main menu** — New run + **Continue** (when a save exists) + Past runs + Settings + Rules; not
      a bare auto-start.
- [ ] **Pause screen** (gear) that **actually freezes the board** — Resume / Settings / Rules /
      Save & quit / Surrender.
- [ ] **Rules** reference + **reduce-motion / animated-background** toggles, reachable from menu & pause.
- [ ] **Save / Continue / Past-runs** persistence via the serializable game state (autosave to localStorage).

## Reuse map (don't re-derive)

- **No-canvas card/tableau game? Go DOM-only** (no Pixi, no async-init gotcha): backdrop
  `roomies/app/src/ui/Backdrop.tsx`, **card flights via Web Animations API**
  `roomies/app/src/ui/FlyLayer.tsx` + `state/store.ts`, phase banner + confetti `ui/{App,EndScreen}.tsx`,
  emoji-glyph "art" `ui/cardText.ts`, cozy glass theme `styles.css`. Full recipe in
  `patterns/presentation-fx.md` ("DOM-only juice"). The whole checklist above is achievable DOM-only.
- Motion/juice kit (Pixi board games): copy `cull-the-crown/app/src/fx/` wholesale (game-agnostic).
- Background: `lacuna PlasmaBackdrop.tsx` (DOM/menu) · `compile neonBackground.ts` (DOM synthwave) ·
  `cull-the-crown fx/plasma.ts` (Pixi).
- Theme: `cull-the-crown/app/src/render/theme.ts`, `compile/app/src/render/theme.ts`.
- Landing menu + Settings + Continue + persisted prefs: `lacuna/app/src/ui/MainMenu.tsx` + store.
- **Audio** (synthesized music + SFX kit + volume mixer + mute, IP-clean): `cull-the-crown/app/src/audio/chiptune.ts` + `ui/SettingsMenu.tsx` — see `playbooks/audio-and-sound.md`.
- **Front-of-house shell** (main menu / Pause-that-freezes / Settings / Rules) + **run persistence**
  (autosave / continue / past-runs): `cull-the-crown/app/src/ui/{App,PauseMenu,SettingsMenu,PastRunsOverlay,HelpOverlay}.tsx` + `store.ts` — see `playbooks/front-of-house-shell.md`.
- **Outcome gate (Continue/Claim) + itemised reward + coin-to-purse**: `cull-the-crown/app/src/ui/CombatGate.tsx`.
- **Deferred outcome flow** (engine `outcome` + `advance` action; typed `fxEvent`): `cull-the-crown/app/src/engine/{combat,run}.ts` + `ui/store.ts`.
- **Stage-level geometry input + drag-to-play/block**: `cull-the-crown/app/src/render/combatStage.ts` + `ui/PixiBoard.tsx`; real-pointer e2e `tests/e2e/input.spec.ts`.
- **Tutorial modal + tooltips (CSS `data-tip`)**: `cull-the-crown/app/src/ui/HelpOverlay.tsx` + `styles.css`.

## Pitfalls (from `patterns/presentation-fx.md` + build-gotchas)

- **Load fonts before building Pixi `Text`** or the first text renders in a fallback face.
- **Full-page Playwright screenshots of a WebGL canvas can be black** — screenshot the canvas
  element directly, or capture DOM-only screens.
- **Keep FX in `render/`/`fx/`; the engine stays pure.** Game-feel never leaks into rules.
