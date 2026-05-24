# Cull the Crown — Roguelike Expansion Changelog

> Summary of the changes made on 2026-05-23, turning the MVP into a deep, Balatro-style roguelike.
> The project is still at the **build gate** (not shipped). Content is deliberately **untuned** —
> numbers (prices, weights, sigil/relic power, deck & stake curves) are balance dials for a `/test` pass.
>
> **Final verification:** `tsc` + `vite build` clean · **110 Vitest** tests · **11 Playwright e2e**.

---

## At a glance

| Area | Before | After |
|---|---|---|
| Opponents | Suit immunity + flat counter only | **Royal Decrees** (tiered), King enrage, intent telegraph, immunity-answer relic |
| Run map | A `Royal n/12` text counter | **"The Descent"** overview modal (acts, all 12 royals, decrees, run state) |
| Relics | 8 flat jokers | **21 relics** — rarities, downsides, scalers, synergies, suit-boosts |
| Shop | Flat list (2 jokers + 4 consumables) | **Booster packs + loose wares + edicts + remove + held tarot pouch** |
| Card upgrades | 4 single sigils | **8 sigils** (multi-per-card) incl. Honed/Companion/Twin-Suit/Wildcard |
| Run variety | Linear 12 fights | + **Court Events** + **starting Decks** + **Stakes** |
| Run creation | Seed only | **13 Decks + 8 Stakes** chosen from a title-screen carousel |

---

## 1. Opponent depth — Royal Decrees, enrage, intents

- **Royal Decrees** — per-royal special rules (data in `content.DECREE_LIBRARY`, stored clone-safe as `Enemy.decreeId`). Hooks fire at fixed points (resolve / forbids / onPlayResolved / onCounterResolved / healthMult / ignoresShield). Decrees: Iron Wall, Headsman, Plague Court, Vampire King, Executioner, Paranoid Crown, Thick Hide, The Tyrant, The Mad King.
- **Difficulty curve** — decrees are now **tiered**: Jacks draw *mild*, Queens *standard*, **Kings a severe decree + a stacked mild one**, and the **final King = the Mad King finisher + a stacked severe**. Kings can carry two decrees (`Enemy.decreeId2`).
- **King enrage** — below 50% HP, Kings strike for +5.
- **Intent telegraph** — a live "Next strike N" + decree pills on the combat screen (`enemyIntent` selector).
- **Immunity answer** — the **Usurper's Sigil** relic strips a royal's immunity (the Jester rework had removed any counter to it).

## 2. "The Descent" — run overview modal

A read-only map (the ⌖ button or **M** key): three colour-banded Courts, all 12 royals with HP/ATK/immunity/decrees + cleared/current markers + event markers, and a side rail of your run state (gold, jesters, training, relics, edicts). `gauntletView` selector.

## 3. Relic depth (21 relics)

Rarity tiers (Common/Uncommon/Rare, rarity-weighted shop). Categories:
- **Downside** — Glass Cannon (×1.5 dmg, −2 hand), Reckless Charge (+5 dmg, +3 incoming).
- **Scaling** — Whetstone (+1/royal felled), Reaper's Toll (+interest cap/kill).
- **Synergy** — Twin Daggers (+3 combo), Spiked Aegis (reflect a counter), Bottled Courage (start fights shielded).
- **Suit-boost** (replaces the old Train consumable) — Heartsworn/Diamond Crown/Clubmaster/Spadesworn (`Joker.suitBoost` → `effectiveSuitUpgrades`).
- New hook points: `onFightStart` / `onCounterResolved` / `onRoyalFelled`; dynamic `maxSlots`/`incomingDamage`; a `ModInfo` snapshot for scaling relics.

## 4. Balatro-style shop redesign

The flat shop is replaced by a booster-pack economy. **Every shop always shows: 3 packs + 3 loose wares + 1 Act-gated Edict + an escalating Remove-a-card + a held tarot pouch.**

- **Packs** crack open into a reveal modal (burst animation + foil-tear SFX + reward chime). Pick **1 of 3** (rare **Jumbo** 1-of-5 / **Mega** 2-of-5). Kinds: **Card / Tarot / Relic / Sigil**.
- **Tarots** are **held consumables** (pouch, usable in the shop *or* mid-combat): Honing Stone, Midas Draught, Shifting Mask, Whetting Oil, Court Advisor, Reliquary Rites, Engraver's Gift, Conjuration.
- **Sigils** (a card can carry several): Keen/Warding/Gilding/Runes + **Honed** (+value), **Companion** (= old Recruit), **Twin-Suit** (fires both suits, double immunity), **Wildcard** (pick the suit at play time, via an in-combat picker).
- **Edicts** — permanent run-wide upgrades, two-tier; one acquirable per Act.
- **Card modifications show on the cards** — Balatro-style badges + tooltips on both the DOM deck/shop cards *and* the Pixi combat hand.
- Full pack/reward reference: see **`SHOP-COMPENDIUM.md`**.

> Engine note: `Card.sigil` → `Card.sigils[]`; `deckCount` is no longer a fixed 40 (cards add/remove) — the invariant is now `deckBaseline`. Old saves are auto-invalidated.

## 5. Run-structure variety — Court Events

Five risk/reward choice nodes (Shrine, Armory, Mercenary, Gambler, Refugees) fire before fights 3/6/9 via a new `event` phase + `EventScreen`.

## 6. Starting Decks + Stakes (run creation)

Chosen on the title screen via deck + stake **carousels**.

**13 Decks** (`content.DECK_LIBRARY`; `RunState.deckId`):
- *Core:* Royal · Merchant's Hoard (+◆10) · Bannerman (+1 hand) · Warband (+1 slot, −1 hand).
- *Unlockable (win-chain):* The Coffer · Tactician · Fool's Pouch · Occult · Iron · Vital · Pilgrim · Erratic · Enchanter.
- Knobs: config overrides, slot/pouch bonuses, starting relics/edicts/tarots, suit-restricted or randomized decks, pre-engraved cards, and passive flags (no-interest, gold-per-leftover-hand, tarot-per-royal, first-royal-decree).

**8 Stakes** — cumulative difficulty ladder (oriented on Balatro): White → Red (royals pay −1) → Green (+15% HP) → Black (no relic selling) → Blue (−1 hand) → Purple (+15% HP) → Orange (+2 reroll/remove) → Gold (+3 attack, start ◆0).

**Unlocks** — Balatro-style win-chain in `localStorage` (`ctc_decks_won` / `ctc_stake_won`); each deck's `unlock` needs winning the prior deck, each stake win opens the next rung. **Debug mode (the Settings "Infinite gold" toggle) unlocks every deck and stake immediately.**

---

## Architecture & invariants (held throughout)

- **Pure, deterministic engine** — every run reproducible from `{seed, deckId, stakeId, action-log}`; all randomness flows through `run.rngState` (never `Math.random`).
- **Clone-safe `RunState`** — only ids/data are stored; behaviours live statically in `content.ts` and resolve via `*ById`. `applyAction` `structuredClone`s the state.
- **Pure `engine/` + thin `ui`/`render`** — UI consumes the engine; the engine never imports UI.

## Files touched (high level)

- Engine: `types.ts`, `content.ts`, `run.ts`, `resolution.ts`, `combat.ts`, `cards.ts`, `index.ts`
- UI/render: `App.tsx` (Shop/Combat/Title + carousels), `store.ts`, `DeckModal.tsx`, `PackModal.tsx`, `render/cardNode.ts` + `combatStage.ts`, `audio/chiptune.ts`, `styles.css`
- Tests: `tests/engine/*` (decrees, relics, shop-depth, events, decks, simulation, …) + `tests/e2e/*` (descent, event, packs, …)
- Reference docs: `SHOP-COMPENDIUM.md`, this `CHANGELOG.md`
