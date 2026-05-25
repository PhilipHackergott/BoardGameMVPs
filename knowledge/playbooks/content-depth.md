# Content depth — the catalog is the product

How to ship a build that is **content-rich and replayable**, not a thin vertical slice — affordably,
by building the data-driven spine first and filling the catalog on it. This is row 4 of
`target-state.md`. Crawl it during spec and again at the start of the build.

> Why this exists. The two projects the user was happiest with earn their value almost entirely in
> **content breadth**: **Cull the Crown** shipped 13 starting decks, 8 stakes, rarity-tiered relics,
> tiered royal decrees, court events, and card sigils; **Lacuna** shipped 24 powers across distinct
> mechanical axes + 7 affinities + a difficulty ladder. A roguelike with 3 enemies and 2 relics is a
> tech demo of a roguelike, not an MVP of one. Content is the reason to play again — so it is not
> "polish later."

## The mindset shift

"Smallest playable MVP" was read as "the thinnest content slice." Wrong axis to cut on. **Cut whole
optional *modules* (extra modes, expansions, online); never cut depth within the core loop.** The base
game ships with the full catalog that makes its loop worth repeating. The good news: done right, breadth
is cheap — you do not hand-author 24 powers, you build one **spine** and pour content into it.

## The enabling architecture: a data-driven content spine (build it in milestone 1)

This is the single decision that makes depth affordable. (Mechanics live in `patterns/engine.md`; this
is the *why and when*.)

- **Content is data, behaviour is a small pure hook.** Each piece of content is a plain data entry in a
  registry (`content.ts` / `powers.ts`); its effect is expressed through **hooks fired at fixed decision
  points** in the reducer. Adding content = a data row + (at most) one hook — not new branches scattered
  through the rules.
- **Define the hook points *once*, up front.** Pick the fixed points where content can act and name a
  resolution order. CTC defined a **DECREE phase** before the JOKERS phase with a fixed hook set —
  `resolve` / `forbids` (veto) / `onPlayResolved` / `onCounterResolved` / `healthMult` / `ignoresShield`
  / `intentNote` — so six royal decrees, then more, all slotted in without touching combat math. Magical
  Athlete fired power hooks at fixed turn moments in a defined resolution order. Decide these before the
  catalog, or every new piece re-opens the reducer.
- **Default-off must reduce to the base game.** With no content flags set, the engine must behave
  exactly as the base rules — so the base-game tests stay valid and content is provably additive. This
  is the contract that lets you keep adding safely.
- **Store per-entity content clone-safe.** Hold a content id + params on the entity (`Enemy.decreeId`,
  per-player power flags), not a closure or live object, so state stays serializable, replayable, and
  cloneable for the sim harness.
- **One predicate per cross-cutting rule.** When many pieces touch the same thing (every displacement
  effect, every immunity), funnel them through **one** shared predicate (Lacuna's `canDisplace`) so a
  new piece can't introduce a divergent rule.

**Build the spine in milestone 1; fill the catalog in milestone 4.** Do not bolt the spine on after a
hardcoded core — Lacuna's "2-player baked in" cost a refactor across engine/scoring/store/UI when depth
arrived. The spine is the cheap-to-extend skeleton; retrofitting it is the expensive path.

## Where depth comes from (the content categories that paid off)

Reach for these axes — each multiplies replayability for modest effort, and all are data on the spine:

- **Run-creation variants** — change the *starting conditions* and one ruleset yields dozens of fresh
  runs. CTC's 13 **decks** (different starting gold/hand/relics/suit mixes) × 8 **stakes** (a cumulative
  difficulty ladder: reward−1 → +HP → −1 hand → +3 atk…) is enormous variety from pure-data config
  overrides. Highest replayability-per-line-of-code there is.
- **A real progression curve (opponents must escalate, not be flat-random).** The user's tell on CTC was
  "do the opponents actually progress?" — they didn't; modifiers were assigned uniformly. The fix:
  **tier content by severity** — Jacks draw a mild decree, Queens a standard one, Kings a severe one +
  a stacked mild, the final boss a unique finisher. Difficulty that *ramps* is itself content.
- **Rarity tiers + downside / scaling / synergy pieces.** CTC relics carry `rarity`
  (common/uncommon/rare, rarity-weighted in the shop) and span archetypes: **downside** (Glass Cannon:
  ×1.5 damage, −2 hand), **scaling** (Whetstone: +1 per enemy felled), **synergy** (Twin Daggers:
  +combo), **lifecycle** (start-of-fight effects). Variety of *shape*, not just numbers, is what makes a
  collection feel deep.
- **Choice nodes / events** — risk-reward decision points between fights (CTC's 5 court events:
  shrine/armory/mercenary/gambler/refugees) add narrative texture and agency cheaply.
- **Editions / modifiers on existing content** — sigils/enchantments that re-skin or buff base pieces
  (CTC's 8 card sigils) multiply a small base set.
- **Orthogonal variant axes that stack** — two independent content systems that each default off and
  compose (Lacuna **powers** + **affinities**). Once the spine supports one axis, a second is nearly
  free and the combinations explode the space.

## Don't build 24 variations of one idea — map the axes, open the empty ones

The trap is piling more content onto the axis you already have. Lacuna's 18 powers all clustered on
**four** axes (placement legality, collect-on-place, displacement, end-scoring) while four rich axes were
**untouched** — board transformation, territory-rule rewrites, pawn-topology, temporal/combo. The
high-value move was opening the empty axes: **Alchemist** (recolour flowers — board transformation),
**Lighthouse/Cartographer** (rewrite the nightfall claim rule), **Momentum** (combo), each a genuinely
new mechanic, not a variation. Method: **list the design axes your content touches, then deliberately
add to the under-served ones** — novelty-per-effort beats count.

## Content isn't done until it's legible and tuned

A piece of content the player can't understand or that breaks the game isn't depth, it's noise. Each
piece must also:

- **Telegraph itself in the UI** — original in-code art per item (`patterns/presentation-fx.md`:
  CTC's `<ItemArt>` SVG emblems, intent banners that announce the enemy's next move + active modifier),
  a full-words description at the point of use, and a tooltip. Surface plan-relevant content state
  redundantly (`visual-first-try.md`).
- **Go through the balance harness** — run the catalog through `balance-and-tuning.md`'s AI-vs-AI sweep;
  no piece should be auto-win or dead. (And remember the AI-blind caveat: planning/active content the AI
  can't use reads low for the wrong reason.)

## How much is enough?

Enough that the core loop is **worth replaying** — judged against the genre. For a roguelike that means
a real catalog (CTC's order of magnitude: ~a dozen decks, ~a dozen relics with distinct shapes, tiered
enemy modifiers, a handful of events). For a variant-driven abstract, a full set of stacking options
(Lacuna's ~24 powers / 7 affinities). When in doubt, ship the **complete base-game catalog** and cut
*modules*, not pieces. Track cut content explicitly with the reason.

## Reusable references

- **Content spine + hook points** — `patterns/engine.md` (data-driven variant spine; trigger/effect
  resolver; fixed hook points; default-off contract; one-predicate-per-rule). Code: Lacuna
  `app/src/engine/{powers,effects}.ts`, CTC `app/src/engine/{content,resolution,combat}.ts`.
- **Run-creation variants** — CTC decks/stakes: `app/src/engine/content.ts` (`DECK_LIBRARY`,
  `STAKE_*`), wired in `run.ts` `createRun`.
- **Tiered progression curve** — CTC `content.DECREE_SEVERITY` + `assignTieredDecree`.
- **Rarity / archetype relics + events + sigils** — CTC `engine/content.ts`; see the
  `project-state.json` history entries "roguelike-expansion P1–P5".
- **Orthogonal axes + exploring design space** — Lacuna `07-balance-report.md` ("exploring unexplored
  design space" + the new-power batches).
