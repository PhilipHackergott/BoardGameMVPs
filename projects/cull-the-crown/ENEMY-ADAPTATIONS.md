# Cull the Crown — Enemy Catalogue (Royals + Decrees)

> **STATUS: shipped ✅** (`app/src/engine/cards.ts` → `TIER_STATS` + `buildCastleGroups`;
> `app/src/engine/content.ts` → `DECREE_LIBRARY` + `DECREE_SEVERITY`; `app/src/engine/run.ts` →
> `applyDecrees`). The 12 royals are the gauntlet (3 tiers × 4 suits). Their **stats** come from
> `TIER_STATS`; their **abilities** are a base set (suit-immunity, counter-strike, King enrage) plus
> a per-royal **Royal Decree** assigned at run-start from the decree library, scaled by tier.

---

## 1. Tier stats — `TIER_STATS`

| Tier | Max HP | Attack | Notes |
|---|---:|---:|---|
| **Jack** | 40 | 7 | Warmup tier. 4 jacks per run (one per suit). |
| **Queen** | 56 | 9 | Mid-game wall. 4 queens per run. |
| **King** | 68 | 11 | Climactic. 4 kings per run. **Enrage at 50% HP → +5 attack** (`enrageAtPct: 0.5`, `enrageAttackBonus: 5`). |

These are the **base** numbers. **Stake** modifiers (white→gold) apply a multiplicative HP bonus
and an additive attack bonus. **Decrees with `healthMult`** (Iron Wall ×1.5, Mad King ×1.25)
further scale the royal's max HP at run-start.

---

## 2. Base abilities (every royal)

| Ability | Description |
|---|---|
| **Suit immunity** | Each royal nullifies the suit power of the suit it shares — e.g. the Jack of Hearts ignores Hearts' heal effect on the player's plays. Symbol on the royal panel: `⊘ ♥ Hearts`. Cancelled by relic effects (Usurper's Sigil). |
| **Counter-strike** | After every play turn (and on yield), the royal strikes for its `attack` value. Reduced by accumulated shield (unless the decree `ignoresShield`). |
| **King enrage** | Kings only: when HP drops to ≤ 50% of max, attack permanently bumps +5 for the rest of the fight. |

---

## 3. Royal Decrees — `DECREE_LIBRARY`

10 decrees, sorted into 4 **severity tiers**. The first royal of the run (always Jack of Hearts)
has **no decree** as a tutorial breather, unless the deck specifies `decreeOnFirstRoyal: true`
(e.g. The Occult Deck).

### 3a. Mild decrees (assigned to Jacks)

| id | Name | Effect | Intent label |
|---|---|---|---|
| `iron-wall` | **The Iron Wall** | Max HP × 1.5 (applied at run-start). | "Fortified: extra health" |
| `vampire` | **The Vampire King** | Heals itself by ⌊incoming / 2⌋ on every blow it lands on you. | "Heals itself when it strikes you" |
| `thick-hide` | **Thick Hide** | Your damage is reduced by 2 (floor 0) on every play. | "Your attacks deal 2 less" |

### 3b. Standard decrees (assigned to Queens)

| id | Name | Effect | Intent label |
|---|---|---|---|
| `headsman` | **The Headsman** | After every play you make, **one random card** is removed from your hand and sent to discard. | "Takes a card from your hand after you attack" |
| `paranoid-crown` | **The Paranoid Crown** | You cannot play **the same suit two turns in a row** (illegal-hand check; the picker warns). | "No repeating a suit two turns in a row" |
| `plague-court` | **The Plague Court** | A **second suit** is corrupted for this fight — its power is nullified just like the royal's own immunity. Suit chosen at run-start (`decreeParam`). | "A second suit's power is nullified" |

### 3c. Severe decrees (assigned to Kings — paired with a stacked mild decree)

| id | Name | Effect | Intent label |
|---|---|---|---|
| `executioner` | **The Executioner** | Strikes **ignore your shield** entirely. | "Strikes ignore your shield" |
| `the-tyrant` | **The Tyrant** | Ignores your shield AND heals on hit (Executioner + Vampire combined). | "Ignores shield · heals when it strikes" |

### 3d. Finisher decree (final King only — paired with a stacked severe decree)

| id | Name | Effect | Intent label |
|---|---|---|---|
| `the-mad-king` | **The Mad King** | Max HP × 1.25, strikes ignore your shield, and after every play **one random card** is lopped from your hand. | "Fortified · ignores shield · takes a card" |

---

## 4. The Castle (run order)

Always 12 royals: **4 Jacks → 4 Queens → 4 Kings**, with suits **shuffled within each tier** by the
seed. One fixed exception: the **Jack of Hearts is moved to slot 1** so every run opens against a
healable suit (the player needs Hearts to be playable for the tutorial). Built in
`run.ts → createRun`:

```
[Jack of Hearts]  ← always first, no decree (tutorial)
[Jack ?]          ← mild decree
[Jack ?]          ← mild decree
[Jack ?]          ← mild decree
[Queen ?]         ← standard decree
[Queen ?]         ← standard decree
[Queen ?]         ← standard decree
[Queen ?]         ← standard decree
[King  ?]         ← severe + a stacked mild decree (no repeat of the just-used severe)
[King  ?]         ← severe + a stacked mild decree
[King  ?]         ← severe + a stacked mild decree
[King  ?]         ← FINAL: finisher (the-mad-king) + a stacked severe decree
```

Per the assignment loop in `applyDecrees`:
- Decree pool draws **avoid repeating the previous royal's primary decree** where possible.
- Kings always get TWO decrees (primary severe/finisher + stacked secondary).
- `healthMult` from BOTH decrees stacks multiplicatively on the royal's max HP.

---

## 5. Stake modifiers (Balatro-style difficulty ladder)

Stakes apply **after** base stats and decree-healthMult, in `createRun`:
```
e.maxHealth = round(e.maxHealth * stake.healthMult)
e.attack    += stake.attackBonus
```
Plus per-stake deltas to `handMax`, `startGold`, `rerollBase`, `removeBase`, and `fightReward` (the
gold paid per royal felled, per tier). See `STAKE_INFO` in `content.ts` for the per-stake numbers
(`white | red | green | black | blue | purple | orange | gold`).

---

## 6. Reward (per tier) — Gold paid on `awardAndAdvance`

| Tier | Base bounty | Exact-kill bonus |
|---|---:|---|
| Jack | 3 ◆ | ×2 base (configurable; `exactKillMult` from joker bonuses) |
| Queen | 4 ◆ | ×2 base |
| King | 5 ◆ | ×2 base |

Plus run-cumulative: **interest** (`floor(gold / 5)`, cap 5; extendable via War Tithe / King's
Ransom edicts), **guild tribute** (jokers with `goldPerFight`), and **deck bonus** (e.g. The
Coffer's +1 per leftover-hand card). All itemized in the Cash Out gate
(`ui/PixiCombatGate.tsx`).

---

## Sources of truth

| Thing | File |
|---|---|
| Tier stats | `app/src/engine/cards.ts` → `TIER_STATS` |
| Castle build / suit shuffle | `app/src/engine/cards.ts` → `buildCastleGroups` |
| Castle ordering + JoH tutorial slot | `app/src/engine/run.ts` → `createRun` |
| Decree assignment by severity | `app/src/engine/run.ts` → `applyDecrees` + `assignTieredDecree` |
| Decree definitions | `app/src/engine/content.ts` → `DECREE_LIBRARY` |
| Decree severity tiers | `app/src/engine/content.ts` → `DECREE_SEVERITY` |
| Stake modifiers | `app/src/engine/content.ts` → `STAKE_INFO` / `stakeMods` |
| Reward breakdown | `app/src/engine/run.ts` → `rewardBreakdown` |
