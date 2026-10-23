# Candidate Brief — TCG Circuit (working title: "TCG Tournament Simulator")

> Stage 1 (Discovery). Produced inline (no subagent), per standing preference. See `../../docs/01-discovery.md`.
> **Concept note:** this is an **original, born-digital game concept**, not a board-game adaptation.
> The discovery template's adaptation fields (designer/publisher/BGG rank) don't apply; they are
> repurposed below, and the 1–5 rubric is reinterpreted for an original concept. No stats fabricated.
>
> **▶ Direction update (2026-05-25):** the user resolved the scope risk by **dropping 3D in favour of
> a 2D old-school JRPG** (Pokémon-style overworld) where the whole scene is modelled as explorable
> *locations* (card shop, school, uni, tournament venues). This raises "MVP scope" and "Visual
> feasibility" materially (no 3D asset risk; content scales by adding maps/NPCs/dialogue). The game is
> framed as a **career arc**: discover the TCG → grind the local scene → World Championship → fame.
> Design is captured in `game-design-document.md`. The 3D-feasibility section below is retained for the
> record but **superseded**.

## Title & identity
- **Name:** TCG Circuit *(provisional working codename; user working title "TCG Tournament Simulator")*
- **Designer / Publisher:** Original — this factory.
- **Year:** 2026 (concept).
- **Genre:** Collection / economy management + life-sim **wrapped around an original playable TCG**.
- **Perspective:** 2D/UI core loop + a stylized **3D** tournament-hall "presence" layer (the headline desire).

## At a glance (repurposed for a born-digital concept)
- **Platform / mode:** web-first (factory standard), single-player vs AI; the TCG itself is PvP-capable, so async/online play is a natural *later* axis.
- **Comparable video games (orientation, not competitors-of-record — analysis confirms):**
  - *Kardboard Kings*, *Card Shop Simulator* — card-shop/economy sims (the "buy low, sell singles" fantasy).
  - *Tales & Tactics*, the *Balatro*/*Slay the Spire* deckbuilder wave — the "the card game itself is the fun" halo.
  - *Pokémon TCG Live*, *Magic: The Gathering Arena* — digital TCG clients (what we are **not** cloning, but the bar for "the card game plays well").
- **Market signal:** the physical-TCG audience is large and passionate; "run a card business" and "deckbuilder" are both proven, hot niches. No game we know of nails **all three** at once: *play* an original TCG **+** *live the collector's life* (singles market, packs, money) **+** *feel present at events*.

## The core loop
You're a teen/college-age player on a budget. Between events you **open packs**, **buy and sell
singles** on a fluctuating online market, and **brew decks** from your collection. You enter
**tournaments** — small locals first, then regionals and majors — where you **actually play your
deck** in matches against AI opponents. Winnings (prize cards, cash, reputation) feed back into a
bigger collection and better decks; new **set releases** periodically shake up prices and the
metagame. You win by climbing the competitive ladder while managing limited money and time
(school, travel, rent). The **3D tournament hall** is where matches happen: you walk in, find your
table, and sit down to play.

## Why digital (the experience it enables)
The whole TCG-collector fantasy is *born* for digital: a live singles market with real price
dynamics, instant deck statistics, pack-opening dopamine, a metagame that shifts with each set —
all bookkeeping and logistics that are tedious or impossible in real life, here automated and made
playful. And it lets a player live the part of the hobby most can't afford in reality: chasing the
chase cards, flipping singles, traveling the circuit. The 3D layer sells the *atmosphere* — the
nervous walk to your table at a big event — that a spreadsheet never could.

## 3D feasibility (the headline question)
- **Tech:** achievable. **React Three Fiber** (Three.js + React) slots into the factory's exact
  stack (Vite/TS/React/Zustand); the pure `engine/` is untouched and `render/` becomes an R3F scene.
- **Real constraint = assets, not rendering.** The factory's zero-asset model (synth audio, CSS/Pixi
  primitives) doesn't extend to 3D characters/props. Mitigation: **CC0 low-poly packs** (Kenney,
  Quaternius, KayKit) + **procedural geometry** for the venue + synthesized audio. A stylized
  low-poly look is feasible; photoreal / bespoke character animation is **out of factory scope**.
- **The honest scoping verdict:** the 3D hall is the *least mechanically load-bearing* and *most
  asset-expensive* part. The shippable, fun core is the **2D/UI loop (TCG + collection + market +
  ladder)** — which the factory is genuinely good at. Recommended MVP slice: build the 2D core first,
  add the 3D tournament-hall as an **atmosphere/stretch layer** (walk in, sit at a table) once the
  core loop is proven fun. Do **not** bet the project on the hardest asset piece.

## Scoring (1–5; rubric reinterpreted for an original born-digital concept)
| Criterion | Score | Note |
|-----------|:----:|------|
| Digital fit | 5 | Born digital — live market, pack-opening, deck stats, shifting meta are perfect for a computer. |
| MVP scope | 2 | **The risk.** It's effectively four games stacked (the TCG, a market sim, a collection meta, a life-sim) + a 3D layer. Needs aggressive scoping. |
| Design clarity | 3 | The TCG and the deckbuilder/shop genres are well-understood; how the life-sim wrapper integrates with the card game is fuzzy and unproven. |
| Visual feasibility | 3 | 2D core is easy; the headline **3D hall** is the asset-heavy, risky part (feasible stylized, not guaranteed to feel "there"). |
| Demand signal | 5 | Huge, passionate TCG audience; card-shop sims + roguelike deckbuilders are both hot; the full combination is unoccupied. |
| **Total** | **18 / 25** | High ceiling, real scope risk. |

## Top risk
Scope: it's four games in a trench coat plus a new 3D substrate — without ruthless MVP scoping (2D core first, 3D as a stretch), it never ships.

## Top opportunity
No game lets you *play* an original TCG **and** live the collector/circuit life **and** feel present at events — the combination is genuinely unoccupied, riding two proven trends (TCG fandom + deckbuilders).

## Natural player mode (note, not scored)
Single-player vs AI for the MVP. The TCG is inherently PvP, so **online/async multiplayer is a strong later axis** (the factory has done online MP once already — Nightweave/Lacuna).

## IP first impression (note, not scored)
**Original (clean by design)** — *provided* the TCG stays 100% original. The standing risk is the temptation to clone an existing TCG's cards/mechanics/brand; the hard line is original cards, mechanics, art, and name only. Real-world brands (events, products) become generic stand-ins. Analysis confirms and records the decision.

## Recommendation
**Shortlist → pursue with mandatory scoping.** The concept is strong and the demand is real, but advancing to analysis/spec must come with an explicit, narrow MVP definition: **the 2D TCG + collection + singles-market + tournament-ladder loop is the product; the 3D tournament hall is an atmosphere layer added only after that loop is fun.** Treat "build the whole fantasy at once" as the failure mode to design out.
