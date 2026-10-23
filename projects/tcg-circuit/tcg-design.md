# TCG Design — "PRISM" (the card game)

> The deep design of the in-world TCG, engineered to four required properties (user, 2026-05-25):
> **(1) expandable** via booster drops across a 1–2-year campaign that reshape the metagame;
> **(2) banned/limited-list ready** as a campaign mechanic; **(3) balanced *around rarity*** so rarer
> cards are stronger (a reward/scaling loop); **(4) highly AI-learnable** — strong, challenging, fun,
> *different* AI opponents. This supersedes the GDD §3 sketch and is authoritative for the card game.
> ("PRISM" is a placeholder name. ⚑ = open decision.)

---

## 0. The core rules (recap — the stable engine)
2 players; **30-card decks**, max **3 copies** per card (overridable by the format's limited list); a
**Nexus** at **20 life**; open hand of 5. **Win:** opponent's Nexus to 0 (alt-loss: draw from an empty
deck). **Resource — Light:** max Light +1 at the start of your turn (auto-escalates) and refills; **Refract
once/turn** = discard a card for +1 Light this turn (the skill lever). **Card types:** Unit `{cost, power,
keyword?}`, Spell (one-shot), Gear (persistent). **Board = 3 lanes**, one Unit per lane (MVP). **Combat:**
each of your lanes' Unit attacks the opposing lane's Unit (mutual power damage) or the **Nexus** if that
lane is empty; attacker chooses lane order. **Determinism:** seeded RNG; a duel replays from
`{decks, seed, action-log}`. *This rules core never changes as the game expands — only the card pool does.*

---

## 1. Expandability — Sets, Formats & the release calendar  *(Property 1)*

**Principle: the rules engine is fixed; the card pool is data that grows.** A new booster = new data
(+ maybe a couple of new keyword handlers), never an engine rewrite.

- **Cards belong to Sets.** `Set = {id, name, releaseDate, cardIds[], newKeywords[], themes[]}`. The
  **campaign calendar** drops a new Set every few in-game weeks; over **one academic-year campaign** (§GDD
  career arc) that's **≈ 6–10 small sets**.
- **Format = the legal card pool right now** = `currentFormat(campaignDate, rules)` →
  `{legalSetIds[], banned[], limited{}}`. Deckbuilding + legality read the format; the duel engine is
  format-agnostic (it just plays the cards in the two decks).
- **Sets are SMALL — ~60 cards each** (user-set: small sets so new drops are cheap + frequent across the
  year). Each is authored to *shift the meta*, not just add cards:
  - **~60 cards around 2–3 themes**: usually *one new archetype*, *one answer to the current dominant
    archetype*, and *one boost to an underperforming Affinity*. So every drop reshuffles the tier list —
    the campaign's "live game" feel — and a 60-card set is small enough to design, balance, and ship fast.
  - **New mechanics ship as new keywords** — pure handlers at the **fixed hook points** (`onDeploy`,
    `onCombatDealt`, `onDestroyed`, `onTurnEnd`, `modifyCombat`, `onDraw`). Adding a keyword = adding a
    handler + data; the engine, `legalMoves`, and the AI evaluator are untouched (see §4).
  - **Set archetype seeds** (examples to author against): Ember *Burn* / *Aggro-swarm*; Tide *Tempo* /
    *Draw-control*; Verdant *Ramp* / *Go-tall*; Gloom *Sacrifice* / *Attrition*; Order *Go-wide* /
    *Lockdown*; plus cross-Affinity "pairs" each set enables.
- **Rotation policy** ⚑: support **both** as campaign events — a **Standard** (only the last K sets legal,
  rotates as new ones drop → keeps the pool fresh + forces re-brewing) and an **Eternal** (everything
  legal → the chase/collection format). The campaign can run Standard for the main ladder and Eternal for
  special events.
- **Engine support:** `Set`, `Format`, `currentFormat()`, `isLegal(deck, format)`. The set schedule +
  themes live in `engine/content/sets.ts` (data); the campaign drives the calendar.

> **Why this is also good for AI (preview):** because new sets add *effect-data* the same evaluator reads
> (not new rules), a strong AI stays strong across expansions without retraining the engine — only the
> decklists/personas it pilots change.

---

## 2. Banned & Limited list  *(Property 2)*

**The format carries the B&R list as data; the campaign uses it as a mechanic.**
- `Format.banned: cardId[]` (0 copies) and `Format.limited: Record<cardId, 1|2>` (max copies; default 3).
  `isLegal(deck, format)` validates copy counts + exclusions and returns human-readable reasons (surfaced
  in the deckbuilder and at event entry).
- **As a campaign beat:** **B&R announcements** fire on the calendar (delivered as an in-fiction
  forum/news post — see art-direction §7). When a card is banned/limited, affected decks become illegal
  and must be **rebuilt** — the player *and* the net-decking AI adapt. This is the lever that "switches up
  gameplay" mid-campaign and keeps even a mastered deck from going stale.
- **Two sources:**
  - **Authored B&R** (MVP): scripted at set/season milestones to steer the campaign's difficulty + variety.
  - **Dynamic B&R** (stretch ⚑): the balance sim (§4) watches archetype win-rates; when one passes a
    threshold the "format committee" auto-issues a ban/limit — a *living format*. Powerful, but gated on
    the sim being trustworthy; ship authored first.
- **Synergy with rarity-power (§3):** the cards that get limited/banned are usually the strongest
  (= rarest) ones, so B&R turns "I own the best cards" into a **constructed puzzle** ("not in *this*
  format") instead of an auto-win — directly mitigating the pay/grind-to-win risk of Property 3.

---

## 3. Balanced *around rarity* — the reward/scaling loop  *(Property 3)*

**Deliberate, atypical choice:** competitive TCGs decouple rarity from power for fairness; **here rarity
*is* a power axis** to drive single-player progression — you get stronger by acquiring rarer cards. Think
roguelike/RPG scaling, with your *collection* as your level. The trick is to make it a **curve, not a
wall** (skill + synergy can still beat raw rarity), and to bound it so games stay interactive.

### 3.1 Rarity → power-budget ladder
Every card has a **power budget** (a points value = stats + ability impact for its cost). Higher rarity =
bigger budget, but with **caps** and usually a **cost/condition** at the top:
| Rarity | Role | Budget | Shape |
|---|---|---|---|
| **Common** | the fair baseline / reference | 1.0× | vanilla or one clean keyword; efficient, simple |
| **Uncommon** | glue / utility | ~1.15× | a useful effect or a slightly better stat line |
| **Rare** | payoff / build-around | ~1.35× | strong line **+** a real ability; archetype anchors |
| **Mythic** | bomb / engine / finisher | ~1.6× **with a cost/condition** | game-changing but *answerable*, never mindless |
| **Prismatic** (foil) | chase cosmetic | +0 to +tiny ⚑ | alt-art; recommend **cosmetic-only or a trivial edge** to avoid pay-to-win feel |

### 3.2 Rules that keep it skillful (not "biggest number wins")
- **Hard budget caps per rarity** (numbers are a sim/tuning job, §4) — a Mythic can't exceed its cap, and
  its excess power is paid for with a **drawback, setup cost, or build-around condition**.
- **Everything is answerable at low rarity:** for every Mythic threat there exist **Common/Uncommon
  answers** (removal, tempo, disruption, tax). A tight cheap deck can beat a clumsy rich one → skill curve.
- **No strictly-better cards:** a Rare is never just "the Common but bigger" — it trades efficiency for a
  ceiling, a condition, or a niche. Higher rarity = higher *variance/ceiling*, not free power.
- **Curve, not cliff:** rarer cards raise your deck's *ceiling*; piloting + synergy + the matchup still decide games.

### 3.3 The scaling / reward loop
- Start with a **Common-heavy starter deck.** Winning duels/tournaments, opening packs, and buying singles
  yields Uncommons → Rares → Mythics → your deck's ceiling rises → you beat tougher opponents → who reward
  better cards. Classic RPG power curve; the "XP" is your collection.
- **Opponents scale rarity too (ties to §4):** early opponents pilot Common/Uncommon decks; mid-game Rares;
  champions tuned Mythic decks. **So the rarity axis *is* the difficulty curve** — the player's collection
  growth must track the opponents' rising rarity (a drop-rate/econ tuning job for the sim).
- Feeds the (deferred) **singles market**: rarer = pricier; the buy-low/sell-high + chase-card loop.

---

## 4. AI-learnability — designed so strong, varied AI is feasible  *(Property 4)*

This is the **most rules-constraining** property, so it's baked into the design as hard rules.

### 4.1 Design rules that make AI strong + learnable
1. **Small, legible state + low branching.** 3 lanes, one Unit per lane (MVP), bounded hand, finite Light
   → an **enumerable `legalMoves`** and a shallow game tree. (Resist board-size creep; it's the #1 AI cost.)
2. **Low randomness.** The *only* RNG is shuffle/draw. **No coin-flips, no random targeting/discard** (a
   hard card-design rule). Deterministic effects → reliable lookahead + a clean value function.
3. **No unbounded loops / guaranteed turn termination.** Repeatable triggers are capped; effects can't
   create non-terminating loops (hard rule). Keeps the search tree finite, the sim safe, and rules bug-free.
4. **A clean static evaluation exists.** Win = Nexus→0 on a lanes+stats board ⇒ a strong heuristic is
   writable: `evaluate = w₁·nexusDiff + w₂·boardPower + w₃·cardAdvantage + w₄·tempo + w₅·laneControl`.
   This powers the AI ladder *today* and is the value-head target for any learned net.
5. **Manageable hidden information.** Hidden = opponent hand + deck order; hand sizes bounded; avoid huge
   hidden-info swing cards. This keeps **MCTS + determinization** (sample plausible opponent hands) and a
   **trained policy/value net** both tractable.
6. **One resolution order, minimal timing exceptions** → easy for AI to reason, easy to keep correct.

### 4.2 A CONTINUOUS skill scale — `skill ∈ [0,1]` (shown as a 0–100 rating), not 3 fixed tiers
One shared `evaluate` + **one continuous `skill` dial** drives every opponent, so the campaign can place
**progressively, finely harder opponents anywhere on the curve** across the 1–2-year career — not just
Low/Med/Hard. `skill` interpolates several knobs **monotonically**:
- **Move selection = softmax over evaluated moves with temperature `T = f(1−skill)`** — the core knob.
  High T (low skill) → loose/blundery; `T→0` (high skill) → near-greedy-optimal. Smooth and monotone.
- **Planning budget** — lookahead depth / **MCTS-determinization** iterations scale with skill (≈0-ply at
  the bottom → deep determinized search at the top).
- **Evaluation completeness** — low skill uses a noisier/partial eval (mis-weights tempo, ignores card
  advantage); high skill uses the full eval + opponent-hand modelling.
- **Craft** — Refract timing, lane sequencing, lethal detection, and "playing around answers" sharpen with skill.
- **Mistake floor** — a small per-turn blunder chance that decays toward 0 at the top.
Difficulty is thus a **single number you ramp continuously**; the sim verifies it's **monotone** (higher
`skill` beats lower, pairwise + smoothly — §4.4).

**Named bands** (UX labels over points on the scale, for legibility + the career ladder):
`Beginner → Kitchen-table → FNM regular → Shop ace → City champ → Regional → National → Worlds-class`
(≈ `skill` 0.05 → 0.95). The **career assigns each opponent a rising `skill`** (alongside rising deck
rarity, §3.3) → opponents get progressively harder all the way to Worlds. (Old "Low/Med/Hard" = just three presets.)
- **(Top of scale, stretch ⚑)** an **AlphaZero-lite self-play net** can back the highest ratings (the small
  board + low randomness make it feasible — Lacuna RL precedent); deep determinized-MCTS suffices otherwise.
- AI **always plays through the real `legalMoves`/`reduce`** (no cheating, no hidden-info peeking beyond its
  determinization model) → it's also the **balance instrument**.

### 4.3 Different opponents = decks + persona weights (orthogonal to skill)
`skill` sets *how well* an opponent plays; **deck + persona weights** set *how it wants to play* — the two
are independent, so you get strong **and** varied opponents at every rating. `opponent = { deckId, skill,
personaWeights, flavor }`. An **Aggro** persona over-weights tempo + Nexus-damage; **Control** over-weights
card-advantage + lane-stall; **Combo** values assembling its engine. A roster of recognizable rivals (each
with its own deck, persona, *and* a campaign-assigned skill rating) — all off one tested core.

### 4.4 The AI is the balance instrument (closes the loop)
A headless **AI-vs-AI sim** (`npm run sim`) sweeps archetype × rarity × format matchups → win-rate tables →
which (a) **tunes the rarity power-budgets** (§3), (b) **flags ban/limit candidates** for the B&R list (§2),
and (c) verifies each new **set** (§1) shifts the meta without a degenerate auto-win deck. The **skill
scale is sim-verified monotone** — sample ratings across `skill ∈ [0,1]` and confirm higher beats lower
pairwise (>50%) and smoothly, so the career's rising-difficulty ramp is real, not noise.

---

## 5. How the four properties interlock
**Sets** (1) expand the pool → new archetypes/power → the **sim+AI** (4) measure the new meta → **ban/limit**
(2) + **rarity power-budget** tuning (3) keep it healthy → the player's **collection growth** (3) tracks the
**opponents' rising rarity** (4) → the **campaign calendar** drives set drops + B&R announcements (1, 2) as
in-fiction beats. A self-reinforcing, single-player "live game." Each property reinforces the others:
- Rarity-power (3) creates chase + difficulty; B&R (2) stops it becoming pay-to-win; sets (1) keep it fresh;
  AI (4) makes every stage a real opponent **and** is the tool that balances 1–3.

---

## 6. Engine / data model (for the build)
```
CardDef   { id, setId, affinity, type, cost, power?, keywords[], rarity, powerBudget, text, art }
Set       { id, name, releaseDate, cardIds[], newKeywords[], themes[] }
Format    { legalSetIds[], banned: id[], limited: Record<id, 1|2> }       // default copies = 3
Campaign  { date, setSchedule[], formatRules, banRestrictEvents[], formatHistory[] }
Opponent  { deckId, skill: number /*0..1, continuous*/, personaWeights, flavor }   // career assigns rising skill
```
Pure functions: `currentFormat(campaign) → Format` · `isLegal(deck, Format) → {ok, reasons}` ·
`legalMoves(duel, player)` · `reduce(duel, action)` · `evaluate(duel, player)`.
**Hard engine invariants (enforced + tested):** deterministic effects, every turn terminates, no unbounded
loops, `legalMoves` is the single source for UI + AI, a new Set adds only data + keyword handlers.

## 7. MVP build slice (for the card-game-first MVP)
Build **one launch Set** (**~60 cards**, 5 Affinities × ~2 archetypes + neutrals, full rarity spread with §3
budgets), a **card gallery** (browse all cards by Set, per-set completion %, filter by Affinity/rarity),
the **format + B&R machinery** (even if the MVP ships one authored format + a tiny demo ban list), the
**rarity-scaled opponent roster on the continuous `skill` scale (named bands) + persona weights**, the
**deckbuilder/legality**, and the **sim** that tunes budgets + verifies the skill scale is monotone. The
set-release calendar, dynamic B&R, market, and Champion-net are post-MVP (the campaign/world layer) — but
the data model above is built to accept them.

## 8. Open decisions ⚑
- Prismatic = cosmetic-only vs trivial edge (lean cosmetic-only to protect fairness).
- Standard rotation vs Eternal vs both-as-events (lean both).
- Dynamic (sim-driven) B&R vs authored-only (MVP = authored).
- Exact power-budget numbers + drop/econ rates (a sim/tuning job).
- Any *revealed-information* mechanics to further aid AI? (e.g., telegraphed "intents") — evaluate in build.
- Keep 1 Unit/lane (AI-tractable) vs allow 2 later (more depth, more branching) — MVP keeps 1.
