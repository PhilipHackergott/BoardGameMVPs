# Cull the Crown — Tarot Adaptations (Balatro → Kingslayer)

> A design catalogue adapting **all 22 Balatro Tarot cards** to Cull the Crown, for the "Balatro
> Patch." The major-arcana names are classical/public-domain, so we keep them for flavour; the
> **effects** are translated into CtC's systems. **No Balatro art ships** — sprites are original
> pixel art (see `cull the crown tarot illustrations/`).
>
> Tarots are **held consumables** (`RunState.held`, used in shop OR combat) — the system already
> exists (`content.TAROT_LIBRARY`, `Tarot.apply`); this reworks the *library* to the full arcana.

## How the four kinds translate
1. **Enhancers** (apply a card modifier) → apply a **Sigil** to selected deck cards. Balatro's
   enhancements map to CtC sigils below — a few are **new sigils** we add to `SIGIL_INFO`.
2. **Planet-referencing** → reference **Fighting Styles** (the Planet analog). "Create Planet cards"
   → "create **Drills**" (the held consumable that levels a Fighting Style). See `FIGHTING-STYLES.md`.
3. **Meta / economy** (gold, create cards) → adapt **1:1** to gold / tarot / joker generation.
4. **Rank / suit / copy / destroy** → adapt **1:1** on CtC's 2–10 + Ace deck.

### Sigil mapping (Balatro enhancement → CtC sigil)
| Balatro enhancement | Effect there | CtC sigil | CtC effect | Status |
|---|---|---|---|---|
| **Bonus** | +30 chips | **Honed** | +value to this card (scales all its powers) | exists |
| **Mult** | +4 Mult | **Keen** | +2 damage when this card is played | exists |
| **Wild** | counts as any suit | **Wildcard** | choose this card's suit at play time | exists |
| **Steel** | ×1.5 Mult **while held** | **Steel** ⟡ | while **held in hand**, +2 shield at the start of each play turn | new |
| **Glass** | ×2 Mult, 1-in-4 shatter | **Glass** ⟡ | this card's value counts **double**; 1-in-4 to be **destroyed** after it's played | new |
| **Gold** | $3 if held at round end | **Minted** ⟡ | +3 gold if this card is **held in hand when the royal falls** | new |
| **Stone** | +50 chips, no rank/suit | **Stoneskin** ⟡ | fixed value 8, **no suit** (fires no suit power, but is immune to suit-forbidding decrees) | new |
| **Lucky** | 1/5 +20 Mult, 1/15 +$20 | **Charmed** ⟡ | when played, **1-in-5** for +10 damage and **1-in-15** for +5 gold | new |

⟡ = new sigil to add alongside the existing keen/warded/gilded/runed/honed/companion/extra/wildcard.

---

## A. Enhancers — *apply a Sigil to selected deck cards*
| Tarot | CtC effect | Balatro source |
|---|---|---|
| **The Hierophant** | **Hone** up to 2 selected cards (Bonus → +value). | Bonus |
| **The Empress** | **Keen-edge** up to 2 selected cards (+damage). | Mult |
| **The Magician** | **Charm** up to 2 selected cards (Lucky). | Lucky |
| **The Lovers** | Make 1 selected card a **Wildcard**. | Wild |
| **The Chariot** | Forge 1 selected card with **Steel**. | Steel |
| **Justice** | Set 1 selected card to **Glass**. | Glass |
| **The Devil** | **Mint** 1 selected card (Gold). | Gold |
| **The Tower** | Turn 1 selected card to **Stoneskin** (Stone). | Stone |

## B. Fighting-Style (Planet) tarots
| Tarot | CtC effect | Balatro source |
|---|---|---|
| **The High Priestess** | Create up to **2 random Drills** (Fighting-Style upgrades) in your pouch (if room). | High Priestess (2 Planets) |

## C. Meta & economy — *adapt 1:1*
| Tarot | CtC effect | Balatro source |
|---|---|---|
| **The Fool** | Re-create the **last Tarot or Drill** you used this run (not The Fool itself). | The Fool |
| **The Emperor** | Create up to **2 random Tarots** in your pouch (if room). | The Emperor |
| **The Hermit** | **Double your gold** (max +20). | The Hermit |
| **Temperance** | Gain gold equal to the **total sell value of your jokers** (max 50). | Temperance |
| **Judgement** | Create a **random Joker** (if you have a free slot). | Judgement |
| **The Wheel of Fortune** | **1-in-4** chance to grant a random Joker a random **edition** (Burnished/Haloed/Prismatic). ★ | Wheel of Fortune |

## D. Rank / suit / copy / destroy — *adapt 1:1*
| Tarot | CtC effect | Balatro source |
|---|---|---|
| **Strength** | Increase the **value of up to 2 selected cards by 1** (max 10). | Strength |
| **The Hanged Man** | **Destroy up to 2** selected deck cards. | The Hanged Man |
| **Death** | Select 2 cards; **convert the left into a copy of the right**. | Death |
| **The Star** | Convert up to **3 selected cards to ♦ Diamonds**. | The Star |
| **The Moon** | Convert up to **3 selected cards to ♣ Clubs**. | The Moon |
| **The Sun** | Convert up to **3 selected cards to ♥ Hearts**. | The Sun |
| **The World** | Convert up to **3 selected cards to ♠ Spades**. | The World |

---

## Notes
- **★ The Wheel of Fortune** needs a small new **edition** concept on jokers (Burnished = +flat
  damage, Haloed = +mult, Prismatic = ×mult). Optional; until then it can grant a flat +×0.25 damage.
- The 5 **new sigils** (Steel/Glass/Minted/Stoneskin/Charmed) extend `content.SIGIL_INFO` and the
  resolution SIGIL/held phases; all are id-only on cards, so RunState stays clone-safe.
- "Drill" is the **Fighting-Style upgrade** consumable (the Planet analog) — defined with the
  Fighting-Styles acquisition work; The High Priestess + Blue Seals create them.
- This replaces the current 8-tarot `TAROT_LIBRARY`. Wiring is the **next** step after sign-off.
