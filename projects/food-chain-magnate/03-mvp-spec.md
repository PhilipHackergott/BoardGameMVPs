# MVP Spec — Food Chain Magnate

> Stage 3 (Specification), the *what*. Operator-run, 2026-05-25.
> **Real-IP build, non-distributed** (per the recorded `ip` decision): the app uses the real
> *Food Chain Magnate* name and IP directly. **Do not distribute.** Mechanics target the
> **base game** (no expansions). Rules numbers below were sourced from public rules (UltraBoardGames
> official-rules mirror, Splotter materials). Where a value isn't reliably published it is
> parameterized in `config` and flagged **`[VERIFY]`** (transcribe off the components) rather than
> fabricated — see the data tables. FCM is **deterministic and dice-free**, which shapes everything.

---

## ⚑ MVP decision table (the gate's decision sheet)

These are *adaptation / scope* decisions, not rule changes. Build against the defaults; each is one
edit away from revision. **D1 (player count) is now LOCKED — see the row and "Player count (D1 — locked)".**

| # | Decision | Default / recommendation | Alternative |
|---|----------|--------------------------|-------------|
| **D1** | **Player count** ✅ **LOCKED (2026-05-25)** | **Skirmish: 2–4 players, any mix of humans/AI, all three seat counts (2/3/4) tuned & tested. Campaign: solo only — 1 human + 1–3 AI rivals (total 2–4 seats), rival count set per scenario.** The whole MVP lives at **2–4 seats**. | **Deliberate scope cap:** the cardboard game also supports **5 players** — intentionally out of the MVP. The engine is written **player-count-generic** (logic parameterized by `config.seats`; no hard-coded max), so adding 5p later is **additive** (lift the cap + transcribe the 5p setup data + a tuning pass), *not* a refactor. See "Player count (D1 — locked)". |
| D2 | Edition / content | **Base game only**, content-complete (all milestones, full employee deck, all marketing/goods) | + *Ketchup Mechanism* expansion (post-v1, built as a default-off data module) |
| D3 | Opponent | **vs-AI included** (difficulty ladder) — FCM's determinism + open info make a strong AI viable, unlike WotR | AI-less hot-seat only (rejected — solo/AI is a top digital-only win here) |
| **D4** | **UI rendering substrate** | **Hybrid, committed up front: Pixi for the City board; DOM/React for the Company & management layer** (org chart, job market, milestones, HUD, modals). Clean board-vs-panels seam — *not* two-of-the-same migrated later. | All-DOM/SVG (the board is a snapped grid — feasible; avoids any seam) — viable fallback if the Pixi board underdelivers. See "UI architecture". |
| D5 | Undo | **Free undo-to-decision in solo/hot-seat** (no hidden RNG ⇒ safe); a per-game "competitive integrity" toggle locks it | No undo (rejected — undo is a marquee digital-only feature for this brutal game) |
| D6 | Hidden info | **Near-perfect-information game.** Only secrets: each turn's **simultaneous Restructuring pick** (until reveal) and **reserve cards** (until a bank-break). Hot-seat handles these with a brief **private-pick step**, *not* a full blur-handoff like WotR | PIN gate (overkill) |
| D7 | Map source of truth | **A data table transcribed from the board** (tiles, road graph, house/garden lots, distances) | Hard-code per screen (rejected — not testable) |
| D8 | First-playable economy slice | **The sell loop first**: map + restaurants + a hand-built demand + **Dinnertime resolution** + payday + bank-end. Then layer org-chart depth, marketing geometry, milestones | Build org-chart first (rejected — the demand market is the heart; prove it first) |
| D9 | Board render fidelity | **Clean top-down "suburban plat / blueprint" city** (Pixi): tiles + roads + house/garden lots + per-company restaurant markers + **marketing-footprint & distance overlays** + delivery animations | Flat tokens only (lower legibility for the spatial economy) |
| **D10** | **Campaign mode** (now first-class) | **Ship a hand-authored ~12-scenario arc ("Rise of a Fast-Food Empire") + a Career meta-layer (content/stats/unlocks, *not* power) + AI personalities**, built on the base engine — scenarios are *setups + objectives*, not a new ruleset | Fewer scenarios; or a sandbox-only persistent-rivals mode (rejected — the authored arc carries the difficulty ramp + onboarding). A **scenario editor / sharing** UI is the deferred part (the `ScenarioDef` format is moddable; the editor is post-v1) |

---

## Pitch & target experience
Run a 1950s fast-food empire where **the org chart is the engine**: hire and train a tower of
employees, blanket the suburbs with billboards and radio jingles to *create the hunger*, then win
**Dinnertime** by being the closest restaurant that can serve a house's whole order for the lowest
price — and the computer does every scrap of the distance/price/payday math instantly and perfectly.
A ruthless, luck-free business duel/brawl you can finally play *fast*, **solo against a real AI**,
save mid-game, and rewind to learn from. The famously brain-burning heavyweight, with the
bookkeeping lifted off the table.

## Scope line (the single core experience the MVP delivers)
**One complete game of the base ruleset**, all subsystems present and rules-enforced: the
**company/org-chart** (restructuring, hiring from the shared job market, training up the employee
tree), the **map economy** (placing/moving restaurants, producing burgers/pizzas, sourcing the three
drinks at range), **marketing** (billboard/mailbox/radio/airplane footprints generating house
demand), the **Dinnertime selling resolution** (closest-qualifying-chain by price+distance, full
tie-break chain, gardens), **pricing** (price/discount/luxury managers), **Payday** (salaries, the
$50×players bank, the two-bank-break end + richest-wins), and the **full milestone board**. Playable as
**hot-seat, vs-AI skirmish, and a first-class Campaign mode** (*Rise of a Fast-Food Empire* — an
authored solo-vs-AI arc with bespoke objectives, AI personalities, and a Career meta-layer),
content-complete. Out: expansions, online multiplayer, accounts.

## Theme & assets
Real *Food Chain Magnate* theme used directly (non-distributed prototype): the 1950s suburban
fast-food setting, the real employee roles, milestones, marketing types, and goods. All assets are
**code-drawn / procedural / CC0-icon-derived** per the factory's zero-asset model (see Concept art &
visual identity) — not copied from Splotter's components. Art is built *intentionally from the first
pass* (themed, cohesive), not "polished later".

---

## Rules to implement (sourced numbers carried in; `[VERIFY]` = transcribe off components)

### Sides, company & the org chart
- **2–4 companies** in the MVP (any mix of human and AI; the engine is **player-count-generic** — see
  the D1 lock + the 5-player note). Each begins with a single **CEO** card.
- **The company is a pyramid (org chart):** the **CEO has 3 report slots**; **manager** cards have
  **2–10 report slots** (per card). **Only the CEO and managers may have subordinates**; a card
  reporting to a manager must be a normal (non-manager) employee. Each player may own **only one** of
  any card marked with the "top-position" symbol. `[VERIFY]` exact slot counts per manager card.
- **Restructuring** (phase 1, simultaneous & secret): each player picks which owned cards "go to
  work" this turn and arranges them legally under the CEO; un-chosen cards "go to the beach" (unpaid,
  inactive). Revealed simultaneously.

### Turn structure — fixed phases (the engine's top-level state machine)
1. **Restructuring** — simultaneous secret selection + legal org-chart arrangement; reveal.
2. **Order of Business** — turn order = **most open (empty) report slots acts first** (chooses its
   slot on the order track first). `[VERIFY]` exact tie-break.
3. **Working 9-to-5** — in turn order, each company spends **one action per working card**, resolving
   *all* of a company's actions before the next company. Action categories (some ordered):
   **Recruit** (take a card from the shared **job market** within the recruiter's reach),
   **Train** (upgrade a card one step along its track), **Marketing** (place a campaign), **Get food
   & drinks** (produce burgers/pizzas; buy drinks at the buyer's range), **Place/Move restaurant**,
   **Place house/garden**. **Resolved (rulebook):** actions resolve in the fixed order **Recruit →
   Train → Marketing → Get food & drinks → Place/move restaurants → Place houses/gardens** (org-chart
   position is irrelevant); pricing/discount/luxuries/CFO/recruiting-mgr/HR/waitress actions are
   **mandatory**, others optional.
4. **Dinnertime** — houses are processed **in number order**; each house with demand buys (see Selling).
5. **Payday** — companies may **fire** cards, then **pay $5 per salaried card**; unaffordable ⇒ must fire.
6. **Marketing resolution** — active campaigns place demand tokens on houses (processed by campaign number).
7. **Clean-up** — discard unsold/expired food & drink (unless a Freezer milestone stores up to 10),
   return cards from "at work" to hand, flip "COMING SOON" restaurants to "WELCOME".

### Selling — the Dinnertime resolution (the heart; get this exactly right)
For each house **with demand tokens**, in house-number order:
- Find every chain with a restaurant **connected by road** that can deliver the house's **entire**
  order (all the demanded food **and** drinks, from stock/production this turn).
- Each qualifying chain's **score = unit price + distance**, where **distance = number of tile
  borders crossed** along the road from restaurant to house. **Lowest score wins** the sale.
- **Default unit price = $10**, modified by the chain's pricing staff: **price manager −$1**,
  **discount manager −$3**, **luxury manager +$10** (stacking per the cards present). *(verified)*
- **Tie-breaks (in order):** most **waitresses** → **earliest in turn order**. *(verified)*
- The winning chain sells the house **all** demanded items, earning **unit price × items** from the
  **bank**. **Gardens double** the unit price received for items at that house. *(verified)*
- **Waitress bonus:** each waitress earns the chain **+$3** at Dinnertime (**+$5** after the
  *First waitress* milestone). **CFO**: chain gets a **+50% cash bonus** at Dinnertime. *(verified)*

### Goods & production
- **Foods:** **burgers, pizzas** (40 wooden of each). **Drinks:** **soft drink, lemonade, beer**
  (40 of each). *(verified component counts)*
- **Production / sourcing** (Working actions): **Kitchen Trainee** → 1 burger *or* pizza;
  **Burger/Pizza Cook** → quantity per card; **Errand Boy** → 1 drink of choice; **Cart Operator**
  → 2 drinks per drink-symbol, **range 2**; **Truck Driver** → 3 per symbol, **range 3**; **Zeppelin
  Pilot** → 2 per symbol over tiles flown, **range 4**. `[VERIFY]` exact per-card quantities; the
  *First cart operator* milestone gives all drink-buyers **+1 range**; *First errand boy* gives buyers
  **+1 drink per source**.

### Marketing (creates demand — spatial)
Campaigns place **demand tokens** on houses in their footprint, over a number of turns:
- **Billboard** — reaches **orthogonally-adjacent houses** (typically 1–2); placed road-adjacent.
- **Mailbox** — reaches all houses reachable **without crossing a road**.
- **Radio** — reaches every house on its **tile + the 8 surrounding tiles** (3×3).
- **Airplane** — flies **1/3/5 rows or columns** across the board from a board edge; no range limit.
- A campaign advertises a **specific product** (a burger / pizza / a drink) and seeds that demand.
- **Marketeer tiers gate which campaigns you can run and the range/duration**: Marketing Trainee
  (billboard, short duration, limited range), Campaign Manager (+mailbox), Brand Manager / Brand
  Director (+radio, +airplane; **unlimited range**). `[VERIFY]` exact durations per tier and which
  tier unlocks which campaign. The *First billboard* milestone makes that owner's campaigns
  **permanent** (and stops paying marketeer salaries); *First airplane* gives **+2 open slots** for
  Order of Business; *First radio* seeds **+2 goods of the advertised type** on each reached house.

### Pricing
Default unit price **$10**. **Price Manager −$1**, **Discount Manager −$3**, **Luxury Manager
+$10** (raises revenue per item but loses the lowest-price tie-break). The *First to lower prices*
milestone makes the owner's prices **automatically $1 lower**.

### Money, the bank & game end
- **Bank starts with $50 × number of players.** Players earn from the bank at Dinnertime and pay
  salaries (to the bank) at Payday. *(verified)*
- **End trigger:** the game runs until the **bank runs out of money twice**. On the **first** break,
  **reserve cards are revealed**, their total added to the bank, and CEO slots adjust per the cards.
  On the **second** break, the game finishes the current phase 4 and ends. **The richest player (most
  cash) wins.** `[VERIFY]` exact reserve-card values + the slot-adjustment rule. *(verified: $50×players,
  two-break end, richest wins)*

### Milestones (one-time races for permanent bonuses — a content pillar)
A shared board of milestone tiles; the **first** company to meet a trigger **claims** it (everyone
who meets it on the *same* turn shares/claims, then it **locks** for everyone else). Each grants a
**permanent** bonus. **Resolved (rulebook): exactly 18 distinct milestones** (84 physical cards =
copies for simultaneous same-turn claims); the enumerated set (name → trigger → permanent effect) is
in the Content catalog below + `06-card-reference.md` §4. Milestones are *the* strategic
spine — they must all ship, data-driven.

### Determinism
FCM has **no dice and no in-play shuffled decks**, so determinism is nearly free: the only randomness
is **initial setup** (map tile layout, job-market seeding, reserve-card deal) drawn from a single
**injected seeded PRNG**. Every game is reconstructable from `{config, seed, action-log}` — powering
replay, undo-to-decision, async, and the playtest stage.

---

## `config` data tables — sourced vs. `[VERIFY]`

The engine reads these from data, never hard-codes them. **Sourced** = confirmed this stage;
**`[VERIFY]`** = transcribe/verify off the physical components before relying on it (a wrong value
is a one-line fix, per the Magical Athlete / WotR config-CONFIRM practice).

| Table | Status | Value / note |
|-------|--------|--------------|
| `bank` | **Sourced (rulebook+image)** | $50 × players; players start $0; two-break end; richest wins (tie → earlier turn order). 1st break: reveal reserves, add $, most-common reserve slot# (2/3/4; ties→higher) sets all CEO slots. **Reserves resolved: 18 = 6 × {+$100/2-slot, +$200/3-slot, +$300/4-slot}.** |
| `pricing` | **Sourced** | base unit price $10; price mgr −$1, discount mgr −$3, luxuries mgr +$10; "First to lower prices" −$1. Bonuses don't change unit price. |
| `selling` | **Sourced** | qualify = road-connected + can serve full order; min(price+distance); tie-break waitresses→turn order; garden doubles unit price (not bonuses); CFO/$100 +50% (round up); waitress +$3/+$5. |
| `distance` | **Sourced (rule)** | distance = tile-borders crossed along road, to the closest restaurant entrance. Exact map adjacency `[VERIFY]`. |
| `goods` | **Sourced** | burgers/pizzas/softdrink/lemonade/beer, 40 each. |
| `production` | **Sourced (rulebook)** | kitchen-trainee 1 burger *or* pizza; burger cook 3 / chef 8; pizza cook 3 / chef 8; errand-boy 1 drink; cart-op r2 / 2-per-source; truck r3 / 3; zeppelin r4 / 2, ignores roads. |
| `marketing` | **Sourced (rulebook)** | footprints (billboard=orth-adjacent; mailbox=block/no-road-cross; radio=tile+8 around; airplane=1/3/5 rows-cols from edge); tiers (trainee billboard dur 2 r2 → campaign mgr mailbox dur 3 r3 → brand mgr airplane dur 4 no-range → brand dir radio dur 5); 16 tiles (6/4/3/3). |
| `orgChart` | **Sourced (rulebook+image) — RESOLVED** | CEO 3 slots (→2/3/4); VP ladder Mgmt Trainee 2 → Junior VP 3 → VP **4** → Senior VP 5 → Exec VP 10; each tier trains into the next column's cluster (full edges in `06-card-reference.md` §3.2); only CEO/managers have reports; one-of-each top-symbol. |
| `salary` | **Sourced — RESOLVED** | $5 per *trained* card at Payday (structure or beach); **CEO + all 8 entry (►) cards are salary-free.** |
| `milestones` | **Sourced (rulebook) — resolved: 18** | **exactly 18 distinct** milestones; full names/triggers/effects in `06-card-reference.md` §4 (84 physical cards = copies). |
| `employees` | **Sourced → `06-card-reference.md`** | full roster, training tree (3 self-tracks + the resolved management tree), abilities, slots, entry/salary all sourced. Only residual `[VERIFY]`: **per-card deck counts** (the 222 breakdown isn't in the rulebook — needs physical cards/BGG file; build impact minor — §9). |
| `jobMarket` | **Sourced (rule)** | hire only at entry (►) positions; if a deck is empty you can't hire it unless you immediately train past it; CEO 1 free recruit + recruiter actions. Stock = the removed/unhired cards (no separate "market size"). |
| `map` | **Rules sourced / tile art physical-only** | 20 tiles (5×5 sq each), randomly placed/rotated; map size by players (2p 3×3 / 3p 3×4 / 4p 4×4). The 20 tiles' exact drink/road/house art is **not in the rulebook** (sample tile only) → MVP **procedurally generates** rules-legal tiles (map is random anyway); a later scan swaps in via data (§9 item 5). |
| `setup` | **Sourced (scaling) — RESOLVED** | bank $50×players; 1 CEO + 3 restaurants + a 3-reserve set (keep 1) each; ► entry-card copies = 1 (2–3p) / 2 (4p); billboards removed per count (#12/#15/#16 → #15/#16 → #16). |
| `turnOrder` | **Sourced (rule)** | most open slots acts first; tie → whoever was ahead in the previous turn's order (+2 slots if "First airplane"). |

---

## Content catalog & depth (the data-driven spine — this is the reason-to-play)

FCM's depth lives in three interlocking catalogs, all modeled as **data on a registry the engine
interprets** (per `knowledge/playbooks/content-depth.md`). The MVP ships them **complete**.

### 1. Employees (the org-chart deck) — the central catalog
Modeled as records `{ id, track, entry?, salaried, slots?, action, trainsInto[], topSymbol? }`.
**Fully transcribed from the official rulebook** (`FCM_Rules_EN_v3.pdf`, incl. the p.5 card-layout
image rendered to PNG) — complete tree + citations in **`06-card-reference.md`**. The training tree is
a first-class data structure:
- **Three self-tracks (own upgrade chain from a ► entry card):**
  - **Kitchen:** Kitchen Trainee (1 burger *or* pizza) → Burger Cook (3) → Burger Chef (8); and → Pizza Cook (3) → Pizza Chef (8).
  - **Buyers:** Errand Boy (1 drink) → Cart Operator (r2, 2/src) → Truck Driver (r3, 3/src) → Zeppelin Pilot (r4, ignore roads, 2/src).
  - **Marketeers:** Marketing Trainee (billboard; r2, dur 2) → Campaign Manager (mailbox; r3, dur 3) → Brand Manager (airplane; no range, dur 4) → Brand Director (radio; dur 5).
- **Management tree (RESOLVED):** the black VP ladder runs across and **each tier trains into the next
  column's cluster** — slots **2→3→4→5→10**:
  - **Management Trainee (2)** → New Business Developer, **Junior VP (3)**, Luxuries Manager (+$10)
  - **Junior VP (3)** → Local Manager, **Vice-President (4)**, Discount Manager (−$3), Recruiting Manager (2×), Coach
  - **Vice-President (4)** → Regional Manager, **Senior VP (5)**, Guru
  - **Senior VP (5)** → CFO (+50%), **Executive VP (10)**, HR Director (4×)
  - *(Correction vs. the prior draft: recruiting & training are **not** linear tracks — Recruiting Girl
    and Trainer are standalone entry cards; Recruiting Manager/HR Director/Coach/Guru are trained from
    black VP cards, per the rulebook.)*
- **Entry (►, hireable) — all 8 are salary-FREE:** Management Trainee, Pricing Manager (−$1), Recruiting
  Girl (hire 1), Trainer (train 1), Errand Boy, Kitchen Trainee, Marketing Trainee, Waitress (+$3/+$5).
  **CEO** also free; **every *trained* card costs $5.** **Top-position (1× per player):** Executive VP,
  Regional Manager, Guru, CFO, HR Director, Luxuries Manager, Brand Director, Zeppelin Pilot, Burger/Pizza Chef.
  *Residual `[VERIFY]`: per-card deck counts (the 222 breakdown — not in the rulebook; needs the physical
  cards / BGG file) — see `06-card-reference.md` §9.*

### 2. Milestones (the permanent-bonus race) — enumerated, all ship
Modeled as `{ id, name, trigger, effect, shared? }`. The base set (sourced from UltraBoardGames; exact
count `[VERIFY]`):

| Milestone | Trigger | Permanent effect |
|-----------|---------|------------------|
| First billboard placed | place a billboard campaign | your marketing campaigns **never end**; **stop paying marketeer salaries** |
| First to train | train an employee a level up | **−$15** salary discount (ongoing) |
| First to hire 3 in a turn | hire ≥3 employees in one turn | immediately gain **2 Management Trainee** cards |
| First burger marketed | run a burger campaign | **+$5** whenever you sell a burger |
| First pizza marketed | run a pizza campaign | **+$5** whenever you sell a pizza |
| First drink marketed | run a drink campaign | **+$5** on all drink sales |
| First errand boy played | play an errand boy | buyers get **+1 drink per source** |
| First to have $20 | hold $20 cash any time | may **look at the face-down reserve cards** |
| First burger produced | produce a burger | immediately gain a **Burger Cook** |
| First pizza produced | produce a pizza | immediately gain a **Pizza Cook** |
| First waitress played | play a waitress | waitresses earn **$5** (not $3) |
| First to throw away food/drink | discard ≥1 token in clean-up | tile becomes a **Freezer** (store up to 10 tokens) |
| First to lower prices | play a price/discount manager | your prices are **automatically $1 lower** |
| First cart operator | place a cart operator | all drink-buyers get **+1 range** |
| First airplane campaign | place an airplane | **+2 open slots** for Order of Business |
| First radio campaign | place a radio | seed **+2 goods** of the advertised type on each reached house |
| First to have $100 | hold $100 at end of phase 4 | **CEO also acts as a CFO** (+50% cash bonus) |
| First to pay ≥$20 salaries | pay ≥$20 in a Payday | may **stack training** actions on one employee |

**Resolved (rulebook): all 18 are base-game**, full wording transcribed in `06-card-reference.md` §4.

### 3. Marketing & goods (above) — the spatial demand catalog
Campaign types × products × footprints, plus the 5 goods and their production sources. All data.

**Design axes & openings:** the catalog already spans *org-chart depth* (tracks/tiers), *spatial
economy* (map/marketing/distance), *pricing*, and *milestone-driven strategy*. The one under-served
axis worth opening as a **default-off variant module** (post-base) is **alternative/expansion content**
(the *Ketchup Mechanism* modules, alternative milestone sets, map variants) — the spine is built so
these are additive data, not rework.

---

## Modes & AI

### Modes
- **Hot-seat skirmish** (2–4 humans on one device) — the simultaneous Restructuring pick uses a brief
  **private-pick step** per player; the rest is open-information so play is continuous.
- **vs-AI skirmish** — a one-off game across **2–4 seats, any mix of humans and AI** (solo = 1 human +
  1–3 AI), with rival **personalities** selectable. **A marquee feature**: FCM's determinism + open
  information make a genuinely strong AI tractable (unlike WotR).
- **Campaign — *Rise of a Fast-Food Empire*** (first-class; full design in the dedicated section
  below) — a single-human **solo-vs-AI** arc of authored scenarios with bespoke objectives, AI
  personalities, and a persistent Career meta-layer. The headline digital-only mode, and the game's
  built-in onboarding / difficulty ramp.
- **Online async** — **out of MVP**, but the state model + action log are built to support it cheaply later.

### AI — a real difficulty ladder (sim-verified)
A **single shared evaluator** (project cash + asset/position value − projected salary liability,
with milestone valuation), driving ≥ **three tiers off the one evaluator**:
- **Low** — greedy on this-turn Dinnertime profit + cheap heuristics (no lookahead), light jitter.
- **Medium** — one-turn lookahead: simulate the deterministic Dinnertime to value marketing/production
  /price plays; pursue reachable milestones.
- **Hard** — deeper valuation (multi-turn marketing payoff, contesting rivals' demand and milestones,
  bank-clock awareness). Still the same evaluator, more search/weight.
The ladder **must be sim-verified to actually climb** (Hard beats Medium beats Low across seeds) via
`npm run sim` (see Balance & tuning). AI plays **only through the public engine API** — the headless
sim *is* the AI driver — so "AI-ready" is provable in tests before any UI.
- **AI personalities** (campaign rivals + skirmish flavor) are *evaluator-weight presets* on this same
  evaluator × a tier — named rivals, **not new AI code** (e.g. a marketing-weighted "Ad-Man", a
  price-war "Discounter"). See Campaign mode.

---

## Campaign mode — *Rise of a Fast-Food Empire* (a first-class mode)

A hand-authored, single-human **solo-vs-AI** campaign that doubles as the game's difficulty ramp and
onboarding — **the digital-only feature that most justifies the build**. It is not a reskin of
skirmish: each stop is a *designed scenario* with a bespoke setup, a named rival roster, and
**win/lose conditions beyond "richest when the bank empties."** A light persistent **Career** layer
frames the arc, tracks your record, and unlocks *content* — never power.

### The shape, and why
Two interlocking pieces:
1. **Scenarios — the content.** A curated arc of **~12 missions** across four eras (late-'50s roadside
   diner → '60s suburban boom → '70s chain wars → '80s corporate empire). Each is a fully-specified,
   **data-driven `ScenarioDef`** (curated map, rival roster + personalities, starting conditions,
   milestone subset, enabled rules, objective(s), fail condition(s), and bronze/silver/gold **par
   medals**) wrapped in briefing/debriefing flavor that tells the rise-of-an-empire story.
2. **Career — the meta-frame (content & stats, *not* power).** Your **company persists** (name, color,
   crest); a **Career Dossier** tracks lifetime stats — the "balance sheet": total revenue, games won,
   milestones claimed, rivals bankrupted, scenarios cleared + medals, fastest win, signature strategy.
   Clearing scenarios **unlocks content**: new skirmish maps, new AI rival personalities, alternate
   milestone decks, cosmetic crests/themes, and optional **challenge modifiers** (self-imposed
   handicaps that raise the medal ceiling).

> **The load-bearing design decision: no persistent power-creep.** FCM is a tightly-balanced
> *symmetric* economy; permanent earned stat-buffs the player carries *into* a game would wreck it.
> So the Career layer earns **content, challenge, and bragging rights — not advantage.** Where a
> scenario is asymmetric (a head start, a handicap, a recession), that asymmetry is **authored into
> the scenario and tuned around it**, never a buff the player stacks across the campaign. This keeps
> every game honest and lets campaign + skirmish share **one balanced engine** — a campaign scenario
> is *a setup + objectives*, not a different ruleset. (Why a narrative-scenario arc over a pure
> meta-progression grind: the arc is what carries the **difficulty ramp + onboarding** for a famously
> brutal game, and a stat-buff tree is exactly the thing that would break the economy.)

### Scenario anatomy (a `ScenarioDef`, all data)
`{ id, era, title, briefing, map, seats:[{ human|aiProfileId }], start:{ cash, orgChart?, market?,
bankSize? }, milestoneSet, enabledRules, objectives:[ObjectivePredicate], fails:[FailPredicate],
medals:{ bronze, silver, gold }, debriefing, unlocksOnClear:[UnlockId] }`. Skirmish is just the
trivial "default" scenario (full map, all milestones, base win condition).

### Objective & fail vocabulary (composable predicates — reuses the milestone-hook pattern)
Pure predicates evaluated each phase by `evaluateObjectives(state, scenario)` / `evaluateFails(...)`:
- `richestAtBankEnd` (the base game's own condition) · `cashBy(amount, turn)` / `netWorthBy(...)`
- `bankruptRivals(rivalIds, byTurn?)` — drive named rivals out · `outlastAll` — last solvent company
- `employeesFirstTo(n)` · `milestonesFirst(set)`
- `monopolizeDemand(product, area)` · `marketShare(product, pct, area)`
- `surviveUntil(turn)` — often paired with a **`recession` modifier** (reduced bank payouts / inflated
  salaries: "survive the 1958 recession")
Composed with **AND/OR + a turn limit**; `fail` predicates mirror them (bankruptcy, turn limit, a
rival crosses a threshold). **Medals** key off margins (turns-to-win, cash lead, optional sub-goals).

### The arc (12 scenarios — each spotlights a subsystem; doubles as the tutorial)
Early scenarios pin most systems and open one at a time (so campaign *is* the onboarding); difficulty
climbs the AI ladder. Illustrative (final list authored at build, all data):
1. **Grand Opening** — one weak rival, pre-seeded demand; learn produce→sell→payday. *(tutorial)*
2. **Word of Mouth** — introduces marketing; the first-billboard milestone matters.
3. **Price War on Main Street** — a *Discounter* rival; pricing & the selling tie-break.
4. **Hiring Spree** — org-chart growth; objective "first to N employees".
5. **The Burger Belt** — monopolize burger demand in a house cluster.
6. **Madison Avenue** — radio/airplane reach vs an *Ad-Man* rival.
7. **The 1958 Recession** — survive N turns under the recession modifier.
8. **Logistics** — drink range/distribution vs a *Zeppelin* rival.
9. **Two-Front War** — bankrupt two named rivals by turn 12.
10. **Hostile Takeover** — a full 4-seat table (you + 3 rivals), full map; outlast them all.
11–12. **Empire** — capstone: hardest AI, all systems on; gold = a dominant margin.

### AI personalities (the vs-AI ladder, made visible)
Named rivals = **strategy archetypes** = evaluator-weight presets on the one shared evaluator × a
difficulty tier (no new AI code):
- *Old Man Hubbard* (tutorial pushover) · *Patty Vanderburg, the Burger Baron* (volume/production) ·
  *Mad Sterling, the Ad-Man* (marketing-heavy) · *Dollar Bill, the Discounter* (price war) ·
  *V. P. Crane, the Suit* (management engine / milestone-greedy) · *Zeppelin Zoë, the Logistics
  Tycoon* (drink range/distribution).
Each is `{ archetype, evaluatorWeights, tier, opening?, flavor, portrait }`. They give campaign its
rivals and skirmish its flavor, and are how the difficulty curve is *authored* per scenario.

### Persistence & save/resume
Campaign progress (Career state) **and** an in-progress scenario both autosave — extends the shell
persistence already specced. Career state is a small serializable structure
(`{ company, stats, clearedScenarios, medals, unlocks }`).

### Player count (D1 — LOCKED)
**The whole MVP operates at 2–4 seats.**
- **Skirmish:** **2–4 players, any mix of humans and/or AI**, with **all three seat counts (2 / 3 / 4)
  tuned & tested**. Solo skirmish = 1 human + 1–3 AI.
- **Campaign:** **solo only** — **1 human + 1–3 AI rivals**, the rival count **set per scenario** (so
  campaign also spans the 2–4-seat range and uses it for variety + the difficulty curve).
- **Deliberate cap at 4:** the cardboard game also supports **5 players**; that is intentionally **out
  of MVP scope**. The cap is enforced at the lobby/config layer (`config.maxSeats = 4`), **not** baked
  into engine logic.
- **Engine boundary (it lines up cleanly):** the engine is **player-count-generic** — every per-player
  quantity (bank `$50 × N`, setup placement, turn order, win check) is parameterized by `config.seats`
  and read from data; **no branch hard-codes a max of 4 or assumes a 5th seat**. Adding 5p later is
  therefore **additive**: lift `maxSeats`, transcribe the 5-player setup row (a `[VERIFY]` data add),
  and run a tuning pass — **no refactor**.

---

## Screens & flow (explicit screen inventory — a build deliverable, not an afterthought)

FCM has two UI domains: a **spatial City board** and a **tabular Company/management layer**. The
screen set covers both. Flow: **Main Menu → New Game setup → In-game shell (phase-driven) → End/
Standings**, with Pause/Settings/Rules/Log reachable throughout.

**Front-of-house (shell — baseline, per `front-of-house-shell.md`):**
1. **Main Menu** — Continue · New Game · How to Play (rules/tutorial) · Settings · (Replays/History).
2. **New Game setup** — **seat-count selector (2–4)**, each seat set Human or AI (+ AI difficulty /
   personality); company name + color; map/seed selector (blank = random); variant toggles
   (default-off); competitive-integrity (undo) toggle.
3. **Pause** — freezes the game; Resume · Settings · Rules · Restart · Quit to menu.
4. **Settings** — Music/SFX volume mixer + mute, text scale, colorblind-safe mode, reduce-motion,
   undo toggle, AI speed.
5. **How to Play / Rules** — searchable rules reference + an optional **guided first turn** tutorial.

**In-game shell (a persistent frame; phases swap the active panel/affordance):**
6. **City Board (center)** — the Pixi map: tiles, roads, house/garden lots (numbered), per-company
   restaurant markers, placed marketing pieces; **overlays** for marketing footprints, road distance,
   reachable houses, and Dinnertime delivery routes. Pan/zoom.
7. **Company / Org-chart panel** — your CEO-rooted pyramid with report **slots**; **drag-drop card
   slotting** for Restructuring; shows salaried/at-work/beach state; legality enforced with reasons.
8. **Restructuring view** — the per-turn secret pick: choose which owned cards work + arrange them;
   **private-pick gate** in hot-seat; "reveal" beat when all are locked.
9. **Job Market (Hiring) panel** — the shared offer of recruitable cards; reach/affordability shown;
   recruit action wired to the active recruiter.
10. **Training view** — pick a card + an upgrade along its track (the training tree visualized).
11. **Marketing view** — choose campaign type + product; **preview the footprint on the board** before
    committing (a what-if overlay); shows duration/range by marketeer tier.
12. **Production / Sourcing view** — produce burgers/pizzas; buy drinks (buyer range shown on board).
13. **Restaurant placement view** — place/move restaurants ("COMING SOON"→"WELCOME"), with reach preview.
14. **Pricing control** — set/show your effective unit price (price/discount/luxury staff effects).
15. **Dinnertime resolution view** — the instant-scoring centerpiece: houses resolve in order with a
    **step-through "why each house bought here"** explanation (closest qualifying chain, price+distance,
    tie-break), cash flying to companies (number-go-up beat). Auto-fast or step mode.
16. **Payday view** — salary tally per company; fire affordances; bank-depletion meter ticks.
17. **Milestone board** — always-glanceable: each tile, who claimed/locked it, and what's still open
    (with live "you could claim X this turn" hints).
18. **Standings / HUD** — per-company cash, card count, open slots, turn-order track, current phase,
    and the **bank-clock gauge** (how close to each bank-break — the famously opaque "how long left").
19. **Log / Replay** — full action-log timeline; scrub/replay the game (à la Lacuna's `LogModal`).
20. **End / Standings screen** — final cash ranking, the deciding state, a one-screen "how the game
    was won" recap; New Game / Replay.

**Campaign screens (mode-specific — see Campaign mode):**
21. **Career Hub / Campaign Map** — the era arc as a stylized expansion map; scenario select
    (locked / available / cleared + medal), with entries to the Career Dossier and Unlocks gallery.
22. **Scenario Briefing** — the mission: narrative setup, objective(s) & fail condition(s), rival
    roster (personalities), starting conditions, and bronze/silver/gold thresholds; Start.
23. **Scenario Debriefing** — pass/fail, medal earned, an objective breakdown, Career stat deltas,
    and any unlocks; Retry (for a better medal) / Continue.
24. **Career Dossier** — the persistent "balance sheet": lifetime stats, company crest, scenarios +
    medals, signature strategy.
25. **Unlocks gallery** — earned maps / AI personalities / milestone decks / cosmetics / challenge modifiers.

In campaign, the in-game shell also gains an **Objectives tracker** (always-visible current-objective
progress + fail-condition / turn-limit warnings) alongside the standings HUD.

**Outcomes are beats, not cuts** (per `visual-first-try.md`): Dinnertime, milestone claims, Payday,
and bank-breaks each get a **Continue/Claim gate that shows what changed** rather than silently
jumping state.

## UI architecture (substrate decided up front — per `knowledge/playbooks/ui-architecture.md`)

The playbook's hard lesson (Cull the Crown's costly DOM→Pixi migration) is: **pick the substrate in
the build plan and build the kit in it from milestone 2 — never two-of-the-same-thing migrated
later.** FCM genuinely has **two distinct UI domains with a clean seam**, so the decision (D4) is a
deliberate two-zone split, not drift:
- **Pixi for the City board** — spatial tiles/roads/tokens, marketing-footprint & distance overlays,
  delivery animations, the fx kit. Canvas is the right tool; mirrors WotR/Lacuna boards.
- **DOM/React for the Company & management layer** — the org-chart slot editor (native drag-drop,
  scroll, focus), job market, training, milestone board, HUD, and **all modals** (the DOM `<Modal>` +
  card/slot atoms from `target-state.md`). Text/form/card/a11y-heavy ⇒ DOM-native.
- The seam is **board-vs-panels** (a board canvas embedded in the DOM app shell), not a DOM overlay
  re-encoding the same component that lives on the canvas — so the playbook's "expensive interim" is
  avoided by construction. **Reusable primitives are committed in both substrates at milestone 2**: the
  DOM `<Modal>`/`<CardSlot>`/`<EmployeeCard>` atoms **and** a `render/theme.ts` board palette/token set.
- **Fallback (D4 alt):** the board is a snapped grid, so an **all-DOM/SVG** board is viable if the
  Pixi board underdelivers — recorded as the escape hatch, decided now, not discovered mid-build.

---

## Digital-only modes & affordances (what going digital unlocks — an explicit pillar)

FCM is *unusually* suited to digital because it's deterministic, open-information, and admin-heavy.
The MVP deliberately exploits this — these are spec'd features, not nice-to-haves:

- **Campaign mode (*Rise of a Fast-Food Empire*)** — the headline digital-only feature: an authored
  solo-vs-AI arc with bespoke objectives, AI personalities, persistent Career stats, and content
  unlocks, that *also* solves FCM's brutal onboarding by being a built-in difficulty ramp. Cardboard
  FCM has **no solo play and no campaign at all**. (Full design in the Campaign mode section above.)
- **Instant Dinnertime resolution** — the computer computes every house's closest-qualifying-chain +
  price+distance + full tie-break chain + garden/CFO/waitress math instantly. The #1 friction removed.
  With an optional **step-through "why"** so you *see* each sale's reasoning (also a teaching tool).
- **Perfect rules referee / guardrails** — illegal org-chart slotting, illegal marketing placement,
  unaffordable hires/salaries are **blocked with a reason**; you cannot misplay the rules.
- **Fast, parallelized turns** — simultaneous Restructuring enforced privately; phases with nothing to
  do auto-advance; the famously slow human "Dinnertime accounting" is gone. A 2–4h game collapses.
- **A real AI opponent & solo play** — the cardboard has no solo mode; here it's a marquee feature
  (determinism makes the AI strong), with a difficulty ladder.
- **Undo-to-decision** — no hidden RNG ⇒ free, safe rewind to your last decision in solo/hot-seat
  (toggleable off for competitive integrity). Transformative for *learning* a brutal game.
- **Live what-if / planning overlays** — preview a marketing footprint before committing; highlight a
  restaurant's reachable houses; preview projected Dinnertime demand vs. your production; preview your
  next Payday. Plan with full information instead of mental math.
- **Always-on legibility of the opaque bits** — a **bank-clock gauge** (how close to each bank-break,
  the #1 "how long is left?" pain), a **live milestone board** (claimed/locked/open), and live cash
  standings — surfaced redundantly.
- **Replay & history** — full action-log replay/scrub; "how the game was won" recap; per-turn timeline.
- **Async / save-resume** — autosave the serializable game state; continue a long game across sessions.
  (True *online* async is deferred, but the model supports it.)
- **Variant toggles (default-off)** — alternative milestone sets, map-size/starting-cash variants,
  a simplified "first game" setup, and (post-v1) the *Ketchup Mechanism* modules — all additive data.
- **Telemetry-driven balance** — the headless AI-vs-AI sim measures milestone-claim rates, win-rates by
  strategy, and game length to tune the `[VERIFY]` config values to real numbers (see Balance & tuning).
- **Tutorial / onboarding** — a guided first turn + contextual tips for a famously steep ruleset.

---

## States the player can be in & UI legibility
- Whose turn / current phase / turn-order track are always shown; the **active affordance** changes by
  phase (Restructuring vs Working vs Dinnertime …) so the player always knows what input is wanted.
- **Plan-relevant state surfaced redundantly:** effective unit price (with the staff breakdown),
  reachable houses for a selected restaurant, a marketing footprint preview, projected payday, the
  bank-clock, and the milestone board. Legal actions are highlighted; illegal ones are blocked **with
  the reason shown**, not silently disabled.
- **Hidden-info handling:** only the simultaneous Restructuring pick (per-player private step in
  hot-seat) and reserve cards (until a bank-break) are concealed — no blur-handoff needed otherwise.

## Look, feel & flow — Concept art & visual identity (committed up front, not "polish later")
Per `knowledge/playbooks/visual-first-try.md` + `target-state.md`, the build commits an
**`art-direction.md`** (palette tokens for DOM `:root` *and* `render/theme.ts`, the one
`<EmployeeCard>` model, panel/modal/button recipes, icon style, an audit checklist) **before** filling
screens.

- **Art direction / mood — "1950s corporate fast-food boom, as clean infographic."** The reference
  vocabulary: **mid-century-modern advertising & Googie signage**, vintage diner menus and ID-badge
  /baseball-card layouts for the employees, a **suburban plat-map / blueprint** for the board, and the
  deadpan corporate-satire tone the game is built on. Think *Mad Men* org-chart meets a 1950s roadside
  diner sign — bold, legible, a little satirical, never fussy. (All **original, code-drawn** — no
  Splotter art copied; the look is *evoked*, not lifted.)
- **Palette (tokenized):** a 50s-diner core — **cream / chrome-grey / turquoise / cherry-red /
  mustard-yellow**, with a distinct **per-company accent** (colorblind-safe: shape/label + hue, never
  hue alone). Marketing footprints and distance overlays use clearly-distinct, accessible tints.
- **Typography:** a retro **display face** for headings/signage (bold script-or-slab feel) + a clean
  **readable sans** for HUD/numbers/dense tables + a "stamped/stencil" treatment for milestone tiles.
- **The ONE card model:** every employee renders through a single `<EmployeeCard>` (badge/baseball-card
  template) — role icon, salary symbol, report-slots, training arrows — reused in the org chart, job
  market, training view, and tooltips. This is the cohesion anchor.
- **Concept-art asset inventory the MVP needs (all code-drawn / procedural / CC0-icon-derived):**
  (1) the employee-card templates per role (iconographic); (2) map tiles + roads + house/garden lots;
  (3) goods glyphs (burger, pizza, 3 drinks); (4) marketing-piece icons (billboard/mailbox/radio/
  airplane); (5) milestone tiles (stamped badges); (6) per-company restaurant markers (color + logo
  glyph); (7) UI chrome (panel/modal/button frames in the diner theme); (8) menu/end framing art;
  (9) **campaign** assets — an **era-arc / expansion-map** illustration (the rise-of-empire timeline),
  **AI-rival portraits** (50s-ad-style caricature badges, one per personality), **company-crest
  customization**, and **medal/achievement** iconography. No bespoke illustration or photoreal
  assets — stylized, flat, badge-like.
- **Themed living background** (the #1 "intentional, not flat" win): a subtly animated suburb — drifting
  clouds / a flickering neon "OPEN" sign / a soft day-to-dusk shift as the bank-clock empties.
- **Game-feel budget** (reuse Cull the Crown's `fx/` kit): cash **counts up** at Dinnertime (the key
  number-go-up beat); milestone claims **stamp** with a pop + particle; marketing pieces **plant** with
  a spring; the bank-clock gauge pulses near a break. Springs/particles/shake/staggered pops — tasteful.
- **Motion / transitions:** outcomes are **beats** — Dinnertime, milestone claims, Payday, and
  bank-breaks each get a Continue/Claim gate that shows what changed.

- **Sound** (per `knowledge/playbooks/audio-and-sound.md`): a synthesized, IP-clean Web Audio engine —
  a light **50s diner/jukebox-flavored** loop + an SFX kit (card slot, hire, cash register *ka-ching*
  at Dinnertime, milestone stamp, the marketing jingle blip), with a **Music/SFX volume mixer + mute**,
  gesture-gated, settings-persisted. **Don't ship a silent game.**
- **Shell, settings & persistence** (per `front-of-house-shell.md`): Main Menu with **Continue**, a
  **Pause that freezes the game**, the settings mixer, and **autosave/continue/history** off the
  serializable game state. Baseline, not stretch.

## Balance & tuning (per `knowledge/playbooks/balance-and-tuning.md`)
Stand up a **headless AI-vs-AI sim** (`npm run sim`): win-rate sweeps across seeds and player counts;
measure **milestone-claim distribution** (no single milestone should be a must-win or dead),
**strategy-archetype win-rates** (burger-rush vs marketing-heavy vs price-war vs management-engine —
none should dominate), and **game length** (bank-clock pacing). Two traps to respect: balance is
**relative to AI skill** (re-tune against the shipped AI; don't over-fit noise), and **AI-blind
content reads low for the wrong reason** (fix the AI or flag for `/test`, don't "buff broken"). This
sim is also how the `[VERIFY]` numbers (production quantities, durations, reserve values) get pinned to
play-validated values. **Campaign scenarios are sim-checked too:** every shipped scenario's
objective must be *achievable* (the Hard AI or a scripted line can clear it) and its fail condition
*reachable*, with the bronze/silver/gold thresholds tuned off sim distributions so bronze is fair and
gold is genuinely hard. AI personalities are sweep-checked to behave distinctly (no two collapse to
the same line).

## Acceptance criteria (each testable — becomes the playtest checklist)
- [ ] New Game builds the full board/company state from `config` + `seed`; same seed ⇒ identical setup; bank = $50 × players.
- [ ] The phases run in order; Restructuring is simultaneous & secret then reveals; Order of Business = most-open-slots-first.
- [ ] Org-chart legality enforced: CEO 3 slots, manager 2–10, only CEO/managers have reports, one-of-each top-symbol; illegal arrangements blocked with a reason.
- [ ] Working: each working card grants exactly one action of its type; recruit/train/market/produce/buy/place/price all resolve per the rules; a company finishes all actions before the next.
- [ ] Production/sourcing: kitchen/cook produce food; errand-boy/cart/truck/zeppelin buy drinks at the correct **range**; ranges respect the cart-operator milestone.
- [ ] Marketing footprints are correct: billboard=orth-adjacent, mailbox=no-road-cross, radio=3×3 tiles, airplane=rows/cols; campaigns seed the advertised product's demand for the right duration.
- [ ] **Dinnertime resolution is exact:** for each house, the chosen chain is the road-connected qualifier with min(unit price + distance); tie-breaks waitresses→turn order; gardens double; CFO +50%; waitress +$3/+$5; cash paid from bank.
- [ ] Pricing: price −$1 / discount −$3 / luxury +$10 stack correctly and affect the selling tie-break.
- [ ] Payday: $5 per salaried card; unaffordable forces firing; bank decremented.
- [ ] Bank end: first break reveals reserve cards & adds them; second break ends the game after phase 4; **richest player wins**.
- [ ] **All milestones present**, each triggering exactly once, locking correctly, and applying its permanent effect.
- [ ] A full game is reconstructable from `{config, seed, action-log}` (replay ⇒ identical end state); undo-to-decision restores prior state exactly.
- [ ] vs-AI: an AI can play a complete legal game through the public API; the **Low/Med/Hard ladder is sim-verified to climb**.
- [ ] **Campaign:** the authored scenario arc loads from data; each scenario applies its setup (map / rivals / start / milestone subset / rules) correctly; objectives & fail conditions evaluate each phase and resolve win/lose; medals award on the thresholds.
- [ ] **Campaign:** every shipped scenario is *clearable* (sim or scripted line) and its fail condition is *reachable*; AI personalities load as evaluator presets and play distinctly.
- [ ] **Career persistence:** company identity, lifetime stats, scenario medals, and unlocks save/restore; **no unlock grants in-game power** (balance-neutral — asserted in tests).
- [ ] The City board renders tiles/roads/restaurants/marketing legibly with footprint & distance overlays; the org-chart panel supports legal drag-drop slotting.
- [ ] Matches `art-direction.md` (palette tokens, the one `<EmployeeCard>` model, themed living background); game is not silent (music + SFX + mixer); Pause freezes; autosave/continue works.
- [ ] The full loop is keyboard-operable; company/role identity does not rely on color alone.

## Out of scope (MVP) — deferred, not removed
- **Online** multiplayer, accounts/profiles, cloud save (the state model stays online-ready).
- **Expansions** (*The Ketchup Mechanism & Other Ideas*) — built later as a default-off data module.
- **Within campaign (now IN scope):** the **scenario-editor / sharing** UI and a **procedural / endless**
  campaign are deferred — the `ScenarioDef` format is moddable and data-driven, but only the
  hand-authored ~12-scenario arc + the Career layer ship in v1; branching narrative trees beyond the
  linear-with-light-gating arc are also deferred.
- Desktop/mobile **wrapping** (web first; codebase stays wrap-ready).
- Photoreal / bespoke illustration; rich animation beyond the specified game-feel beats.
- (The base game itself ships **content-complete** — all milestones, the full employee deck, all
  marketing/goods. "Out of scope" means whole *modules*, never depth within the base loop.)
