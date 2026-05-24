# Cull the Crown — Shop Compendium

> Packs, rewards, and abilities. Generated from the live content library (`app/src/engine/content.ts`)
> on 2026-05-23. **All numbers are untuned** — pack odds, prices, the modified-card rate, and item
> power are balance dials.

## How packs are generated

Every shop rolls **3 booster packs**. Each pack independently rolls a **kind** and a **size**.

**Kind** (odds): Card **27%** · Tarot **27%** · Sigil **27%** · Relic **18%**

**Size** (odds) → contents revealed / cards you keep / price surcharge:

| Size | Odds | Reveals | You keep | Surcharge |
|---|---|---|---|---|
| Standard | 67% | 3 | 1 | +0 |
| Jumbo | 22% | 5 | 1 | +2 |
| Mega | 11% | 5 | **2** | +4 |

**Base price by kind** (before size surcharge & edict discounts): Card 4 · Tarot 4 · Sigil 5 · Relic 6.
Examples: Standard Relic pack = ◆6, Jumbo Relic = ◆8, Mega Relic = ◆10; Standard Card pack = ◆4.

---

## 1. Card Pack — adds a playing card to your deck

Each revealed card is rolled fresh: random suit (25% each), value **2–10** (~10% chance of an
**Ace = Animal Companion** instead), with a **~22.5% chance to be "modified"** with one random flat
sigil (Keen / Warding / Gilding / Runes / Honed). Picking it adds the card to your draw pile.

- **Normal card** — a `<value> of <suit>` (or a suited Companion).
- **Modified card** — the same, pre-engraved with one flat sigil (see Sigil abilities below).

---

## 2. Tarot Pack — held consumables (use in the shop **or** mid-fight)

Distinct picks from these 8. ⌖ = needs a target card. Loose-tarot price ◆4.

| Tarot | Ability |
|---|---|
| **Honing Stone** ⌖ | Engrave a card with **Honed** (+2 to its value). |
| **Midas Draught** | Double your gold (bonus capped at +20). |
| **Shifting Mask** ⌖ | Change a card's **suit** (cycles to the next suit). Usable mid-fight. |
| **Whetting Oil** ⌖ | Raise a card's **rank by 1** (max 10). Usable mid-fight. |
| **Court Advisor** | A random **relic** joins your guild. |
| **Reliquary Rites** | Shuffle the **used pile back into your deck**. |
| **Engraver's Gift** ⌖ | Engrave a card with a **random sigil**. |
| **Conjuration** | Conjure a **fresh card** into your deck. |

---

## 3. Relic Pack — guild members & relics

Rarity-weighted (Common 3 : Uncommon 2 : Rare 1), only ones you don't already own. **21 relics.**
Loose-relic price = the relic's own price (◆4–7). Guild cap is 5 slots (6 with War Banner / Conscription).

### Common (5)

| Relic | Ability |
|---|---|
| The Jester's Twin | +2 Jester uses (discard hand & redraw). |
| Field Medic | Hearts heal +2. |
| Quartermaster | +1 maximum hand size. |
| Tithe Collector | +2 gold after every fight. |
| Sapper | Exact-kill gold multiplier +1. |

### Uncommon (13)

| Relic | Ability |
|---|---|
| Bloodstained Shield | Spades also deal bonus damage equal to the shield they grant. |
| The Opportunist | Clubs in a multi-card combo trigger an extra time. |
| Duelist | First attack each fight deals double damage. |
| Reckless Charge | +5 damage per attack — but every counter hits you for 3 more. |
| Twin Daggers | Combos (2+ cards) deal +3 damage. |
| Whetstone | +1 damage per royal already felled. |
| Spiked Aegis | When a counter lands, half of it is dealt back to the royal. |
| Bottled Courage | Begin every fight with 5 shield already raised. |
| Reaper's Toll | Each royal felled permanently raises your interest cap by 1. |
| Heartsworn Oath | Hearts heal +2 for the rest of the run. |
| Diamond Crown | Diamonds draw +1 for the rest of the run. |
| Clubmaster's Mark | Clubs add +2 flat damage for the rest of the run. |
| Spadesworn Vow | Spades shield +2 for the rest of the run. |

### Rare (3)

| Relic | Ability |
|---|---|
| Usurper's Sigil | Royals are no longer immune to their own suit. |
| Glass Cannon | ×1.5 all damage — but max hand size −2. |
| War Banner | +1 guild slot (6 total). |

---

## 4. Sigil Pack — engrave a chosen card

Distinct picks from these 8; applying one targets a deck card (a card can carry several). **Flat**
sigils stack; **structural** ones reshape the card. Loose-sigil price ◆3.

| Sigil | Type | Ability |
|---|---|---|
| **Keen Edge** | flat | +2 damage when this card is played. |
| **Warding** | flat | +2 shield when this card is played. |
| **Gilding** | flat | +1 gold when this card is played. |
| **Runes** | flat | +1 card drawn when this card is played. |
| **Honed** | flat | +2 to this card's **value** — every power it grants scales up. |
| **Companion** | structural | Becomes an Animal Companion: value 1, pairs with any one card. |
| **Twin-Suit** | structural | Counts as a **second suit** too — fires both powers (and both immunities apply). |
| **Wildcard** | structural | **Choose this card's suit** each time you play it. |

---

## Loose wares (the 3 single-buy items)

Each loose slot rolls a kind by the **same odds** as packs and offers **one** item from that pool —
buy it directly (sigils prompt you to pick a target card). Prices: Card ◆2 · Sigil ◆3 · Tarot ◆4 ·
Relic = its own price. All shop prices are reduced by **Black Market** (−20%) / **Free Port** (−40%).

---

## Not part of packs (separate shop slots)

- **Edict** — one acquirable per Act (3 total). Two-tier (an upgrade needs its base owned):
  Black Market → Free Port (−20% → −40% prices) · War Tithe → King's Ransom (+5 → +10 interest cap) ·
  Bannerman → Standard Bearer (+1 → +1 max hand size) · Conscription (+1 guild slot) ·
  Spymaster (rerolls −1).
- **Remove a card** — always available; escalating cost (◆2, +2 each use).
- **Reroll** — re-rolls the packs & wares; cost +1 each reroll.
