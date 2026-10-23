# PRISM — TCG Circuit (MVP build)

The **card game** slice of TCG Circuit: an original, playable trading-card game (**PRISM**) with a
full launch set, a continuous-skill AI ladder, a deckbuilder, a card gallery, and a Free-Play /
Gauntlet / Starter harness. The JRPG career world (overworld, market, tournaments, story) is
**designed + concept-arted and deferred** — see `../03-mvp-spec.md` (the MVP re-scope).

## Run / build / test

```bash
npm install
npm run dev        # dev server at http://localhost:5173
npm run build      # tsc --noEmit + vite build  ->  dist/
npm test           # Vitest: PRISM rules + a full-duel simulation (tests/engine)
npm run sim        # headless AI-vs-AI balance sweep: archetype matrix + skill-monotonicity (tests/sim)
npm run test:e2e   # Playwright happy-path (boots, shell screens, a real-pointer duel turn)
```

`npm run sim` accepts `SIM_GAMES=80` (default 40) for a deeper sweep.

## Architecture (engine/UI split — `../../docs/stack-and-conventions.md`)

```
src/
├── engine/prism/      PURE, deterministic duel engine (no React/DOM/RNG-without-seed)
│   ├── types.ts        state + action + card-def model
│   ├── rng.ts          seeded mulberry32 (the only randomness: shuffle/draw)
│   ├── setup.ts        createDuel + beginTurn + draw (alt-loss)
│   ├── legalMoves.ts   the SINGLE legal-action source the UI and AI both use
│   ├── reduce.ts       reduce(duel, action) -> duel  (Light/Refract, deploy/cast/attach,
│   │                   3-lane combat, keywords, win/alt-loss, fx events)
│   └── evaluate.ts     one heuristic (shared by the AI ladder + sim)
├── engine/career/     PURE Act I career-sim (day/slot clock, money, location, story beats)
├── engine/content/    DATA on the registry the engine reads (no rules hard-coded)
│   ├── cards.ts        the "First Light" launch set (~60 cards, 5 Affinities + neutral)
│   ├── sets.ts/format.ts  Set + Format + Banned/Limited machinery (expandability + B&R)
│   ├── decks.ts        10 legal prebuilt archetype decks
│   ├── opponents.ts    14-opponent Gauntlet roster (rising skill + personas)
│   ├── story.ts        the Act I "Discovery" script (8 beats, 3 story duels)
│   └── world.ts        the 4 locations (home/town/shop/school) as tilemaps + entities
├── ai/                continuous-skill AI (chooseMove) + the shared match runner
├── sim/               balance harness core (matrix + ladder)
├── assets/manifest.ts ASSET SEAM — keyed art (null src => procedural placeholder; set src => real art)
├── render/            theme tokens, the Canvas2D living background, the overworld draw kit
├── ui/                React: store (engine↔UI↔AI driver↔world↔fx↔persistence) + screens + the ONE <CardFace>
└── audio/             synth chiptune + SFX (WebAudio, HMR-safe)
```

## Substrate decision (a recorded deviation)

The build plan splits rendering "dense card/list UI = DOM, boards = Pixi." The MVP is **entirely** the
card game — cards (text-rich), hand, lane *slots*, deckbuilder, gallery, menus — i.e. the DOM half. So
this slice is built in **DOM + a CSS pixel theme + a Canvas2D living background + DOM/WAAPI juice**,
not Pixi. Rationale: crisp pixel-font card text, reliable pointer input, and the required a11y
(keyboard, text-scale, reduce-motion) come free in DOM, and it sidesteps the WebGL-context / async-init
/ teardown pitfalls in `knowledge/patterns/build-gotchas.md` (the reference projects' costliest detours).
This is **not** a "DOM-first-then-migrate" trap: the card/list UI is meant to stay DOM; the *deferred*
top-down world is where canvas is load-bearing and will be authored in canvas from the start, with these
DOM screens layered over it. The pure engine keeps that future clean. (`pixi.js` stays in deps for that
world; the MVP doesn't import it, so it tree-shakes out of the bundle.) See `../art-direction.md` §12.

## PRISM rules (in brief)

Reduce the opponent's **Nexus** (16) to 0; drawing from an empty deck is an alt-loss. Each turn max
**Light** +1 and refills; **Refract** once/turn discards a card for +1 Light (+2 on Refract+ cards).
Units (power = attack = health), Spells (one-shot), Gear (permanent buff). 3 lanes, one unit each;
combat is lane-vs-lane, open lanes hit the Nexus. Keywords: Haste, Guard (each stops one open-lane
attack), Pierce (overkill→Nexus, ignores Guard), Drain, Shield N, Lifegain N, Volatile. Many damage
spells can hit a unit **or** the Nexus (reach). Full text in the in-game **How to Play**.

## Balance note (first tuning pass)

`npm run sim` (40 games/pairing, skill 0.6): archetype win-rate spread **compressed to ~38–42 pts**
(strongest **Greenwall ramp ~70%**, weakest **Tidewatch tempo ~29–31%**) — no auto-win deck, no dead
archetype. The skill scale is **sim-verified monotone** (higher skill beats lower pairwise: ~70 / 80 /
62%, and a wide gap 0.95-vs-0.1 ~85% > a narrow gap ~55%). First-pass tuning that got here: weakened
Guard from "blocks all open-lane damage" to "each Guard stops one attack"; gave burn spells **reach**
(hit a unit *or* the Nexus) so aggro can close; tightened the clock (Nexus 20→16); taxed over-statted
Guard/big bodies; and re-weighted the AI eval toward *closing* over raw board power. **Flagged for
`/test`:** ramp (Greenwall/Wildgrowth) still leans strongest and pure-tempo (Tidewatch) weakest — the
greedy AI under-pilots tempo/sequencing (an "AI-blind" axis per `patterns/ai.md`); confirm under human
play before further nerfs.

## Act I — the game world (Story Mode)

A walkable top-down RPG slice wrapping the card game. **Story → Act I** (or **Continue**) drops you into
your room; walk (WASD/arrows) and interact (E/Space) across **home · downtown · Pip's Cards · school**.
The Act I arc (8 beats): wake up → get a starter from Pip → tutorial duel vs Milo → meet your rival Vex
at school → beat Vex → sign up for Friday Night → beat the shop ace Cora → make your name (hook to the
Regional Qualifier / Act II). Story duels launch the real PRISM engine and fold the result back into the
career (money, story flags). The **bed** sleeps/saves (Continue), the **desk** manages decks + opens the
gallery, the **events board** advances the FNM beat. The career state is JSON-serializable and persisted.

**Economy (built):** you own a **collection** (start with your starter deck's cards). Buy **booster
packs** at Pip's booster stand and open them with a **pack-rip reveal** (rarity-weighted, 1 Rare+
guaranteed); browse/buy/sell **singles** on the home PC's **PrismSingles.net** market (prices drift
daily). The deckbuilder is **collection-aware** in Story mode (build from owned; Quick Play stays
ungated).

**Life-sim (built):** New Story picks a **year-level context** (HS Sophomore/Junior/Senior or College)
that seeds your five **character stats** (Composure / Charisma / Knowledge / Stamina / Reputation) and
difficulty. Around town you spend **day-slots** on **activities** — Study (school library), Work a shift
(shop register, +money −stamina), Socialize (shop lounge), Practice (home) — each consuming one of the
day's 3 slots; sleep restores Stamina and advances the day. A **Status** panel shows your stats.
On **exam days** the school Library runs a Knowledge check (pass → Reputation/money; fail or skip →
Reputation hit); the HUD flags exam days.

**Tournaments + fame (built):** the shop events board runs **AI bracket tournaments** (Friday Night
PRISM + a fame-gated Shop Cup) — one PRISM duel per round vs rising-skill opponents, awarding money,
**fame**, prize packs, and a trophy for the champion. **Fame** (scene reputation) unlocks a
**sponsorship** perk (a daily stipend) and gates bigger events.

**Live metagame + community (built):** a **campaign calendar** drops sets and **Banned/Limited**
announcements on dated events — `currentFormat(day)` makes B&R actually bind in the deckbuilder as the
campaign progresses. **PrismNexus** (on the home PC) is the diegetic community: a **News & B&R** feed, a
**deck-tech forum**, and a **set-review blog** with embedded decklists.

See `../build-report.md` for the full component inventory. Deferred: **Acts II–IV** story (by directive),
more **set content** (the drop machinery is ready — set 2+ is data-only), and final human balance tuning.

## Assets needed (placeholders currently in use)

**I cannot generate reference-grade pixel art**, so the world ships **procedural code-drawn placeholders**
behind the asset-manifest seam (`src/assets/manifest.ts`). To swap in real art (e.g. **LimeZu Modern
Interiors/Exteriors + Modern UI**, **thehorseman007 interiors**, or a commissioned/AI-pixel pass), drop
the files in `app/public/art/`, set each `src` in the manifest, and call `preloadAssets()` at boot —
**no renderer/engine change**. Keys to fill:

- **Tiles (16×16):** `tile.grass`, `tile.path`, `tile.floor`, `tile.wall`, `tile.tree`
- **Characters (16×24; a 4-dir × 2-frame walk sheet is ideal):** `spr.player`, `spr.sis`, `spr.pip`,
  `spr.milo`, `spr.vex`, `spr.cora`, `spr.classmate`
- **Objects (16×16):** `obj.door`, `obj.building`, `obj.bed`, `obj.desk`, `obj.counter`, `obj.table`,
  `obj.shelf`, `obj.board`, `obj.pc`, `obj.booster`
- **Card art** (the `<CardFace>` art window) also slots in via the same seam (per-card `art` field).

## Dev / e2e seam

`window.__prism` — `startFreePlay(playerDeckId, oppDeckId, skill)`, `startGauntlet(deckId)`,
`state()`, and the raw `store`. Used by `tests/e2e`.
