# Roomies — web MVP

An original animal-housing **drafting** game. Hot-seat, 2–4 players, 3 rounds. Draft one card per
turn from a rotating hand and play it to your tableau of **rooms** (Environments). Animals earn
points modified by their **roommates** (paired buddies, Security guards, sheep herds, isolation),
each room multiplies its total, and complete **biome sets** score a bonus. Highest score wins.

See the spec: [`../03-mvp-spec.md`](../03-mvp-spec.md) and plan [`../04-build-plan.md`](../04-build-plan.md).

## Run

```bash
npm install
npm run dev        # http://localhost:5173
```

## Verify

```bash
npm run lint       # tsc --noEmit (strict)
npm run test       # Vitest — 54 engine tests (synergies, rules, full-game simulation, determinism)
npm run build      # tsc + vite production build
npm run test:e2e   # Playwright — full game played through the real UI to a result
```

## Architecture

Pure, deterministic engine + thin React UI (per `../../../docs/stack-and-conventions.md`):

```
src/
├── engine/        # PURE. No React/DOM. The game rules + the scoring calculator.
│   ├── cards.ts       # static design data (the single source of truth) → 94-card deck
│   ├── types.ts       # serializable GameState (replayable from {config,seed,log})
│   ├── rng.ts         # seeded mulberry32 + shuffle (only randomness, at setup)
│   ├── setup.ts       # createGame / dealRound
│   ├── legalMoves.ts  # capacity + placement validation / target generation
│   ├── rules.ts       # applyAction(state, action) -> state  (the reducer)
│   ├── scoring.ts     # the heart: per-room synergy scoring + biome sets
│   └── index.ts       # public API
├── state/store.ts # Zustand: GameState + selection + pass-the-device + animation flights
├── ui/            # React presentation:
│   ├── App.tsx        # routes Title → PassDevice → Draft → Place → End; Backdrop + FlyLayer + PhaseBanner
│   ├── Backdrop.tsx   # animated cozy backdrop (drifting blobs + motes)
│   ├── FlyLayer.tsx   # card-glyph flight animations (hand→pool, pool→room)
│   ├── DraftScreen.tsx / PlaceScreen.tsx  # the two phases
│   ├── TitleScreen / PassDeviceScreen / EndScreen / Hud / CardFace
│   └── cardText.ts    # labels, emoji "art" glyphs, badges
└── main.tsx
```

### Two phases per round
- **Draft:** pick-and-pass — pick a card into your pool, pass the rest; Dalai (rotate hands) and
  Marty (swap a hand) fire here.
- **Place:** arrange your drafted pool into rooms; unplaced cards are discarded; press **Done**.

### Deviation from the build plan
The plan named **PixiJS** for the board. Roomies is a **card/tableau game** with no canvas physics,
so it's rendered in **React + DOM** (with Web-Animations-API card flights) — simpler, accessible,
and faster to ship correctly. The engine stays Pixi-agnostic and pure, so portability is unaffected.

## Modes (Main menu → New game → Setup)
- Pick **2–4 players**; set each seat to **Human** or **AI (Easy / Medium / Hard)**.
- **Solo vs AI** (1 human) — no device-passing. **Hot-seat** (2+ humans) — pass-the-device. **Watch
  all-AI** — the way to exercise multiplayer/PvP & balance without hot-seat friction.
- AI turns are **paced + animated** (speed in Settings). **Settings** also has reduce-motion.
- AI difficulties: **Easy** random/first-fit; **Medium** greedy (draft for synergy, place to maximise
  your score); **Hard** medium + biome-set awareness + stronger synergy weighting. (`src/ai/ai.ts`.)
- *Online multiplayer is out of scope (no server/accounts).*

## Controls
- **Draft:** click a card in your hand (or press its number) to draft it; it flies to your pool.
- **Place:** click a pool card → choose a target room (or **Place** a room card) → or **Discard**;
  press **Done** to finish. Keyboard: digits select / choose targets, **D** discard, **E** done,
  **Esc** deselect, **Enter** reveals on the pass screen, **N** new game on the end screen.

## Status — MVP scope & known gaps
- Full **two-phase** loop (draft → place, ×3 rounds) for **2–4 players, any mix of Human / AI**, all
  animal synergies, Joker wildness, improvements, biome **set-collection** scoring (placeholder
  **+6/set**), animated card flights, phase banners, end-screen breakdown + confetti, main menu +
  setup + settings.
- **⚑ Design items still open** (see the spec's ⚑ table): deck is **94** cards (brief says 96);
  biome values + the env→biome map are placeholders; Dekoration is a **no-op** (no animal can score
  below 0 with the given numbers); `Draft:` intercepts fire on the **pick**.
- **Not in MVP:** AI opponents (hot-seat only, by request), online play, save/resume, sound.
