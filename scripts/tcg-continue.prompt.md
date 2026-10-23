You are the BoardGameMVPs factory operator. Read the root CLAUDE.md first. Then CONTINUE the
in-progress build of the project `tcg-circuit` — the task is to "build everything EXCEPT Acts II–IV"
of the game world. This is an unattended headless continuation; work autonomously and efficiently.

## Orient first
1. Read `projects/tcg-circuit/project-state.json` (especially the `history` array) and
   `projects/tcg-circuit/app/README.md` to see EXACTLY what is already built and what remains.
   The card game (PRISM) + Act I world (home/town/shop/school, 8-beat story, day/slot loop) are DONE.
2. Read `projects/tcg-circuit/03-mvp-spec.md`, `game-design-document.md`, and `tcg-design.md` for the
   designed-but-deferred systems you are now building.

## Build these remaining world systems (each: pure engine + DATA + UI, verified before moving on)
Priority order — finish whole systems rather than starting many:
1. **Collection economy** — owned cards (`Record<cardId, qty>` in the career), and **booster packs**
   (rarity-weighted + a pity rule) you buy at the shop and open with a **pack-rip reveal** (the
   dopamine beat). Deckbuilding becomes collection-aware (build from owned; prebuilts still loanable).
2. **Singles market** — the home-PC diegetic app: every card has a price that drifts with metagame +
   supply; buy/sell singles; watchlist + wallet. Pure price model in the engine.
3. **Persona life-sim depth** — at New Game pick a context (HS Sophomore/Junior/Senior or College) that
   sets difficulty/free-time; day/slot **activities** (grind duels / work / study / shop / socialize /
   rest); **character stats** (Composure, Charisma, Knowledge, Stamina, Reputation) used in dialogue +
   out-of-game checks; **side jobs** for money; **exam seasons** + **skip-school risk**.
4. **Shop tournaments** — real Swiss-ish/single-elim **AI brackets** that award money + fame + prize
   cards; a bracket screen.
5. **Fame / Scene Reputation** — rises with tournament results; unlocks recognition + a basic
   sponsorship perk + story-flavor.
6. **Community forum + deck-tech blog** — in-game pixel UI (boards→threads→posts; articles with an
   embedded decklist + Light-curve), carrying **B&R announcements**.
7. **Set-release calendar + Banned/Limited as live calendar events** that reshape the legal format.
8. **More locations** as needed to host the above (no new story acts).

## Hard rules
- Keep `app/src/engine/` PURE + deterministic (extend `engine/career` + add new pure modules; engine
  NEVER imports ui/render). All content is DATA on registries.
- You CANNOT generate reference-grade pixel art. Use PROCEDURAL PLACEHOLDER art behind
  `app/src/assets/manifest.ts`; add manifest keys for any new art and list them in `app/README.md`
  under "Assets needed".
- Substrate stays **DOM + Canvas2D** (do NOT introduce Pixi).
- Do **NOT** build the Act II–IV story. Do **NOT** cross the ship gate. Work ONLY inside
  `projects/tcg-circuit/`; never touch other projects.

## Verify continuously (Node is at `C:\Program Files\nodejs`, NOT on PATH — prepend it per shell)
In `projects/tcg-circuit/app/`: keep `npm run lint`, `npm test`, `npm run sim`, `npm run build`, and
`npm run test:e2e` GREEN. Don't claim success on a type-check alone.

## Save progress
- Edited files on disk ARE the saved progress (local working tree) — the next run reads them. Git
  commits are optional: the working tree has unrelated pre-existing changes, so DON'T do a blanket
  `git add -A`. If you commit, stage only `projects/tcg-circuit/**` and commit on branch
  `tcg-circuit/world` with a clear message. Never push to any remote.
- After each system, update `projects/tcg-circuit/project-state.json` `history` + the
  `registry/projects.json` note. When you finish or run out of usage, append a clear
  "RESUME HERE: <what's next>" note to the project-state history so the next run continues cleanly.
