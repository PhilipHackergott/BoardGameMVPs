# MVP Spec — {{TITLE}}

> Stage 3 (Specification), the *what*. Produced by `spec-writer`. See `../../docs/03-specification.md`.
> Don't guess rules — if the ruleset source is ambiguous, ask the human.

## Pitch & target experience
_One line + the feeling we're going for._

## Scope line (the core loop the MVP delivers — with its full base content set)
_Cut whole optional **modules** (extra modes, expansions, online), **not depth within the core loop**.
A roguelike with 2 relics is a tech demo, not an MVP. See `target-state.md` / `content-depth.md`._

## Rules to implement
### Components & setup
### Turn structure
### Actions
### Win / end conditions & scoring
### Edge cases
### Modules deferred / cut for the MVP (and why) — cut at the module level

## Content catalog & depth  (crawl `../../knowledge/playbooks/content-depth.md`)
_The reason to replay — spec it, don't defer it._
- **The full base content set** (cards / powers / enemies / relics / events / run-variants) the MVP
  ships, listed or sized — content-complete for the core loop.
- **Modeled as data on a spine**: a content registry + fixed hook points (default-off ⇒ base game).
- **Design axes it spans** + any under-served axis worth opening (novelty-per-effort, not more of the same).

## Modes & AI
_e.g. vs-AI, hot-seat. A **difficulty ladder** (≥ Low/Med/Hard off one shared evaluator), not a single
difficulty — and it must be **sim-verified** to actually climb (`balance-and-tuning.md`)._

## Screens & flow
_menu → game → end. Board-view + HUD wireframe-level description. **Outcomes are beats, not cuts:**
specify the transition/gate between fights/rounds and at win/loss — no auto-switching screens; each
outcome screen needs a Continue/Claim button and shows what changed (rewards collected, etc.)._

## Player states & feedback
_How the UI shows whose turn it is, legal moves, rejection reasons, score, game end. **Surface
plan-relevant rules state** (immunities, modifiers) on the actor + on affected pieces + at the point
of action. Direct forced choices with motion._

## Look, feel & flow  (crawl `../../knowledge/playbooks/visual-first-try.md` + `target-state.md` + `ui-architecture.md` first)
_Original-asset direction consistent with the IP decision. Commit up front to:_
- **The UI substrate — DOM or canvas (Pixi)?** State it now; it decides where the whole UI kit is built.
  A unified pixel-art/arcade look ⇒ canvas; text/form-heavy ⇒ DOM. **Never plan to start DOM and port to
  Pixi later** — that hybrid interim is the costliest path (see `ui-architecture.md`).
- **A design / art-direction doc** (`projects/<slug>/art-direction.md`): concept, palette as named
  tokens, one display + one body face, **the ONE card/piece model**, panel/modal/button recipes, motion
  + a11y, a component audit checklist. Cohesion is decided, not discovered — exemplar `cull-the-crown/art-style.md`.
- **Reusable UI primitives**: ONE `<Modal>`/overlay shell + shared atoms (`<CardFace>`/token, Button,
  Panel, tooltip), built before the individual screens so every overlay shares them.
- **Theme**: palette, one display + one body face, icon/token style (a `render/theme.ts`, tokens synced with `:root`).
- **A themed living background** (the #1 first-try win) + a legibility veil/vignette.
- **Game-feel budget**: which actions get springs/particles/shake/pops; the key "number-go-up" beat.
- **Transitions & outcome screens**: intro beat, win celebration, **legible loss** (animate the cause,
  then gate), reward-collection animation.
- **Accessibility**: colorblind-safe (shape ≠ hue only), keyboard, text scaling, reduce-motion.

## Sound  (crawl `../../knowledge/playbooks/audio-and-sound.md`)
_Don't ship silent. Specify the synthesized (IP-clean, zero-asset) audio:_
- **Music**: a looping score (per-screen tracks — menu / play / shop — if it fits).
- **SFX**: which events get a sound (the key action, gains, hits, UI clicks).
- **Mixer**: independent **Music + SFX volume sliders** and a **mute**, persisted.

## Shell, settings & persistence  (crawl `../../knowledge/playbooks/front-of-house-shell.md`)
_The layer that makes it read as a game, not a demo:_
- **Main menu**: New game/run + **Continue** (when a save exists) + Past runs/history + Settings + Rules.
- **Pause** (a gear during play) that **actually freezes the game**: Resume / Settings / Rules /
  Save & quit / Abandon.
- **Settings**: the audio mixer + reduce-motion / animated-background toggles.
- **Persistence**: autosave + Continue + a runs/results history (the engine state is JSON-serializable).

## Balance & tuning  (crawl `../../knowledge/playbooks/balance-and-tuning.md`)
- **Sim harness**: a headless AI-vs-AI sweep (`npm run sim`) the build stands up to measure win rates.
- **Target**: compress the win-rate spread (no auto-win / dead content); verify the difficulty ladder climbs.
- A **first tuning pass** runs in the build; final tuning (incl. AI-blind content) loops with `/test`.

## Acceptance criteria (each testable — becomes the playtest checklist)
_Include content-completeness, a sim-verified difficulty ladder, and "matches `art-direction.md`"._
- [ ]
- [ ]
- [ ]

## Out of scope (MVP) — whole modules, not depth
_online multiplayer, accounts, **separate expansions / secondary modes**, monetization plumbing. The
base game still ships **content-complete and tuned**._
