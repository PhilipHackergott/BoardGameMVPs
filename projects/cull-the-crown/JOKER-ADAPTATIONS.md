# Cull the Crown — Joker Adaptations (Balatro → Kingslayer)

> A design catalogue of Balatro jokers translated into **Cull the Crown** mechanics, for the
> "Balatro Patch" (relics → **jokers**). All names are **original** (medieval-court flavour); the
> Balatro joker that inspired each is cited for reference only. **No Balatro art or names ship.**
>
> **How the translation works.** Balatro scores `Chips × Mult`; Cull the Crown deals **damage** and
> juggles four suit powers — ♥ Heal, ♦ Draw, ♣ Double-damage, ♠ Shield — plus **gold/interest**,
> **hand size**, **guild slots**, **combos** (2–5 equal-rank cards, sum ≤ 10), **Animal Companions**
> (the Aces), **Fighting Styles** (the Planet-card analog — see below), **exact-kill**, and royal
> **decrees**. So:
> - Balatro **+Mult / +Chips** → **+damage** (or +shield/+heal/+draw/+gold for off-axis jokers).
> - Balatro **suit-scored** jokers → "each card of suit X you play …" (per-card, scales with the play).
> - Balatro **poker hands**: *Pair / Three / Four of a Kind* → CtC **combos** of 2 / 3 / 4 (now up to
>   5). *Flush* → "all cards in your play share a suit." (Straights have no clean analogue, skipped.)
> - Balatro **Planet-card** jokers (Constellation, Astronomer, Satellite, Space Joker) → **Fighting
>   Style** jokers — see **§J** and `FIGHTING-STYLES.md`.
> - Balatro **face-card** jokers don't map (the deck is 2–10 + Aces; J/Q/K are the enemies) — adapted
>   to rank/Companion conditions instead.
> - Balatro **X-Mult / scaling / economy / meta** jokers map almost directly.
>
> **Fighting Styles primer.** A play's *style* is set by its **card count** — 1 = Two-Handed,
> 2 = Sword & Shield, 3 = Spear, 4 = Dual Wielding, 5 = Mage — and **Mounted** also fires whenever the
> play contains an Ace. Styles **level up** (the Planet analog) to scale that play's suit effects. The
> §J jokers below reward, scale with, or level these styles.

Suggested rarity in parentheses. ★ = needs a small new engine hook beyond the current modifier stack.

---

## A. Suit specialists — *per card of a suit you play*
*(Balatro: Greedy/Lusty/Wrathful/Gluttonous Joker, Rough Gem, Arrowhead, Onyx Agate, Bloodstone)*

| Joker | Effect | Inspired by |
|---|---|---|
| **Bloodletter** (common) | Each ♥ Heart you play heals an extra +2. | Lusty Joker |
| **Prospector** (uncommon) | Each ♦ Diamond you play earns +1 gold. | Rough Gem |
| **Headsman's Pride** (common) | Each ♠ Spade you play deals +3 damage. | Wrathful / Arrowhead |
| **Bludgeon** (common) | Each ♣ Club you play deals +4 damage. | Gluttonous / Onyx Agate |
| **Warden's Eye** (uncommon) | Each ♠ Spade you play also grants +2 shield. | Arrowhead |
| **Sanguine Pact** (uncommon) | 1-in-2 chance each ♥ Heart played deals ×1.5 damage. ★ | Bloodstone |

## B. Combo jokers — *of-a-kind plays*
*(Balatro: The Duo/Trio/Family, Jolly/Zany Joker, Spare Trousers, Half Joker)*

| Joker | Effect | Inspired by |
|---|---|---|
| **Twin Blades** (uncommon) | Combos of **2** cards deal +6 damage. | Jolly Joker / The Duo |
| **Triumvirate** (rare) | Combos of **3** cards deal ×2 damage. | The Trio |
| **The Phalanx** (rare) | Combos of **4** cards deal ×3 damage. | The Family |
| **Veteran's Instinct** (uncommon) | This joker gains +2 damage permanently each time you play a combo. ★ | Spare Trousers |
| **Lightfoot** (common) | Plays of **3 or fewer** cards deal +5 damage. | Half Joker |

## C. Rank & Companion jokers
*(Balatro: Even Steven, Odd Todd, Scholar, Fibonacci, Walkie Talkie, Wee Joker, Hack, The Idol)*

| Joker | Effect | Inspired by |
|---|---|---|
| **Even Hand** (common) | Even-rank cards (2/4/6/8/10) deal +4 damage. | Even Steven |
| **Odd Omen** (common) | Odd-rank cards (3/5/7/9) grant +4 shield. | Odd Todd |
| **Beastmaster** (uncommon) | Animal Companions draw +2 and deal +3. | Scholar (Aces) |
| **Spiral Friar** (uncommon) | Cards of value 2, 3, 5, or 8 deal +5 damage. | Fibonacci |
| **Drillmaster** (common) | Each 10 or 4 you play deals +5 and draws +1. | Walkie Talkie |
| **Cutpurse** (uncommon) | Low cards (2–5) trigger their suit power an extra time. ★ | Hack |
| **Sworn Number** (uncommon) | One chosen rank deals ×2 damage; the rank rerolls each fight. ★ | The Idol |

## D. Held-in-hand jokers
*(Balatro: Raised Fist, Blackboard, Shoot the Moon, Baron)*

| Joker | Effect | Inspired by |
|---|---|---|
| **Coward's Gambit** (uncommon) | Adds **double the value of your lowest card in hand** to your damage. | Raised Fist |
| **Black Banner** (rare) | ×3 damage while every card in your hand is a ♠ Spade or ♣ Club. | Blackboard |
| **Hoarder's Grip** (uncommon) | +3 shield for each card held in hand at the start of the royal's strike. ★ | Shoot the Moon |

## E. Retrigger jokers ★
*(Balatro: Hanging Chad, Dusk, Seltzer, Mime, Sock and Buskin, Loyalty Card)*

| Joker | Effect | Inspired by |
|---|---|---|
| **Echo Herald** | Your **first card each fight** triggers its suit power 2 extra times. | Hanging Chad |
| **The Encore** | Every **6th play** triggers its suit powers twice. | Loyalty Card |
| **Twin Cast** | For the next **5 plays** after acquiring, all suit powers trigger twice (then it leaves). | Seltzer |

## F. Economy jokers
*(Balatro: Bull, Bootstraps, To the Moon, Cloud 9, Rocket, Egg, Gift Card, Delayed Gratification, Business Card, Credit Card)*

| Joker | Effect | Inspired by |
|---|---|---|
| **War Chest** (uncommon) | +1 damage for every 5 gold you hold. | Bull |
| **Bootstraps** (uncommon) | +2 damage for every 5 gold you hold. | Bootstraps |
| **Usurer** (uncommon) | +1 extra interest per 5 gold at fight end. | To the Moon |
| **Tithe Barn** (common) | Earn +1 gold per ♦ Diamond in your deck at fight end. | Cloud 9 |
| **Siege Engineer** (uncommon) | +1 gold per fight; +2 more after each King felled. ★ | Rocket |
| **Nest Egg** (common) | Gains +3 sell value at the end of each fight. ★ | Egg |
| **Almsgiver** (uncommon) | +1 sell value to every other joker each fight. ★ | Gift Card |
| **Patient Tactician** (common) | If you never yield in a fight, earn +4 gold. ★ | Delayed Gratification |
| **Letter of Credit** (common) | You may go up to −10 gold in debt. ★ | Credit Card |

## G. Scaling jokers ★
*(Balatro: Ride the Bus, Green Joker, Supernova, Hiker, Campfire, Vampire, Gros Michel, Hit the Road, Glass Joker)*

| Joker | Effect | Inspired by |
|---|---|---|
| **Bloodthirst** (uncommon) | +1 damage per consecutive fight cleared without yielding. | Ride the Bus |
| **Momentum** (uncommon) | +1 damage per card played this run; −1 per yield. | Green Joker |
| **Grindstone** (uncommon) | Every card you play permanently gains +1 damage. | Hiker |
| **Cull's Reward** (rare) | +×0.25 damage per card culled/removed; resets each Act. | Campfire |
| **Vampiric Crest** (rare) | Gains +×0.1 damage per sigil-bearing card played, consuming one of its sigils. | Vampire |
| **The Glutton** (common) | +15 damage; 1-in-6 chance to be destroyed at the end of each fight. | Gros Michel |
| **Executioner's Tally** (uncommon) | +×0.5 damage for each card you discard to block this fight. | Hit the Road |

## H. Meta jokers ★
*(Balatro: Blueprint, Brainstorm, Joker Stencil, Abstract Joker, Swashbuckler, Baseball Card, Mr. Bones, Chicot, Riff-Raff, Invisible Joker)*

| Joker | Effect | Inspired by |
|---|---|---|
| **Mirror Knight** (rare) | Copies the ability of the joker to its **right**. | Blueprint |
| **Echo Squire** (rare) | Copies the ability of your **leftmost** joker. | Brainstorm |
| **Lone Wolf** (uncommon) | ×0.5 damage for each **empty** guild slot. | Joker Stencil |
| **War Council** (common) | +3 damage for each joker you own. | Abstract Joker |
| **Quartermaster's Ledger** (uncommon) | Adds the total sell value of your other jokers to your damage. | Swashbuckler |
| **Banneret** (rare) | Uncommon jokers each grant an extra ×1.25 damage. | Baseball Card |
| **Last Stand** (rare) | Once per run, survive a blow that would kill you (then it's spent). | Mr. Bones |
| **Court Jester** (rare) | Disables the current royal's decree(s). | Chicot |
| **Conscriptor** (uncommon) | At each fight's start, conjure a random Common joker if you have a free slot. | Riff-Raff |

## I. Generation & utility jokers ★
*(Balatro: Cartomancer, 8 Ball, DNA, Four Fingers, Smeared Joker, Juggler, Showman)*

| Joker | Effect | Inspired by |
|---|---|---|
| **Soothsayer** (uncommon) | Create a random Tarot in your pouch when each fight begins (if room). | Cartomancer |
| **Court Astrologer** (common) | Each 8 you play has a 1-in-4 chance to create a Tarot. | 8 Ball |
| **Twin Soul** (rare) | The first single card you play each fight is permanently copied into your deck. | DNA |
| **Loose Grip** (uncommon) | Combos may be formed with cards summing to **≤ 13** (instead of ≤ 10). | Four Fingers |
| **Smeared Herald** (uncommon) | ♥/♦ count as one suit and ♠/♣ count as one suit (for immunity & combos). | Smeared Joker |
| **Squire's Pack** (common) | +1 maximum hand size. | Juggler |
| **The Collector** (uncommon) | Jokers, tarots, and sigils may appear more than once in shops. | Showman |

## J. Fighting Style jokers — *interact with the Planet-card analog*
*(Balatro Planet-referencing jokers re-pointed at Fighting Styles, plus original style payoffs. A
play's style = its card count: 1 Two-Handed · 2 Sword & Shield · 3 Spear · 4 Dual Wielding · 5 Mage;
**Mounted** also fires on any play with an Ace. "level" = that style's upgrade count.)*

### J0. Planet-card adaptations
| Joker | Effect | Inspired by |
|---|---|---|
| **Star Chart** (rare) | Permanently gains +×0.2 damage each time you **level any Fighting Style**. ★ | Constellation |
| **Grand Strategist** (uncommon) | **Training packs and Drills are free** (Fighting-Style upgrades cost no gold). ★ | Astronomer |
| **Quartermaster of Drills** (uncommon) | At each fight's end, earn **+1 gold per distinct Fighting Style you've leveled** this run. ★ | Satellite |
| **Wild Apprentice** (uncommon) | **1-in-4 chance** that a play also **levels its size-style by 1**. ★ | Space Joker |

### J1. Two-Handed (1-card plays)
| Joker | Effect | Rarity |
|---|---|---|
| **Lone Champion** | Single-card (Two-Handed) plays deal **+6 damage**. | common |
| **Duelist's Focus** | While Two-Handed is your **highest-leveled** style, single-card plays deal **+×0.5 damage**. ★ | uncommon |
| **Honor Duel** | The **first single-card play each fight** triggers its suit power **twice**. ★ | uncommon |

### J2. Sword & Shield (2-card plays)
| Joker | Effect | Rarity |
|---|---|---|
| **Shield Wall** | 2-card (Sword & Shield) plays grant **+5 shield**. | common |
| **Balanced Stance** | Sword & Shield plays **draw +1 and shield +2**. | common |
| **Parry & Riposte** | On a Sword & Shield play, deal **bonus damage equal to the shield gained** this turn. ★ | uncommon |

### J3. Spear (3-card plays)
| Joker | Effect | Rarity |
|---|---|---|
| **Phalanx Drillmaster** | 3-card (Spear) plays deal **+×0.5 damage**. | uncommon |
| **Pike Square** | Each Spear play permanently gives this joker **+2 damage**. ★ | uncommon |
| **Reach Advantage** | Spear plays **ignore the royal's decree(s)** for that play. ★ | rare |

### J4. Dual Wielding (4-card plays)
| Joker | Effect | Rarity |
|---|---|---|
| **Twin Fury** | 4-card (Dual Wielding) plays deal **×2 damage**. | rare |
| **Whirlwind** | Dual Wielding plays also grant **shield equal to their damage**. | uncommon |
| **Ambidextrous** | Dual Wielding plays trigger their suit powers **twice**. ★ | rare |

### J5. Mage (5-card plays)
| Joker | Effect | Rarity |
|---|---|---|
| **Arcane Surge** | 5-card (Mage) plays deal **+25 damage**. | uncommon |
| **Spellweaver** | Mage plays fire **all four suit powers**, regardless of the suits played. ★ | rare |
| **Grand Conjuration** | Each Mage play **creates a random Tarot** in your pouch (if room). ★ | uncommon |

### J6. Mounted (any play with an Ace)
| Joker | Effect | Rarity |
|---|---|---|
| **Cavalier** | Mounted plays (containing an Ace) deal **+5 damage**. | common |
| **Warhorse** | Mounted plays **draw +2**. | common |
| **Knight Errant** | While **Mounted is leveled**, Animal Companions count as **value 3** instead of 1. ★ | uncommon |

---

## Notes & next steps
- **★ items** need a small new hook on top of the current `Joker` modifier stack (e.g. retrigger
  counts, "on fight start," per-fight discard tallies, copy-adjacent resolution, debt-allowed gold,
  decree-disable). All are additive and clone-safe (ids + data only).
- This is a **design list**, intentionally larger than what should ship at once — a strong Alpha
  pool is ~30. We can cut/tune during the balance pass.
- The companion **illustration set** lives in `cull the crown joker illustrations/` (original art in
  the game's flat 8-bit style — see that folder's `README.md`).
- The broader patch (rename `relics` → `jokers` in code/UI, remove the current Jester charges, wire
  these jokers into `content.JOKER_LIBRARY`) is the **next** step after this catalogue is approved.
