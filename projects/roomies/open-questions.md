# Roomies — Issues & Incomplete Information (current build, round 1)

> Operator-compiled 2026-05-21 against the built MVP (`app/`) and the original design brief.
> Tags: **[BLOCK]** must answer to finish the design · **[DESIGN]** a rule I invented, please confirm
> · **[BUG]** behaves wrong · **[GAP]** missing feature/coverage · **[FEEL]** balance/experience.
> Everything below is built against a default so the app runs; nothing here stops play.

---

## Round-3 updates (2026-05-22)

**Resolved by the designer:**
- **Croco & Mungo are two distinct characters** (Mungo = 🦍 gorilla, Croco = 🐊). Split the old combined
  "Croco/Mungo" (qty 6) into **Croco ×3 + Mungo ×3**, same stats. ⚑ *Per-character quantities & whether
  their stats differ — TBC* (kept identical for now; deck still totals 94).
- **Hossi, Mikel and Hippo are all hippos** (🦛); **Hossi is bigger, Mikel smaller** (shown via glyph
  size). **Rocky is a husky** (🐕).
- **Three sheep colours**: white / brown / black — split the old Sheeps (qty 6) into **2 + 2 + 2**.
  Designer confirmed colours are cosmetic but invited *very slight* mechanical differences, now
  implemented (⚑ D16, confirm the twists): **White** −1 without Security (timid); **Brown** no Security
  penalty (hardy); **Black** herds at **≥2** Schafe instead of ≥3 (clannish) but still −1 without
  Security. All base 1, all count as Schafe. Parameterized (`herdThreshold`/`needsSecurity`) so the
  values are a one-line retune. Marley remains a separate Herde/Stoner sheep.

**Added this round (modes & AI):** main menu → setup screen (2–4 players, each seat Human / AI
Easy·Medium·Hard), Settings (AI speed, reduce-motion), solo-vs-AI, all-AI watch (PvP/balance testing
without hot-seat friction), paced+animated AI turns. **Online PvP** (servers/accounts) remains out of
MVP scope — flag if you want it.

---

## 1. Incomplete information in the source (the design isn't fully specified)

| # | Tag | Item | What's missing / what I assumed |
|---|-----|------|--------------------------------|
| 1 | BLOCK | **Deck count 94 vs 96** | Components itemize to 27 env + 52 animals + 15 improvements = **94**. Brief says 96. The 2 extra cards are unidentified. Built from 94. |
| 2 | BLOCK | **What do the Types do?** | Every animal has Type(s) — Firma, Stoner, Greyer, Herde, Joker — but **no listed effect references a type**. Effects reference the *keywords* `Schaf`/`Security` and the *names* Hossi/Mikel. So in the build, types (except Joker) **do nothing**. Five types carefully assigned to every card strongly implies they should score (type sets? majorities? per-biome?). Currently inert. |
| 3 | BLOCK | **Biome → environment mapping** | The 3 biomes exist and improvements *add* biome tags, but the brief never says which biome each room **intrinsically** is. I guessed: Park=Stadt, Feld=Natur, Trattoria=Stadt, Wohnzimmer=Zuhause, Landhaus=Zuhause, Café=Stadt, **Reisetasche & Bulli = no biome** (mobile). All invented. |
| 4 | BLOCK | **Biome scoring values & rule** | You chose "set/collection" but gave no numbers. I used **+6 per complete {Zuhause, Stadt, Natur} set**, leftovers worthless. Real rule? (set / majority / per-tag?) Real values? |
| 5 | DESIGN | **Whole game flow** | Players (I chose **2–4**), rounds (**3**), draft model (**Sushi-Go pick-and-pass**), win condition (**highest total**), turn order — none were in the brief. All designed. |
| 6 | BLOCK | **"Gumbel" (Verkleidung)** | "Gumbel wird zu Joker" — **no card named Gumbel exists**. Treated as a generic placeholder: Verkleidung turns *a chosen animal* into a Joker. Typo? A real card? A type? |
| 7 | DESIGN | **Joker semantics** | Joker's actual effect is undefined. I made a Joker (Hippo, or a Verkleidung'd animal) count as **both a Schaf and a Security provider**. Without this, Hippo (base 0) is a dead card. Confirm. |
| 8 | DESIGN | **"Security" — keyword owned vs. granted** | Croco/Mungo, Rocky, Bumpa, Leo list "Security" as their effect. I read it as "this animal **provides** Security to its room" (satisfies Sheeps, fuels Marty). Could instead be a *type* or a *requirement*. Confirm. |
| 9 | DESIGN | **Scoring formula** | Assumed: room score = (Σ animal adjusted points) **× room multiplier**; player total = Σ rooms + biome bonus. The brief gives a "Score Modifier" per room but never states it multiplies the animal-point sum. Confirm the multiplier's target and that biome bonus is *not* multiplied. |
| 10 | DESIGN | **Raum model** | Assumed each room has a capacity (Raum) and each animal consumes its Raum value; animals fit while Σ ≤ capacity. Improvements consume **no** Raum. Confirm. |
| 11 | DESIGN | **Acquisition of rooms & improvements** | Assumed environments and improvements are shuffled into the **same** drafted deck (96 total spans all three card types). Could instead be separate supplies. Confirm. |
| 12 | DESIGN | **Per-player vs shared tableau** | Assumed each player builds their **own** rooms. Confirm it isn't a shared board. |
| 13 | DESIGN | **Hand dealt per round** | Assumed a fresh 6-card hand each of the 3 rounds. Confirm (vs. one deal for the whole game). |
| 14 | BLOCK | **Croco/Mungo — one card or two?** | Listed as a single row "Croco/Mungo" qty 6. Modeled as **one** animal kind ×6. Could be two animals (Croco, Mungo) ×3 each. |
| 15 | DESIGN | **Hippo "0-3" parse** | Raw table read as Raum 1 / Joker / **base 0** / no-effect / **qty 3**. The "0-3" was ambiguous in the run-together source — could mean a variable/base-range. Confirm base & qty. |

---

## 2. Rules decisions I invented (please confirm — wrong guesses waste build effort)

| # | Tag | Decision | Default chosen |
|---|-----|----------|----------------|
| 16 | DESIGN | **Draft intercepts fire on *play*, not on pick/discard** | Dalai's rotate & Marty's swap trigger only when the card is successfully **placed**. If you can't place it (no room) and discard it, the effect does **not** fire. |
| 17 | DESIGN | **Marty swap timing** | "Tausche Hand" resolves **when hands pass** (pick-round boundary), not the instant Marty is played. *(Required to keep hand sizes equal — see Bug-history note below.)* You choose which player; you may skip. |
| 18 | DESIGN | **Dalai rotate** | Adds **one extra hand-pass** at the pick-round boundary (stacks with the normal pass). With 2 players this can cancel the normal pass. |
| 19 | DESIGN | **Marty "+1 per Security"** | Counts every Security provider in Marty's room (incl. Jokers), **excluding Marty himself**. |
| 20 | DESIGN | **Leo "exactly 4 Schafe"** | Brittle: 3 or 5 Schafe → no bonus. Leo himself doesn't count as a Schaf; a Joker does. |
| 21 | DESIGN | **Dekoration clamp target** | Clamps each **animal's** adjusted score to ≥0 (vs. clamping the room subtotal). |
| 22 | DESIGN | **Multiple Ausbau stack** | Each Ausbau adds +2 Raum; stackable on one room. Dekoration is idempotent. |
| 23 | DESIGN | **Verkleidung target** | Only **your own placed** animal; targeting a Hippo is a legal no-op. Can't target hand cards or opponents. |
| 24 | DESIGN | **Tie-break** | total → most biome sets → most animals placed → shared win. |
| 25 | DESIGN | **First picker each pick-round** | Player 1 always acts first within a pick-round (matters only because intercepts are sequential). |

---

## 3. Bugs / correctness notes

| # | Tag | Item | Status |
|---|-----|------|--------|
| 26 | (fixed) | Marty swapping a mid-pick-round hand caused **uneven hand sizes → a seat faced an empty hand**. | Fixed by deferring swaps/rotations to the pick-round boundary (#17/#18). |
| 27 | BUG? | **Dekoration is a no-op.** With the given numbers, **no animal can ever score below 0** (Sheep floors at 0, Mikel at 1, Hossi at 2). So "keine Minuspunkte" never triggers and the card is useless. Implies missing negative-scoring rules or different values. | Needs a design answer. |
| 28 | FEEL | **−1 penalties never cause real losses** — they only reduce gains, because all bases are positive and clamp at the modifier level. Lonely Hossi still nets +2. Tension is weak. | Design question. |

No blocker/major functional bugs remain: 54 unit tests, a randomized full-game simulation (termination, card conservation, Raum limits, deterministic replay), and a Playwright full-game e2e all pass.

---

## 4. UI / UX gaps

| # | Tag | Item |
|---|-----|------|
| 29 | GAP | **Can't see opponents' tableaus** during your turn — only their running totals. A drafter usually needs to read what rivals are building. |
| 30 | GAP | **No in-app rules/legend/help** — keyword and biome meanings aren't explained in-app. |
| 31 | GAP | **No discard pile view** — discarded/spent cards are invisible. |
| 32 | GAP | **Placement is immediate, no confirm/undo** — a misclick on a target room is committed (selection *can* be cancelled before placing). |
| 33 | GAP | **Keyboard flow partial/unverified** — wired (digits select hand card; digits also pick targets when a card is selected; Enter/P play; D discard; Esc deselect; N new game; Enter reveals on pass screen) but **not e2e-tested**, and the dual number-key mode may confuse. |
| 34 | GAP | **No responsive/mobile layout pass** — only verified at desktop 1280×920; hand strip may cramp on small screens. |
| 35 | GAP | **Accessibility not audited** — claims colorblind-safety (glyphs ●▲■◆ + icon/text badges, not hue-only) but no screen-reader/contrast/text-scaling audit. |
| 36 | GAP | **No persistence** — refresh loses the game; no save/resume (out of MVP scope). |
| 37 | GAP | **Seed not shown during play** (only on end screen), so a memorable game can't be noted mid-play. |

---

## 5. Test-coverage gaps

| # | Tag | Item |
|---|-----|------|
| 38 | GAP | No **keyboard-only** e2e playthrough. |
| 39 | GAP | No test for a **tie / shared win** display. |
| 40 | GAP | No unit test for the **empty-hand intercept no-op**. |
| 41 | GAP | Biome bonus tested at 0 and 1 set, **not 2 sets** (+12). |
| 42 | GAP | No test asserting **Draft intercept does NOT fire on discard** (decision #16). |

---

## 6. Balance / feel concerns (untuned — need playtesting once the rules are confirmed)

| # | Tag | Item |
|---|-----|------|
| 43 | FEEL | **Types are inert** (#2) — large unused design space. |
| 44 | FEEL | **Dekoration useless** (#27); **penalties toothless** (#28). |
| 45 | FEEL | **Hippo/Joker value** hinges entirely on the Joker interpretation (#7). |
| 46 | FEEL | **"Play or discard, no relocation"** — an animal drafted before you own a fitting room is lost; early game is swingy. |
| 47 | FEEL | **×2 small rooms** (Café cap 3, Reisetasche cap 2) vs **×1 big rooms** (Feld cap 10) — relative value untested. |
| 48 | FEEL | **Biome set bonus (+6)** magnitude vs. room scores is untuned. |
| 49 | FEEL | **Limited interaction** — only Marty/Dalai touch other players; no catch-up mechanism. |

---

## Suggested next step
The **BLOCK** items (1, 2, 3, 4, 6, 14 — deck count, what Types do, biome map, biome values, Gumbel,
Croco/Mungo) are the ones that genuinely change the design. Answering those (plus a steer on #27
Dekoration) would let one tight iterate round lock the ruleset; the rest are confirmations and polish.
