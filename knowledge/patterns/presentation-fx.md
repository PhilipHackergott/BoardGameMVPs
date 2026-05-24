# Pattern: a reusable "juice" layer for PixiJS games (springs, particles, shake, pops)

**Problem it solves.** Factory MVPs were starting to look the same and feel flat — correct but
inert. Game-*feel* (the thing LÖVE/Balatro is admired for) is achievable on the factory's standard
web stack (PixiJS v8), and it's the same handful of primitives every time. So build them **once**,
game-agnostic, and re-skin per project.

**First built in:** `projects/cull-the-crown/app/src/fx/` (a Regicide × Balatro roguelike). Copy
that folder into any project's `app/src/` — it imports nothing game-specific.

## The living background is the #1 first-try visual win (cross-project)

Confirmed across **three** projects: the single biggest, cheapest upgrade from "flat" to
"intentional" is a **themed, animated, self-contained background**. Each project re-derived it —
so reach for it by default (see the checklist in `playbooks/visual-first-try.md`). Three proven
variants, pick the cheapest fit:

- **DOM 2D-canvas domain-warped sine plasma** — soft drifting bands from a tiny buffer, CSS-upscaled;
  no Pixi needed, ideal for menus/React screens. _`lacuna PlasmaBackdrop.tsx` (pond palette), adapted
  from `plasma.ts` below._
- **DOM 2D-canvas additive radial blobs + gradient + perspective grid** — a synthwave/neon look from
  large `lighter`-composited radial gradients drifting over a vertical gradient + a horizon grid.
  _`compile render/neonBackground.ts`._
- **Pixi sprite plasma** (`plasma.ts`) — the same field as a nearest-neighbour sprite for an in-game
  8-bit look.

Always pair it with a **reduce-motion** path (one static frame) and a **vignette/dark veil** so
foreground text and panels stay legible.

## The kit (`app/src/fx/`)

| File | What it is | Reusable scope |
|------|-----------|----------------|
| `easing.ts` | Easing fns (`easeOutBack`, `easeOutCubic`, `easeOutElastic`, …) + `lerp`/`clamp01`. | Anything (no deps). |
| `spring.ts` | `Spring` — a sub-stepped, critically-damped numeric spring. Drive x/y/rot/scale; `to()/snap()/kick()`. The workhorse of juicy motion. | Anything (no deps). |
| `particles.ts` | `Particles` — pooled-ish Graphics burst system; `.burst(x,y,opts)` + `.update(dt)`; add `.layer` to the stage. | Pixi v8. |
| `shake.ts` | `Shake` — trauma-based screen shake (intensity = trauma², decays); `.add(amount)`, `.update(dt, container, baseX, baseY)`. | Pixi v8. |
| `pops.ts` | `Pops` — floating text (damage numbers, "+gold"); scale-in overshoot, float, fade; **per-pop `delay`** so a sequence staggers into a cascade. | Pixi v8. |
| `plasma.ts` | `PlasmaBackground` — a Balatro-style **living backdrop** without GLSL: a small offscreen 2D canvas filled each frame with a domain-warped sine field, mapped through a **palette you pass in**, shown as a nearest-neighbour sprite. Cheap, robust, re-skins per game. | Pixi v8 + 2D canvas. |

Verified by unit tests (`app/tests/fx/spring.test.ts`): spring converges & rests, stays finite
under large `dt` (sub-stepping), easings hit endpoints and `easeOutBack` overshoots. **Test the
math even when you can't see the pixels** — it's the only automated guarantee for blind FX work.

## How to wire it (the shape that worked)

1. **Keep the engine pure.** FX lives only in `render/` + `fx/`. The engine never knows it exists.
2. **Stage owns containers, ticker pumps `update(dt)`.** One `world` container holds everything;
   `Shake` moves `world`, so shake is global and free. Clamp `dt` (`min(deltaMS/1000, 1/20)`).
3. **Reconcile, don't rebuild.** Keep a `Map<id, Node>`; on each `sync(viewModel)` add new nodes
   (spring in from a "deck" point), mark departed nodes `exit()` (animate out then destroy), and
   re-target layout springs. Cards/tokens then *move* between states instead of popping.
4. **Drive the cascade off the engine's resolution result.** The store captures the
   `ResolutionResult` of a move *before/at* dispatch and emits an `fxEvent {id, result, killed}`;
   the Pixi component plays pops/shake/particles staggered by `delay`. (See
   `cull-the-crown/app/src/ui/store.ts` `playCards()` + `ui/PixiBoard.tsx`.) This keeps React the
   single source of intent and lets the trace double as the on-screen "number-go-up".
5. **Theme is per-game, kit is shared.** Put palette/typography/iconography in a `render/theme.ts`;
   that's where each project earns a *distinct* look while reusing the same motion toolkit.

## Pixi v8 + React lifecycle (the gotcha, again)

`Application.init()` is async and **StrictMode double-mounts**. Guard with a `cancelled` flag: if
the effect cleans up before `init()` resolves, destroy the app inside the `.then`; otherwise mount
`app.canvas`, build the stage, and on cleanup `stage.destroy()` + `app.destroy(true,{children:true})`.
Working reference: `cull-the-crown/app/src/ui/PixiBoard.tsx`. (Companion to the async-init note in
[build-gotchas](build-gotchas.md).)

## Achieving an 8-bit arcade look on this stack (proven game-ready in Cull the Crown)

- **Low-res + nearest upscale.** Render the Pixi app at a small logical size (e.g. 480×270),
  `antialias:false`, `roundPixels:true`, then let the host CSS-upscale it: `canvas { image-rendering:
  pixelated }`. Vector Graphics drawn small become chunky pixels for free.
- **Pixel fonts**, loaded *before* building Pixi `Text` (`await document.fonts.load("12px 'Silkscreen'")`)
  — otherwise the first text renders in a fallback. "Press Start 2P" for big titles, "Silkscreen"
  for legible body.
- **Flat, limited palette + the plasma backdrop + a CSS CRT overlay** (`.host::after` with
  `repeating-linear-gradient` scanlines + a radial vignette) and an **arcade-cabinet bezel**
  (layered `box-shadow` rings + `inset` shadow for screen curvature) sells the cabinet.
- **2.5D cards (the Balatro card feel):** put the card art in an inner container and **skew it
  toward the pointer** (`body.skew` from `(pointer − cardCentre)` while hovered), lift on
  hover/select, and give it a **drop shadow that detaches** (offsets down/opposite as the card
  rises). Float hero art on a lit elliptical **dais** with a cast shadow for grounded depth. All
  spring-driven. Reference: `cull-the-crown/app/src/render/{cardNode.ts,combatStage.ts}`.

## Driving combat juice from typed store events

Keep the engine pure, but have the **store emit a typed FX event** alongside each state change
(`{ id, kind: 'play'|'yield'|'discard'|'jester', result, killed, strike }`). The Pixi component,
on a *new* event id: (1) sets an **exit mode** so departing cards animate to the right place
(`'play'`→fly into the enemy, else →the discard pile), (2) re-syncs, (3) plays the matching
animation — enemy **hit reaction** (white flash + recoil kick + particle burst), a delayed
**enemy strike** (red full-screen flash + lunge + shake) when it survives, a **defeat flourish**
(fade/fall + big burst). Real **deck/discard piles** (stacked card-backs with counts) double as the
spawn/exit anchors so deals and discards read correctly. Reference:
`cull-the-crown/app/src/{ui/store.ts,ui/PixiBoard.tsx,render/combatStage.ts}`.

## Don't auto-advance: defer the engine transition behind a Continue gate

When a stage ends, the temptation is to flip `phase` immediately — but then the screen jumps and
the player never sees the result. **This bites losses hardest:** a player reported playing a card
and being on the game-over screen in ~0.1s, illegible. Fix **both** win and loss the same way:
**defer the transition in the engine**. On the win OR the killing blow, set `combat.outcome =
'won' | 'lost'` and *stay* in the same phase so the board keeps the final moment (felled enemy / the
enemy's killing strike animation). Add an explicit `advance` action that does the real work
(award+shop / win; or → game-over). The UI shows a blocking **Continue gate**, delayed (~1.1s won,
~1.5s lost) so the cascade / enemy attack lands first. Guard all in-fight actions with
`&& !combat.outcome`. The full-run simulation and engine tests must Continue too
(`if (combat.outcome) advance`). The enemy's counter-attack animation (wind-up → lunge → slash +
downward blood particles + red flash) plays on **every** strike — whether you block it or it's
lethal — so a death reads as a blow, not a teleport. Reference:
`cull-the-crown/app/src/{engine/combat.ts,engine/run.ts,ui/CombatGate.tsx}`.

## Item/icon art without external assets (IP-clean, recognizable)

Shops/inventories full of text-only items are unreadable at a glance. Give each item **original
in-code art**: a small **flat SVG emblem** keyed by an `art` field on the item data (a
`<ItemArt icon={...} suit={...}/>` with a `switch` of simple shapes in the theme palette, framed in a
gold-bordered badge). Chunky flat shapes + a limited palette read as cohesive game art, scale
crisply, and ship **zero external assets** (no licensing risk). Render the same emblem everywhere the
item appears (shop offer, owned tray, HUD slot). For a quick baseline, emoji-glyph art also works
(see Roomies' `cardText.ts`). Reference: `cull-the-crown/app/src/ui/ItemArt.tsx` + `engine/content.ts`
(`art` keys). Verify with a **near-native element screenshot** of one offer card — full-page shots
downscale too far to judge icon quality.

## Outcome screens: show & collect the reward (DOM micro-pattern)

The won gate shows an **itemised** reward (bounty incl. exact ×mult, guild tribute, interest, total)
from a **pure `rewardBreakdown(run, exact)` selector** — the same fn `awardAndAdvance` uses, so the
preview can't drift from the actual award. The **Claim** button then animates collection: a
`requestAnimationFrame` loop ticks a "Purse N ◆" counter from current→current+total over ~650ms while
a handful of `◆` coin spans CSS-fly into the purse (`@keyframes` translate + fade, per-coin
`animation-delay` + a `--dx` scatter), then dispatches `advance` (~820ms). Self-contained on the
gate, so it works across the screen swap. Reference: `cull-the-crown/app/src/ui/CombatGate.tsx`.

## State legibility: surface plan-relevant rules redundantly

When a rule changes how a move resolves (e.g. suit immunity), drive **three** indicators from the
same `sync(vm)`: an **emblem on the actor** (the enemy's crown wears its immune-suit glyph) + a
**colour-coded pill** (`SUIT_COLOR` per suit, `IMMUNE ♦ DIAMONDS`), a **per-card badge** on affected
cards (`CardNode.setImmune(true)` → a red ⊘), and a **point-of-action warning** in the DOM staging
panel when the selected play hits it. Direct forced choices with motion: a `defendMode` flag makes
un-chosen cards grow + blink (`scale↑` + `sin` alpha) and the turn banner pulses red. References:
`cull-the-crown/app/src/render/{combatStage.ts,cardNode.ts}` + `ui/App.tsx`.

## Cross-screen transitions + tutorial + tooltips (DOM, works over Pixi too)

- **Outcome transitions:** a fixed-position DOM overlay that watches `phase`/enemy changes and
  fires a sweep + big pixel banner (royal felled→shop, run won, run lost, "next royal approaches").
  Pointer-events off, auto-clears. Works over both the Pixi board and DOM screens. Reference:
  `ui/TransitionLayer.tsx`.
- **Tooltips for free:** a CSS-only system — any element with `data-tip="…"` shows a styled
  tooltip on `:hover`/`:focus-visible` via `::after { content: attr(data-tip) }`. Cheap to sprinkle
  everywhere for a teaching UI.
- **Tutorial:** a "How to Play" modal auto-shown on first run (localStorage flag) + a persistent
  `?` button, plus an always-on suit **legend** strip. Reference: `ui/HelpOverlay.tsx`.

## Gotcha: Pixi per-object hit-testing can silently fail — own the input

Pixi's built-in per-card pointer events (`view.on('pointerdown')`, even with `eventMode:'static'` +
an explicit `hitArea`) **resolved to the stage, not the card**, through nested layers on a
CSS-upscaled low-res canvas — taps registered nothing. `globalpointermove` still fired and mapped
coordinates correctly, which is the tell: **the pointer reaches Pixi; only hit-testing is broken.**
Insidiously, it stays hidden if every test drives the game through a dev seam — exercise **real
pointer input** in an e2e (`page.mouse.click/down/move/up`) at least once.

Fix that's robust: **do input at the stage level with explicit geometry.** The stage is the pointer
target everywhere; on `pointerdown` find the topmost card under the point yourself
(`Math.abs(px-card.x) <= W/2`, pick the highest child index among hits), then drive drag from
`globalpointermove` + stage `pointerup`/`pointerupoutside`. This also makes **drag-and-drop** natural
(tap = select for combos; drag up into a "play zone" = play). Reference:
`cull-the-crown/app/src/render/{combatStage.ts,cardNode.ts}` + `tests/e2e/input.spec.ts`.

## Gotcha: full-page screenshots of a WebGL canvas can be black

Playwright `page.screenshot()` (and any composite capture) may capture a WebGL canvas as **black**
because the drawing buffer isn't preserved at composite time — it's intermittent and **not a game
bug** (the canvas renders fine for users). For reliable visual tests, screenshot the **canvas
element** directly (`page.locator("canvas").screenshot()`), capture *before* a heavy re-render, or
enable `preserveDrawingBuffer`. Don't chase it as a rendering defect (we nearly did).

## Game-feel is also sound and shell (companion playbooks)

Motion is half of "feel". The other half — and the difference between a polished board and a
*finished game* — is **sound** and the **front-of-house shell**, both repeatedly bolted on at the
very end. Build them in alongside the FX kit:
- **Sound** → `../playbooks/audio-and-sound.md`: a synthesized (IP-clean, zero-asset) Web Audio engine
  — a looping score + an SFX kit + a Music/SFX volume mixer + mute — wired to the **same typed
  `fxEvent`** that drives this cascade, plus input callbacks and a capture-phase global button click.
  Copy `cull-the-crown/app/src/audio/chiptune.ts`.
- **Shell + persistence** → `../playbooks/front-of-house-shell.md`: main menu, a **Pause that stops
  the ticker** (`app.ticker.stop()`), settings, rules, autosave/continue/past-runs.

New render/render-adjacent **gotchas** from this work (full detail in [build-gotchas](build-gotchas.md)):
disable Pixi v8 **texture/renderable GC** for fixed-asset games (`textureGCActive:false,
renderableGCActive:false`) + guard `Text` re-rasterization (`returnTexture → undefined.push`); on a
board **remount**, seed the FX cursor with the current `fxEvent.id` so a stale terminal event doesn't
re-fire; pin any timer/context-holding **singleton (audio) to `globalThis`** so HMR can't duplicate it.

## When NOT to reach for Pixi

Menus, HUD, shop lists, settings — DOM/React is faster and more accessible. Use Pixi for the
*board/cards and the FX*, overlay React for controls. (Hybrid: `CombatScreen` = `<PixiBoard/>` +
React action bar + HUD.) And don't switch the whole project to LÖVE/Lua for "juice" — it costs the
web-first stack, the shared TS engine, and the test suite for effects this kit already delivers.

## DOM-only juice for card/tableau games (no Pixi at all) — Roomies

For a **card/tableau** game (no canvas board, no physics), you can hit a high visual bar **entirely
in React + DOM/CSS** and skip Pixi — simpler, accessible, keyboard-friendly, and no async-init
lifecycle gotcha. The recipe that worked (cozy animal-drafter, _projects/roomies_):

- **Animated backdrop, pure CSS.** A few big blurred radial-gradient "blobs" on a slow `@keyframes
  drift`, plus ~25 absolutely-positioned glowing "motes" floating up on staggered durations.
  `position:fixed; z-index:0; pointer-events:none`. Re-confirms the cross-project rule that a
  **living themed background is the #1 first-try visual win** — and that it's achievable with zero
  canvas. _`roomies src/ui/Backdrop.tsx` + `styles.css` (.backdrop-*, .mote-*)._
- **Card-flight animation via the Web Animations API** (the DOM analogue of the Pixi `Spring`
  reconcile): on click, capture `e.currentTarget` rect → push a `{from, toSel, glyph}` flight to the
  store → a fixed `FlyLayer` renders a floating emoji clone and `element.animate()`s it to the
  destination element (found by `data-pool`/`data-room` selector), then pulses the target. Cards
  *travel* between hand→pool→room instead of popping. **CSS `animation:none` in tests does NOT stop
  WAAPI**, so flights keep working under the e2e animation-kill (see build-gotchas).
  _`roomies src/ui/FlyLayer.tsx` + `state/store.ts` (`spawnFlight`)._
- **Phase banners** = a fixed full-screen `pointer-events:none` overlay that shows a big label on a
  `@keyframes` fade when the store's `announce` changes (gated so it waits out the pass-the-device
  screen). **Confetti** end screen = N absolutely-positioned spans on a `fall` keyframe. Both are a
  dozen lines of CSS. _`roomies src/ui/{App,EndScreen}.tsx`._
- **Emoji as zero-cost "art".** A `Record<defId, string>` of emoji per animal/room/biome
  (🦛🦁🦙🐑 / ☕🌳🚐 / 🏠🏙️🌿) gives an MVP instant character and theme with no asset pipeline or
  licensing. Pair with **shape-or-text badges** (not hue-only) for accessibility.
- **Glassmorphism panels** (`background: rgba(...); backdrop-filter: blur()`) + a warm gradient body
  + one display font (Fredoka) / one body font (Nunito) via a single Google-Fonts `@import` carry the
  theme. _`roomies styles.css`._

When to use this vs. the Pixi `fx/` kit: **no canvas board ⇒ DOM-only** (cards, tableaus, drafters);
**a real board / lots of sprites / screen-shake-and-particles game-feel ⇒ Pixi + the `fx/` kit.**
