# MVP Spec — Cull the Crown (Regicide × Balatro roguelike)

> Stage 3 (Specification), the *what*. Operator-run inline, 2026-05-21.
> Clean reimplementation per the recorded IP decision: original title **Cull the Crown**, original
> assets/icons, CC-BY credit to the Regicide designers. Mechanics adapt Regicide's solo combat
> (`RegicideRulesA4.pdf`) into a Balatro-style run. No Regicide/Balatro art, text, or branding.

## Pitch & target experience
A single-player roguelike where you overthrow a gauntlet of 12 corrupted monarchs one tense
card-combat at a time, then raid a shop to bolt guild-members, relics, and deck upgrades onto a
deepening engine. Regicide's exact, every-suit-matters tactical combat wrapped in Balatro's
build-craving "one more run" loop — the satisfaction of watching a stack of passive modifiers
turn a modest hand into a monarch-slaying cascade.

## Scope line (the single core loop the MVP delivers)
One **seeded run** = defeat all 12 royals. Each royal is a Regicide solo combat; between fights a
**shop** spends the gold those fights earned on jokers, consumables, and deck edits. Win the run
by defeating the 12th royal; lose if you can't survive a counter-attack.

> **Scope note (full-roguelike target, staged build):** the user chose the full-roguelike target.
> This spec describes that whole loop. The build plan (`04-build-plan.md`) delivers it as ordered,
> demoable milestones — a complete *single-fight* slice ships before the run/shop layer — and keeps
> jokers/consumables **data-driven** so the content library can start thin and grow. Meta-progression
> (unlocks, difficulty stakes) is explicitly post-MVP (see Out of scope).

## Theme reskin (original assets)
- A standard 4-suit, 13-rank deck is reused as a game mechanic (suits/ranks are not protectable),
  but with **original suit icons, card faces, enemy art, and UI**. No publisher art or names.
- Enemies are "corrupted royals"; jokers are "guild-members & relics"; consumables are original
  named items. Internal-only mapping to source terms lives in code comments, never on screen.

## Rules to implement

### Components & setup (a run)
- **Run deck** (the Tavern deck): starts as a standard **52-card deck + 2 Jesters** (54 cards).
  Mutated permanently across the run by consumables (recruit/train/cull).
- **Castle deck** (the gauntlet): 12 royals = 4 Jacks, 4 Queens, 4 Kings. Order is **Jacks (×4),
  then Queens (×4), then Kings (×4)**, shuffled within each rank by the run seed. Faced one at a
  time, top to bottom.
- **Hand:** single hand, **max size 8** (solo). Dealt up to max at the start of each fight.
- **Discard pile:** shared per run; the Hearts power draws from it.
- **Gold:** run currency, starts at a configured value (e.g. 4). **Guild slots:** 5 (hold jokers).

### Enemy stats (base; modifiable by relics)
| Royal | Health | Attack |
|-------|:-----:|:-----:|
| Jack  | 20 | 10 |
| Queen | 30 | 15 |
| King  | 40 | 20 |
Jacks/Queens/Kings also have an attack/discard value of 10/15/20 if drawn into hand.

### Turn structure (one fight; repeat until enemy defeated or you lose)
**Step 1 — Play or yield.** Play a card, a combo, or an animal-companion pairing from hand onto
the table; or **yield** (skip to Step 4). You may not yield twice in a row (no other player exists,
so a yield must be followed by a non-yield turn or the run ends — see loss).
**Step 2 — Activate suit power(s)** of what you played (red resolve now, black later). If a combo
or companion pairing mixes Hearts and Diamonds, **resolve Hearts (heal) before Diamonds (draw)**.
**Step 3 — Deal damage & check defeat.** Deal the played attack value (Clubs may double it). Sum
all damage dealt to this enemy this fight; if ≥ its health, it's **defeated** (see economy).
**Step 4 — Suffer damage.** If the enemy survives, it attacks for its Attack value **minus the
total Spade shield** accumulated this fight. Discard cards from hand whose values sum to **≥** that
amount. If you cannot, you **die** → run lost. Then refill is *not* automatic — you draw only via
Diamonds (as in Regicide). Begin the next turn at Step 1.

### Suit powers (mandatory; resolved at the played attack value `v`)
- **♥ Hearts — Heal:** shuffle the discard pile, count `v` cards face-down **under** the run deck
  (returning the rest to discard). Replenishes the deck; cannot exceed discard size.
- **♦ Diamonds — Draw:** draw `v` cards (solo: all to the one hand), never above max hand size;
  no penalty if the deck is empty.
- **♣ Clubs — Double damage:** in Step 3, the damage contributed by clubs counts ×2.
- **♠ Spades — Shield:** in Step 4, reduce this enemy's attack by `v`; **cumulative** across all
  spades played against this enemy, persists until it is defeated.

### Enemy immunity & the Jester
- Each enemy is **immune to its own suit's power** (e.g. a Spades enemy: spades deal damage but
  grant **no shield**). The numeric damage still counts.
- A **Jester** (attack value 0) played in Step 1 **cancels the current enemy's immunity** for the
  rest of the fight. (Solo "discard & refill" Jester rule is **dropped**; Jesters live in the deck
  and are played as immunity-cancel cards.)

### Combos & animal companions
- **Combos:** 2–4 cards of **equal rank** whose values **sum to ≤ 10**, played together. All their
  suit powers resolve at the **summed** value; damage is the sum (clubs in the combo double).
- **Animal Companions** (value 1): played alone, or **paired with exactly one** other card (incl.
  another companion, but never a Jester). Both cards' suit powers apply at the combined value; two
  same-suit cards apply that suit power once. Companions cannot join a numbered combo.

### Defeat & the exact-kill economy (the roguelike twist)
- On defeat, the enemy and all cards played against it go to the discard pile, and the next royal
  is revealed. The player who lands the kill **skips Step 4** and starts fresh on the new enemy.
- **Exact kill:** if total damage **exactly equals** the enemy's health, award a **gold multiplier
  bonus** (configurable, e.g. fight reward ×2). *(Replaces Regicide's "place defeated enemy on the
  deck"; defeated enemies are simply discarded here.)*

### Economy (gold)
- **Fight reward** on victory, scaling by tier (e.g. Jack 3 / Queen 4 / King 5).
- **Exact-kill bonus:** multiplier on that fight's reward.
- **Interest:** +1 gold per `N` held at fight's end (e.g. per 5, capped) — Balatro-style.
- Gold is spent only in the shop.

### Shop (between fights; after each win except the 12th)
- Offers a refreshing set of: **jokers** (buy into a free guild slot, up to 5; **sell** for partial
  gold), **consumables**, and a **reroll** button (costs gold, escalating) to redraw the offers.
- **Consumables (one-shot, bought then used on a target):**
  - **Recruitment (Tarot-equiv):** turn a chosen low-value card in the deck into an **Animal
    Companion** (value 1, pairs with anything).
  - **Class Training (Planet-equiv):** **permanently upgrade a suit** for the rest of the run —
    e.g. Hearts heal `v+2`; Diamonds draw `v+1`; Spades shield `v+1`; Clubs +flat damage. Stackable.
  - **Culling:** **permanently remove** a chosen card from the deck (thinning for consistency).
- "Next fight" advances to the next royal.

### Jokers — starting library (data-driven; 5 active slots)
The three named in the blueprint plus a small original set so a run offers choices. Each is a pure
modifier registered into the resolution stack (see build plan):
- **Bloodstained Shield** (relic): spades also **deal bonus damage equal to the shield** they
  provide (i.e., a spade contributes both its shield and that much extra damage).
- **The Opportunist** (guild): **Clubs trigger twice** when played as part of a multi-card combo
  (the doubling applies an extra time for combos of 2+ cards).
- **The Jester's Twin** (guild): whenever you play a Jester, **draw 3 cards** and set that Jester's
  **attack value to 5** (so it now also deals damage, in addition to cancelling immunity).
- **Field Medic** (relic): Hearts heal `+2` on top of their value.
- **Quartermaster** (relic): **+1 max hand size**.
- **Tithe Collector** (guild): **+1 gold** per fight and improved interest.
- **Duelist** (guild): the **first attack each fight deals double** damage.
- **Sapper** (relic): increases the **exact-kill gold multiplier**.

### Determinism
A run is fully reconstructable from `{seed, action-log}`. The seeded PRNG drives: initial deck
shuffle, castle within-rank shuffle, every draw, the Hearts heal-shuffle, and all shop offers /
rerolls. No other randomness exists. (Powers replay, debugging, and the playtest stage.)

## Modes
- **Single-player solo** — the only mode. **No opponent AI:** enemies are deterministic (fixed
  health/attack and a flat Step-4 counter-attack); there is no decision-making opponent to search.
- No hot-seat, no online.

## Screens & flow
- **Title / New Run:** start a run; optional **seed** field (blank = random).
- **Combat screen:**
  - **Enemy panel** (top): art, current **HP** (damage-dealt / health), **Attack**, **immunity
    suit** badge (lit until a Jester cancels it), **accumulated Spade shield**.
  - **Hand** (bottom): the cards; selectable for a play/combo/pairing; a **staging area** shows the
    current selection and its computed effect.
  - **Run HUD:** gold, **5 guild-slot tray** (active jokers w/ tooltips), deck & discard counts,
    **gauntlet progress** (which of 12 royals, current tier).
  - **Resolution readout:** when you confirm a play, a step-by-step panel shows the **modifier
    stack** resolving (base value → combo/companion → suit power → joker modifiers → immunity/Jester
    → final damage/heal/draw/shield). This *is* the game's payoff and must be legible.
  - Controls: **Play**, **Yield**; illegal selections rejected with a visible reason.
- **Shop screen:** gold; offered jokers & consumables (with prices); the guild-slot tray (with
  **sell**); a **deck list** (targets for cull/recruit/train); **Reroll**; **Next fight**.
- **End screen:** **Victory** (all 12 defeated) or **Defeat** (couldn't cover damage / forced to
  yield with no follow-up), a **run summary** (royals beaten, gold earned, jokers held), **New Run**.

## Player states & feedback
- Always show: current enemy stats + immunity + shield, hand, gold, active jokers, gauntlet
  progress, deck/discard counts.
- On selecting cards: validate the combo/pairing live; show computed damage/heal/draw/shield in the
  staging area; **explain rejections** ("Combo must be equal rank, total ≤ 10", "Animal Companion
  pairs with one card only", "Spades grant no shield vs a Spades enemy — play a Jester first").
- On resolution: animate the modifier stack so each joker/upgrade's contribution is visible.
- On defeat of an enemy: show the reward (and **exact-kill** bonus prominently when earned).
- On run end: state clearly why, and the summary.

## Art & feel direction
- Dark, **corrupted-court** palette; original card faces and enemy portraits; **original suit
  icons** distinguished by **shape *and* color** (colorblind-safe — never hue alone).
- The resolution readout is the visual identity: clean, escalating, satisfying "number go up".
- **Keyboard-operable** throughout (select cards, Play=Enter, Yield, Reroll, Next, New Run); text
  scales; no essential info conveyed by color only.
- **Credits** attribute the Regicide designers (Paul Abrahams, Luke Badger, Andy Richdale) and
  Badgers from Mars per CC-BY, without implying endorsement.

## Acceptance criteria (each testable — becomes the playtest checklist)
- [ ] New Run builds a 54-card deck (52 + 2 Jesters) and a 12-royal castle; **same seed → identical
      run** (deck order, castle order, draws, shop offers).
- [ ] Each suit power resolves correctly: Hearts heal `v` from discard under the deck; Diamonds draw
      `v` (capped at max hand); Clubs double their damage; Spades reduce the enemy's attack and the
      shield is **cumulative** until the enemy dies.
- [ ] **Enemy immunity** suppresses the matching suit's *power* (not its damage); playing a
      **Jester** cancels immunity for the rest of that fight.
- [ ] **Combos** (equal rank, sum ≤ 10) and **animal-companion pairings** compute the correct
      combined value, apply all suit powers (Hearts before Diamonds), and reject illegal selections
      with a visible reason.
- [ ] Step 4: enemy attack minus shield is enforced; covering with discards works; **failing to
      cover → run lost**; landing a kill **skips** the counter-attack.
- [ ] **Exact kill** (damage == health) ends the fight and awards the gold multiplier bonus;
      over/under-kill does not.
- [ ] Defeating the **12th royal → Victory**; the end screen shows an accurate run summary.
- [ ] Gold accrues correctly (fight reward + tier scaling + exact-kill bonus + interest); the shop
      **spends/refunds** gold correctly, including **reroll** cost escalation.
- [ ] Each **consumable** mutates the deck as specified (recruit → companion; train → upgraded suit
      effect visible in later resolution; cull → card permanently gone) and persists across fights.
- [ ] Each **joker's** modifier provably changes resolution (e.g. Bloodstained Shield adds spade
      damage; The Opportunist double-triggers clubs in a combo; The Jester's Twin draws 3 and the
      Jester deals 5); selling frees its slot and refunds gold.
- [ ] The full run is **keyboard-operable**; suits are distinguishable without relying on hue alone;
      the resolution readout shows each modifier's contribution.

## Out of scope (MVP)
Online/multiplayer, accounts, **save/cloud persistence** (a run is single-session), sound,
**meta-progression** beyond one run (unlocks, difficulty "stakes", boss-blind special rules),
animations beyond the resolution readout + basic feedback, settings menus beyond accessibility
basics, monetization plumbing, desktop/mobile wrapping (web only for now).
