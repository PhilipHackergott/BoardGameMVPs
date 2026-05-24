# MVP Spec — Roomies

> Stage 3 (Specification), the *what*. Operator-run, 2026-05-21. **Original design** supplied by the
> user; `ip.status: clear`. The source specifies **components + the scoring engine** in full but
> leaves the **game flow** and **biome scoring** undefined. This spec designs them and flags every
> invented rule with **⚑**. Treat the ⚑ list below as the gate's decision sheet.
>
> **REVISION 2026-05-22 (build round 2):** the round is now an explicit **two-phase** structure —
> a **DRAFT phase** (pick-and-pass; Dalai/Marty intercepts fire here) followed by a **PLACE phase**
> (arrange your drafted cards into rooms) — replacing the round-1 "pick-and-place-instantly" model,
> which had no visible draft. See "Turn structure" below.
>
> **REVISION 2026-05-22 (build round 3):** **modes & AI.** A **main menu → setup screen** lets you set
> 2–4 players and make each seat **Human** or **AI (Easy/Medium/Hard)**. So "hot-seat" is now just one
> config (2+ humans); you can also play **solo vs AI** (no device-passing) or **watch all-AI** (the way
> to exercise PvP/balance without hot-seat friction). AI turns are paced + animated. A **Settings**
> screen has AI speed + reduce-motion. **Card identities corrected** (see components): Croco & Mungo
> are two characters (Mungo a gorilla), Hossi/Mikel/Hippo are hippos (Hossi big, Mikel small), Rocky a
> husky, sheep come in white/brown/black. _True online multiplayer remains out of scope (server/accounts)._

---

## ⚑ Open design decisions (confirm or correct at this gate)

The build is blocked on none of these — each has a concrete default chosen so the engine is fully
specified — but each is a place the source was silent and I made a call. Override any of them and I
revise in place.

| # | Decision | Default chosen for the MVP | Why / alternative |
|---|----------|----------------------------|-------------------|
| D1 | **Deck size** | Itemized components total **94** cards (27 env + 52 animals + 15 improvements), not the stated 96. | Stated "96"; I can't see the missing 2. Default: build from the 94 itemized; add the 2 when identified. |
| D2 | **Players** | 2–4, hot-seat; **3** is the default in New Game. | Hand-passing draft needs ≥2; 3–4 is the sweet spot. |
| D3 | **Rounds** | **3 rounds**; each round deal a fresh 6-card hand to every player. | Mirrors 7 Wonders "ages". Configurable constant. |
| D4 | **Draft model** | Sushi-Go/7-Wonders **pick-and-pass**: pick 1 card from the hand in front of you, **play it immediately** to your tableau, pass the rest to the next seat; repeat until hands are empty. | Strongly implied by "Rotiere Hände" / "Tausche Hand". |
| D5 | **Playing a card** | On your pick you **play** (place) the card if a legal target exists, else you **discard** it (scores nothing). No relocating cards once placed. | Keeps the MVP unambiguous. Alternative (a holding bench, moving cards) deferred. |
| D6 | **Unplaceable animal** | An animal with no Environment that has free Raum is discarded. | See D5. Swingy on draw order — a balance note, not a correctness issue. |
| D7 | **Biome scoring** (you chose *set/collection*) | Each Environment carries biome tag(s); **+6 pts per complete set of all three biomes** (Zuhause+Stadt+Natur) present among a player's Environments; leftover tags score 0. The `+6` and the rule are a single config constant. | You picked set-collection but gave no values. This is a placeholder you should set. Alt: per-biome majority, or graduated set values [0,1,3,6,10]. |
| D8 | **Intrinsic biome of each Environment** | Proposed mapping (table below); Bulli & Reisetasche are "mobile" with **no** intrinsic biome (only gain one via an Improvement). | Source lists 3 core biomes and biome-granting Improvements but never maps Environments→biomes. |
| D9 | **Types** (Firma/Stoner/Greyer/Herde/Joker) | Carried as data but have **no generic scoring**. No listed effect references a *type* — effects reference the **keywords** `Schaf` and `Security` and the **names** Hossi/Mikel. `Joker` is the only type with mechanical meaning (D10). | Avoids inventing set-collection on types. Easy to add later if you intend type bonuses. |
| D10 | **Joker semantics** (Hippo; Verkleidung) | A `Joker`-type animal counts as **both a Schaf and a Security provider** for all co-location checks in its Environment (a flexible filler). Hippo (base 0) and any animal turned Joker by Verkleidung gain this wild role. | Makes Hippo/Verkleidung meaningful. Alt: Joker = "any one keyword, chosen on placement". |
| D11 | **Dekoration** ("keine Minuspunkte") | Within a Dekoration'd Environment, **each animal's adjusted score is clamped to ≥ 0** before the environment multiplier is applied. | Cleanly removes the −1 penalties (lonely Hossi/Mikel, sheep w/o Security). Alt: clamp only the environment subtotal ≥ 0. |
| D12 | **"Gumbel"** in Verkleidung | Read as a generic "the chosen animal" — Verkleidung attaches to one animal in your tableau and sets its type to Joker. "Gumbel" treated as a placeholder/typo, not a specific card. | No card named Gumbel exists in the list. |
| D13 | **Win / tie-break** | Highest total score wins. Tie-break: most complete biome sets → then most animals placed → then shared win. | Source gives no win condition for the full game. |
| D14 | **Marty's "+1 per Security"** | +1 for each *other* Security provider in Marty's Environment (Marty has none himself). | Literal reading. |
| D15 | **Score multiplier order** | Per Environment: sum animals' adjusted (and Dekoration-clamped) points, **then × the Environment multiplier**, then add nothing else; biome sets are scored once at the player level. | Standard "multiplier on the zone total". |
| D16 | **Sheep colours** (designer asked for "very slight" differences) | All three are Schafe, base 1, +1 in a herd. **White** −1 without Security; **Brown** no Security penalty (hardy); **Black** herds at **≥2** (not ≥3) but still −1 without Security. Parameterized via `herdThreshold` + `needsSecurity` on the card def — trivial to retune. | Cosmetic colours + a small mechanical twist; confirm the twists/values. |

---

## Pitch & target experience
A breezy 20-minute **animal-housing drafter**: snatch the right critter from a passing hand, drop it
in the right room, and watch the combos light up. The tension is spatial and combinatorial — every
animal is worth more (or less) depending on its roommates — and the app does the fiddly maths live so
the "ohhh, put the sheep *there*" payoff lands instantly.

## Scope line (the single core loop the MVP delivers)
**Local hot-seat play of one full game (2–4 players, 3 rounds):** each round, players **draft** cards
by pick-and-pass (into a personal pool), then **place** their drafted cards into rooms. After 3 rounds
the engine scores every tableau (animal synergies × room multipliers + biome sets) and declares a
winner. **Hot-seat, animated** (pass-the-device + card-flight animations); no AI, no online, no
accounts. The drafted-card synergy engine is the heart and must be exact.

---

## Rules to implement

### Components (the deck — see D1 for the 94-vs-96 count)

**Environments (27 cards, 8 kinds)** — drop-zones with `Raum` (capacity) and a score multiplier:

| Environment | Raum | Multiplier | Qty | Intrinsic biome (⚑ D8) |
|-------------|:----:|:----------:|:---:|------------------------|
| Park        | 7  | ×1 | 3 | Stadt |
| Feld        | 10 | ×1 | 3 | Natur |
| Trattoria   | 8  | ×1 | 3 | Stadt |
| Reisetasche | 2  | ×2 | 3 | — (mobile) |
| Wohnzimmer  | 6  | ×1 | 3 | Zuhause |
| Landhaus    | 5  | ×1 | 3 | Zuhause |
| Café        | 3  | ×2 | 3 | Stadt |
| Bulli       | 6  | ×1 | 6 | — (mobile) |

**Animals (52 cards, 13 kinds)** — `Raum` = space consumed; `Base` = base points; keywords/effects
resolve against the *contents of the same Environment*:

| Animal | Raum | Type(s) | Base | Keywords / effect | Qty |
|--------|:----:|---------|:----:|-------------------|:---:|
| Croco (🐊) | 2 | Firma | 2 | **Security** | 3 |
| Mungo (🦍 gorilla) | 2 | Firma | 2 | **Security** | 3 |
| Hippo | 1 | Joker | 0 | wild (counts as Schaf + Security, D10) | 3 |
| Dromi | 3 | Stoner, Firma | 3 | — | 4 |
| Hossi | 3 | Greyer | 3 | **+1 if Mikel in same env, −1 if not** | 4 |
| Rocky | 3 | Firma, Herde | 2 | **Security** | 4 |
| Dalai Lama | 2 | Stoner | 2 | **+2 if alone in its env**; *Draft:* rotate all hands ×1 | 3 |
| Bumpa | 4 | Herde, Greyer | 3 | **Security** | 4 |
| Leo | 4 | Herde | 4 | **Security**; **+2 if exactly 4 Schafe in same env** | 3 |
| Bob | 4 | Stoner, Greyer | 4 | — | 4 |
| Marty | 3 | Firma | 4 | **+1 per Security in same env** (D14); *Draft:* swap hand with a player | 3 |
| White Sheep 🐑 | 1 | Herde | 1 | **Schaf**; +1 if ≥3 Schafe; **−1 if no Security** (timid) | 2 |
| Brown Sheep 🐑 | 1 | Herde | 1 | **Schaf**; +1 if ≥3 Schafe; **no Security penalty** (hardy) | 2 |
| Black Sheep 🐑 | 1 | Herde | 1 | **Schaf**; +1 if **≥2** Schafe (clannish); −1 if no Security | 2 |
| Marley | 1 | Herde, Stoner | 1 | **Schaf** | 4 |
| Mikel | 1 | Greyer | 2 | **+1 if Hossi in same env, −1 if not** | 4 |

**Improvements (15 cards, 6 kinds)** — attach to a tableau target:

| Improvement | Effect | Attaches to | Qty |
|-------------|--------|-------------|:---:|
| Ausbau | **+2 Raum** capacity | an Environment | 3 |
| Dekoration | **No negative points** in this Environment (D11) | an Environment | 3 |
| Pop-Up Couch | **+ Zuhause** biome tag | an Environment | 2 |
| Boombox | **+ Stadt** biome tag | an Environment | 2 |
| Blumentopf | **+ Natur** biome tag | an Environment | 2 |
| Verkleidung | **Sets target animal's type to Joker** (D10, D12) | an Animal in play | 3 |

### Setup
- Choose 2–4 players (D2). Seat them in fixed order around the (virtual) table.
- Shuffle the deck (seeded PRNG — determinism per stack conventions).
- Each player starts with an **empty tableau** and **no cards in hand** until the round deal.

### Turn structure — two phases per round (REVISED 2026-05-22)
A game is **3 rounds**. Each round has a **DRAFT** phase then a **PLACE** phase:

**1. DRAFT phase — pick-and-pass (this is where the draft intercepts live).**
- **Deal** every player a hand of **6** cards.
- Repeated **pick-rounds** until hands are empty (6 picks): in seat order, the active player picks
  **one card** from the hand in front of them; the card goes into their **pool** (drafted, not yet
  placed). After all players have picked, **all hands pass** one seat.
- **Draft intercepts fire when the card is drafted (picked):**
  - **Dalai Lama** → queues **one extra hand rotation**, applied at the pick-round boundary.
  - **Marty** → the drafter may **swap a hand** with a chosen player; the swap is **queued and applied
    at the pick-round boundary** (so all hands stay equal size — see build note). May be skipped.

**2. PLACE phase — arrange your pool.**
- In seat order, each player places cards from their **pool** into their tableau:
  - **Environment** → a new room.
  - **Animal** → into one of *their* rooms with free Raum ≥ the animal's Raum.
  - **Improvement** → attached to a room (or, Verkleidung, to a placed animal).
- A player ends their placement with **Done**; any **unplaced pool cards are discarded** (⚑ D5/D6 —
  no relocation, no carry-over between rounds). When the last player is done, deal the next round, or
  (after round 3) proceed to final scoring.

> Hot-seat realization: both phases are sequential on one device with a **pass-the-device** interstitial
> that hides each player's hand/pool between turns. Picks and placements **animate** (a card glyph flies
> to the pool / room), and a phase banner announces DRAFT / PLACEMENT, so turns are clearly readable.

### Scoring (resolved at game end — the heart)
For each player, for each Environment `E` in their tableau:
1. The Environment holds a set of animals whose total Raum ≤ `E.Raum (+2 if Ausbau)`.
2. For each animal in `E`, compute **adjusted points = base + Σ conditional modifiers**, evaluated
   against the other contents of `E`:
   - **Hossi:** +1 if a Mikel is in `E`, else −1.
   - **Mikel:** +1 if a Hossi is in `E`, else −1.
   - **Sheeps:** +1 if `count(Schafe in E) ≥ 3`; **and** −1 if no Security provider is in `E`. (Both
     can apply: a sheep in a herd of ≥3 with no guard nets +1−1 = +0 on top of base.)
   - **Leo:** +2 if `count(Schafe in E) == 4` exactly.
   - **Dalai Lama:** +2 if it is the **only** animal in `E`.
   - **Marty:** +1 for each Security provider in `E` (D14).
   - **Schaf count** includes Sheeps, Marley, and any Joker (D10). **Security providers** are
     Croco/Mungo, Rocky, Bumpa, Leo, and any Joker (D10).
3. **Dekoration (D11):** if `E` has Dekoration, clamp each animal's adjusted points to **≥ 0**.
4. **Environment score = (Σ adjusted points in E) × E.multiplier** (D15).
5. **Player tableau score = Σ Environment scores + biome-set bonus** (D7): score `+6` per complete
   {Zuhause, Stadt, Natur} set formed from the player's Environment biome tags (intrinsic D8 + any
   added by Improvements; an Environment may carry multiple tags).

### Win / end conditions (⚑ D13)
After round 3 scoring, **highest total wins**. Tie-break: most complete biome sets → most animals
placed → shared win.

### Edge cases (locked for the MVP)
- **Empty Environment:** scores 0 (×anything = 0). Dalai-Lama-alone needs exactly itself present.
- **Over-capacity placement is illegal** and prevented by the UI; the engine rejects it with a reason.
- **Discarded cards** leave play permanently (no recycle in MVP).
- **Marty swap / Dalai rotate with empty hands:** if a target hand is empty (end of round), the
  intercept is a no-op.
- **Negative environment totals** are allowed (and can lower a player's score) **unless** Dekoration
  is present — by default a tableau total can dip via lonely Hossi/Mikel or unguarded sheep.
- **Determinism:** every game is reconstructable from `{config, seed, action-log}`. Only the initial
  shuffle uses the PRNG.

### Rules deferred / cut for the MVP (and why)
- **AI opponents** — hot-seat only for v1 (the human chose the full multiplayer game). vs-AI is a
  fast-follow.
- **Type-based scoring** (D9) — no source effect needs it; deferred until you confirm types should
  score.
- **Card relocation / a holding bench** (D5/D6) — adds UI and rules; the simple "play or discard" rule
  ships first.
- **The missing 2 cards** (D1) — build from the itemized 94 until identified.
- **Real biome values** (D7) — placeholder `+6/set`; you set the real economy at this gate.

---

## Modes
- **Hot-seat, 2–4 players** (pass-and-play on one device) — the only MVP mode.
- vs-AI is the planned fast-follow (the pure engine + legal-move generation make a heuristic AI
  feasible) — **not** in this MVP.

## Screens & flow
- **Title / New Game:** choose player count (2–4, default 3) and optional seed (blank = random).
- **Draft screen** (per active player):
  - **Pass-device interstitial** first ("Pass to Player N — tap when ready") so hands stay hidden.
  - **Hand strip:** the cards currently in front of the active player; tap a card to select it.
  - **Your tableau:** your Environments as zones, each showing Raum used/total, multiplier, attached
    Improvements, biome tags, contained animals, and a **live computed sub-score**.
  - **Placement:** picking an Animal prompts "choose an Environment" (only those with room are
    enabled); picking an Improvement prompts a legal target; an Environment drops straight in.
    A **Discard** option is always available.
  - **Intercept prompts:** Dalai Lama → toast "all hands rotate"; Marty → "swap hands with… (or skip)".
  - **HUD:** round (1–3), pick number, whose turn, each player's running tableau total.
- **End screen:** per-player final score with a **breakdown** (each Environment's animal points →
  ×multiplier, plus biome-set bonus), the winner (or tie result), and **New Game**.

## Player states & feedback
- Always show: current round/pick, active player, every player's live total.
- On selecting a card: highlight legal targets; disable/grey illegal ones (e.g. Environments without
  room for the chosen animal) with a reason on hover/tap ("No room: needs 3 Raum, 1 free").
- On placement: animate the card into the zone; the zone's sub-score updates with a brief annotation
  of *why* (e.g. "Hossi +1 (Mikel present)", "Sheeps −1 (no Security)").
- On discard: show the card moving to a discard pile.
- At end: lay out each player's tableau with the full scoring breakdown so the result is legible.

## Art & feel direction
- Original assets (this is an original design — no third-party art). Friendly, flat, **icon-forward**
  card faces: a clear creature glyph, Raum pips, base points, and keyword icons (🛡 Security, 🐑 Schaf,
  🃏 Joker). Environments as labelled "room" cards with a capacity meter and a ×multiplier badge.
- **Biomes** shown as small colored tags (Zuhause / Stadt / Natur) with **distinct icon + shape**, not
  color alone.
- **Accessibility floor:** colorblind-safe palette (hue + icon/shape), full keyboard operation
  (arrow/Tab to select a card, Enter to play, number keys to choose a target Environment, D to
  discard, N for new game), and scalable text. No essential info conveyed by color only.

## Acceptance criteria (each testable — becomes the playtest checklist)
- [ ] New Game with N players (2–4) deals each a 6-card hand; same seed → identical deal & shuffle.
- [ ] A picked Environment is added to the active player's tableau with the correct Raum & multiplier.
- [ ] A picked Animal can only be placed in an Environment with free Raum ≥ its Raum; illegal targets
      are disabled with a visible reason; with no legal target the card can be discarded.
- [ ] Picking is strictly seat-order; after every player picks once, all hands pass one seat; a round
      ends when hands are empty; the game runs exactly 3 rounds.
- [ ] **Dalai Lama** played → all hands rotate one extra step. **Marty** played → active player may
      swap their hand with a chosen player (or skip). Both are no-ops on empty hands.
- [ ] **Hossi/Mikel:** +1 each when together in an Environment; −1 each when apart. (Both directions.)
- [ ] **Sheeps:** +1 when ≥3 Schafe share the Environment; −1 when no Security shares it; both can
      apply at once.
- [ ] **Leo:** +2 only when exactly 4 Schafe share its Environment (3 or 5 → no bonus).
- [ ] **Dalai Lama:** +2 only when alone in its Environment.
- [ ] **Marty:** +1 per Security provider in its Environment.
- [ ] **Joker (Hippo / Verkleidung'd animal):** counts as a Schaf for herd/Leo checks and as a
      Security provider for sheep/Marty checks.
- [ ] **Ausbau** raises an Environment's Raum by 2; **Dekoration** clamps each animal's adjusted
      points to ≥0 in that Environment.
- [ ] Environment score = Σ adjusted animal points × multiplier; ×2 environments (Café, Reisetasche)
      double correctly.
- [ ] **Biome sets:** a player with all three biomes among their Environment tags scores the set
      bonus; biome-granting Improvements add their tag; the bonus scales with complete sets.
- [ ] End screen shows each player's per-Environment breakdown and biome-set bonus; the highest total
      wins; tie-break applied; a shared win is possible and shown.
- [ ] The full loop is keyboard-operable; hands are hidden behind a pass-device screen between players;
      card info is distinguishable without relying on hue alone.
- [ ] A full game is reconstructable from `{config, seed, action-log}` (replay/determinism).

## Out of scope (MVP)
vs-AI, online multiplayer, accounts/profiles, save/resume, sound, rich animation beyond basic
feedback, card relocation/holding bench, type-based scoring, multiple themes, monetization,
desktop/mobile wrapping (web only for now).
