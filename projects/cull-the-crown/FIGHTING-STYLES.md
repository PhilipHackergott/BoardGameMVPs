# Fighting Styles — the Planet-card analog

**Status:** **engine wired** ✅ (scaling + classifier + curve + rules change, 124 vitest green) — sprites
done. **Pending:** acquisition (leveling consumables, landing with the tarot rework) and a combat-screen
indicator. Part of the "Balatro Patch."

In Balatro, **Planet cards** permanently level up a *poker hand* (more chips & mult every time you
play that hand). Cull the Crown's analog levels up a **Fighting Style**, where the style is decided by
**how many cards the play uses**. Leveling a style scales the **suit effects** of every play of that
size — so investing in "Spear" makes all your 3-card plays hit/heal/shield/draw harder.

## The styles

| Cards in the play | Fighting Style | **+ per level** | Notes |
|---|---|---|---|
| 1 | **Two-Handed** | **+1/8** | a single card (or a lone Animal Companion) |
| 2 | **Sword & Shield** | **+1/4** | a 2-combo, or Companion + 1 card |
| 3 | **Spear** | **+1/3** | a 3-combo (or Companion + 2-combo) |
| 4 | **Dual Wielding** | **+1/2** | a 4-combo (or Companion + 3-combo) |
| 5 | **Mage** | **+1/1** | a 5-combo, or Companion + 4-combo |
| *any play containing an Ace* | **Mounted** | **+1/5** | an **overlay** that stacks on the size-style above |

"Mounted" is not a size — it's a tag that fires **in addition** whenever the play includes an Animal
Companion (Ace). A 3-card play with an Ace is **Spear *and* Mounted**, and both styles' levels apply.

## The scaling math (curved, per Balatro Planet cards)

Balatro's Planet cards scale **additively and tiered**: the harder/rarer the hand, the bigger the
per-level bonus (High Card +1 Mult/+10 Chips … Straight Flush +4 Mult/+40 Chips — see
[balatrowiki](https://balatrowiki.org/w/Planet_Cards)). Cull the Crown mirrors that — **bigger plays
scale harder per level** — with a per-style fraction:

```
PER_LEVEL = { twoHanded: 1/8, swordShield: 1/4, spear: 1/3, dualWield: 1/2, mage: 1, mounted: 1/5 }

bonusFraction(style) = level(style) × PER_LEVEL[style]          // level = upgrades bought, 0 = base
totalFraction(play)  = bonusFraction(sizeStyle)
                       + (play has Ace ? bonusFraction("mounted") : 0)
scaledEffect         = floor( baseEffect × (1 + totalFraction) )
```

`floor` everywhere — *"1.5 draw → 1 draw."* At level 0 nothing changes. The curve means a single card
(Two-Handed) needs **8 levels to double**, while a 5-card **Mage doubles every single level** — so
big plays are where leveling pays off, and Mounted (+1/5) is a steady, always-available bonus that
rewards keeping Aces in the mix.

**Which effects scale ("suit effects"):**
- ♥ **Heal**  (base `v + upgrades.H`)
- ♦ **Draw**  (base `v + upgrades.D`)
- ♠ **Shield** (base `v + upgrades.S`)
- ♣ **Club damage** — the doubling is the club's suit effect, so a club play's **damage** scales
  (`base = v×2 + upgrades.C`).

**Worked example.** A 4-card all-Spades combo worth `v = 8`, **Dual Wielding** at level 2
(`fraction = 2 × 1/2 = 1`): shield `floor(8 × 2) = 16`. Add an Ace with **Mounted** at level 1
(`+1/5`): fraction `= 1 + 0.2 = 1.2`, shield `floor(8 × 2.2) = 17` (and the play becomes a 5-card
**Mage**, so its Mage level would apply instead of Dual Wielding's).

> **Open decision — base (non-club) attack damage.** A plain non-club play deals `damage = v`. That's
> not strictly a "suit effect," so the default **does not scale it** (only ♣/♠/♥/♦ outputs scale). If
> you want every style to also raise raw attack value, we scale `damage` too. *Flagged.*

## Where it slots into the engine

The resolution pipeline today is
`PARSE → AGGREGATE → BASE_POWERS → DECREE → SIGIL → JOKERS → FINALIZE`
(`app/src/engine/resolution.ts`). Fighting Styles add **one new phase**:

```
… → BASE_POWERS → STYLE → DECREE → SIGIL → JOKERS → FINALIZE
```

`STYLE` runs right after the base suit powers are computed (so it scales the "natural" suit output,
before sigil/joker flat bonuses and before the enemy's decree reacts). Concretely:

- **Types** (`types.ts`): `FightingStyleId = "twoHanded" | "swordShield" | "spear" | "dualWield" | "mage" | "mounted"`.
  `RunState.styleLevels: Record<FightingStyleId, number>` — pure numbers, so state stays
  `structuredClone`-safe (no behavior on state, consistent with the engine's rule).
- **Classifier** (pure, in `resolution.ts`): `styleOf(cards) → { size: FightingStyleId; mounted: boolean }`
  from `cards.length` (Two-Handed…Mage) and `cards.some(c => c.kind === "companion")` (Mounted).
- **STYLE phase**: compute `totalFraction` from `styleLevels`, then
  `ctx.heal/draw/shield = floor(base × (1+f))`, and `ctx.damage = floor(base × (1+f))` **when a club is
  active**. Emit a trace line ("Spear Lv2 ×1.67 → shield 15").
- **Acquisition** (the "Planet pack" analog): a new consumable family — one item per style (working
  name **"Drill"** / **"Battle Plan"**) that does `styleLevels[id] += 1` when used. Slots into the
  existing **held-consumable** flow (`RunState.held`, `Action.useHeld`) exactly like tarots, and into
  the shop as a new **pack kind** (a "Training pack" ≈ Balatro's Celestial pack) plus loose offers.
- **UI**: a **Styles panel** (mirrors Balatro's hand-level list) showing each style's level, current
  `×multiplier`, and times played; and the combat preview naming the current selection's style(s) and
  multiplier so the player can see why a play scales.

## Decisions

1. **Mage reachability / max play size.** ✅ **Implemented.** `parseSelection` now accepts combos of
   **2–5** equal-rank numbers (sum ≤ 10) and lets an **Ace join a combo**, with the whole play
   **capped at 5 cards** (Ace + 4-combo ⇒ a 5-card Mage+Mounted play; two Aces together are rejected).
2. **Scale base attack damage too?** Default kept: **no** — only ♣/♠/♥/♦ suit outputs scale (a plain
   non-club play's raw `v` damage is left alone). Easy to flip later.
3. **Acquisition** — *open.* Leveling will come from a tarot/consumable family (the Planet-pack
   analog), wired with the **tarot rework**. Until then `styleLevels` stays at 0 in normal play.
4. **Starting levels** — all styles start at level 0 (base); some **Decks/Stakes** could pre-level or
   cap styles later.
5. **Combat UI** — *pending:* show the current selection's style + ×multiplier in the action box.
