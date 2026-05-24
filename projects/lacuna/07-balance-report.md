# Lacuna — Balance Report (AI-vs-AI sweep)

> Generated 2026-05-22 from `npm run sim` (harness: `app/tests/sim/balance.test.ts`,
> raw data: `app/balance-sim.json`). **600 games per category, 1,800 total.**

## Method

- **Two HARD AIs, 2 players, AI vs AI.** Headless playout over the pure engine (the App driver
  loop replicated: claim → place → free-picks → dusk → abyss → repel → pass).
- Powers/affinities are **assigned at random to the two seats** (not via the tier draft), so
  per-entity win rates aren't confounded by who drafted first. Seat 0 always moves first, so the
  seat-0 win rate is a clean **first-player** signal.
- 0 errors, 0 non-terminating games, ~0 draws (powers) — strong, clean signal.
- `winRate = (wins + 0.5·draws) / appearances`. `colorMargin = avg(your colours − their colours)`.
  A balanced entity sits near **50% / 0.0**.

## Headline findings

1. **First-player advantage is NOT a problem.** Seat-0 win rate: **49.3%** (powers), **46.0%**
   (affinities), **50.9%** (both). Round-robin order is fair; no turn-order fix needed. (Pure-affinity
   games show a mild *second*-player edge — minor.)
2. **Powers are wildly unbalanced** — win rates span **24% → 99%**. One power (Procrastinator) is
   effectively an auto-win.
3. **Affinities are much tighter** (40% → 59%) but have a clear weak end (Frost, Ember) and strong
   end (Aureate, Verdant, Dusk). They're functional but flat — each is a single small bonus.
4. ⚠️ **Three powers are "AI-blind" — their numbers are not trustworthy.** The current AI never uses
   **Nomad**'s redeploy or **Flexible**'s flex-pass/extra (optional actives), and **Controlling**'s
   lens-denial is meaningless to an AI that doesn't use the lens. Worse, **Nomad's passive skips the
   starting-bonus claim** — a *real* cost the AI pays with no offsetting active. Treat their low
   scores as "passive-only floor," not true balance.

## Powers — measured win rates

| Power | winRate | colorMargin | n (powers / both) | Verdict |
|-------|:------:|:-----:|:--:|---|
| **Procrastinator** | **0.99 / 1.00** | +2.81 | 78/61 | 🔴 broken — auto-win |
| **Spectral** | 0.81 / 0.84 | +1.75 | 52/56 | 🔴 too strong |
| **Cheater** | 0.69 / 0.71 | +1.15 | 67/68 | 🟠 strong |
| **Gravity** | 0.61 / 0.54 | +0.6 | 75/69 | 🟡 slightly strong |
| Warding | 0.60 / 0.55 | ~0 | 62/71 | 🟢 fine |
| Assassin | 0.58 / 0.44 | ~0 | 59/81 | 🟢 fine |
| Shadow Follow | 0.50 / 0.58 | ~0 | 68/60 | 🟢 fine |
| Agile | 0.49 / 0.48 | −0.3 | 65/65 | 🟢 fine |
| Catalyst | 0.37 / 0.59 | ~0 | 52/65 | 🟡 noisy |
| Patron | 0.45 / 0.37 | −0.3 | 75/77 | 🟠 weak |
| Intercept | 0.43 / 0.42 | −0.3 | 76/62 | 🟠 weak |
| Harvester | 0.37 / 0.37 | −0.7 | 73/78 | 🟠 weak |
| Flying | 0.37 / 0.48 | −0.3 | 57/68 | 🟠 weak |
| Hoarder | 0.36 / 0.30 | −0.8 | 80/66 | 🔴 weak |
| Repeller | 0.33 / 0.24 | −1.2 | 70/59 | 🔴 weak |
| **Controlling** | 0.38 / 0.48 | −0.5 | 68/64 | ⚪ AI-blind (lens denial meaningless vs AI) |
| **Flexible** | 0.37 / 0.46 | −0.5 | 51/68 | ⚪ AI-blind (actives unused) |
| **Nomad** | 0.29 / 0.24 | −1.0 | 72/62 | ⚪ AI-blind + passive skips the starting claim |

## Affinities — measured win rates

| Affinity | winRate (aff / both) | Verdict |
|----------|:----:|---|
| **Verdant** (pull nearby flowers) | 0.59 / 0.45 | 🟡 strong (pure) |
| **Aureate** (+1 best non-winning colour) | 0.57 / 0.58 | 🟠 consistently strong |
| **Dusk** (steal 1 of a colour from its leader) | 0.54 / 0.53 | 🟢 well-placed |
| **Abyss** (banish a flower) | 0.53 / 0.53 | 🟢 well-placed |
| **Chalk** (bonus line budget) | 0.47 / 0.45 | 🟠 weak/flat |
| **Ember** (pull same-colour to the drop) | 0.42 / 0.49 | 🟠 weak |
| **Frost** (freeze 2 nearest) | 0.40 / 0.45 | 🔴 weakest — purely defensive |

---

# Suggested patch notes

Goal: compress the power spread from **24–99%** toward **~42–58%**, lift the weak affinities, and
trim the two strong ones. Numbers are starting points to re-sim with `npm run sim`.

### Power nerfs
- **Procrastinator** — the connected same-colour *cluster* collect is the culprit (it can net many
  flowers per placement). **Cap the bonus to +2 extra flowers** (or remove cluster-collect and keep
  only the "start a turn later" tempo). Target ~55%.
- **Spectral** — currently stacks pass-through placement **and** 1.3× territory weight. Keep **one**:
  pass-through with weight 1.0, *or* weight 1.15 without pass-through. Target ~55%.
- **Cheater** — drop the flat **+1 to best colour**; keep only **win colour ties**. Target ~53%.
- **Gravity** — reduce pull radius/strength ~15%. Target ~52%.

### Power buffs
- **Repeller** — widen the cone and/or push harder so it actually scatters a rival cluster; consider
  letting it also nudge *your* colour inward. Target ~48%.
- **Hoarder** — the ≥6 doubling threshold lands too late. Lower to **≥4**, or **+1 per colour where
  you hold ≥3**. Target ~48%.
- **Harvester / Flying / Patron / Intercept / Catalyst** — small buffs: Harvester grabs the nearest
  **2** matching; Flying may cross **2** blockers; Patron picks **3** (not 2); Intercept's barrier
  also denies nightfall territory in a band; Catalyst's phantom collects a **trio**.

### Power reworks (AI-blind — fix design *and* AI)
- **Nomad** — stop skipping the starting claim (or make it automatic), and either make the redeploy a
  passive perk or **teach the AI to use it**. It's currently strictly worse than no power.
- **Flexible** — teach the AI to spend flex-pass / extra-turn; today it's an unused passive.
- **Controlling** — rework into a *material* effect (lens-denial is meaningless vs AI and weak vs
  humans): e.g. "rivals can't place within R of your pawns **and** you alone see the live territory
  projection."

### Affinity tuning + fleshing-out (the user's ask: make them all better/more interesting)
Give each affinity a **passive identity** ("while you lead {colour}…") on top of its trigger, so
collecting your colour compounds and each feels distinct:
- **Frost** 🔴 — freeze **3** nearest *and* frozen flowers you later collect count **double**; while
  you lead Frost, rivals can't displace your pawns' neighbours.
- **Ember** 🟠 — instead of a chaotic global pull, **at nightfall pull same-colour leftovers toward
  your pawns** (a territory boost); while you lead Ember, your placements ignore 1 blocker.
- **Chalk** 🟠 — +1 line reach per **2** Chalk held *and* ignore one barrier; while you lead Chalk,
  your lines can't be blocked by rival pawns.
- **Aureate** 🟠 (trim) — +1 to a colour you're **tied or 1 behind** in (situational, not a free swing).
- **Verdant** 🟡 (trim) — pull radius −15%.
- **Dusk / Abyss** 🟢 — keep; optionally add a small passive (Dusk: see rivals' leading colour; Abyss:
  banished flowers' colour can't be won by rivals this game).

---

# Additional abilities to flesh out variety

Powers currently cluster around displacement/territory tweaks. Suggested new powers spanning
**under-served axes** (info, economy, movement, denial, set-shaping). Pull the existing backlog
(`06-powers-backlog.md`: Vortex / Arc / Nexus / Lattice / Seismic) forward too.

- **Surveyor** (info) — see the live exact territory projection. Real value vs humans; needs an AI hook.
- **Lighthouse** (territory) — one chosen pawn's nightfall reach is doubled (an anchor).
- **Tithe** (economy) — when a rival collects a colour **you** lead, you collect 1 of it too.
- **Migration** (movement) — once per game, relocate one of your placed pawns to any legal point.
- **Bramble** (denial) — drop a permanent line-blocking thorn on an empty point (placeable Intercept).
- **Prism** (set-shaping) — each placement also collects the nearest **off-colour** flower (diversify).
- **Echo** (tempo) — your **first** placement is duplicated as a phantom (front-loaded Catalyst).
- **Magpie** (scoring) — at nightfall, steal one colour majority you trail by **exactly 1**.

These add information, economy, mobility, and scoring-twist archetypes the current 18 lack.

---

# Patch applied (2026-05-22) + after-results

Implemented the power changes, fixed AI usage of optional actives, removed **Controlling**, and
added **Tithe / Prism / Magpie**. Re-ran the sweep (N=800/category) across three tuning iterations.

**Result: power win-rate spread compressed from 24–99% → 32–73%; 17/20 powers within 35–65%;
first-player 50–53% (fair); affinities 42–59%.** (Per-power CI is ~±8% at this N, so ±5pt moves are
noise.)

| Power | avg win% | Power | avg win% |
|-------|:--:|-------|:--:|
| Procrastinator | 73 | Assassin | 46 |
| Spectral | 71 | Prism | 45 |
| Nomad | 61 | Magpie | 43 |
| Gravity / Intercept | 59 | Flying / Tithe | 41 |
| Warding | 57 | Cheater | 38 |
| Catalyst | 55 | Flexible | 36 |
| Harvester | 50 | Repeller | 32 |
| Agile / Shadow Follow / Patron | 48–49 | Hoarder | 46 |

**What shipped:**
- *Nerfs:* Procrastinator (full cluster → +1, first 3 placements only); Spectral (territory reach
  1.3→1.12); Cheater (greedy +1 removed → wins ties only); Gravity (separate, weaker constants from
  Verdant); Magpie (steal → **spoil/contest**, only when behind on colours).
- *Buffs:* Hoarder (double → a held-5+ won colour counts as an extra colour); Harvester (sweeps 1–2
  left); Flying (cross 2); Patron (pick 3); Intercept (barriers now also block rival **territory
  claims**); Catalyst (phantom collects a trio); Repeller (off-field flowers are **swept into your
  basket**, not scattered); Nomad (no longer skips the starting claim).
- *New:* **Tithe** (skim a colour a rival collects while you lead it), **Prism** (first 3 placements
  also grab the nearest off-colour flower), **Magpie** (spoil a trailed-by-1 colour when behind).
- *AI usage:* the AI now uses **Nomad redeploy** (Nomad 24%→61%). **Flexible's** extra-turn is
  deliberately *not* used — the sim proved reordering turns adds no pawns, so it's tempo-neutral;
  Flexible needs a real-extra-pawn redesign (below). Harness: `npm run sim`.

**Still slightly off (within tolerance / flagged):**
- **Procrastinator 73 / Spectral 71** — mildly hot; a touch more (Procrastinator first-2 only;
  Spectral 1.08) would settle them. Left as-is to avoid over-fitting noise.
- **Repeller 32 / Flexible 36** — the weak end. Both are *design* problems, not numbers:
  - **Flexible**: "extra turn" must grant a genuine **extra pawn** (a 13th beacon for you), not
    reorder the snake. Needs a `bonusBeacons` state field.
  - **Repeller**: even collecting off-field flowers, pushing is awkward. Consider reworking into a
    **pull** that drags a cone of flowers toward your pawn (collect-adjacent), making it an active
    harvest tool.

---

# New powers — exploring unexplored design space

Per the brief ("think outside the box; no UI-only powers"). The current 20 powers cluster on four
axes: **placement legality, collect-on-place, displacement, end-scoring tweaks.** Four axes are
barely touched — each is a rich, distinct design space:

### A. Board transformation — change the flowers, not just their positions
The board's *colour composition* is currently fixed; letting players reshape it is the biggest
untapped space (it changes which pairs are even legal, and the whole set-collection).
- **Alchemist** — once per turn, recolour one flower to a colour of your choice. Bends the board
  toward your sets and breaks rivals'.
- **Wildseed** — your placements leave the two claimed spots as **wild** flowers (connectable to
  any colour) for everyone — or only you. Reshapes the connection graph.
- **Pollen** — each of your pawns slowly **converts the nearest flower to its line's colour** at
  nightfall, before territory is scored.

### B. Territory-rule powers — rewrite how the nightfall Voronoi works (the scoring heart)
Only Spectral (reach) and Intercept (walls) touch nightfall; the claim *rule* itself is open.
- **Lighthouse** — one chosen pawn claims by a **doubled radius** (a dominant anchor).
- **Cartographer** — your pawns claim every flower within a fixed **radius** (area claim), so
  claims can overlap and contest — a totally different territory metric from "nearest pawn."
- **Tide** — at nightfall all loose flowers **drift toward the pond centre** before claiming,
  reshaping every territory at once (rewards central pawns).

### C. Topology / pawn-relationship — powers about your pawns' geometry to each other
- **Constellation** — pairs of your pawns within range form an **edge**; flowers under that edge
  are yours at nightfall (claim *corridors*, not just points).
- **Mirror** — each placement also drops a free **phantom mirrored across the pond centre**
  (symmetric board coverage; phantom collects nothing, only claims territory).

### D. Temporal / combo — reward sequencing (the engine already keeps an action log)
- **Momentum** — each consecutive turn you collect the **same colour**, gain +1 more of it
  (a build-up combo that punishes interruption).
- **Echo** — once per game, immediately **repeat your last placement's collect** on another legal
  pair of that colour.

### E. Risk / wager — variance and bluffing, currently absent
- **Gambler** — secretly name a colour at game start; win it for **+2 colours**, lose it for **−1**.
- **Investor** — *decline* to collect on a placement to bank it; your **next** placement collects
  **double**.

**Recommended first batch to build (highest novelty-per-effort, all pure-engine):** **Alchemist**
(opens the board-transformation axis), **Lighthouse** + **Cartographer** (open the territory-rule
axis), **Momentum** (opens the combo axis), and the **Flexible/Repeller redesigns** above. That
adds three genuinely new mechanical axes rather than more variations on placement/scoring.

---

# Round 2 (2026-05-22) — four new powers + two redesigns

Built the recommended batch (three new mechanical axes) + the two flagged redesigns, re-balanced
over two sim iterations (N=800).

**New powers**
- **Alchemist** (board transformation) — after each placement, the nearest other flower transmutes
  into your colour (+1 of it). Opens the "reshape the board's colour composition" axis.
- **Lighthouse** (territory rule) — your first pawn claims from 1.5× as far.
- **Cartographer** (territory rule) — strong local claim reach (×2 within 85u of any pawn),
  overriding nearest-pawn for not-too-close rivals.
- **Momentum** (combo) — consecutive same-colour placements build a streak (+1, +2, +3).

**Redesigns (the two powers numbers couldn't fix)**
- **Flexible** → `flexExtra` now grants a **genuine extra pawn** (a 13th beacon + an extra turn),
  not a no-op reorder. AI re-enabled. **36% → 60%.**
- **Repeller → "Magnet"** → the cone now **drags flowers toward your pawn and harvests up to two**
  that reach it, instead of pushing them away (which only hurt the owner). **32% → 54%.**

**Final distribution (24 powers, N=800, avg of powers-only & both):**

| | win% | | win% | | win% |
|--|:--:|--|:--:|--|:--:|
| Cartographer | 65 | Lighthouse | 56 | Patron / Magpie | 44 |
| Intercept | 63 | Magnet | 54 | Hoarder / Agile / Prism | 42 |
| Procrastinator / Flexible / Warding | 60 | Nomad / Tithe / Catalyst | 52–53 | Cheater | 41 |
| Gravity / Alchemist | 59 | Shadow Follow | 49 | Assassin | 39 |
| Spectral | 57 | Harvester | 47 | Flying | 33 |
| | | | | Momentum | 32 |

**Spread 32–65% (was 24–99%); 22/24 within 35–65%; first-player 49/49%; affinities 43–56%.**

**Known measurement caveat (don't over-buff):** **Momentum (32%)** and **Flying (33%)** read low
because the greedy 1-ply AI can't *plan* — it won't deliberately chain a colour (Momentum) or set up
a cross-two-blockers reach (Flying). Like the earlier Nomad/Flexible finding, these are
AI-undervalued floors, not true imbalance; they'd test higher with a planning AI or human play.
Cartographer (65) sits at the top edge — a touch more (radius 80 / ×1.8 reach) would settle it.

---

# Round 3 (2026-05-22) — smarter Hard AI (no longer "just greedy")

**Change.** Medium is now **pure greedy** (maximise your own projected flowers + territory, one
ply). **Hard is a 2-ply lookahead**: for the top candidate placements it simulates the opponent's
best greedy reply, then scores on the **actual win condition** — *projected colours won* via
`finalize` (so it's power/affinity-aware: Hoarder, Cheater, Magpie, Lighthouse, Cartographer,
Spectral, Intercept all factor in), not raw flower/territory counts. Sources: `src/ai/ai.ts`
(`aiPlace`, `bestGreedyReply`, `evalColors`).

**Verified (new `npm run sim` "strength ladder" test, seats alternated to cancel first-player):**
> **Hard beats Medium 78–84%**, Medium beats Low ~100%, Hard beats Low ~100%.

The ladder now genuinely climbs (before, Hard was greedy+rival ≈ Medium).

**Consequence — balance is relative to AI skill, and it shifted.** The power numbers above were
tuned against the *old* greedy Hard; under the new smarter Hard (N=600):
- **Warding 83%** — a lookahead AI exploits its placement-denial far better; now the top power.
- **Procrastinator 74%** (nudged: bonus on the **first placement only** now).
- **Cartographer / Intercept ~66%** still strong.
- **Momentum 22%, Nomad 31%, Cheater/Magpie ~38%** — the bottom. Momentum especially: even a 2-ply
  AI doesn't deliberately *build* a multi-turn colour streak, so it stays AI-undervalued.
- **First-player win rate fell to ~40%** — moving *second* is now an edge, because the smarter AI
  responds optimally to the opener. Worth a small first-player compensation if it persists.

**Recommendation:** the AI upgrade is the deliverable and is done. A focused **re-tune against the
new Hard** is the natural follow-up (nerf Warding's ward radius; investigate the second-player edge;
treat Momentum/Flying as AI-undervalued or give the AI light planning for them). Not done here to
avoid chasing a moving target without a steer.

## Caveats
- Balance is measured **under the current hard AI**, which plays a greedy 1-ply estimate and **does
  not** use optional actives or the lens. It's an excellent detector of dominant/dead *passive*
  effects (Procrastinator, Spectral, Repeller, Frost) but cannot judge actives (Nomad, Flexible) or
  information powers — those need AI support or human playtests.
- Re-run after each patch with `npm run sim` (set `SIM_N` higher for tighter per-power intervals).
