# Game Design Document — TCG Circuit (working title: "TCG Tournament Simulator")

> Original-concept design artifact (the "rulebook we write ourselves"). Feeds `/spec` →
> `03-mvp-spec.md` + `04-build-plan.md`. See root `CLAUDE.md` → "The original-concept track".
> Substrate: **2D** (Pixi) — a top-down JRPG overworld + a 2D card-duel screen. Open decisions ⚑.

---

## 1. Vision

A top-down **2D JRPG** about a kid who discovers a trading card game and rises, over years, through
the whole competitive scene to the **World Championship** — and becomes famous doing it. It is three
things woven together: a **coming-of-age story-RPG**, a **deep, genuinely-good TCG you actually play**,
and a **simulation of the entire TCG scene** (collecting, the singles market, deckbuilding, the
metagame, the community, the grind, the travel). You don't just play the card game — you *live the hobby*.

**One-line pitch:** the *Pokémon TCG* GBC game grown into a full *Persona*-style life-sim about
becoming a TCG world champion.

### Pillars
1. **Live the whole scene** — the shop, the friendships, the grind, the budget, the travel, the metagame — not just the duels.
2. **A real TCG you master** — the card game is deep, skill-rewarding, and original; mastery is the point.
3. **From nobody to legend** — a career arc with stakes, rivals, fame, and a true climax (Worlds).

### Closest comparable (proof the format works)
The **Pokémon Trading Card Game** (GBC, 2000) — a JRPG where you walk a world, challenge leaders, and
play a real TCG. We take that proven skeleton and scale it into a *career sim of the modern scene*
(singles market, set releases, regionals → Worlds, fame), with an **original** TCG and IP.

---

## 2. Art direction → see **[`art-direction.md`](art-direction.md)** (authoritative)

**Revised 2026-05-25 to the user's reference:** a **cozy, lush, modern top-down ¾ pixel-art RPG** —
the HGSS/DS Pokémon × Dragon Quest look (detailed 16×16-based tiles, ¾ overhead perspective, rich
palettes, expressive overworld sprites, warm interiors). *Not* the earlier flat-vector / GBA-low-res /
"early-2000s web" idea (superseded). **The real constraint is the asset pipeline, not the renderer:**
this fidelity = a **sourced/licensed top-down tileset** (LimeZu Modern Interiors/Exteriors;
thehorseman007 interiors) + bespoke card faces via an asset-manifest seam — full spec, references, and
sourcing plan in `art-direction.md`. (Earlier SVG concept boards are layout-only; only the forum/blog
*content* concepts carry forward, reskinned to an in-game pixel UI.)

*(2D pixel art keeps the whole scene affordable: locations are tile maps + sprites, content scales by
adding maps/NPCs/cards/dialogue — no 3D asset wall.)*

---

## 3. The TCG itself — "PRISM" → see **[`tcg-design.md`](tcg-design.md)** (authoritative)

> **The full card-game design is in [`tcg-design.md`](tcg-design.md)** — engineered to four required
> properties: **expandable** (booster sets drop across the campaign + reshape the meta), **ban/limit-list
> ready** (a campaign mechanic), **balanced *around rarity*** (rarer = stronger → a reward/scaling loop),
> and **highly AI-learnable** (a **continuous skill scale** — `skill ∈ [0,1]`, named bands, for progressively
> harder opponents across the career — + archetype personas off one evaluator; designed for low randomness /
> bounded board / no infinite loops). This section is a quick recap; the design doc rules.
> Original-IP: 100% original cards/mechanics/art/brand.

### 3.1 Goal & setup
- 2 players. Each has a **30-card deck** (max **3 copies** of any card) and a **Nexus** with **20 Life**.
- **Win:** reduce the opponent's Nexus to **0 Life** (alt path: opponent can't draw → they lose).

### 3.2 The resource — *Light* (the identity mechanic)
Avoids both MtG lands and Pokémon energy:
- Each turn your **max Light rises by 1 automatically** (turn 1 = 1 Light … smooth, onboarding- and AI-friendly), refilling at turn start.
- **Refract (the skill lever):** once per turn you may discard a card from hand to gain **+1 temporary Light this turn** — letting you "power out" a big play early, at real card cost. The floor is smooth; the ceiling rewards planning. *Every card is potential tempo* — a clean, original tension.

### 3.3 Card types
- **Units** — `Cost / Power / [keyword ability]`. They occupy the battlefield and fight.
- **Spells** — one-shot effects (burn, draw, removal, buffs).
- **Gear** — persistent equipment/auras attached to a unit or your Nexus.
- **Sites** (optional, later set) — a board fixture giving ongoing value.

### 3.4 Battlefield — **3 lanes** (the readable, original combat)
Each player has **3 front-line slots (lanes)**. This is the core tactical layer and reads instantly on a 2D screen:
- Units are deployed into a lane. On combat, **your unit attacks the unit in the opposing lane**; if that lane is **empty**, it hits the **Nexus** directly.
- Lane management *is* the strategy: where to commit, where to leave open, when to trade vs. race. (Distinct from MtG blocker math and Pokémon active/bench — and far cleaner for AI than open blocking.)

### 3.5 Turn structure
`Draw → +1 max Light (refill) → [Refract?] → Main (deploy units / cast spells / equip gear) → Combat (resolve lanes, attacker's choice of order) → End.`

### 3.6 Affinities (the metagame spine) — 5 color identities
- **Ember** — aggro / direct burn / haste.
- **Tide** — control / card draw / bounce.
- **Verdant** — ramp / big units / lifegain.
- **Gloom** — disruption / sacrifice / removal.
- **Order** — defensive / go-wide synergy / buffs.
Decks are **mono- or dual-affinity**; this seeds archetypes, counter-relationships, and collection goals.

### 3.7 Rarity, sets & the living game
- Rarity: **Common / Uncommon / Rare / Mythic**, plus **Prismatic** (foil) variants (cosmetic + market value).
- Cards belong to **Sets**; periodic **set releases** add cards, **rotate** the legal pool, and **shake the metagame + singles market** — the engine of the scene sim (§5).

### 3.8 Why this ruleset fits the factory
Pure, deterministic, seedable → ideal for **AI opponents at skill tiers** and **headless balance sims**
(`npm run sim`) — exactly the factory's proven strengths (Lacuna/Cull the Crown). The 3-lane board keeps
the AI tractable and the screen legible.

---

## 4. Core gameplay loops

Two nested loops that feed each other:

### 4.1 The Duel loop (minute-to-minute)
Play a match of PRISM: draw, manage Light (refract or not), deploy to lanes, attack, adapt to the
opponent. Outcome is **skill × deck quality**. Duels are the test of everything the scene loop builds.

### 4.2 The Scene loop (day-to-day — the sim)
1. **Live your life** — spend limited daily time (school/uni, job, social, grind, rest) — a *Persona*-style time economy.
2. **Earn money** — allowance → part-time job → flipping singles → prize money. You're a broke kid: budget pressure is real.
3. **Acquire cards** — buy **packs** at the shop, **singles** on the online market, **trade** with NPCs, win **prizes**.
4. **Build & tune decks** — collection → **deckbuilder** → answer (or innovate against) the metagame.
5. **Compete** — Friday-night shop tournaments → city → **Regionals** → **Nationals** → **Worlds**.
6. **Results → money + fame + cards → repeat at higher stakes.**

```
   ┌─────────────── Scene loop (days/weeks) ───────────────┐
   live life → earn money → buy cards → build deck → compete → results
        ▲                                                    │
        └──── fame + collection + money grow the next cycle ─┘
                              │ tests the deck
                       ┌──────▼──────┐
                       │  Duel loop  │  (a match of PRISM)
                       └─────────────┘
```

---

## 5. The scene sim — systems that make it "the whole experience"

- **Singles market (dynamic economy):** card prices move with the **metagame** and **set releases**; buy-low/sell-high, the agony of chasing a pricey Mythic, the rush when your spec pays off. Budget tension throughout.
- **Pack opening:** the dopamine core — packs from sets, foil pulls, the chase card; a fair pity mechanic (⚑). Midnight set-release events at the shop.
- **The metagame:** an evolving "best decks" landscape; NPCs **net-deck** top archetypes; you can follow the meta or pilot a **rogue deck**. Tournaments report a **metagame breakdown** (Tier lists), so the world feels alive and reactive.
- **Collection & binder:** set completion, foils, trading; the satisfaction of the full binder.
- **Deckbuilder:** real builder with **Light-curve feedback**, archetype templates, synergy hints, "legal for format X" checks.
- **Rivals & relationships:** named rivals with their own decks, personalities, and arcs; friends, a mentor, the shop owner, online personalities; social-sim bonds that grant perks + story (⚑ scope of relationship system).
- **Fame / Scene Reputation:** rises with tournament results **and** community contribution (stream? write a deck guide? help a newbie?). Unlocks **sponsorships** (free product, travel funding — easing the budget), NPC recognition, and story beats. Fame *is* the win-state flavor: becoming famous in the scene.
- **Time management — the Persona-style life-sim (the spine):**
  - **The campaign is a single academic year** (a Persona-style calendar). Up front you pick your **life
    context**, which sets your free-time budget + difficulty:
    - **High School — Sophomore** (most free time, fewest exams → easiest), **Junior** (mid), **Senior**
      (least free time, most exams → hardest); OR
    - **College** (the most freedom to manage your own time — fewer fixed obligations, looser structure).
  - **Days have a few time slots.** **School/classes occupy weekdays** (except **holidays / long weekends**,
    which free up big TCG blocks); evenings + weekends are yours. **Exam seasons** spike the study demand.
  - **Spend free slots on:** grind/play TCG · **side jobs** (money, below) · **study** (pass exams / avoid
    trouble) · **side activities & clubs** (raise **character stats**, below) · socialize (bonds) · rest.
  - **Skip school** for extra TCG time — but risk **teacher/parent trouble** + **failing exams** (real
    consequences: grounding/allowance cuts, locked events, a bad-ending pressure). College loosens these.
- **Side jobs (earn money to buy cards):** a handful of gigs that cost time + pay cash (and often tie to a
  character/stat): **shelf-stocking / judging at the card shop**, a **café or Späti shift**, **tutoring**
  (uses Knowledge), **food delivery** (uses Stamina), small-event **TO/judging**, plus **flipping singles**.
  Money sources overall = allowance + side jobs + selling singles + prize money.
- **Character stats** (raised by activities/jobs) give edges **in conversations** (persuade/negotiate/befriend
  checks) and in **out-of-game challenges**: e.g. **Composure** (hold steady in a high-pressure match /
  resist tilt), **Charisma** (better trades, sponsor talks, recruiting friends), **Knowledge/Game-IQ**
  (read the meta, deck-tech debates, exams), **Stamina** (more slots before you're spent), **Reputation**
  (doors open in the scene). Stats are the coming-of-age progression *outside* the duels.

---

## 6. Career arc — one academic year: discover → the year-end championship → fame

**The campaign spans a single academic year** (set by your chosen life context, §5 — a HS year-level or
College). No multi-year time-skips; the four acts are the **year's escalation**, climaxing in a big
year-end tournament (the championship — the "Worlds" of this campaign):

- **Act I — Discovery (Autumn term).** A friend shows you PRISM; you get a **starter deck**; learn to play;
  win your first duels at school and the **local card shop**; meet your first **rival**. Wonder, low stakes.
  *(Tutorial woven into story.)*
- **Act II — The grind (Winter).** Build a real collection + learn deckbuilding and the metagame; win
  **shop tournaments**; juggle exams + side jobs + the hobby; earn a name locally. Rivalries deepen.
- **Act III — The circuit (Spring).** Travel to bigger events; face the real meta + tougher players; wins
  and gut-punch losses; first **sponsorship** + notoriety; **qualify** for the year-end championship.
- **Act IV — The Championship (year's end).** The big-tournament gauntlet; the arc-rival final; win it
  (or a bittersweet near-miss) and **become famous in the scene**. The **epilogue reflects your choices**
  (the friends/bonds you kept, your stats, net-deck vs. rogue, the kind of player you became).
- *(A new academic year — a higher context, a new set/format — is the natural **New Game+** / next campaign.)*

**Stakes & texture:** the friend who quits, the rival who turns pro, net-deck vs. innovate, the set drop
that obsoletes your beloved deck, the money you maybe shouldn't have spent, exam season vs. a key event,
the win that changes everything.

---

## 7. The world (the scene as explorable locations)

| Location | Role |
|----------|------|
| **Your bedroom / home** | Collection HQ: binder, **deckbuilder**, the **PC** (online marketplace), sleep = save/advance day. |
| **Local card shop (LGS)** | The social hub: buy packs/singles, **Friday-night tournaments**, meet rivals, bulletin board (events), trade, set-release nights. The heart of Act I–II. |
| **School → University** | Life/time-economy hub; friends who play (or don't); lunchtime duels; the teen→college time-skip lives here. |
| **Tournament venues** | Escalating: shop → city hall → **Regionals** convention center → **Nationals** → the **Worlds arena**. |
| **Other towns/cities** | Travel for the circuit; different **regional metagames**, regional rivals, new shops. |
| **Conventions** | Big halls: vendors, side events, artist alley, pack wars — scene spectacle. |
| **Online marketplace (via PC)** | Buy/sell singles at fluctuating prices; the economy mini-game. |

---

## 8. 2D implementation sketch (Pixi)

Factory stack, engine/UI/render split intact:
- **`engine/` (pure, deterministic, seeded) — two sub-engines:**
  - **TCG engine** — PRISM rules: `state` (board/lanes, Light, hands, decks, Nexus), `rules` (deploy/cast/refract/combat/draw), `legalMoves`, seeded RNG. Headlessly testable; powers AI + balance sims.
  - **Sim engine** — the scene: calendar/time-slots, money, collection, market prices, metagame model, fame, relationships, story flags, tournament brackets. Pure reducers.
- **`ai/`** — PRISM opponents at skill tiers (heuristic → greedy → lookahead), the factory's AI patterns; deck-archetype "personalities."
- **`render/` (Pixi)** — the top-down **overworld** (tilemap + sprite NPCs + interaction) **and** the **duel screen** (card-battle board, lane combat, presentation-fx juice).
- **`ui/` (React DOM)** — JRPG menus, **deckbuilder**, **binder/collection**, **marketplace**, dialogue, tournament UI, front-of-house shell + autosave/continue.
- **Content = data registries** (cards, sets, NPCs, dialogue, tournaments, market seeds, metagame) — the content-depth playbook: *the catalog is the product*. Asset-manifest seam for card art (placeholder → real).
- **Audio** — synth chiptune (factory audio playbook): shop theme, duel theme, pack-rip SFX, the Worlds fanfare.

---

## 9. MVP scope (first build) vs. full vision  *(user-set 2026-05-25)*

**MVP = the core card game + Act I + the major locations.**
- **Core PRISM card game (the heart):** the **full duel engine**, the **continuous-skill AI** (a few
  rating points to start) + balance sim, the **deckbuilder/legality**, and prebuilt + buildable decks.
- **One launch set of ~60 cards** (5 Affinities × ~2 archetypes + neutrals + full rarity spread). **Sets
  are small (~60) by design** so new sets drop easily across the campaign (§1/§7 of `tcg-design.md`).
- **A card gallery** — browse **all cards sorted by Set** (per-set completion %, filter by Affinity/rarity);
  the collection/"binder" view, even before the full market exists.
- **Act I (Discovery):** the contained story slice — discover PRISM, the first rival, learn-to-play woven
  in, the first shop tournament. + a **light daily time-loop** (school day → free slots → play/shop) hinting
  the life-sim, without the full Persona depth yet.
- **Major locations:** **home** (collection/deckbuilder/gallery/sleep), the **local card shop** (the hub:
  packs, play tables, the first rival, FNM), **school** (the day/time anchor). [Not the full overworld.]
- Front-of-house shell, synth audio, save/continue.

**Deferred (designed + concept-arted now — the world/campaign layer):** the full Persona life-sim
(year-level/College context, exams, side jobs, character stats, skip-school), the singles **market**
economy, Acts II–IV → the year-end championship, multiple cities/conventions, fame/sponsorship, set-release
calendar + B&R as live events, online PvP. The data model is built to accept them (the spine is the same).

---

## 10. Risks & open decisions (⚑)
- **Scope is the central risk** (it's a TCG *and* an RPG *and* an economy sim). Mitigation: MVP is the full *systems* on a *small content slice*; build the **TCG engine + duel + one set + market + deckbuilder** first and make *that* fun before widening the world.
- **The TCG must be genuinely good** — it carries everything. Prototype PRISM headlessly, balance-sim it, and play it before building the world around it.
- **Original-IP discipline** — no Magic/Pokémon/Yu-Gi-Oh card text, names, art, mechanics-as-branded, ever.
- ⚑ Open: PRISM name + final ruleset tuning (lanes count, Life total, refract limits); pity-timer for packs; depth of the relationship/social-sim layer; how "live"/scripted the metagame evolution is; card-art pipeline (placeholder → stylized-generated → commissioned).
