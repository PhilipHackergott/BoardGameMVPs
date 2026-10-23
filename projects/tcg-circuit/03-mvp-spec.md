# MVP Spec — TCG Circuit (working title)

> Stage 3 (Specification), the *what*. See `../../docs/03-specification.md`. Original-concept track
> (design is ours; derived from `game-design-document.md`). Substrate: **2D Pixi**, **high-res GBA-era
> pixel art**. ⚑ marks an open decision.
>
> **▶ MVP RE-SCOPE (user, 2026-05-25): the MVP is the CARD GAME, not the world.** Build, prototype, and
> iterate **PRISM** — the duel engine + a real AI ladder + one full card set + the deckbuilder + a thin
> "play/iterate" harness. The **whole JRPG world** (overworld, locations, career sim, time-economy,
> singles market, tournaments, community forum, fame) is **designed on paper + delivered as concept art
> this round, and deferred from the build.** Sections below are tagged **[MVP build]** vs **[Designed /
> concept-art; deferred]**. Rationale: get the core mechanics playable fast so we can tune the fun of the
> actual TCG before investing in the world.

## Pitch & target experience
**Discover a trading card game as a kid and rise through the whole scene.** A top-down pixel JRPG where
you play a real, original TCG (**PRISM**), build a collection, work a fluctuating singles market, and
climb the local competitive ladder. The feeling: a Friday night at the card shop — the pack-rip
dopamine, the rival across the table, the brew that finally works. *Pokémon TCG (GBC)* grown into a
*Persona*-flavoured career sim. **MVP delivers the early career**; the full discover→Worlds arc is the
content the systems scale into.

## Scope line — **the MVP is PRISM, the card game** *(re-scoped)*
The MVP delivers a **complete, tunable card game + a vertical slice of the world**: the **PRISM duel
engine**, **one ~60-card launch set** (small by design — cheap, frequent set drops), a **continuous-skill
AI**, a **deckbuilder + a card gallery (all cards by Set)**, **Act I** (the discovery story slice) and the
**major locations** (home · local card shop · school) with a **light daily time-loop** — content-complete
*for the card game* so we can prototype and tune the actual fun. Within the card game we cut no depth —
PRISM with 20 cards or one AI tier would be a tech demo; the MVP ships the set + the skill scale.

**Designed + concept-arted this round, but NOT built (deferred — the world/life-sim layer):** the full
overworld + more locations, the singles **market** economy, Acts II–IV → the year-end championship, the
**Persona life-sim depth** (year-level/College context, exams, side jobs, character stats, skip-school),
the **community forum/blog**, fame/sponsorship, set-release calendar + B&R as live events. Specified in the
GDD + `tcg-design.md` and delivered as **concept art** (`concept-art/`), to build in a later round.

## Rules to implement

### A) PRISM — the in-world TCG  **[MVP build — this IS the MVP]** (spec'd to code from)
- **Setup:** 2 players (you vs AI). Each: a **30-card deck** (max **3 copies** per card), a **Nexus** at
  **20 Life**, draw an opening hand of **5** (⚑ mulligan rule: simple "draw 5, one free bottom-and-redraw"
  ⚑ tune). On-the-play player **skips their first draw** (⚑ standard tempo fix).
- **Win:** reduce the opponent's **Nexus to 0**. **Alt-loss:** a player who must draw from an empty deck loses.
- **Resource — Light:** at the start of your turn **max Light increases by 1** (turn 1 = 1) and **refills**.
  **Refract (once/turn):** discard a card from hand → **+1 Light this turn only** (the skill lever).
- **Card types:** **Unit** `{cost, power, keyword?}` · **Spell** (one-shot) · **Gear** (persistent, attaches
  to a Unit or the Nexus). (Sites deferred — see cuts.)
- **Battlefield — 3 lanes** per side. Units deploy into a lane (one Unit per lane for MVP ⚑).
- **Turn structure:** `Draw → +1 max Light & refill → [Refract?] → Main (deploy Units / cast Spells /
  attach Gear, paying Light) → Combat → End`.
- **Combat:** for each of your 3 lanes, your Unit (if any, and able) **attacks**: if an enemy Unit sits in
  the **same lane**, they deal **power** to each other (a Unit at ≤0 power-damage is destroyed; damage
  resets at end of turn unless a keyword says otherwise ⚑); if the opposing lane is **empty**, it deals
  **power to the Nexus**. Attacker chooses lane order. (Clean, readable, AI-tractable — no open blocking.)
- **Keywords (base set, ~8):** *Haste* (can attack the turn it lands), *Guard* (must be dealt with / taunts
  its lane ⚑), *Drain* (Nexus damage heals your Nexus), *Pierce* (excess over the blocker hits the Nexus),
  *Shield N* (absorbs N once), *Volatile* (dies end of turn), *Lifegain N*, *Refract+* (cheaper/free refract).
- **Determinism:** seeded RNG (shuffle/draw) → a duel replays from `{decks, seed, action-log}`. Pure engine.

### A′) The card-game harness  **[MVP build]** (the thin shell that makes PRISM playable + iterable)
- **Main menu → mode select:** **Free Play** (pick any two decks, you pilot one, AI the other, choose AI
  tier) · **Gauntlet** (a fixed ladder of roster decks at rising AI tiers — the "is it fun / does the
  ladder climb" harness) · **Starter onboarding** (a guided first duel with a preset deck).
- **Deckbuilder + collection:** in the MVP harness you have the **full card pool available** to build
  from (no economy gating yet) — 30-card / max-3 / affinity-legal / Light-curve feedback — plus a set of
  **prebuilt archetype decks** to play instantly. (Acquisition/economy is part of the deferred world.)
- **Duel result:** a Continue-gated win/loss screen; in Gauntlet, advance to the next rung.
- This harness is deliberately minimal — its only job is to let us **prototype and tune PRISM**.

### B) The scene sim (the world around the duel)  **[Designed / concept-art; DEFERRED from the build]**
*Specified here at design level + delivered as concept art (`concept-art/`); built in a later round.*
- **Time:** a **day = a few action slots** (⚑ ~3: e.g., Morning/Afternoon/Evening) spent on actions
  (grind duels, work for money, shop, study, socialize, rest). Days advance a **calendar** toward the
  **regional qualifier** (the MVP capstone). Sleep (at home) = save/advance day.
- **Money:** one wallet. Sources: **allowance/job**, **selling singles**, **prize money**. Sinks: packs,
  singles, entry fees, travel.
- **Collection & deckbuilder:** owned cards in a **binder**; a **deckbuilder** (30-card / max-3 / Light-
  curve feedback / affinity legality) produces decks you pilot.
- **Singles market (PC at home):** every card has a **price** that drifts with the **metagame** + supply;
  **buy/sell** singles. **Packs** (from a set) opened for random cards (rarity-weighted + a pity rule ⚑).
- **Tournaments:** **shop tournaments** (Swiss-ish small bracket vs AI opponents) award money + fame +
  prize cards; results gate the **regional qualifier**.
- **Fame / Scene Reputation:** rises with tournament results (MVP: results-driven only; content-creation
  fame deferred). Unlocks recognition + a basic sponsorship perk (⚑ travel/stipend) + story beats.

### Actions (player verbs)
**[MVP build]** Duel: `deployUnit(card, lane)`, `castSpell(card, targets)`, `attachGear(card, target)`,
`refract(card)`, `declareCombat(laneOrder)`, `endTurn`; harness: `buildDeck`, `pickDeck`, `startDuel(tier)`.
**[Deferred]** Overworld/meta: `move`, `interact`, `enterLocation`, `useTimeSlot`, `openPack`,
`buySingle/sellSingle`, `enterTournament`.

### Edge cases
Empty-deck draw (alt-loss); lane already occupied (illegal deploy); not enough Light (illegal, with
reason); Refract already used; targeting rules for Spells/Gear; simultaneous lethal (both Nexus ≤0 →
active player's opponent checked first ⚑); selling your last copy that's in an active deck (warn);
can't afford an entry fee; deck illegal (<30 / >3 copies) blocks tournament entry with a clear reason.

### Modules deferred / cut for the MVP (and why) — at the module level
- **The ENTIRE JRPG world** (overworld, locations, day/time career sim, singles **market**, **packs-in-
  the-world**, **tournaments** + rival/career arc, **community forum/blog**, fame/sponsorship, the
  discover→Worlds story) — **designed + concept-arted this round, built later.** The MVP is the card game.
- **Online PvP of PRISM** — a server/accounts module; strong later axis (factory shipped online MP once).
- **Set rotation / multiple sets** — one set is content-complete for the MVP card game.
- **PRISM "Sites" card type & 2-Units-per-lane** — deferred to keep the first ruleset tight.

## Content catalog & depth (crawl `../../knowledge/playbooks/content-depth.md`)
*The card set + the opponent roster are the MVP product. All **data on registries** read at fixed hook points.*
- **[MVP build] PRISM launch set — ~60 cards** (small sets by design, so new sets drop cheaply across the
  campaign) across **5 Affinities** (Ember/Tide/Verdant/Gloom/Order), **~2 archetypes per Affinity** + a few
  **neutrals**; rarities (Common/Uncommon/Rare/Mythic) + **Prismatic** foils. A real deckbuilding space.
- **[MVP build] Card gallery** — browse **all cards sorted by Set** (per-set **completion %**, filter by
  Affinity/rarity); the collection/binder view, present from the MVP (even before the full singles market).
- **[MVP build] Opponent roster — ~12–16 NPC decks** the AI pilots (Gauntlet + Free Play): each = a deck +
  a **skill rating** (continuous) + a persona + a name/flavour line.
- **[MVP build] Prebuilt archetype decks** (one+ per archetype) so the game is instantly playable.
- **[MVP build] Act I + major locations** — the **home** (deckbuilder/gallery/sleep), the **local card
  shop** (packs, play tables, first rival, FNM), **school** (the day anchor) + a **light daily time-loop**.
- **[Deferred — designed/concept-art] The full world/life-sim:** the singles **market** economy,
  Acts II–IV → the year-end championship, the Persona time-management depth (year-level/College, exams, side
  jobs, character stats), more locations, the forum/blog, fame — in the GDD + shown in `concept-art/`.
- **Design axes (cards):** affinity identity × archetype × rarity/cost-curve. **Under-served axis worth
  opening (⚑):** *rogue-deck vs net-deck* incentives — flag for when the metagame/world is built.

## Modes & AI (a continuous skill scale — PRISM is adversarial)
Single-player vs **PRISM AI** on a **continuous skill dial `skill ∈ [0,1]` (0–100 rating), not fixed
tiers** — one shared `evaluate` + knobs that scale monotonically with skill (softmax move-selection
temperature `T=f(1−skill)`, lookahead/MCTS budget, eval completeness, Refract/lane craft, a decaying
blunder floor). **Named bands** for UX (Beginner → Kitchen-table → FNM regular → Shop ace → City champ →
Regional → National → Worlds-class). Each opponent = `{deck, skill, persona, flavor}`; the (deferred)
career assigns a **rising skill** so opponents get **progressively, finely harder**. **Sim-verified
monotone** (higher skill beats lower, pairwise + smoothly). The AI **doubles as the balance instrument**.
Full design: `tcg-design.md` §4.

## Screens & flow  **[MVP build = the card-game harness; world flow deferred]**
**MVP:** `Main menu → {Act I story (home · card shop · school) | Free Play | Gauntlet | Starter onboarding
| Deckbuilder | Card Gallery} → Duel screen → Result gate → (Gauntlet: next rung) → menu.`
- **Card Gallery:** browse **all cards grouped by Set**, with per-set **completion %** + Affinity/rarity filters.
- **Duel screen:** the PRISM board — opponent Nexus + hand (face-down) top, your Nexus + **Light gauge** +
  hand bottom, the **3 lanes** center; readable pixel card faces; tap/drag to deploy to a lane; **Refract**
  + **End Turn** buttons; an **intent/telegraph** for the AI's lethal.
- **Deckbuilder:** the full pool + prebuilt decks; 30/max-3/affinity-legal with a **Light-curve** readout.
- **Outcomes are beats, not cuts:** a duel ends on a **Continue-gated** result screen; **legible loss**
  (the killing blow animates, then gate); Gauntlet advances via a rung screen, not auto-switch.
- **[Deferred] World flow** (overworld ⇄ locations → market/packs/tournaments/forum → the discover→qualifier
  story) is designed in the GDD + shown in `concept-art/`; not built this round.

## Player states & feedback
Duel UI always shows: **whose turn / phase**, **Light available** (and what Refract would add), each
Unit's **power** + keywords, **lane occupancy**, and **legal targets** when casting (illegal plays explain
why — "not enough Light", "lane occupied"). **Plan-relevant state surfaced redundantly:** keywords shown
on the card *and* as lane badges; the AI's telegraphed lethal highlighted; deck-illegality shown in the
builder *and* at tournament entry. Overworld: clear time-slots-remaining + day/goal indicator.

## Look, feel & flow (crawl `../../knowledge/playbooks/visual-first-try.md` + `target-state.md`)
**Modern top-down ¾ pixel-art RPG** (HGSS/DS Pokémon × Dragon Quest) — see **`art-direction.md`**
(authoritative; revised 2026-05-25 away from the earlier GBA/flat-vector idea). Commit up front to:
- **`art-direction.md`** — the top-down ¾ pixel concept; the **asset reality** (this fidelity = a
  **sourced/licensed tileset**: LimeZu Modern Interiors/Exteriors, thehorseman007 interiors — not
  hand-drawn), the **rendering pipeline** (16×16 tiles, ¾ perspective, integer nearest-neighbor upscale,
  pixel font), **per-Affinity ramps**, **the ONE `<CardFace>` model** (bespoke pixel art via an
  asset-manifest seam), the in-game-pixel-UI for diegetic screens (forum/blog), and a component audit
  checklist. (For the MVP card game, the load-bearing art is the **duel board + `<CardFace>`**; the
  town/interiors are the deferred world.)
- **Reusable UI primitives:** ONE `<Modal>`/overlay shell + atoms — `<CardFace>`, `<DeckRow>`, Button,
  Panel, Tooltip — built before screens.
- **Living background:** a parallax animated overworld (drifting clouds/lights, NPC idle anims); the duel
  mat has a subtle animated backdrop (the plasma kit, re-voiced to a calm felt).
- **Game-feel budget:** card deal/hover/deploy springs, lane-clash hit + shake + particles, Nexus-damage
  pops, the **pack-rip reveal** (the dopamine beat), coin-to-wallet on prizes (the "number-go-up").
- **Transitions & outcomes:** duel intro, win flourish, **legible loss** (animate the lethal then gate),
  prize-collection animation, the qualifier capstone beat. Reuse `cull-the-crown/ui/{CombatGate,
  TransitionLayer}.tsx` + the `fx/` kit.
- **Accessibility:** colorblind-safe (Affinity = shape/icon + hue, never hue alone), keyboard-operable
  menus/deckbuilder, text scaling, reduce-motion.

## Sound (crawl `../../knowledge/playbooks/audio-and-sound.md`)
Synthesized, IP-clean, GBA-flavoured chiptune.
- **Music:** an **overworld theme**, a **card-shop theme**, a **duel theme**, and a brief **qualifier/
  victory** fanfare; menu cue. (Per-screen tracks.)
- **SFX:** card deal/deploy, lane clash, Nexus hit, Refract, draw, the **pack-rip + reveal**, coin/prize,
  UI clicks (capture-phase), tournament-advance sting.
- **Mixer:** Music + SFX sliders + mute, persisted; engine pinned to `globalThis` (HMR-safe).

## Shell, settings & persistence (crawl `../../knowledge/playbooks/front-of-house-shell.md`)
- **Main menu:** New game · **Continue** · **History** (tournament results / record) · Settings · Rules
  ("How to play PRISM").
- **Pause** (during a duel / in the overworld) that **freezes** play: Resume / Settings / Rules / Save &
  quit / Concede (in duel) / Abandon.
- **Settings:** audio mixer + reduce-motion + text size + animation toggles.
- **Persistence:** autosave the JSON-serializable career state (collection, money, decks, calendar, fame,
  story flags) — slot-based; **Continue**; results history. A duel is resumable or at least restart-safe (⚑).

## Balance & tuning (crawl `../../knowledge/playbooks/balance-and-tuning.md`)
- **Sim harness (`npm run sim`):** headless **PRISM AI-vs-AI** sweep — every archetype deck vs every other
  across seeds, alternating play/draw, at fixed AI tier; plus the **ladder test** (Low/Med/Hard head-to-head).
- **Targets:** **archetype win-rate spread compressed** (no auto-win deck, no dead archetype); **no dead
  cards** (each sees viable play); the **ladder climbs** (Hard > Med > Low > 50% pairwise). First tuning
  pass in the build (card numbers, costs, curve, the play/draw rule); AI-blind cards flagged for `/test`.
  Balance note committed.

## Acceptance criteria (each testable — becomes the playtest checklist)  **[card-game MVP]**
- [ ] A full PRISM duel plays vs AI: Light escalates + Refract works; deploy/cast/attach legal-gated with
      reasons; 3-lane combat + Nexus damage resolve; win/alt-loss detected; result is Continue-gated.
- [ ] **Full launch set present:** all **~60** cards exist + are playable; **deckbuilder** enforces
      30/max-3/affinity + shows the Light curve; every archetype is buildable; prebuilt decks load.
- [ ] **Card gallery** lists every card **grouped by Set** with per-set completion % + Affinity/rarity filters.
- [ ] **Act I + major locations** play: the discovery story slice across home · card shop · school, with a
      light daily time-loop (school day → free slots → play/shop) and the first-rival beat.
- [ ] **Harness works:** Free Play (pick decks + a **skill rating**), the **Gauntlet** (rising-skill ladder),
      and starter onboarding all play through; a duel replays from `{decks, seed, action-log}`.
- [ ] **AI skill scale sim-verified MONOTONE** across `skill ∈ [0,1]` (higher beats lower, pairwise + smoothly
      — supports a progressive career ramp); **archetype spread compressed**, **no dead cards** (balance note
      committed) — *the central "is it fun + fair" gate*.
- [ ] **Shell:** menu + mode select + Pause-that-freezes + settings mixer; deck saves persist.
- [ ] **Not silent:** duel music + SFX (deal/clash/Nexus-hit/refract) wired; mixer + mute persist.
- [ ] **Matches `art-direction.md`**: GBA pixel pipeline (nearest-neighbor, pixel font), per-Affinity card
      frames, the duel juice, outcome beats; a11y toggles work.
- [ ] Boots + plays at a steady frame rate on a mid laptop.
- [ ] **World is designed + concept-arted** (GDD world sections + `concept-art/`: store, tournament,
      online card-market UI, community forum/blog) — present as design artifacts, not built.

## Out of scope (this MVP) — built later
**The entire JRPG world** (overworld/locations, day/time career sim, singles market, packs-in-the-world,
tournaments + rival/career arc, community forum/blog, fame/sponsorship, the discover→Worlds story) —
designed + concept-arted now, built in a later round. Also: online PvP, set rotation, PRISM "Sites" +
multi-Unit lanes, monetization. **The card game itself ships content-complete and tuned.**
