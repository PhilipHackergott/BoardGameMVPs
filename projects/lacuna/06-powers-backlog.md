# Powers backlog & design (Lacuna)

Status of the special-powers mode. **Shipped** powers are live in the engine + draft.
**Designed** entries are specced but not yet built (they need new interactive sub-phases or are
proposals from a planning pass).

## Shipped (engine + tested + iconed)
warding, flying, agile, controlling, procrastinator, gravity, intercept, flexible, patron,
cheater, **spectral**, **hoarder**, **shadowfollow** (Shadow Follow), **harvester**, **assassin**.
- Push/pull (gravity, future repeller) is **shielded**: flowers inside a Warding zone or on an
  Intercept barrier are never moved. (`engine/effects.ts isShielded`.)
- Procrastinator follows only the player's own legal (green) lines — Flying lets it cross one
  blocker per hop.

## Shipped — the interactive trio (engine + UI + tested)
- **Repeller** — after placing, click a direction; flowers in a ±60° cone within reach are
  shoved away (warded/barriered flowers exempt). Dashed reach ring while aiming.
- **Nomad** — always seated first + skips the starting claim; once/game **Redeploy** button →
  click one of your pawns to reclaim it (extra slot to re-drop for a fresh pair).
- **Catalyst** — after your 2nd real pawn, an automatic extra **phantom** placement (collects a
  pair, drawn outline-only, excluded from territory).

## Shipped — AI players
Setup: per-player Human / Low / Med / Hard. `ai.ts` choice fns + an App driver effect step the
AI through draft → claim → place → free picks → repel → pass. Low = random; Medium = greedy by a
position estimate; Hard = estimate(me) − best rival. Reuses the pure engine for simulation.

## NEXT — Color Affinities (PART II, full spec from planning)
A second draftable axis: each player may take **one affinity** tied to a flower colour. Dual-zone
draft (powers + affinities), affinities are unique (locked once taken), card border = colour
identity, owned cards show the owner's colour + avatar. Inter-player flower transfers (Dusk,
Poacher, Abyss-vs-rival) animate token→token between supply piles.
- **Ember** (c0): collect an Ember pair → pull ALL remaining Ember toward your pawn (ward/barrier/Frost shield).
- **Frost** (c1): collect a Frost pair → permanently freeze the 2 nearest flowers (immune to all displacement). Adds `frozenStars`.
- **Verdant** (c2): collect a Verdant pair → local any-colour Gravity pulse from your pawn.
- **Aureate** (c3): collect an Aureate pair → +1 to your best not-yet-winning colour (auto). Dotted bonus-target highlight while aiming an Aureate pair.
- **Dusk** (c4): collect a Dusk pair → pick a non-Dusk colour, steal 1 from its leading rival. New action `duskSteal{colorId}` + colour-picker UI.
- **Chalk** (c5): your line flower-crossing budget = `collected[you][5]` (stacks with Flying).
- **Abyss** (c6): collect an Abyss pair → may remove 1 flower from the field (void); expires at turn end.
- Engine hooks: displacement effects (gravity/repeller/vortex/nexus + Ember/Verdant) must skip
  `frozenStars` and shielded flowers; `lineClearFor` flower budget += Chalk count; `finalize`
  unaffected except via collected. New state: `frozenStars`, `abyssVoid*`, affinity per player.

## NEXT — remaining powers (specced earlier, not yet built)
- **Vortex** — each placement rotates nearby flowers around your pawn by a fixed arc (cumulative spiral). `geometry.rotateAround`.
- **Arc** — placement line may bend at a chosen waypoint A→C→B; each segment cleared independently; Flying budget per segment. `place` gains `{wx,wy}`; waypoint picker UI.
- **Nexus** — each placement pulses your whole beacon network: flowers near any of your pawns drawn toward the nearest friendly pawn.
- **Lattice** — with 3+ beacons, flowers inside your beacons' convex hull are yours at end. `geometry.pointInConvexHull` in `finalize`.
- **Seismic** — once/game: pick a beacon; flowers within its ward-sized radius are voided. Beacon-selector sub-phase + dotted blast ring.

## Designed — interactive (need a new sub-phase; engine hooks exist as patterns)
- **Repeller** — after placing, a **cone picker** (±60° arc): flowers in that arc within radius
  are pushed away (inverse Gravity), `isShielded` flowers exempt. Build: a `pending: {kind:"cone",
  origin}` sub-phase; player clicks a direction; reuse the gravity move with a negated factor +
  cone test. Render a dashed cone preview.
- **Nomad** — always seated first (`placementOrder` puts Nomad at index 0) **and skips the setup
  claim** (if the first player is Nomad, skip straight to play). Plus once/game **beacon
  redeploy**: a `pending:{kind:"pickup"}` to select one of your beacons → it's removed (territory
  loses it) and you get an extra placement to re-drop it (collecting a new pair).
- **Catalyst** — after your **2nd** real placement, an automatic **extra placement** whose beacon
  is a **phantom** (`Beacon.phantom`): collects the pair normally but is excluded from territory
  in `claimOwner`. Build: `phantomNext[]` flag + order insert (like flexExtra) + make
  `beaconsPlacedBy` ignore phantoms; render phantoms as outline-only pawns.

## Designed — AI players (setup-configurable, low / medium / hard)
- **Setup**: per-player type `human | ai`, plus difficulty. Store `players: {type, ai?}[]`.
- **Driver**: an App effect — when it's an AI player's turn (or AI must draft / resolve a free
  pick / claim), compute a move and dispatch the same store actions a human would, with a short
  delay for legibility. Must handle every phase: setup claim, draft (pick a power), placement
  (select→hover→commit), free picks, flex, pass.
- **Difficulty**:
  - *Low* — random legal move; midpoint placement; random draft.
  - *Medium* — greedy: place to maximize flowers collected now + simple territory heuristic
    (nearest-flower control); draft by a fixed power tier list.
  - *Hard* — 1-ply lookahead over legal moves scored by a `finalize`-style territory estimate
    (run the existing weighted nearest on a hypothetical board), avoid feeding rivals; smarter
    placement point (toward contested clusters); power-aware (use ward/intercept to deny).
- Reuse the pure engine (`legalMoves`, `applyAction`, `finalize`) for simulation — it's already
  deterministic and side-effect free, ideal for AI rollouts.

## Designed — color-specific powers (1 per flower, flavorful; proposals)
Each keys off one flower colour, so it only pays off if you commit to that colour.
- **Bellflower — Peal**: collecting a Bellflower pair lets your *next* line cross one blocker (a one-shot Flying, colour-gated).
- **Lotus — Bloom**: if you hold the Lotus majority at end, each Lotus you hold is worth +1.
- **Water Lily — Lilypad**: you may drop pawns slightly off the line when near a Water Lily (small free-placement radius) — spatial.
- **Marigold — Wildfire**: collecting a Marigold pair burns (removes from game) the nearest other flower.
- **Jasmine — Fragrance**: each Jasmine you've collected widens your nightfall pull a little (stacking territory weight).
- **Primrose — First Light**: holding the most Primrose also wins you one *tied* colour of your choice.
- **Anemone — Pale Veil**: a pawn dropped adjacent to an Anemone projects a small ward zone (colour-gated Warding) — spatial.

## Designed — more spatial zone-of-control powers (proposals)
- **Riptide**: your drawn line shoves flowers off it to the sides (clears a lane).
- **Mire**: rival pawns within R of yours have weakened nightfall pull.
- **Fault Line**: once/game draw a permanent barrier across the pond only *you* may cross (inverse Intercept).
- **Echo**: one chosen pawn anchors a larger fixed-radius territory bubble at nightfall.
- **Claim Stake**: drop a non-collecting marker that still anchors territory (a cheap extra beacon).
