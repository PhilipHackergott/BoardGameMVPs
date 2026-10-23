# Game Design Document — Food Chain Magnate

> The **design bible** — the *design language*, distinct from `04-build-plan.md` (engineering) and
> `03-mvp-spec.md` (rules/scope). This is what keeps every screen feeling like one game and tells the
> build stage *how it should look, read, and feel* before a line of UI is written. Its tokens are
> implemented concretely in **`concept/concept.css`** and rendered in the **`concept/` mockups**; at
> build time the distilled, checklist form of this doc becomes `art-direction.md`
> (per `docs/stack-and-conventions.md` + `knowledge/playbooks/target-state.md`).

---

## 1. Design pillars (what this game must evoke)

Five pillars. Every design decision is checked against them.

1. **"The org chart IS the engine."** The company tower is the hero object — the thing you build, read,
   and feel proud of. The UI must make assembling and re-slotting your hierarchy tactile and legible,
   not a spreadsheet. *Feeling: an ambitious executive sketching their empire on a napkin.*
2. **Deadpan corporate satire, 1950s boom.** Clean mid-century **infographic** — confident, optimistic
   advertising design with a knowing wink (this is a game about ruthlessly bankrupting your neighbors
   with cheaper burgers). Never grimdark, never cartoonish-cute. *Feeling: a glossy 1955 franchise
   brochure that's secretly cut-throat.*
3. **The math is visible, the friction is gone.** FCM's brutal bookkeeping (Dinnertime distance/price,
   payday, milestones) is the computer's job — but we **show the reasoning**, never a black box.
   Legibility of *why* is a feature. *Feeling: relief + mastery — "I can finally see the whole board."*
4. **Tense, luck-free competition.** No dice, no cards-of-fate. Every loss is your decision. The UI must
   surface the contested resources (the job market, the map, the milestone race, the bank clock) so the
   pressure is *felt at a glance*. *Feeling: a chess clock, not a slot machine.*
5. **Readable under load.** A 4-company late game is dense. The design's hardest job is **the glance
   test**: whose turn, what phase, who's winning, what's contested — answerable in <2 seconds without
   reading paragraphs. Density is managed by hierarchy, color, and progressive disclosure, never by
   hiding the truth.

**Readability targets (testable):**
- Identify the **current phase + whose turn** in <1s, from across the room.
- Read a **region's full demand + which chain will win it** in <3s with the overlay on.
- Read your **org chart's legality + total salary** in <3s.
- Tell **who's leading** (cash) and **how close the game is to ending** (bank clock) at any moment, always on screen.
- **Color is never the only signal** — every state also carries a shape, icon, or label (colorblind floor).

---

## 2. Visual identity / design system

### 2.1 Palette (tokens — implemented as CSS custom properties in `concept/concept.css`)
A 1950s diner-and-boardroom palette: warm paper, chrome, and three "sign" accents.

| Token | Hex | Role |
|-------|-----|------|
| `--cream` | `#F4E9D0` | primary background (menu paper / board parchment) |
| `--cream-2` | `#EADDBF` | panel fill, raised paper |
| `--ink` | `#2B2118` | primary text (warm near-black) |
| `--ink-soft` | `#6B5E4C` | secondary text, captions |
| `--chrome` | `#C2C7CC` / `--chrome-dark` `#8A9298` | borders, rails, bezels (mid-century metal) |
| `--turquoise` | `#1FAE9C` | primary accent / "GO" / positive / signage |
| `--cherry` | `#D6342C` | alert / cherry-red sign / "STOP" / cherry accent |
| `--mustard` | `#E8B23A` | highlight / coins / milestone gold |
| `--navy` | `#1F3A4D` | deep contrast, headers, the night-sky of the menu |

**Company accents (seats 1–4, colorblind-safe + paired with a shape/crest):**
`--co-cherry #D6342C` (◆) · `--co-turquoise #1FAE9C` (●) · `--co-mustard #E8B23A` (▲) · `--co-violet
#7A5C9E` (■). Each company also gets a **crest glyph**, so identity never rests on hue alone.

**Product colors (consistent everywhere — board, cards, demand, Dinnertime):**
burger `--burger #B5651D` (sesame-brown), pizza `--pizza #C8472B` (tomato-red), soft drink
`--soda #3E7CB1` (blue), lemonade `--lemon #E8C53A` (yellow), beer `--beer #C68A2E` (amber). Each also
has a distinct **glyph**.

### 2.2 Typography
A three-voice system, all free/system or open-license (zero-asset):
- **Signage display** — a heavy condensed grotesque (`Anton` / fallback `Oswald`, `Impact`): big
  headings, the phase banner, milestone names, menu titles. Evokes roadside signage and ad headlines.
- **Logotype script** — a friendly retro script (`Pacifico` / cursive fallback) used **only** for the
  brand wordmark and a few flourish moments (the diner "OPEN" feel). Used sparingly — it's seasoning.
- **Body / data** — a clean humanist sans (`Inter` / system stack) for all running text, labels, and
  tooltips. **Tabular numerals** for money/scores.
- **Ledger mono** — a monospace (`Roboto Mono` / `ui-monospace`) for **money columns, the bank clock,
  payday tallies, and Dinnertime math** — reinforces the "accounting made trivial" pillar.

Type scale (rem): 0.75 / 0.875 / 1 / 1.25 / 1.5 / 2 / 3. Display weights heavy; body 400/600.

### 2.3 Iconography
**Flat, bold, badge-like, single-weight infographic** — like a 1950s instructional diagram. Built as
**code-drawn SVG**, never illustration. Rules: 2px stroke at base size, filled silhouettes for the
core nouns (burger, pizza, cup, billboard, house, employee bust), a consistent 24px grid. Each
employee **track** has a signature glyph; each **product** has a glyph + color; each **milestone** is a
stamped seal. Icons must read at 16px (HUD) and 48px (cards).

### 2.4 Spacing, grid & elevation
- **Spacing scale (4px base):** 4 / 8 / 12 / 16 / 24 / 32 / 48 / 64.
- **Radii:** 4px (chips/badges), 8px (cards/buttons), 14px (panels). Cards feel like printed stock.
- **Elevation = hard mid-century shadow**, not soft blur: a crisp offset drop (`3px 3px 0` ink at 12%)
  + a thin chrome stroke. Modals get a heavier offset. This gives the "printed card / enamel sign"
  look and keeps edges sharp (matches the "clean infographic" pillar).
- **Board grid:** a faint blueprint grid under the plat-map; tiles snap to it.

### 2.5 Motion language
Purposeful, springy, never floaty. (Built on the reused Cull-the-Crown `fx/` kit.)
- **Card slotting:** a short spring + a soft "thunk" settle when a card drops into an org slot.
- **Number-go-up:** money **counts up** digit-by-digit at Dinnertime; the company's cash chip pulses
  mustard. The single most important "feel" beat.
- **Milestone claim:** a **rubber-stamp** scale-down + ink-spatter particle + a locked sheen.
- **Marketing plant:** a billboard/sign **drops in** with a bounce; its footprint **blooms** outward once.
- **Bank clock:** a steady drain; a **pulse + desaturate** as it nears each break (tension cue).
- **Dinnertime delivery:** a dashed route **draws** from restaurant to house; the house "lights up" when served.
- **Reduce-motion:** all of the above degrade to instant state changes + a static highlight.

---

## 3. Component design language

The cohesion anchors. Each is built once and reused; the concept files render them.

- **Employee card (`.emp-card`) — the ONE model.** An **ID-badge / corporate baseball-card**: a colored
  header band (by track) with the role title in signage type; a code-drawn **bust portrait**; a
  **salary chip** ($5 / "FREE" / discounted); **report-slot rectangles** (0 for line staff, 3 for CEO,
  2–10 for managers); **training arrows** to the next role(s); a one-line ability in body text; a
  **track glyph** watermark. Selected/at-work/beached/illegal each have a distinct frame treatment.
- **Card slot (`.slot`).** A dashed chrome rectangle = empty/legal drop target (glows turquoise when a
  held card is legal, cherry when illegal-with-reason). Filled slots show the card; manager slots show
  their count.
- **Panel (`.panel`).** Cream-2 fill, chrome stroke, hard shadow, a signage title bar with an optional
  accent underline. The single panel recipe; modals are panels with a heavier shadow + dim backdrop.
- **Button (`.btn`).** Chunky enamel-sign button: filled accent, chrome bevel edge, hard shadow that
  *collapses on press* (the tactile "click"). Primary = turquoise, danger = cherry, neutral = chrome.
- **Badge / chip (`.chip`).** Small pill for money, counts, products, statuses. Money chips use ledger
  mono; product chips carry the product glyph+color.
- **Milestone tile (`.milestone`).** A square **stamped seal**: name in signage, the effect in body,
  a wax-seal/star motif. States: **open** (live, slight glow if you could claim it), **claimed-by-you**
  (your crest + color), **locked** (greyed, embossed, the claimant's crest small).
- **Bank-clock HUD (`.bankclock`).** The game's *doomsday clock*: a horizontal **dual-segment gauge**
  (two breaks) draining right-to-left, ledger-mono dollar readout, and a "breaks left: ●●/●○/○○"
  indicator. Always on screen. Pulses near a break. This answers "how long is left?" — FCM's #1 pain.
- **Phase rail (`.phaserail`).** The 7 phases as a horizontal stepper; the active phase lifts + accents;
  done phases dim with a check. The turn-order track sits beside it (company crests in order).
- **Standings strip (`.standings`).** Company crest + name + cash (ledger mono) + card count + open
  slots, sorted by cash; the leader gets a small crown. The glance-test for "who's winning."
- **Demand marker (`.demand`).** On a house: a stack of product glyph-chips = what the inhabitants want
  (e.g. 🍔🍔🥤). Garden houses get a "×2" laurel.
- **Restaurant tile (`.resto`).** Company-colored building glyph with a marquee reading **WELCOME** or
  **COMING SOON**; shows its effective unit price as a small ledger chip.
- **Marketing footprint overlay (`.footprint`).** A translucent tinted area (product-colored) over the
  houses a campaign reaches, with a dashed boundary and the piece (billboard/radio/airplane/mailbox)
  at its origin. Toggle/preview before committing.
- **"Why" panel (`.why`).** The Dinnertime explainer (see §5).

---

## 4. Information hierarchy — reading the board at a glance

Three depth layers, always in the same screen regions so the eye learns them once:

1. **Status crown (top rail) — "the state of the world."** Phase rail + turn order + bank clock +
   standings. *Persistent, never scrolls.* This is the glance-test layer.
2. **The board (center) — "the contested map."** The plat-map is the largest object. Default view is
   clean (tiles, roads, restaurants, demand). **Overlays are on-demand** (marketing footprint, reach,
   distance, delivery routes) so the base map never clutters. One overlay at a time, toggled.
3. **The instrument (context panel) — "what I'm doing now."** The right/bottom panel swaps with the
   phase: your **org chart** (Restructuring), the **job market** (recruiting), **Marketing** (with the
   board preview), the **Dinnertime "why"** (selling). Only the *active* instrument is foregrounded.

**Encoding rules (so the glance test holds under a dense 4-company late game):**
- **Company identity = crest glyph + accent color + position**, consistently, everywhere it appears.
- **Product = glyph + fixed color**, identically on the board, on cards, in demand, in the "why" panel.
- **Money is always ledger-mono and right-aligned** — your eye finds totals instantly.
- **State via redundancy:** legal/illegal, at-work/beached, open/claimed/locked all carry a frame +
  icon + label, not just a tint.
- **Progressive disclosure:** a region shows a demand summary by default; **hover/select expands** the
  full breakdown and the qualifying-chain math. Cards show role + salary + slots; hover reveals the
  full ability + training tree.
- **The contested things glow:** the open milestone you could claim this turn, the job-market card you
  can afford, the house your chain would win — get a subtle live highlight in your accent color.

---

## 5. Onboarding & feedback systems

FCM is famously punishing to learn; the digital version's job is to make the rules *teach themselves*
without dumbing them down.

- **Contextual tooltips (`data-tip`).** Every card, milestone, icon, and HUD element has a plain-language
  tip. Tips state the *rule* and the *current consequence* ("Discount Manager: −$3 to your unit price.
  Your effective price is now **$6** — you'd win House 4 over Patty's chain.").
- **Legal-move guidance, with reasons.** Illegal actions aren't silently disabled — the affordance shows
  *why* ("Can't recruit here: your Recruiting Girl reaches 2 tiles; this card is 3 away."). The org
  chart highlights legal drop slots in turquoise and explains illegal ones in cherry.
- **The Dinnertime "why" panel — the marquee teaching + trust device.** For each house, step through:
  the demand, every qualifying chain with its **`unit price + distance` math laid out**, the winner
  highlighted, the **tie-break** named if used ("tie at 12 → most waitresses → Patty wins"), and the
  **payout breakdown** (×items, garden ×2, CFO +50%, waitress bonus). Auto-fast or step mode. This is
  how players *learn the core rule by watching it*, and how they trust the engine isn't cheating.
- **The AI rival reveal.** In skirmish setup and campaign briefings, each AI rival is introduced as a
  **character card** (50s-ad caricature + name + a one-line "playstyle tell": *"Dollar Bill slashes
  prices — bring volume or be undercut."*). This makes the AI ladder *legible* and gives the player a
  read to play against, not a faceless bot.
- **Scenario briefing / debrief (campaign).** Briefing states the objective(s), fail condition(s),
  rivals, and medal thresholds as a **mission dossier**. Debrief replays the deciding moments, awards
  the medal with a stamp beat, shows **stat deltas** and any unlocks, and offers Retry-for-gold.
- **First-run guided turn.** Scenario 1 (*Grand Opening*) is the tutorial: systems are introduced one at
  a time with inline coach-marks; later scenarios stop hand-holding. Campaign *is* the onboarding.
- **The "number-go-up" reward loop.** Cash counting up at Dinnertime, milestone stamps, and the
  payday tally are the positive feedback that makes a dry economic game feel good to play.

---

## 6. Audio direction

Synthesized, IP-clean, zero-asset (Web Audio), per `knowledge/playbooks/audio-and-sound.md`:
- **Music:** a light, brushed-jazz / diner-jukebox loop — upright bass, brushed snare, vibraphone —
  unobtrusive, era-appropriate, loops without fatigue. Tempo nudges up subtly as the bank clock nears a
  break (tension).
- **SFX kit:** card-slot *thunk*, hire *stamp*, training *ding*, marketing *jingle blip*, a satisfying
  **cash-register `ka-ching`** at Dinnertime (scaled to the sale size), milestone **rubber-stamp**, the
  bank-clock **tick** that quickens near a break, and an end-game fanfare.
- **Mixer:** separate Music / SFX sliders + mute, gesture-gated, persisted. Never ship silent.

---

## 7. Accessibility targets (the floor, decided now)
- **Colorblind-safe:** every company/product/state carries shape/glyph/label in addition to color;
  a high-contrast toggle.
- **Keyboard-operable:** full menu + turn flow navigable without a mouse; visible focus rings.
- **Text scaling & reduce-motion** honored (motion degrades to instant + static highlight).
- **Tooltips and the "why" panel are text** — never color/icon-only — so outcomes are always legible.
- **Tabular/ledger numerals** for all money so columns align and scan cleanly.

---

## 8. How this maps to the build
- The tokens, type, and component recipes here are implemented in **`concept/concept.css`** and shown
  in the **`concept/` mockups** — so the concept art *is* the first cut of the design system, not throwaway.
- At build **milestone 2**, this GDD is distilled into **`art-direction.md`** (the token table + the ONE
  `<EmployeeCard>` model + the panel/modal/button recipes + an audit checklist) and the shared UI
  primitives (DOM `<Modal>`/`<CardSlot>`/`<EmployeeCard>` + the Pixi `render/theme.ts`) are built
  against it **before** the individual screens — cohesion is decided, not discovered.
- Every acceptance-criteria "matches `art-direction.md`" check traces back to the pillars (§1) and the
  readability targets.
