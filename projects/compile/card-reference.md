# Compile: Main 1 — Card Reference (sourced)

**Status:** card data **RESOLVED from online sources** (was a documented gap — the user's rulebook
PDF defines the full rules system but prints **no individual card texts**).
**Pass type:** data-sourcing only. No build/test/spec gate was crossed.
**Date:** 2026-05-26.

This file is the authoritative record of the 72 published Main 1 command cards (12 protocols × 6
cards), with the value and the three command-box texts for each, plus per-card source confidence and
the exact mapping into the engine (`app/src/engine/cards.ts`).

---

## What "Compile" is

*Compile: Main 1* (Greater Than Games / Flat River Group, 2024; designer **Michael Yang**) is a
two-player duelling card game. Each player is a rogue AI racing to **compile three protocols**.
Players **draft** 3 protocols each (1-2-2-1 draft from a shared pool of 12), shuffle the 6 command
cards of each drafted protocol into an **18-card deck**, and fight for **value** across **3 lines**.
A line you hold at **≥ 10 value AND strictly ahead** must be compiled (flip that protocol). Compile
all three to win. Full rules are in [`rulebook-extracted.txt`](rulebook-extracted.txt).

Each command card has up to three command boxes:
- **Top — Persistent:** active while the card is face-up, **even when covered**.
- **Middle — Immediate:** resolves on play face-up / flip face-up / uncover.
- **Bottom — Auxiliary:** active only while face-up **and** uncovered (often a `Start:`/`End:` or a
  reactive trigger).

The card's printed **value** is contributed to its line while face-up; a face-down card is worth a
flat **2**.

---

## Sources & confidence

| # | Source | Used for | Notes |
|---|--------|----------|-------|
| S1 | **Compile Card Database** — ryanascherr.github.io/compile (raw `script.js`, branch `main`) | **Primary**: all 72 card values + box texts | Community-maintained, fully structured. Captured verbatim 2026-05-26. |
| S2 | **Official rulebook** (user's `compile-main-1-rulebook.pdf` → `rulebook-extracted.txt`; mirror: gamers-hq.de hosted GTG rules PDF) | Rules system; 3 leaked card texts | Card Anatomy + Rules sections print **Spirit-1**, **Death-1**, **Death-3** in full. |
| S3 | **BGG thread 3352854 "Metal 1 clarification"** | Confirms **Metal-1** text | "Draw 2 cards. Your opponent cannot compile next turn." |
| S4 | **BGG / search corroboration** of **Metal-6** | Confirms the value-6 Metal card | "Metal 6 … deletes itself when flipped" → matches S1. |
| S5 | **The Compile Codex** (Scribd doc 924488020) — errata/FAQ | Flagged, **not yet accessible** (login-gated) | Tracks official errata; see Outstanding. |

**Cross-validation result:** S1 was checked against the independent texts in S2/S3/S4 on the
cards they cover and **matched exactly** (Spirit-1, Death-1, Death-3, Metal-1, Metal-6 — 5/5). S1 is
internally consistent (exactly 12 Main 1 protocols × 6 cards). It is treated as **authoritative for
card text and values**, with the caveats in *Outstanding* below.

> The same database also contains 3 extra protocols — **Apathy, Hate, Love** — which are **not** in
> Main 1 (they are the *Aux 1* expansion). They are **excluded** here; the 12 below are exactly the
> Main 1 set named in the rulebook.

### Transcription fixes applied (S1 had minor typos)
- Plague value-2: "Dicard" → **"Discard"**.
- Spirit value-4: added a trailing period.
- HTML markup (`<div><span class='emphasis'>…</span></div>`, incl. a misspelled `empahsis` class) was
  stripped to plain text; the visible `Start:` / `End:` / `When this card would be covered:` labels
  are preserved.

---

## ⚠️ Important correction to a prior project assumption

The placeholder build assumed **every protocol uses a clean 0–5 value spread**. **That is wrong for
two protocols.** Real Main 1 values:

| Protocol | Card values |
|----------|-------------|
| **Gravity** | 0, 1, 2, **4, 5, 6** &nbsp;— *no value 3; has a value 6* |
| **Metal** | 0, 1, 2, 3, **5, 6** &nbsp;— *no value 4; has a value 6* |
| All other 10 | 0, 1, 2, 3, 4, 5 |

Confirmed by S1 (full list) and S4 (Metal-6 specifically). The engine value-validation test was
updated from `0..5` to `0..6` to match reality (see *Propagation*).

A second consistent design pattern: **every protocol's value-5 card has the same middle command,
"You discard 1 card."** (a discard cost paid for the big +5 value).

---

## The 72 cards

Format per card: **value** — `Top:` / `Middle:` / `Bottom:` (empty boxes omitted). All from **S1**
unless a card is tagged with another source.

### Spirit — FLIP, SHIFT, DRAW
- **0** — Middle: *Refresh. Draw 1 card.* · Bottom: *Skip your check cache phase.*
- **1** — Top: *You can play cards in any line.* · Middle: *Draw 2 cards.* · Bottom: *Start: Either discard 1 card or flip this card.* — **[S1+S2: rulebook Card Anatomy prints this card verbatim — exact match]**
- **2** — Middle: *You may flip 1 card.*
- **3** — Top: *After you draw cards: You may shift this card, even if this card is covered.*
- **4** — Middle: *Swap the positions of 2 of your protocols.*
- **5** — Middle: *You discard 1 card.*

### Death — DELETE, DRAW
- **0** — Middle: *Delete 1 card from each other line.*
- **1** — Top: *Start: You may draw 1 card. If you do, delete 1 other card, then delete this card.* — **[S1+S2: rulebook Rules section prints this verbatim — exact match]**
- **2** — Middle: *Delete all cards in 1 line with values of 1 or 2.*
- **3** — Middle: *Delete 1 face-down card.* — **[S1+S2: rulebook Rules section, exact match]**
- **4** — Middle: *Delete a card with a value of 0 or 1.*
- **5** — Middle: *You discard 1 card.*

### Fire — DISCARD FOR EFFECT
- **0** — Middle: *Flip 1 other card. Draw 2 cards.* · Bottom: *When this card would be covered: First, draw 1 card and flip 1 other card.*
- **1** — Middle: *Discard 1 card. If you do, delete 1 card.*
- **2** — Middle: *Discard 1 card. If you do, return 1 card.*
- **3** — Bottom: *End: You may discard 1 card. If you do, flip 1 card.*
- **4** — Middle: *Discard 1 or more cards. Draw the amount discarded plus 1.*
- **5** — Middle: *You discard 1 card.*

### Metal — PREVENT, DRAW, FLIP
- **0** — Top: *Your opponent's total value in this line is reduced by 2.* · Middle: *Flip 1 card.*
- **1** — Middle: *Draw 2 cards. Your opponent cannot compile next turn.* — **[S1+S3: BGG "Metal 1 clarification", exact match]**
- **2** — Top: *Your opponent cannot play cards face-down in this line.*
- **3** — Middle: *Draw 1 card. Delete all cards in 1 other line with 8 or more cards.*
- **5** — Middle: *You discard 1 card.*
- **6** — Top: *When this card would be covered or flipped: First, delete this card.* — **[S1+S4: corroborated by BGG/search]**

### Gravity — SHIFT, FLIP, DRAW
- **0** — Middle: *For every 2 cards in this line, play the top card of your deck face-down under this card.*
- **1** — Middle: *Draw 2 cards. Shift 1 card either to or from this line.*
- **2** — Middle: *Flip 1 card. Shift that card to this line.*
- **4** — Middle: *Shift 1 face-down card to this line.*
- **5** — Middle: *You discard 1 card.*
- **6** — Middle: *Your opponent plays the top card of their deck face-down in this line.*

### Life — FLIP, TOP DECK PLAY, DRAW
- **0** — Middle: *Play the top card of your deck face-down in each line where you have a card.* · Bottom: *When this card would be covered: First, delete this card.*
- **1** — Middle: *Flip 1 card. Flip 1 card.*
- **2** — Middle: *Draw 1 card. You may flip 1 face-down card.*
- **3** — Bottom: *When this card would be covered: First, play the top card of your deck face-down in another line.*
- **4** — Middle: *If this card is covering a card, draw 1 card.*
- **5** — Middle: *You discard 1 card.*

### Light — DRAW, FLIP, SHIFT
- **0** — Middle: *Flip 1 card. Draw cards equal to that card's value.*
- **1** — Bottom: *End: Draw 1 card.*
- **2** — Middle: *Draw 2 cards. Reveal 1 face-down card. You may shift or flip that card.*
- **3** — Middle: *Shift all face-down cards in this line to another line.*
- **4** — Middle: *Your opponent reveals their hand.*
- **5** — Middle: *You discard 1 card.*

### Plague — FORCED DISCARD, FLIP
- **0** — Middle: *Your opponent discards 1 card.* · Bottom: *Your opponent cannot play cards in this line.*
- **1** — Top: *After your opponent discards cards: Draw 1 card.* · Middle: *Your opponent discards 1 card.*
- **2** — Middle: *Discard 1 or more cards. Your opponent discards the amount of cards discarded plus 1.*
- **3** — Middle: *Flip each other face-up card.*
- **4** — Bottom: *End: Your opponent deletes 1 of their face-down cards. You may flip this card.*
- **5** — Middle: *You discard 1 card.*

### Darkness — DRAW, SHIFT, MANIPULATE
- **0** — Middle: *Draw 3 cards. Shift 1 of your opponent's covered cards.*
- **1** — Middle: *Flip 1 of your opponent's cards. You may shift that card.*
- **2** — Top: *All face-down cards in this stack have a value of 4.* · Middle: *You may flip 1 covered card in this line.*
- **3** — Middle: *Play 1 card face-down in another line.*
- **4** — Middle: *Shift 1 face-down card.*
- **5** — Middle: *You discard 1 card.*

### Water — RETURN, DRAW, FLIP
- **0** — Middle: *Flip 1 other card. Flip this card.*
- **1** — Middle: *Play the top card of your deck face-down in each other line.*
- **2** — Middle: *Draw 2 cards. Rearrange your protocols.*
- **3** — Middle: *Return all cards with a value of 2 in 1 line.*
- **4** — Middle: *Return 1 of your cards.*
- **5** — Middle: *You discard 1 card.*

### Psychic — DRAW, MANIPULATE, SHIFT
- **0** — Middle: *Draw 2 cards. Your opponent discards 2 cards, then reveals their hand.*
- **1** — Top: *Your opponent can only play cards face-down.* · Bottom: *Start: Flip this card.*
- **2** — Middle: *Your opponent discards 2 cards. Rearrange their protocols.*
- **3** — Middle: *Your opponent discards 1 card. Shift 1 of their cards.*
- **4** — Bottom: *End: You may return 1 of your opponent's cards. If you do, flip this card.*
- **5** — Middle: *You discard 1 card.*

### Speed — DRAW, PLAY, SHIFT
- **0** — Middle: *Play 1 card.*
- **1** — Top: *After you clear cache: Draw 1 card.* · Middle: *Draw 2 cards.*
- **2** — Top: *When this card would be deleted by compiling: Shift this card, even if this card is covered.*
- **3** — Middle: *Shift 1 of your other cards.* · Bottom: *End: You may shift 1 of your cards. If you do, flip this card.*
- **4** — Middle: *Shift 1 of your opponent's face-down cards.*
- **5** — Middle: *You discard 1 card.*

---

## Propagation into the engine

`app/src/engine/cards.ts` was rewritten so that **all 72 cards now carry the real published value and
the real box texts above** (no more invented stand-in text). The in-game **Card Codex** therefore now
shows the true Main 1 cards.

**Effect logic** is a separate matter from text. The current effect runtime
(`app/src/engine/effects.ts`) supports a fixed verb vocabulary: `draw`, self-`discard`, opponent
forced-`discard`, and single-**uncovered**-target `delete` / `flip` / `shift` / `return` (optionally
filtered to face-up / face-down), plus "discard 1 → payoff". Per the rulebook, effects target
**uncovered** cards by default, so single-target commands are executed faithfully.

The engine now wires each card to the **faithful subset** of its real text that the runtime can
express, and **drops** (never substitutes) the parts it cannot yet model. A card is flagged
`placeholder: false` only when its **entire** text is executed faithfully; otherwise `placeholder:
true` — which now means **"text & value are the real published data; effect logic is simplified
pending richer runtime primitives,"** not "invented stand-in."

**Faithful today (24 / 72):** every value-5 "You discard 1 card."; Spirit-2; Death-3; Fire-1/2/3;
Life-1/2; Light-1; Psychic-3; Speed-4; Darkness-4; Water-4. (Spirit-1's *passive* "play in any line"
and *middle* "draw 2" are faithful; its `Start:` aux is approximated, so the card is flagged.)

**Runtime primitives still missing** for the other 48 (a future **build**-stage task, out of scope
for this data pass):
- value modifiers (`Metal-0`, `Darkness-2` face-down = 4, `Apathy`-style);
- play-from-deck / play-from-hand as an effect (`Gravity-0/6`, `Life-0/3`, `Water-1`, `Speed-0`, `Darkness-3`);
- reactive triggers beyond `Start:`/`End:` — "When this card would be covered / flipped / deleted by compiling", "After you draw / delete / discard / clear cache" (`Fire-0`, `Life-0/3`, `Metal-6`, `Speed-1/2`, `Spirit-3`, `Plague-1`);
- lock-outs / state flags ("cannot compile next turn", "cannot play face-down", "can only play face-down") (`Metal-1/2`, `Psychic-1`, `Plague-0`);
- protocol rearrange/swap as an effect (`Spirit-4`, `Water-2`, `Psychic-2`);
- reveal hand (`Light-4`, `Psychic-0`); value/line-conditional multi-delete (`Death-0/2/4`, `Metal-3`); "covered"-card targeting (`Darkness-0/2`); refresh-as-effect & cache-skip (`Spirit-0`).

The exact per-card wiring + faithful/approx flag lives inline in `app/src/engine/cards.ts`.

---

## [VERIFY] checklist — resolved vs outstanding

| Item | Before | Now |
|------|--------|-----|
| 12 protocol names | ✅ correct (from rulebook) | ✅ unchanged |
| Per-protocol verb summaries | ✅ correct (from rulebook) | ✅ unchanged |
| **All 72 card values** | ❌ invented 0–5 spread | ✅ **RESOLVED** (S1; Gravity/Metal corrected to include a 6) |
| **All 72 card box texts** | ❌ invented stand-ins | ✅ **RESOLVED** (S1, 5/5 cross-checked against S2–S4) |
| `playAnyProtocol` passive placement | ⚠️ on placeholder Spirit-0 | ✅ moved to **Spirit-1** (its real home) |
| Faithful effect logic (24/72) | ❌ | ✅ implemented within current runtime |
| Faithful effect logic (other 48/72) | ❌ | ⏳ **OUTSTANDING — build-stage** (needs new runtime primitives, listed above). Text is real; effect simplified & flagged. |

### Still outstanding (and why)
1. **Official errata / FAQ (S5 "The Compile Codex").** Login-gated (Scribd) and BGG XML/web are
   auth-blocked from this environment, so any post-print errata could not be folded in. The base
   texts above are the printed cards. **Recommendation:** if a published errata doc becomes
   reachable, diff it against this file (likely candidates flagged by the community: Spirit-1).
2. **The 48 non-faithful effects** are an engine-capability gap, not a data gap — the *data* is
   resolved. Implementing them is the natural scope of a Compile **build** revision round (extend
   `types.ts`/`effects.ts`/`field.ts`/`game.ts` with the primitives listed above), deliberately
   **not** done in this data-sourcing pass.
3. **No second fully-independent 72-card transcription** was obtainable (BGG files/forums and the
   Codex are auth/login gated here). Confidence rests on S1's internal consistency + 5 exact
   cross-matches against the official rulebook and BGG. If higher assurance is wanted, photograph the
   physical cards and diff against this file.

---

## Provenance links
- Compile Card Database (S1): https://ryanascherr.github.io/compile/ (data: `https://raw.githubusercontent.com/ryanascherr/compile/main/script.js`)
- GTG rules PDF mirror (S2): https://gamers-hq.de/media/pdf/22/bb/2e/Compile_GamersHQ_Rules.pdf
- BGG "Metal 1 clarification" (S3): https://boardgamegeek.com/thread/3352854/metal-1-clarification
- BGG game page (S4): https://boardgamegeek.com/boardgame/406652/compile-main-1
- The Compile Codex (S5, gated): https://www.scribd.com/document/924488020/The-Compile-Codex-1
