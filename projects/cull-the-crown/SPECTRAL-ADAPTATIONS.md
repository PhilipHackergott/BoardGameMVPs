# Cull the Crown — Spectral Adaptations (Balatro → Kingslayer)

> **STATUS: all 18 wired & playable ✅** (`content.SPECTRAL_LIBRARY`, 143 vitest green). Implementation
> notes vs this design: **Editions are joker-only** (one storage path, `RunState.slotEditions`), so
> **Aura** enchants a guild member instead of a playing card; **Black Hole** levels every Fighting
> Style; face-card adders use **10s**. Spectrals currently share the tarot shop pool (untuned — not
> yet rarity-gated) and use the held-consumable flow. Pending: a dedicated Spectral pack + on-card
> seal/edition badges.

## Current SPECTRAL_LIBRARY (engine source of truth)

18 entries in `app/src/engine/content.ts → SPECTRAL_LIBRARY`:

| # | id | Name | Section |
|---|----|------|---------|
| 1 | `familiar` | Familiar | Card-gen (3 enhanced 10s) |
| 2 | `grim` | Grim | Card-gen (2 enhanced Aces) |
| 3 | `incantation` | Incantation | Card-gen (4 enhanced numbered) |
| 4 | `cryptid` | Cryptid | Copy chosen card ×2 |
| 5 | `immolate` | Immolate | Destroy 5 random, +20 gold |
| 6 | `sigil` | Sigil | Hand → single random suit |
| 7 | `ouija` | Ouija | Hand → single random rank, −1 hand size |
| 8 | `black-hole` | Black Hole | +1 every Fighting Style level |
| 9 | `wraith` | Wraith | Random joker + gold→0 |
| 10 | `ankh` | Ankh | Copy a guild member, destroy the others |
| 11 | `the-soul` | The Soul | Powerful joker if room |
| 12 | `talisman` | Talisman | Gold Seal on a hand card |
| 13 | `deja-vu` | Deja Vu | Red Seal on a hand card |
| 14 | `trance` | Trance | Blue Seal on a hand card |
| 15 | `medium` | Medium | Purple Seal on a hand card |
| 16 | `aura` | Aura | Random edition (Burnished/Haloed/Prismatic) on a guild member |
| 17 | `ectoplasm` | Ectoplasm | Shadow edition (+1 slot) on a guild member, −1 hand size |
| 18 | `hex` | Hex | Prismatic on a guild member, destroy all others |


> A design catalogue adapting **all 18 Balatro Spectral cards** to Cull the Crown, for the "Balatro
> Patch." Spectrals are **rare, powerful held consumables** — most carry a sharp **downside** (destroy
> cards, zero your gold, lose hand size). Names kept for flavour; **effects** translated; **no Balatro
> art ships** (original pixel sprites in `cull the crown spectral illustrations/`).
>
> Spectrals reuse the held-consumable system (`RunState.held`, used in shop/combat) like tarots, but
> are gated to **Spectral packs** and a few jokers.

## Translation rules
- **Seals** → a new **Seal** modifier on cards (one per card, distinct from sigils):
  | Balatro seal | Effect there | CtC seal | CtC effect |
  |---|---|---|---|
  | **Gold** | +$3 when played | **Gold Seal** | +3 gold when this card is played |
  | **Red** | retrigger the card | **Red Seal** | this card's suit power triggers **one extra time** |
  | **Blue** | makes a Planet at round end | **Blue Seal** | if **held when the royal falls**, create a **Drill** (Fighting-Style upgrade) |
  | **Purple** | makes a Tarot when discarded | **Purple Seal** | when this card is **discarded**, create a random Tarot (if room) |
- **Editions** → CtC **editions** (Burnished = +flat damage, Haloed = +mult, Prismatic = ×mult,
  **Shadow** = Negative = +1 guild slot). ★ small new concept; until built, approximate with flat/×mult.
- **Face cards** → there are no J/Q/K in the player deck (they're the enemies), so anything that adds
  *Enhanced face cards* instead adds **Enhanced 10s** (the top numbered rank), per your note.
- **"Poker hand level"** → **Fighting-Style level** (the Planet analog).
- **Jokers** = CtC jokers; **rarity tiers** map directly (Rare/Legendary).

---

## A. Card generation (destroy then add — face cards → 10s)
| Spectral | CtC effect | Balatro source |
|---|---|---|
| **Familiar** | Destroy 1 random card in hand, add **3 random enhanced 10s** to hand. | Familiar (face→10s) |
| **Grim** | Destroy 1 random card in hand, add **2 random enhanced Aces** (Animal Companions) to hand. | Grim |
| **Incantation** | Destroy 1 random card in hand, add **4 random enhanced numbered cards** to hand. | Incantation |
| **Cryptid** | Create **2 copies** of 1 selected card in hand. | Cryptid |
| **Immolate** | Destroy **5 random cards** in hand, gain **+20 gold**. | Immolate |

## B. Seals (add a Seal to a selected card)
| Spectral | CtC effect | Balatro source |
|---|---|---|
| **Talisman** | Add a **Gold Seal** to 1 selected card. | Talisman |
| **Deja Vu** | Add a **Red Seal** to 1 selected card. | Deja Vu |
| **Trance** | Add a **Blue Seal** to 1 selected card. | Trance |
| **Medium** | Add a **Purple Seal** to 1 selected card. | Medium |

## C. Editions & Jokers
| Spectral | CtC effect | Balatro source |
|---|---|---|
| **Aura** | Add **Burnished / Haloed / Prismatic** (an edition) to 1 selected card in hand. ★ | Aura |
| **Ectoplasm** | Add **Shadow** (Negative → +1 guild slot) to a random Joker; **−1 max hand size**. ★ | Ectoplasm |
| **Wraith** | Create a **random Rare Joker**; set your **gold to 0**. | Wraith |
| **Ankh** | **Copy** a random Joker; **destroy all your other Jokers**. | Ankh |
| **Hex** | Add **Prismatic** (Polychrome → ×mult) to a random Joker; **destroy all other Jokers**. ★ | Hex |
| **The Soul** | Create a **Legendary Joker** (if room). | The Soul |

## D. Deck-wide conversion & meta
| Spectral | CtC effect | Balatro source |
|---|---|---|
| **Sigil** | Convert **all cards in hand to a single random suit**. | Sigil |
| **Ouija** | Convert **all cards in hand to a single random rank**; **−1 max hand size**. | Ouija |
| **Black Hole** | **Level up every Fighting Style by 1** (the Planet "all hands" analog). | Black Hole |

---

## Notes
- **New systems referenced:** **Seals** (4) and **Editions** (4). Seals are a per-card slot separate
  from sigils (a card can have sigils *and* a seal). Editions sit on jokers (Aura also on a card).
  Both are id-only data → RunState stays clone-safe.
- Spectrals are **high-variance**: keep them rare, pack-gated, and clearly telegraph the downside in
  the UI (gold-to-zero, destroy, −hand size).
- **The Soul / legendary jokers**: needs a `legendary` rarity tier added to the joker pool.
- Wiring (Seals, Editions, the new spectral library + packs) is the **next** step after sign-off;
  this doc + the sprites are the design deliverable.
