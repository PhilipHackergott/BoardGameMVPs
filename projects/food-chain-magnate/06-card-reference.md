# Card & Component Reference — Food Chain Magnate

> The transcribed game data behind the `[VERIFY]` items in `03-mvp-spec.md` / `04-build-plan.md`.
> **Primary source:** the official rulebook the operator placed in the project folder —
> `FCM_Rules_EN_v3.pdf` (Splotter Spellen, 2015, 3rd printing; extracted to `FCM_Rules_EN_v3.txt`
> via `pdftotext`). Web sources are cited inline where they corroborate or fill a gap. **Confidence**
> is marked per item: **[R]** = stated outright in the rulebook text (high); **[R-layout]** =
> inferred from the rulebook's card-layout image, which OCR'd partly scrambled (medium — confirm
> against the physical cards); **[web]** = community source; **[VERIFY]** = still open.

## Sources
- **Rulebook** `FCM_Rules_EN_v3.pdf` — authoritative for abilities, phases, milestones, component
  counts, setup scaling, bank/break rules. The card-layout image (rulebook p.5 "Setting up") is the
  canonical training-tree diagram; its caption: *"If you lay out the cards as pictured, you will have
  an overview of upgrade paths."*
- UltraBoardGames — [game rules](https://www.ultraboardgames.com/food-chain-magnate/game-rules.php) · [milestones](https://www.ultraboardgames.com/food-chain-magnate/milestones.php)
- Nights Around a Table — [how to play](https://nightsaroundatable.com/2021/05/14/how-to-play-food-chain-magnate/) (entry-card list + track colors)
- My Board Game Guides — [strategy guide](https://www.myboardgameguides.com/game-strategy/game-specific-strategy/food-chain-magnate-strategy-guide/) (management progression)
- BGG — [Training progression thread](https://boardgamegeek.com/thread/1626874/training-progression) · [Cards List filepage](https://boardgamegeek.com/filepage/127848/food-chain-magnate-cards-list) (BGG blocks automated fetch; used via search snippets)

---

## 1. Components (resolved [R])
| Component | Count |
|-----------|------|
| Map tiles | **20** (each 5×5 squares) |
| House tiles / Garden tiles | **8 / 8** |
| Marketing tiles | **16** = 6 billboards · 4 mailboxes · 3 airplanes (sizes 1/3/5) · 3 radios |
| Numbered "busy" chips | **16** |
| Restaurants per player | **3** (each 2×2, one corner = entrance) |
| CEO cards | **6** (1 per chain) |
| Employee cards | **222** (all types + copies) |
| Milestone cards | **84** (18 distinct milestones × copies) |
| Bank reserve cards | **18** |
| Goods (wood) | **40 each** of softdrinks, beer, lemonade, burgers, pizzas |
| Money / turn-order track / player menus | bills; 1 track; 5 EN + 5 DE menus |

## 2. Setup scaling by player count (resolved [R])
| Players | Copies of each ► entry card | Billboards removed | Map size |
|:--:|:--:|:--:|:--:|
| 2 | 1 | #12, #15, #16 | 3×3 |
| 3 | 1 | #15, #16 | 3×4 |
| 4 | 2 | #16 | 4×4 |
| 5 *(out of MVP scope)* | 3 | none | 5×4 |
- Bank = **$50 × players** [R]. Players start with **$0** [R].
- Each player: 1 CEO + 3 restaurants + a set of 3 reserve cards; chooses 1 reserve (others discarded unseen) [R].
- Initial turn order randomized; first restaurants placed last-player-first [R].

---

## 3. Employee roster & training tree

**Org-chart rules [R]:** CEO has **3** report slots (changeable to **2/3/4** by reserve cards).
Manager ("black") cards have **2–10** slots. Cards under a manager must be normal staff (not other
managers). You may own **only one copy** of each card bearing the **top-position** symbol. Entry
cards (►, top-left arrow) are the only ones a recruiter may **hire**; everything else is reached by
**training**. Salary = **$5** per card bearing the salary symbol; the **CEO is free**.

**Training rules [R]:** train an employee **one step** per training action; you may only train cards
**on the beach** (incl. just-hired); marketeers/kitchen/buyers have their **own upgrade track**; all
other non-entry employees are **trained from managers**. Coach = same card up to 2 steps; Guru = up
to 3 steps. Intermediate cards needn't be in stock when multi-stepping.

> **RESOLVED via the rulebook's card-layout image (p.5).** Rendered `FCM_Rules_EN_v3.pdf` p.5 to PNG
> (MuPDF-WASM) and read it at high resolution — so the items below are now **[R-image]** (high
> confidence), not guesses. This **corrected** an earlier assumption: recruiting and training are
> **not** linear self-tracks. The rule "*marketeers, kitchen staff and buyers each have their own
> upgrade track; all other non-entry employees are trained directly from managers (black cards)*"
> is literal — only three tracks are self-contained.

### 3.1 The THREE self-tracks (own upgrade track from a ► entry card) — [R-image]
**Kitchen** (produce food)
```
Kitchen Trainee ─┬─► Burger Cook ─► Burger Chef
 (1 burger/pizza) │   (3 burgers)    (8 burgers)
                  └─► Pizza Cook  ─► Pizza Chef
                      (3 pizzas)     (8 pizzas)
```
**Buyers** (source drinks; "range" = tiles crossed)
```
Errand Boy ─► Cart Operator ─► Truck Driver ─► Zeppelin Pilot
(1 drink,     (range 2,         (range 3,        (range 4, ignores
 any type)     2/source)         3/source)        roads, 2/source)
```
**Marketeers** (place campaigns; tier gates type/range/duration)
```
Marketing Trainee ─► Campaign Manager ─► Brand Manager ─► Brand Director
(billboard;          (mailbox or lower;  (airplane/lower;  (radio or lower;
 range 2, dur 2)      range 3, dur 3)     no range, dur 4)  no range, dur 5)
```

### 3.2 The management tree — [R-image] RESOLVED
The VP ladder runs across, and **each black VP tier trains into the *next column's* whole cluster**
(the next VP + that column's specialist managers). Slot counts confirmed: **2 → 3 → 4 → 5 → 10**.
```
Management Trainee(2) ─► Junior VP(3) ─► Vice-President(4) ─► Senior VP(5) ─► Executive VP(10)
        │                    │                  │                  │
        ├─► New Business     ├─► Local Manager  ├─► Regional Mgr   ├─► CFO (+50% cash)
        │     Developer      ├─► Discount Mgr   └─► Guru           └─► HR Director (4× hire/−$5)
        └─► Luxuries Mgr     ├─► Recruiting Mgr
            (+$10)           │     (2× hire/−$5)
                             └─► Coach
```
| Card | Slots | Effect [R] | Trains from [R-image] |
|------|:--:|------|------|
| CEO | 3 (→2/3/4) | "Hire 1 person" (1 free recruit); **free salary** | — (start) |
| Management Trainee ► | 2 | management gateway (slots) | hired (entry) |
| Junior Vice-President | 3 | slots only | Management Trainee |
| Vice-President | **4** | slots only | Junior VP |
| Senior Vice-President | 5 | slots only | Vice-President |
| Executive Vice-President | 10 | slots only (1×/top) | Senior VP |
| New Business Developer | — | "Place house or garden" | Management Trainee |
| Luxuries Manager | — | "Price +$10" (mandatory; 1×/top) | Management Trainee |
| Local Manager | — | "Place restaurant (COMING SOON); drive-in" | Junior VP |
| Discount Manager | — | "Price −$3" (mandatory) | Junior VP |
| Recruiting Manager | — | "2×: hire 1 / −$5 salary" (mandatory) | Junior VP |
| Coach | (2 train) | "2 training slots; +2 steps same card" | Junior VP |
| Regional Manager | — | "Place/move restaurant, opens now; drive-in" (1×/top) | Vice-President |
| Guru | (3 train) | "3 training slots; +3 steps same card" (1×/top) | Vice-President |
| CFO | — | "+50% to all cash this round" (mandatory; 1×/top) | Senior VP |
| HR Director | — | "4×: hire 1 / −$5 salary" (mandatory; 1×/top) | Senior VP |

### 3.3 Entry cards & salary — [R-image] RESOLVED
**Entry (►, directly hireable) — all 8 are salary-FREE** (verified: each shows ► and **no** salary
symbol): **Management Trainee, Pricing Manager, Recruiting Girl, Trainer, Errand Boy, Kitchen
Trainee, Marketing Trainee, Waitress.** The **CEO** is also free. **Standalone entries** (no upgrade
path): Pricing Manager (−$1, mandatory), Recruiting Girl (hire 1), Trainer (train 1), Waitress (+$3 /
+$5; mandatory) — only Management Trainee (the management root) and the three self-track trainees
upgrade. **Every *trained* card costs $5** (bears the salary symbol). **Top-position (1× per player,
the "1×" badge):** Executive VP, Regional Manager, Guru, CFO, HR Director, Luxuries Manager, Brand
Director, Zeppelin Pilot, Burger Chef, Pizza Chef (the top of each line).

---

## 4. Milestones — all **18 distinct** (resolved [R], full text)
| Milestone | Trigger | Permanent effect |
|-----------|---------|------------------|
| First billboard placed | place a billboard campaign | no salaries for marketeers; **your campaigns never end** (eternal) |
| First to train someone | train an employee up a level | **−$15** salary discount (obligatory; min $0) |
| First to hire 3 in one turn | hire ≥3 people in a turn | gain **2 Management Trainees** (on beach) |
| First burger marketed | run a burger campaign | **+$5** per burger sold (not doubled by garden; not in unit price) |
| First pizza marketed | run a pizza campaign | **+$5** per pizza sold |
| First drink marketed | run any drink campaign | **+$5** per drink sold (all drink types) |
| First errand boy played | play an errand boy | buyers get **+1 drink per source** |
| First to have $20 | hold $20 cash any time | may **look at the face-down reserve cards** |
| First burger produced | produce a burger | gain a **Burger Cook** |
| First pizza produced | produce a pizza | gain a **Pizza Cook** |
| First waitress played | play a waitress | waitresses earn **$5** (not $3) |
| First to throw away drink/food | discard ≥1 token in phase 7 | tile = **freezer**, store up to 10 tokens |
| First to lower prices | play a pricing or discount manager | prices **automatically −$1** (permanent) |
| First cart operator played | play a cart operator | buyers (cart/truck/zeppelin) get **+1 range** |
| First airplane campaign | place an airplane | **+2 open slots** for Order-of-Business only |
| First radio campaign | place a radio | radios place **2 goods** of the advertised type per house |
| First to have $100 | hold ≥$100 at end of phase 4 | **CEO also acts as CFO** (+50%); may not keep/ train a real CFO |
| First to pay $20+ in salaries | pay ≥$20 salary in phase 5 | may **stack multiple trainers/coaches/gurus** on one person |

> Each milestone is one card-type with multiple copies (84 total) so multiple players can claim it
> **the same turn**; at end of that turn the rest of that type are removed [R].

---

## 5. Marketing campaigns (resolved [R])
| Campaign | Footprint | Placed by (tier) | Range | Max duration |
|----------|-----------|------------------|:--:|:--:|
| Billboard | orthogonally-adjacent houses (1–2) | Marketing Trainee + | per marketeer | 2 (trainee) |
| Mailbox | all houses in the "block" (no road crossed) | Campaign Manager + | per marketeer | 3 (campaign mgr) |
| Airplane | 1/3/5 full rows/columns from a board edge; no road/range needed | Brand Manager + | n/a | 4 (brand mgr) |
| Radio | the tile + all 8 surrounding tiles | Brand Director (radio or lower) | n/a | 5 (brand dir) |
- A campaign advertises **one** product (burgers, pizza, or one drink); tokens = duration [R].
- Marketeer becomes **busy** (set aside w/ a numbered chip) until the campaign ends; busy marketeers take **no slot** but still need salary [R].
- House demand cap: **3 tokens** (5 with a garden); overfull houses ignore further campaigns [R].

## 6. Working-phase action order (resolved [R])
Within a player's turn, actions resolve in this fixed order (org-chart position is irrelevant):
**Recruit → Train → Initiate marketing → Get food & drinks → Place/move restaurants → Place houses/gardens.**
CEO gives **1 free recruit**; pricing/discount/luxury managers, CFO, recruiting manager, HR director,
and waitress actions are **mandatory**, all others optional [R].

## 7. Dinnertime, Payday, Bank (resolved [R])
- **Unit price $10**, modified by Price −$1 / Discount −$3 / Luxuries +$10 (stacking) + "First to
  lower prices" −$1. Bonuses (CFO, "...marketed") do **not** change unit price. Worked example in the
  rulebook: 1 burger + 2 beer to a garden house, luxuries (+$10) → unit $20; garden doubles → $40
  each; +$5 burger bonus → burger $45; total **$125** [R].
- Selection: road-connected chains that can serve the **full** order; lowest **(unit price + distance)**
  wins (distance = tile-borders crossed); tie → **most waitresses** → **earlier in turn order** [R].
- Garden **doubles unit price** (not bonuses). Waitress +$3/$5 paid after all houses. CFO/"$100"
  milestone +50% on the turn's cash (rounded up) [R].
- **Payday:** $5 per salaried card (structure **or** beach); unused recruiting-mgr/HR actions = −$5 each;
  min payable $0; busy marketeers still paid (else fired) [R].
- **Bank:** $50×players; **1st break** → reveal reserves, add their $ to bank, and the **most-common
  slot number (2/3/4; ties→higher)** on the revealed reserves sets all CEOs' slots henceforth;
  **2nd break** → game ends end of phase 4 (no salaries that turn); **most cash wins**, tie → earlier
  turn order [R].

## 8. Bank reserve cards — [R-image] RESOLVED
**18 cards = three types**, each pairing a money value with an open-slot number (confirmed from the
p.3 component image): **+$100 → 2 slots · +$200 → 3 slots · +$300 → 4 slots.** Each player is dealt a
**set of 3 (one of each type)** and secretly keeps **1** — choosing both how much money joins the
bank on the first break (game length) and the CEO-slot count for the rest of the game. With 6 CEO
cards (max 6 players), **18 = 6 × {one of each type}**. The most-common slot number among the
*revealed* reserves sets all CEOs' slots after the first break (ties → higher).

---

## 9. `[VERIFY]` checklist — resolved vs. outstanding (after the rulebook pass)

### ✅ Resolved this pass (source = official rulebook, high confidence)
- [x] **Milestone count + wording** — exactly **18**, full text (§4).
- [x] **Production quantities** — kitchen trainee 1; burger/pizza cook 3, chef 8 (§3.1).
- [x] **Drink-buyer ranges/yields** — errand 1; cart r2/2; truck r3/3; zeppelin r4/2 ignore-roads (§3.1).
- [x] **Marketeer tiers** — which tier unlocks billboard/mailbox/airplane/radio + each max duration (§3.1, §5).
- [x] **Marketing footprints** — billboard/mailbox/radio(tile+8)/airplane(1·3·5) (§5).
- [x] **The 5 core training tracks** — kitchen, buyers, marketeers, recruiting, training (§3.1).
- [x] **Working action order** — Recruit→Train→Marketing→Get food&drinks→Place/move restaurants→Houses/gardens (§6).
- [x] **Mandatory vs optional actions** (§6).
- [x] **Component counts** — 222 employees, 84 milestones, 18 reserves, 20 map tiles, 16 marketing (6/4/3/3), goods 40× (§1).
- [x] **Setup scaling by player count** — map size, entry-card copies, billboards removed (§2).
- [x] **Bank / break / CEO-slot-adjust rules** + 2nd-break end + tie-break (§7).
- [x] **Order-of-Business tie-break** — prior-turn order; +2 slots for First-airplane (§7 / spec).
- [x] **Pricing + selling + garden + CFO/waitress math** — incl. the rulebook's worked $125 example (§7).
- [x] **CEO slot range** 3 (→2/3/4); manager 2–10; Mgmt Trainee 2; Exec VP 10 (§3.2).

### ✅ Resolved in the 2nd pass (PDF p.5/p.3 rendered to PNG via MuPDF-WASM and read at high res)
- [x] **Management-branch parent edges + Vice-President = 4 slots** — full tree in §3.2 (each VP tier
  trains into the next column's cluster; slots 2→3→4→5→10). Also corrected: recruiting/training are
  **not** linear tracks (§3.1/§3.2).
- [x] **Salary-free entry subset** — **all 8 entry (►) cards + the CEO are free**; every trained card is $5 (§3.3).
- [x] **Reserve-card value×slot distribution** — 18 = 6 × {+$100/2-slot, +$200/3-slot, +$300/4-slot} (§8).

### ☐ Genuinely needs the physical components (not in the rulebook or any accessible digital source)
2. **Per-card deck counts** across the 222 employee cards. **Confirmed NOT in the rulebook** (it states
   only "222 employee cards" + the ► entry-card setup copies of **1/1/2/3** per 2/3/4/5 players, and the
   "1×" top cards). **Sourcing exhausted (two passes):** BGG XML API (`/xmlapi2/`) returns game
   metadata, not card lists; the BGG "FCM Cards List" filepage (127848), the "how many of each card"
   (1725765) and "list of employee per player" (1483914) threads, **Fandom**, **Scribd** (335843397,
   preview-only), the **Wayback Machine**, and store/component pages (Spielmaterial/Splottershop/
   Dicetroyers) all either block automated fetch or don't publish the per-type counts. The distribution
   lives only on the **physical cards** or the login-gated BGG file. *Build impact: minor — the engine
   only needs counts for the rare "deck ran out" rule; `data/employees.jobMarketCounts` uses a flagged
   default (entry 1–2, top 1, others 6), a one-line change once the physical counts are read.*
5. **Map-tile art** — the 20 tiles' exact drink/road/house layouts + house numbering. **Confirmed NOT
   in the rulebook** (p.3 depicts only a single sample tile). Needs the physical tiles or a scan.
   *Build approach: the engine reads tiles from data and the map is **randomly assembled** anyway, so
   the MVP **procedurally generates** rules-legal 5×5 tiles (roads + drink sources + house parts) — it
   does not need to replicate Splotter's exact 20, and a later scan can swap them in via data.*
