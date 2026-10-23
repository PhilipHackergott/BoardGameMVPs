# COMPILE — MVP (web)

A 1:1 digital adaptation of the rogue-AI duel card game, built in this factory. **Hot-seat
multiplayer** plus **Easy / Medium / Hard AI** opponents, wrapped in a futuristic neon-arcade look
(synthwave backdrop, CRT scanlines, neon glow, particle juice — techniques learned from the
`cull-the-crown` project, recoloured for Compile's "rewrite reality" theme).

## Run it

```bash
npm install
npm run dev      # http://localhost:3000 (or next free port)
npm run build    # tsc --noEmit && vite build
npm test         # vitest: card DB, field math, draft, full AI-vs-AI games
```

## Card data: real text & values (sourced) — effect logic partly simplified

Compile: Main 1 has **12 protocols × 6 command cards = 72 unique cards**. The user's rulebook PDF
defined the **complete rules system** but printed **no individual card texts**; that gap is now
**resolved by web research** — see [`../card-reference.md`](../card-reference.md) for the full sourcing
and citations.

- The **rules engine is faithful**: draft, lines, values, face-down = 2, the full turn order
  (Start → Check Control → Check Compile → Action → Check Cache → End), control component +
  rearrange, compile / recompile (steal), refresh, clear-cache, win, and the LIFO effect-resolution
  stack with uncover triggers are all implemented from the rulebook.
- The **card names, values & box texts are the real published data** for all 72 cards in
  [`src/engine/cards.ts`](src/engine/cards.ts). (Note: values are *not* a clean 0–5 spread — Gravity
  uses {0,1,2,4,5,6} and Metal {0,1,2,3,5,6}.)
- The **effect logic** is faithful for 24/72 cards; the other 48 have real text but a **simplified**
  effect (tagged `SIMPLIFIED` in the in-game Codex, `placeholder: true` in code), because the current
  runtime lacks some primitives (value modifiers, play-from-deck, reactive "when covered/flipped"
  triggers, lock-outs, rearrange, reveal, value/line-conditional multi-delete, covered targeting).

### How to reach full effect fidelity (a build-stage task)

Card *data* is done. Closing the remaining effect gap means **extending the runtime**
(`types.ts` / `effects.ts` / `field.ts` / `game.ts`) with the missing primitives listed in
[`../card-reference.md`](../card-reference.md), then flipping the remaining `placeholder` flags to
`false` in [`src/engine/cards.ts`](src/engine/cards.ts). Each card has three command boxes
(see [`src/engine/types.ts`](src/engine/types.ts) → `CardDef`):

| Box | Field(s) | Rulebook meaning |
|-----|----------|------------------|
| Top — Persistent | `topText` / `passive` | active while face-up, **even when covered** |
| Middle — Immediate | `middleText` / `middle` | resolves on play face-up / flip face-up / uncover |
| Bottom — Auxiliary | `bottomText` / `trigger` + `triggerEffect` | active only while face-up **and** uncovered (Start/End) |

Effects are authored as generator functions over the `EffectAPI` (see the verb builders at the top
of `cards.ts`: `draw`, `selfDiscard`, `deleteTarget`, `flipTarget`, `shiftTarget`, `returnTarget`,
`forceDiscard`, `discardForEffect`, composed with `seq(...)`). The AI, UI, and rules pick up card
changes automatically.

## Architecture (pure engine + thin UI)

```
src/engine/         framework-agnostic, pure, unit-tested
  types.ts          domain model + the choice protocol
  field.ts          pure queries: value / line / control / compilable
  cards.ts          ⚠ the card database (placeholder; this is what you replace)
  effects.ts        EffectAPI: generator-based effect runtime (pauses for choices; LIFO nesting)
  game.ts           setup, draft, the turn-flow generator, and the Engine that drives it
  ai.ts             Easy (random) / Medium (1-ply search) / Hard (sharper eval) opponents
  rng.ts            seeded mulberry32
src/render/         neon-arcade presentation (no game rules)
  theme.ts          per-protocol neon palette + verb labels
  neonBackground.ts animated synthwave backdrop (canvas)
  particles.ts      compile/win particle bursts (canvas)
src/ui/
  store.ts          Zustand shell over the Engine + AI pacing
  App.tsx           setup → draft → board → end; choice prompts; FX wiring
```

### How the turn loop works

A whole turn is one generator (`turnGen`). Every decision — including *which action to take* — is a
`yield`ed `ChoiceRequest`. The `Engine` pumps it: AI requests are answered immediately by `ai.ts`;
human requests are parked on `state.pending` until the UI calls `submitChoice`. Flipping a card
face-up or uncovering one is a nested `yield*`, which gives the rulebook's "last in, first out"
interrupt order for free.

## Known MVP simplifications (documented, not bugs)

- **Card effects are placeholders** (see above) — the only thing between this and 1:1.
- During an effect chain, **all choices are made by the active player**; the rulebook hands a few
  sub-decisions to a card's owner. Revisit once real card data lands.
- **Rearrange** (after compile/refresh while holding Control) is offered as a quick rotate/skip
  rather than a full drag-reorder.
- Web only so far (no desktop/mobile wrapper). Visual *feel* needs human eyes — automated tests
  cover correctness, not juice.
