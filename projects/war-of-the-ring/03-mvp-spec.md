# MVP Spec — War of the Ring

> Stage 3 (Specification), the *what*. Operator-run, 2026-05-22.
> **Real-IP build, non-distributed** (per the recorded `ip` decision): the app uses the real
> *War of the Ring* / Tolkien Middle-earth names, characters, and lore directly. **Do not
> distribute.** Mechanics target the **Second Edition base game** (no expansions).
> Rules numbers below were verified from public rules sources (Ares/Dized official rules,
> UltraBoardGames). Where the *text* of a value isn't published, it's parameterized in `config`
> and flagged **`CONFIRM`** (read off the components) rather than fabricated — see the data tables.

---

## ⚑ MVP decision table (digital-medium & scope choices — the gate's decision sheet)

These are *adaptation* decisions, not rule changes. Build against the defaults; each is one edit away from revision.

| # | Decision | Default | Alternative |
|---|----------|---------|-------------|
| D1 | Player mode | **Local hot-seat, 2 players** (engine-enforced hidden info) | vs-AI / online (deferred) |
| D2 | Edition / content | **2nd ed. base game only** | + expansions (post-v1) |
| D3 | Event-card library | **All 96 cards in the MVP** — full deck composition (24×4) and the engine support the complete set; card text sourced online (see **Card sourcing**). Any card whose full text can't be reliably sourced ships as a **flagged, data-shaped placeholder** (correct slot/deck/die, inert or best-effort effect) — never fabricated. | Framework + subset only (rejected by operator — full capture wanted) |
| D4 | Hidden-info handoff | **Blur-screen "pass the device" overlay** between turns when the Shadow must not see Fellowship data | PIN gate; or skip (hot-seat honor) |
| D5 | Undo | **Undo allowed before a die roll / Hunt draw is revealed; locked after** | Full undo (breaks integrity); no undo |
| D6 | Combat-card play | The combat use of every card is defined alongside its event use (same data record); placeholder cards carry flagged placeholder combat text | Defer all combat cards |
| D7 | Map source of truth | A **data table transcribed from the board** (regions, edges, terrain, settlements, VPs) | Hard-code per screen (rejected — not testable) |
| D8 | First-playable victory path | **Military victory first** (armies/political/combat loop), then layer Fellowship/Hunt/Ring | Build Ring path first |
| D9 | Map/unit render fidelity | **2.5D standees** on a perspective Middle-earth map (PixiJS), following the Magical Athlete / Cull the Crown patterns; **real design attention to the stacking readout** (scales 1→10 units + Leaders/Nazgûl/Characters/Fellowship). | Flat 2D tokens (lower wow); true 3D / Three.js (renderer swap off-stack, weaker stack legibility) |

---

## Pitch & target experience
The full *War of the Ring* on one screen, with the table-keeping done for you: the Shadow grinds
west while the Fellowship slips east, every Action die a hard choice between war and the Ring. The
machine is the perfect referee — it hides the Fellowship honestly, resolves the Hunt and every
siege exactly, and never loses a token. A faithful, rules-complete digital Middle-earth you can
save and resume.

## Scope line (the single core experience the MVP delivers)
**One complete two-player hot-seat game of the base ruleset, played to any of the four victory
conditions**, with all five subsystems present and rules-enforced: Action Dice, Armies & Combat
(field + siege), the Political track, the Fellowship & the Hunt (incl. Mordor), and Event Cards.
Everything else — AI, online, accounts, expansions, the full 96-card art/text polish — is out.

## Theme & assets
Real Middle-earth theme used directly (non-distributed prototype): real region names, nations,
characters, and the *War of the Ring* iconography. Art starts as **placeholder standee sprites + a
schematic map** (the build contract is correctness + legibility first; see Visual identity) and can
be enriched later since this is for the operator's own play only.

---

## Rules to implement (verified numbers carried in)

### Sides & components
- Two asymmetric sides: **Free Peoples (FP)** and **Shadow**.
- **Unit types:** Regular units, Elite units, **Leaders** (FP) / **Nazgûl** (Shadow), and
  **Characters** (Companions for FP, Minions for Shadow). Characters carry a **Level** and a
  **Leadership** value and special abilities.
- **Nations** — FP: **The North, Rohan, Gondor, the Elves, the Dwarves.** Shadow: **Sauron
  (Mordor), Isengard, Southrons & Easterlings.**
- **Settlements:** Town (0 VP), City (1 VP), Stronghold (2 VP).
- Map = a fixed graph of regions (terrain, settlement, nation, VP) — see `CONFIRM: map`.

### Turn structure — 6 phases (the engine's top-level state machine)
1. **Recover Action Dice & Draw Event Cards.** Reclaim all used dice. **Draw:** on **turn 1**, each
   player draws **one card from *each* of their two decks** (2 cards); on **later turns**, each
   player draws **one card from one deck of their choice** (1 card). **Hand limit 6** (2-player) —
   draw first, then discard down to 6.
2. **Fellowship Phase.** FP may: **declare** the Fellowship's position (place its figure at its
   current Progress distance from its last known position); **heal 1 Corruption** if declared in an
   FP-controlled City/Stronghold; **change the Guide**.
3. **Hunt Allocation.** Shadow may place Action dice into the **Hunt Box**. Minimum **1** die if FP
   retrieved dice from the box last turn; **maximum = number of Companions currently in the
   Fellowship.**
4. **Action Roll.** Both roll their dice pools. **Shadow "Eye" results are moved to the Hunt Box**
   automatically (not spendable).
5. **Action Resolution.** Players alternate spending **one die at a time, FP first**, until both
   have used/forfeited all dice.
6. **Victory Check.** Check **Military** victory (see Victory). (Ring victories trigger immediately
   when reached, not only here.)

### Action Dice
- **Pools:** FP **4** dice; Shadow **7** dice. FP gains **+1 when Aragorn (crowned Heir) enters**
  and **+1 when Gandalf the White enters** (max **6**). Shadow gains **+1 each** for **Saruman, the
  Witch-king, the Mouth of Sauron** (max **10**).
- **Die faces (6 each)** — `CONFIRM: dieFaces` (canonical layout below):
  - **FP die:** `Character, Character, Army&Muster, Muster, Event, Will of the West`. (FP has **two**
    Character faces and **no pure Army face** — Army appears only on the combined Army&Muster face.)
  - **Shadow die:** `Character, Army, Army&Muster, Muster, Event, Eye`.
- **What each result does when spent** (one die = one action):
  - **Character** — move/attack with a Leader-led army; move the Fellowship one step; move
    Companions/Minions; separate a Companion; play a Character-type event card.
  - **Army** — move up to **two** armies, or move-and-attack.
  - **Muster** — recruit reinforcements (only for **At War** nations), advance the Political track,
    bring a Character/Minion into play, or play a Muster-type event card.
  - **Army&Muster (combined)** — usable as **either** an Army **or** a Muster action.
  - **Event** — draw an event card, or play one.
  - **Will of the West** (FP) — **wild** (use as any other result); the **only** way to crown
    **Aragorn** or bring **Gandalf the White** into play.
  - **Eye** (Shadow) — never spent; auto-added to the Hunt Box in phase 4.

### The Fellowship & the Hunt (hidden-information core)
- **Hidden Progress.** The Fellowship's real position is a hidden **Progress counter**, known only
  to FP. A **Character** die can move the Fellowship one Progress step. The map figure shows only
  the **last declared** location; Progress = distance from it.
- **Guide.** Highest-level Companion by default (FP may choose among equal-level); grants an
  ability. Gollum becomes Guide when the Fellowship has no Companions.
- **Hunt roll (when FP moves the Fellowship and is not yet in Mordor):**
  - **Hunt Level** = number of Shadow dice in the **Hunt Box** (allocated + Eye results). Shadow
    rolls that many **combat dice, max 5**.
  - **Success on 6.** **+1 to every die** for each **FP die already in the Hunt Box** this turn
    (i.e. each prior Fellowship move this turn — so a 2nd move succeeds on 5–6, etc.).
  - **Re-rolls:** after the roll, re-roll **one failed die for each** of these present in the
    Fellowship's *region*: a **Shadow Stronghold**, **Shadow Army units**, **Nazgûl**.
  - On **≥1 success**, draw **one Hunt tile**.
- **Hunt tiles** (`CONFIRM: huntPool`): **16 standard (beige)** tiles, values **0–3** = Corruption
  damage; some bear a **Reveal** icon (Fellowship is revealed after damage); **Eye** tiles deal
  damage **= number of successes** rolled. **Special** tiles (blue = Fellowship, red = Shadow) are
  set aside and enter only via Event cards. When the pool empties, return **standard** tiles only.
- **Applying damage:** add Hunt damage to **Corruption**, unless absorbed/mitigated by revealing a
  Companion or a Guide/card ability. **Reveal** → place the figure on the map at Progress distance.
- **Corruption track 0–12.** **12 ⇒ Shadow wins immediately.** Heal 1 by declaring in an FP
  City/Stronghold (phase 2) or via specific effects.
- **The Mordor Track (5 steps).** The Fellowship enters Mordor when the Ring-bearers are at
  **Minas Morgul or Morannon** (no declaration needed). Place on Mordor step **0**. In Mordor:
  - The Fellowship Progress counter no longer advances (it now only marks Hidden/Revealed).
  - Each Mordor **move attempt auto-draws one Hunt tile** (no Hunt roll); the Fellowship advances
    one step **unless the tile shows a Stop** icon.
  - If FP makes **no move/hide attempt during a turn**, **+1 Corruption** automatically.
  - Completing **all 5 Mordor steps** (Crack of Doom) with **Corruption < 12 ⇒ FP wins.**

### Military movement & combat
- **Stacking limit:** max **10 Army units** per region (Leaders/Characters don't count toward it).
- **Movement:** along the region graph; **Army** die moves up to two armies, **Character** die
  moves a Leader-led army. Free movement/attack into enemy territory generally requires the moving
  nation to be **At War** (see Political).
- **Field combat:**
  - Each side's **Combat Strength** = number of participating units → rolls that many **combat dice,
    max 5**. **Hit on 5–6.**
  - **Leadership** (count of Leaders/Nazgûl + Characters' Leadership) lets a side **re-roll up to
    that many failed dice, max 5**.
  - Each round, either side may play **one combat card** (the combat use of an event card).
  - Rounds repeat until the attacker stops, the defender retreats, or a side is wiped.
- **Sieges:**
  - A defender in a Stronghold may **retreat into siege** instead of fighting in the field.
  - In a siege round the **attacker hits only on 6**, the **defender on 5–6**.
  - A besieged Stronghold holds **max 5 Army units** (+ any number of Leaders).
  - A siege battle lasts **one round** unless the attacker **reduces one participating Elite to a
    Regular** to fight another round.
- **Settlement control** updates Victory Points (below).

### Political track
- Each nation has a Political counter advancing toward a final **"At War"** step.
- **FP nations start Passive (gray) except the Elves**, which start Active. A **Passive** nation can
  never reach **At War**.
- **Activate** an FP nation (flip to Active) when: an enemy Army enters one of its regions; an Army
  containing its units is attacked; or the **Fellowship is declared in its City/Stronghold**.
- **Advance** the track via a **Muster** die, certain **Event** cards, or **automatically +1** when
  an Army with that nation's units is **attacked**, or one of its **Settlements is captured**.
- A nation must be **At War** to **recruit** (Muster) and to move/attack freely into non-friendly
  regions. (Step count to "At War" = `CONFIRM: politicalTrack`.)

### Event & Character cards
- **Four decks, 24 cards each (96 total):** FP **Strategy** + FP **Character**; Shadow **Strategy**
  + Shadow **Character**. Strategy ≈ military/political; Character ≈ Fellowship/Companions/Minions.
- Drawn in phase 1 and via **Event** dice; played via the die type the card requires. Most cards
  carry **both** an Event effect and a **Combat card** use.
- **All 96 in the MVP:** the full deck composition (24 per deck) ships and the engine plays any
  defined card. Cards are **data** (id, deck, die-to-play, event effect, combat effect, conditions,
  scripted hooks). Card text is sourced online (see **Card sourcing**). Any card whose full text
  can't be reliably sourced ships as a **flagged, data-shaped placeholder** (correct deck/slot/die,
  inert or best-effort effect) — never fabricated, and tracked toward completion. The deck always
  contains all 96 slots.

### Card sourcing (decision D1 — coverage finding)
Full text for the 96 base-game cards **is available online** and mutually corroborated across
sources, so all-96 is a bounded transcription task, not a coverage gap:
- **warofthering.eu "Master Events" PDFs** (`fp_master_events.pdf`, `sa_master_events.pdf`) — the
  community's authoritative complete card text.
- **BGG "War of the Ring: Second Edition — Base Game Card Reference"** (filepage) — full card list.
- **Steam Workshop full-art card mods** + Dized's card-layout reference (corroboration).

*Extraction caveat:* the Master PDFs are **image-based** (need OCR / `pdftoppm`+tesseract, or
reading in a browser) and BGG blocks automated fetch — so transcription is a deliberate build-time
data task. The **placeholder policy** (above) guarantees the decks are always complete (96 slots,
correct deck/die) even if a few cards' exact text lags; placeholders are flagged and never invented.

### Characters
- **FP Companions** (start in the Fellowship): **Gandalf the Grey, Strider (Aragorn), Boromir,
  Legolas, Gimli, Meriadoc, Peregrin** (+ the **Ring-bearers**).
- **Upgrades** (via **Will of the West**): **Aragorn — Heir to Isildur (crowned)**, **Gandalf the
  White** (each also grants +1 FP Action die).
- **Shadow Minions** (via **Muster**, conditions apply): **Saruman, the Witch-king, the Mouth of
  Sauron** (each grants +1 Shadow die).
- Stats per character (`CONFIRM: characters`): Level, Leadership, abilities, entry conditions.

### Victory conditions
1. **Military (checked in phase 6; ends the game immediately when met):**
   - **Shadow wins** controlling FP Cities/Strongholds worth **≥ 10 VP**.
   - **Free Peoples win** controlling Shadow Cities/Strongholds worth **≥ 4 VP**.
   - **City = 1 VP, Stronghold = 2 VP.** Military victory takes precedence — it's why the Shadow
     races *both* the map and the Hunt.
2. **Ring (triggers immediately when reached):**
   - **Shadow wins** if **Corruption reaches 12**.
   - **Free Peoples win** if the Ring-bearers reach the **Crack of Doom** (Mordor step 5) with
     **Corruption < 12**.

### Determinism
Every game is reconstructable from `{config, seed, action-log}`. All randomness (Action-die rolls,
combat dice, Hunt rolls, Hunt-tile draws, deck shuffles) draws from a single injected seeded PRNG.
This powers replay, debugging, the hidden-info firewall, and the playtest stage.

---

## `config` data tables — verified vs. `CONFIRM`

The engine reads these from data, never hard-codes them. **Verified** = sourced this stage;
**`CONFIRM`** = transcribe/verify off the physical components before relying on it (a wrong value
is a one-line fix, per the Magical Athlete config-CONFIRM practice).

| Table | Status | Value / note |
|-------|--------|--------------|
| `dicePools` | **Verified** | FP 4 (+1 Aragorn, +1 Gandalf White, max 6); Shadow 7 (+1 each Saruman/Witch-king/Mouth, max 10). |
| `dieFaces` | **Verified (layout)** | FP `[Char,Char,Army&Muster,Muster,Event,Will]`; Shadow `[Char,Army,Army&Muster,Muster,Event,Eye]`. |
| `combat` | **Verified** | field hit 5–6; siege attacker 6 / defender 5; max 5 combat dice; leadership re-roll ≤ leadership, max 5; siege = 1 round unless reduce 1 Elite→Regular; besieged stronghold cap 5 units; stacking 10. |
| `hunt` | **Verified** | Hunt Level = dice in Hunt Box, roll max 5, success 6, +1/FP-die-in-box; re-roll 1 per {Shadow stronghold, Shadow army, Nazgûl} in region; draw 1 tile on success. |
| `huntPool` | **CONFIRM (counts)** | 16 standard tiles, values 0–3, subset with Reveal icon, plus Eye tiles (damage = successes); blue/red specials via events. *Exact per-value counts to be read off tiles.* |
| `corruption` | **Verified** | track 0–12; 12 ⇒ Shadow win. |
| `mordorTrack` | **Verified** | 5 steps; enter at Minas Morgul/Morannon → step 0; auto-draw 1 tile/move, advance unless Stop; +1 Corruption if no attempt/turn; step 5 + <12 ⇒ FP win. |
| `victory` | **Verified** | Shadow 10 VP / FP 4 VP; City 1 / Stronghold 2. |
| `decks` | **Verified (counts)** | 4 decks × 24 = 96; turn-1 draw 1/each deck, later 1/chosen deck; hand limit 6, discard after draw. |
| `cards` | **Required: all 96; text CONFIRM** | Deck composition (24×4) is fixed and built. Per-card text sourced from warofthering.eu Master Events PDFs + BGG Base-Game Card Reference + full-art mods (see Card sourcing). Unsourceable cards = flagged placeholders, never fabricated. |
| `politicalTrack` | **CONFIRM (step count)** | FP Passive-except-Elves; activation + advance triggers verified; *number of steps to At War to be read off the board.* |
| `map` | **CONFIRM (data)** | full region graph (regions, adjacencies, terrain, settlement type, nation, VP) — transcribe from the board. |
| `setup` | **CONFIRM (data)** | starting unit placement, deck assignment, Fellowship in Rivendell (Guide = Gandalf the Grey, Corruption 0) — transcribe from rulebook setup. |

---

## Modes
- **Hot-seat** (two humans, one device) — the only MVP mode.
- **vs-AI** — **out of MVP**, but the engine's public API (`legalActions` / `apply` / `view`) is
  built to **accept an AI driver with no rules changes** (the headless `simulation` harness is
  exactly what an AI would drive). A real follow-on project (asymmetric goals + hidden info); not built now.
- **Online async** — deferred (the information firewall is built engine-side now so it's cheap to add later).

## Screens & flow
- **Title / New Game:** start; optional seed field (blank = random); pick the human-vs-human seat labels.
- **Game screen:**
  - Center: the **region map** (Pixi) with army tokens, the Fellowship figure (last-known), the
    Hunt Box, and tracks (Political per nation, Corruption, Mordor, VP).
  - HUD: current **phase**, whose turn, each side's **Action dice tray** (rolled faces, spent/unspent).
  - Panels: **FP-private Fellowship panel** (true Progress, Guide, Companions, Corruption) — shown
    only to FP; **hands & decks**; **reinforcement pools**; **event log / replay scrubber**.
  - Combat opens a **resolver modal** (assembles dice, leadership re-rolls, card play, step-by-step log).
- **End screen:** which victory condition fired, for whom, with the deciding state shown; New Game.

## Hidden-information handling (hot-seat)
- The engine exposes `view(state, asSide)`; the Shadow view **never** includes Fellowship Progress,
  Guide, or hidden Companion/Corruption detail.
- A **blur-screen handoff overlay** (D4) gates the transition when control passes and the incoming
  player must not see the other's private panel.

## Accessibility (factory floor)
- Keyboard-operable menus and turn flow; **colorblind-safe** faction/unit encoding (shape + label,
  not color alone); scalable text. Dice/Hunt outcomes always shown as text, not color/icon only.

## Visual identity (the build's visual target — not "polish later")
- **Units & stacking (2.5D standees) — the headline render task:** units render as **2.5D standee
  sprites** on a perspective-tilted Middle-earth map (PixiJS), following the Magical Athlete
  `render/board.ts` standee pattern and Cull the Crown's 2.5D pointer-tilt. The hard problem is
  **stacking**: a region can hold up to **10 units plus Leaders/Nazgûl/Characters and the
  Fellowship**, and literal per-unit miniatures don't read. The readout must **scale gracefully**:
  - **1–3 units:** individual standees, fanned.
  - **4–10 units:** a representative standee cluster (depth-sorted) + a **composition/strength
    badge** (e.g. `4×Reg 2×Eli · ⚔7 · Ldr 3`) rather than 10 discrete figures.
  - **Leaders/Nazgûl** as distinct standee silhouettes; **named Characters** (Companions/Minions)
    as portrait-marker overlays pinned to the region; the **Fellowship** as its own clearly-distinct
    marker (last-known position).
  - Selection/hover **expands** a region into a full unit list (the authoritative composition).
  Prototype this at **max density first** and screenshot-test it (the visual-playtest pattern).
- **Mood/reference:** a lived-in war map of Middle-earth — parchment-and-ink cartography, candle-lit
  council-table feel; somber, epic, legible. Free Peoples cool blues/silvers; Shadow reds/blacks.
- **Living background:** a subtly animated map backdrop (drifting fog over the map edges, an ember
  glow toward Mordor that intensifies as Corruption rises) — per `knowledge/playbooks/visual-first-try.md`,
  the themed living background is the #1 "intentional, not flat" win. Reuse the `fx/` kit from
  Cull the Crown (springs, particles, trauma shake) for dice/combat beats.
- **Typography:** a display face for headings (epic/serif), a clean readable sans for HUD/numbers.
- **Motion / game-feel:** dice **roll** and settle; Hunt tiles **flip** with a reveal beat;
  combat hits **shake**/spark; **outcomes are beats, not cuts** — a Continue/▶ gate shows what
  changed (settlement captured, Corruption gained, nation goes to War) rather than silently jumping state.
- **Menu/end framing:** title over the map with the Ring motif; end screen states the victory path
  taken and the final board.

---

## Acceptance criteria (each testable — becomes the playtest checklist)
- [ ] New Game builds the full board from `config` + `seed`; same seed ⇒ identical setup; FP 4 dice / Shadow 7.
- [ ] The 6 phases run in order; phase 1 draws 1/each-deck on turn 1 and 1/chosen-deck after; hand discards to 6.
- [ ] Eye results are moved to the Hunt Box in phase 4 and cannot be spent.
- [ ] Players alternate one die at a time, FP first; each die maps to its legal action set; illegal uses are blocked with a reason.
- [ ] Army die moves up to two armies; Character die moves a Leader-led army or the Fellowship.
- [ ] Field combat: ≤5 dice per side, hit on 5–6, leadership re-rolls ≤ leadership (≤5); a combat card resolves in a round.
- [ ] Siege: attacker hits only on 6, defender on 5–6; stronghold caps at 5 units; one round unless an Elite is reduced.
- [ ] Stacking never exceeds 10 Army units in a region.
- [ ] Political: FP nations start Passive (except Elves); activation + advance triggers fire; only At-War nations may Muster reinforcements.
- [ ] Fellowship Progress is hidden from the Shadow view; declaring places the figure at Progress distance and (in an FP city/stronghold) heals 1 Corruption.
- [ ] Hunt roll uses Hunt-Box count (≤5 dice), success on 6, +1/FP-die-in-box, correct re-rolls; a success draws a tile; tile value adds Corruption; Reveal reveals; Eye = #successes.
- [ ] Mordor: entering at Minas Morgul/Morannon places step 0; each move auto-draws a tile and advances unless Stop; idle turn adds 1 Corruption.
- [ ] Corruption 12 ⇒ Shadow win immediately; Crack of Doom (step 5) with <12 ⇒ FP win immediately.
- [ ] Military check: Shadow ≥10 VP of FP settlements ⇒ Shadow win; FP ≥4 VP of Shadow settlements ⇒ FP win; City 1 / Stronghold 2.
- [ ] A full game is reconstructable from `{config, seed, action-log}` (replay produces the identical end state).
- [ ] All 4 decks contain 24 card slots each (96 total); placeholder cards are clearly flagged and inert/best-effort; no fabricated text ships.
- [ ] The 2.5D standee map renders a single readable region stack from 1 unit up to a full 10-unit stack, with a composition/strength/leadership readout and distinct named-character / Nazgûl / Fellowship overlays.
- [ ] The full loop is keyboard-operable; faction/unit identity does not rely on color alone.

## Out of scope (MVP) — deferred, not removed
- **AI opponent** and **online** play; accounts/profiles; cloud save.
- **Expansions** (*Lords/Warriors/Kings of Middle-earth*), the 3–4 player **multiplayer mode**.
- Event cards are now **in scope — all 96** (see Card sourcing). Only **final card art** is deferred;
  the mechanical text ships, with flagged placeholders where a card's text can't yet be sourced.
- Full audio; rich animation beyond the specified game-feel beats; tutorial/onboarding (audience is
  rules-literate, D-table assumed).
- Desktop/mobile **wrapping** (web only first; codebase stays wrap-ready).
