# MVP Spec — {{TITLE}}

> Stage 3 (Specification), the *what*. Produced by `spec-writer`. See `../../docs/03-specification.md`.
> Don't guess rules — if the ruleset source is ambiguous, ask the human.

## Pitch & target experience
_One line + the feeling we're going for._

## Scope line (the single core loop the MVP delivers)
_Everything else is out._

## Rules to implement
### Components & setup
### Turn structure
### Actions
### Win / end conditions & scoring
### Edge cases
### Rules deferred / cut for the MVP (and why)

## Modes
_e.g. vs-AI (one difficulty to start), hot-seat._

## Screens & flow
_menu → game → end. Board-view + HUD wireframe-level description. **Outcomes are beats, not cuts:**
specify the transition/gate between fights/rounds and at win/loss — no auto-switching screens; each
outcome screen needs a Continue/Claim button and shows what changed (rewards collected, etc.)._

## Player states & feedback
_How the UI shows whose turn it is, legal moves, rejection reasons, score, game end. **Surface
plan-relevant rules state** (immunities, modifiers) on the actor + on affected pieces + at the point
of action. Direct forced choices with motion._

## Look, feel & flow  (crawl `../../knowledge/playbooks/visual-first-try.md` first)
_Original-asset direction consistent with the IP decision. Commit up front to:_
- **Theme**: palette, one display + one body face, icon/token style (a `render/theme.ts`).
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

## Acceptance criteria (each testable — becomes the playtest checklist)
- [ ]
- [ ]
- [ ]

## Out of scope (MVP)
_online multiplayer, accounts, full expansions, monetization plumbing, …_
