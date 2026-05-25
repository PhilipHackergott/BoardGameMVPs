# Target state — what a built MVP actually looks like

The single picture of **"done with the build stage."** Read this first, before any other build
playbook. Every other playbook is a detail of one row in the bar below.

> Why this exists. Our two deepest projects — **Cull the Crown** and **Lacuna** — each reached a
> state the user was happy with only after *days* of iteration in waves: a correct-but-flat first
> build, then visual polish, then audio + shell, then **content depth**, then **balance + AI**. Every
> wave was the same story: "why is this flat / silent / shallow / unbalanced — bake it in." The fix is
> always the same: **stop shipping the thin version first.** This page resets the build target so the
> first build lands near that end-state instead of three weeks of rounds away from it.

## The bar (the user's actual definition of "good")

A built MVP is a **finished-feeling, content-rich, tuned game** — not a "smallest playable, correct"
slice. Concretely, when the build gate opens, all six rows are true, not just the first:

| # | Row | The bar | Detail playbook |
|---|-----|---------|-----------------|
| 1 | **Correct core** | Pure deterministic engine; rules right; full-game simulation green. | `stack-and-conventions.md`, `patterns/engine.md` |
| 2 | **Finished feel** | A committed **design/art-direction doc**; themed living background, theme module, springy motion + the key juice beat, outcomes-are-beats-not-cuts, legible state. | `playbooks/visual-first-try.md`, `patterns/presentation-fx.md` |
| 3 | **Not a demo** | Sound (music + SFX + mixer) **and** the front-of-house shell (menu, pause-that-freezes, settings, rules, save/continue/history). | `playbooks/audio-and-sound.md`, `playbooks/front-of-house-shell.md` |
| 4 | **Content-rich** | The **full base content set** that makes the loop replayable, built **data-driven** — not 3 sample cards. Whole optional *modules* may be cut; depth within the core is not. | `playbooks/content-depth.md` |
| 5 | **A real opponent** | A **sim-verified difficulty ladder** (≥ Low/Med/Hard), not "one AI, single difficulty." The AI doubles as the balance instrument. | `patterns/ai.md`, `playbooks/balance-and-tuning.md` |
| 6 | **Tuned, not broken** | A **balance harness** (`npm run sim`) exists and a **first tuning pass** has run, so no content is wildly dominant/dead. Final tuning still loops with `/test`. | `playbooks/balance-and-tuning.md` |

Rows 1–3 are already first-shot-ready in the templates/docs. **Rows 4–6 are the ones we kept
re-discovering in late waves — they are now part of the first build, not the test stage.**

## What "smallest" used to mean, and what it means now

The old framing ("smallest playable, correct; the single core loop; everything else is out") was
right about *modes* and *expansions* and wrong about *depth*. The reframe:

- **Cut whole modules, not depth.** Out of scope is still: online MP, accounts, secondary game modes,
  separate expansions, monetization. **In scope is the full base game** — all the cards / powers /
  enemies / relics / events that make the *core loop* worth replaying. A roguelike with 2 relics and
  3 enemies is not an MVP of a roguelike; it's a tech demo of one.
- **Replayability is content, and content is the product.** Both reference games' value lived almost
  entirely in their content breadth: Cull the Crown shipped 13 starting decks, 8 stakes, rarity-tiered
  relics, tiered royal decrees, court events, and card sigils; Lacuna shipped 24 powers across distinct
  mechanical axes + 7 affinities + a difficulty ladder. That breadth is the *reason to play*, so it is
  not "polish later."
- **Data-driven from day one is what makes this affordable.** You do not hand-build 24 powers. You
  build the **spine** (a data registry + pure hooks read at fixed decision points) so each new piece of
  content is *data + one hook*, and then you fill the catalog. See `content-depth.md`.

## The wave trap (the mistake to design out)

Both projects independently walked the same path:

```
flat build → "make it look good" → "why is it silent" → "why is there no menu/save"
           → "why is there so little to do" (content) → "this is unbalanced / the AI is dumb"
```

Each arrow was a multi-round iteration the user had to drive by hand. **The arrows are predictable, so
collapse them into milestone planning up front.** A build that ships rows 2–6 already present turns
"days of waves" into "one tuning loop with `/test`."

## Commit these design decisions *before* you fill screens

Polish is not a coat of paint applied at the end; it is a set of decisions made *first* that every
later screen inherits for free. The two cheapest, highest-leverage ones — both repeatedly skipped, then
expensively retrofitted:

### 1. A written design / art-direction doc (visual cohesion is decided, not discovered)

Before milestone 2, write a one-page **`art-direction.md`** in the project folder and treat it as the
source of truth every screen matches. It is the difference between "each screen looks like a different
app" and "this is one game." It commits, concretely:

- **Concept** — one sentence of visual identity (e.g. "an 8-bit arcade take on a medieval court").
- **Palette as named tokens** — a small intentional set defined **once** and not duplicated: pick a
  single source (`render/theme.ts` for a canvas game; CSS `:root` for a DOM game) and **generate** the
  other side from it (CTC: a `gen-tokens` build-prestep rewrites the brand `:root` vars from `THEME`) so
  they can't drift. A rule that **chrome never uses a raw hex** — only a token. Name the **primary-action colour** and reserve info colours so CTAs are
  unambiguous (CTC: "primary = red; blue is info-only, never a button").
- **Type** — one display face + one body face, loaded before first paint, with where each is used.
- **The one model per repeated object** — *one* card/piece/token look, built once as a shared component
  (`<CardFace>`) and reused everywhere; "**do not invent a second card look**."
- **Panel / modal / button recipes** — the shared surface treatment (border, shadow, radius), the
  light-vs-dark box rule, the button press style — so a new panel is a class, not a redesign.
- **Motion + accessibility defaults** — idle/ambient motion, reduce-motion behaviour, shape≠hue.
- **A component audit checklist** — "when you add or touch a component, it must: use tokens, use the
  shared card/modal/button, respect reduced-motion…". This is what keeps cohesion from drifting.

Exemplar to copy the *shape* of (not the content): `projects/cull-the-crown/art-style.md`. Write the
thin version up front and grow it; do not reverse-engineer it after ten screens have each guessed.

### 2. Reusable UI primitives, especially ONE modal shell

> **First decide the substrate.** DOM or canvas (Pixi)? Build the primitives below *in that substrate*,
> chosen up front — see [`ui-architecture.md`](ui-architecture.md). The trap is building DOM primitives
> "to move fast" for a game whose identity is a unified pixel-art/canvas look, then migrating to Pixi
> piece by piece later (Cull the Crown's most expensive detour). The rest of this section describes the
> DOM case; for a canvas game the same roles are filled by the Pixi kit (`render/ui/`: `WiggleField`
> typeface, `drawButton`, `ModalStage`, tokens).

Both reference apps grew **6–10 overlays** (deck view, pack reveal, past-runs, rules, settings, pause,
log, victory, account, …) — and each re-derived its own backdrop, centring, escape-to-close, focus
handling, and panel chrome, because **no shared `<Modal>` primitive was built first.** Build the shell
once, in milestone 2/5, before the individual overlays:

- **One `<Modal>` / overlay primitive**: dim backdrop, centred panel with the art-direction chrome,
  `Esc`/backdrop-click to close, focus trap + restore, scroll-lock, reduce-motion-aware enter/exit.
  Every overlay is then *content* dropped into it, not a fresh scaffold.
- **The shared object component** (the `<CardFace>`/token from the design doc) — one place to restyle.
- **A handful of shared chrome atoms** — `Button`, `Panel`, an icon/emblem renderer, a tooltip system
  (CSS `data-tip`), a carousel/picker if the game has selectable content. Cheap, and they enforce the
  design doc by construction.

The payoff is compounding: the front-of-house shell, the content browser, the outcome gates, and every
future overlay all share one accessible, on-theme shell — so "add a screen" stays a half-day, not a day
of re-deriving modal plumbing and guessing at colours.

## How this changes the build plan's milestones

The old plan ended at "5. Polish + acceptance." The full-target plan threads content, AI, and balance
through, and adds a tuning milestone. Recommended order (engine still first, each still demoable):

1. **Engine + the content spine + tests** — pure reducer, the data registry/hook points for the
   variant axes, full-game simulation green. (Don't bolt the spine on after; the catalog rides on it.)
2. **Design doc + static themed render** — write `art-direction.md`; build the shared UI shell (the
   `<Modal>` primitive, `<CardFace>`/token, theme tokens in `:root` + `render/theme.ts`) and the themed
   living background. Every later screen reuses these.
3. **Interactive core loop** — full playable loop, win/lose, real-pointer input verified.
4. **The content catalog + the AI ladder** — fill the full base content set on the spine; build
   Low/Med/Hard off one shared `estimate()`. (These are built together because the AI is how you'll
   measure the content.)
5. **Feel + sound + shell** — fx kit wired (cascade/particles/shake/pops), outcome gates + transitions
   + reward animation, state legibility; the audio engine (music + SFX + mixer + mute); the
   front-of-house shell (menu / pause-that-freezes / settings / rules) + save/continue/history — every
   overlay built on the milestone-2 `<Modal>` primitive, every surface matching `art-direction.md`.
6. **Balance harness + first tuning pass** — stand up `npm run sim` (AI-vs-AI sweeps), measure the
   win-rate spread + a strength ladder, run one tuning iteration so nothing is dominant or dead.
7. **Acceptance pass** — every acceptance criterion met + the `visual-first-try.md` pre-ship checklist
   passes + the balance harness runs clean.

## Pre-gate self-check (in addition to the visual-first-try checklist)

- [ ] **Content-complete for the defined scope** — the full base catalog is present and data-driven
      (adding one more piece is data + a hook, not a refactor). Cut items are *modules*, listed with why.
- [ ] **Difficulty ladder** — ≥ 3 tiers off one shared evaluator, and a sim shows the ladder actually
      climbs (the harder tier beats the easier one well above 50%).
- [ ] **Balance harness exists and ran** — `npm run sim` produces win rates; the spread is compressed
      (no auto-win / dead content), and a one-paragraph balance note records where it landed + what's
      still flagged for `/test`.
- [ ] **`art-direction.md` exists** and the running app matches it — one card/token model, tokenized
      palette (no stray chrome hexes), one display + one body face, one primary-action colour.
- [ ] **A shared `<Modal>`/overlay primitive** backs every overlay (no per-modal backdrop/close
      re-derivation); shared `<CardFace>`/token + button/panel atoms are reused, not re-styled per screen.
- [ ] Rows 1–3 already covered by the `visual-first-try.md` checklist (visuals + sound + shell).

## What is still legitimately deferred to `/test` and beyond

Full target ≠ infinite scope. These stay out of the build:

- **Final balance fine-tuning** under human play and a planning AI — the build does *one* pass to kill
  dominant/dead content; the `/test` loop does the rest (`balance-and-tuning.md` explains why a greedy
  AI under-values planning-heavy content).
- **Online multiplayer, accounts, matchmaking, ranked ladders** — the production layer. The pure
  serializable engine makes it tractable *later* (it becomes the server's source of truth — see
  Lacuna's `08-production-plan.md`), but it is explicitly post-MVP per `stack-and-conventions.md`.
- **Desktop/mobile wrapping** — after the web build passes its gate.
- **Secondary modes / separate expansions** — one strong base game first.

## Reference projects for the whole bar

- **Cull the Crown** (`projects/cull-the-crown/`) — content depth (decks/stakes/relics/decrees/events/
  sigils) + the full feel/sound/shell stack. Read its `project-state.json` history to see every wave we
  are collapsing.
- **Lacuna** (`projects/lacuna/`) — the variant-axis content spine (powers + affinities), the
  sim-verified AI ladder, and the balance methodology in `07-balance-report.md`.
