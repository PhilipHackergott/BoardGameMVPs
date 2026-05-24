# MVP Spec — Magical Athlete

> Stage 3 (Specification), the *what*. Operator-run, 2026-05-21. Authoritative ruleset pinned from the
> official CMYK rulebook (`How-to-play-MAGICAL-ATHLETE.pdf`). Licensed adaptation (`ip.status: clear`):
> real title, art, and design. Companion: `04-build-plan.md`. Plan of record:
> `C:/Users/phili/.claude/plans/make-an-mvp-based-bright-metcalfe.md`.

## Pitch & target experience
A chaotic fantasy footrace you play on one device with friends. Draft a stable of absurd racers, send
one to the line each race, roll your die — and watch wacky, rule-breaking powers turn a simple track
into glorious mayhem. Race four times; most points wins. Nostalgic "tabletop toy" feel in 2.5D.

## Scope line (the single core loop the MVP delivers)
Local **hot-seat** play of a **full match: 4 races (Mild, Wild, Mild, Wild), 2–4 players** — snake
draft → each race reveal a racer, take dice turns with full power resolution, race ends when the 2nd
racer finishes → cumulative chip scoring → winner. No AI, no online (deferred).

## Rules to implement (from the rulebook — authoritative)

### Components (digital model)
- One **double-sided track**: **Mild Mile** (plain) and **Wild Wilds** (features). Flips between races.
- **36 racers**, each a token + a power. (MVP ships a curated initial roster, then expands — see
  build plan.)
- **Dice** (d6, one per active racer).
- **Point chips:** 4 **gold** (1st place, one per race, ascending value), 4 **silver** (2nd place,
  ascending), **bronze 1-point** and **bronze 3-point** chips (from stars/powers).

### Setup & draft
- Track Mild side up. Shuffle the racer deck.
- **Snake draft:** flip `2 × players` racer cards; snake-draft twice so each player ends with **4
  racers** (3–6 player rules). **2-player** uses the **double-racer variant**: each player drafts **8**
  racers and runs **2 racers per race** (line of 8, ABBA…; repeat). (Optional 3P double-racer variant
  exists.)
- Roll-off decides first pick / first turn (highest die; reroll ties).

### Race loop
1. Each race, every player simultaneously **reveals one racer** from their hand (each racer used once;
   later races are worth more, so saving strong racers matters). Tokens start on the **Start space**
   (Start counts as a space).
2. On your turn: **roll your die and move that many spaces — your "main move."** Many powers key off the
   *main move* specifically (vs. other movement). Then resolve triggered powers.
3. Turn passes **clockwise**. Continue until **two racers cross the finish line**: 1st across = 1st
   place, the instant the 2nd crosses, the **race ends immediately**.
4. **Powers:** "**can**" = optional (player chooses); everything else is **mandatory**. When several
   powers fire at once, resolve in order **Racetrack spaces → current player → other players
   (clockwise)**.

### Track features (Wild Wilds)
- **Arrow:** on stopping, move the shown amount in the arrow's direction (a separate move, never part of
  the main move).
- **Rock:** on stopping, you **trip**.
- **Star:** on stopping, take a **bronze 1-point** chip.

### Key concepts (engine must encode precisely)
- **Stopping on a space**, **sharing a space** (both stopped there; passing through doesn't count),
  **ahead/behind**, **alone**, **lead**, **last place**, **passing** (start behind, end ahead in one
  move).
- **Trip:** skip your next main move (token face-down; recover next turn). Tripping doesn't end the
  current move.
- **Warp:** token moves without "moving" (doesn't trigger movement-based powers/passing).
- **Move 0 / rerolls don't count as moving.** Timed powers ("before my main move") fire **once per
  turn**. Powers deactivate once a racer wins/leaves a race. **Infinite loops:** resolve once, then
  stop (but legitimately repeatable interactions, e.g. Scoocher↔Suckerfish, may repeat).

### After each race & final scoring
- 1st takes the top **gold** chip, 2nd the top **silver** (values ascend by race). Remove that race's
  racers; flip the track. Farthest-behind/first-eliminated player goes first next race.
- After race 4, **sum all chips → most points wins; ties are shared.**

### Numbers to confirm against physical components / CMYK assets (parameterized, flagged)
The rulebook *text* does not state: exact **track length** (space count) per side, exact **feature
positions** on the Wild side, or the printed **point values** of the gold/silver chips. These are
modeled as **config data** with clearly-marked placeholder values and must be confirmed from the board
art / component values before the build gate. The engine reads them from config so corrections are
one-line.

## Modes
- **Hot-seat**, 2–4 players (one device, pass-and-play). The only MVP mode. **No AI; no online.**
- 2-player (and optional 3-player) **double-racer** variant included (build milestone 5).

## Screens & flow
- **Main menu:** player count (2–4), optional race-schedule override (default M/W/M/W), seed (blank =
  random), Start.
- **Draft:** the face-up racer line; snake-draft picks; each player's drafted hand; racer cards show
  name, art, and power text.
- **Race screen (2.5D):** the dimetric track with standee racers; HUD = current player/racer, race # and
  its chip values, each racer's position/lead order, **Roll** button; **power prompts** for optional
  powers (use/skip); **pass-device** hand-off between human turns; running point totals.
- **After-race:** who placed 1st/2nd and chips awarded; "next race" with track flip.
- **End:** final standings + winner (or shared tie); New Match.

## Player states & feedback
- Always show whose turn/racer it is, race number + that race's chip values, and live point totals.
- On roll: animate the main move (hop per space); show triggered powers resolving in order with brief
  labels; show trips (topple), warps (slide/fade), chip gains.
- Optional powers prompt the active human with a clear use/skip choice and a one-line effect summary.
- On race end: clearly announce 1st/2nd and chips.

## Art & feel direction
- Licensed CMYK art: character illustrations as **2.5D standees** with shadows; the real board art,
  chips, and logo. Loaded via an **asset manifest**; **placeholders** until CMYK's official pack lands.
- Accessibility floor (per stack conventions): colorblind-safe player/turn indicators (not color
  alone), keyboard-operable menus and Roll/confirm, scalable text.

## Acceptance criteria (each testable — becomes the playtest checklist)
- [ ] New Match drafts correctly for 2/3/4 players (snake order; 4 racers each, or 8 in 2P double-racer); same seed → identical draft order.
- [ ] Each race, players reveal one racer; a racer can never be used in two races.
- [ ] Rolling moves the active racer exactly that many spaces along the current track (Start is space 0).
- [ ] The race ends the instant the 2nd racer crosses the finish; 1st/2nd are recorded correctly.
- [ ] Wild features fire on stopping: arrow shunts, rock trips, star grants a bronze 1-pt chip.
- [ ] Trip skips exactly the next main move; warp moves without triggering movement powers; "move 0" never triggers movement powers.
- [ ] When multiple powers fire, they resolve in order: racetrack spaces → current player → others clockwise; timed powers fire once/turn; infinite loops resolve once and stop.
- [ ] Every implemented racer power matches its rulebook effect (one passing unit test per power).
- [ ] Gold/silver chips are awarded per race with ascending values; final winner = most total points; ties shared.
- [ ] A full 4-race match always terminates and produces a winner; same {config, seed, action-log} reproduces the identical result.
- [ ] The full hot-seat loop is operable via keyboard; turn/player identity is not conveyed by color alone.

## Out of scope (MVP)
AI opponents, online multiplayer, accounts/profiles, save/persistence, sound beyond basic cues, settings
depth, expansions beyond the base 36 racers, monetization, and desktop/mobile *wrapping* (web build
first; Capacitor/Tauri later). Official art beyond the manifest hookup is a content task, not code.
