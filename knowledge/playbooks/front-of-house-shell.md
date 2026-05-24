# Front-of-house shell + run persistence: the "this is a real game" layer

> Why this exists: a polished board still feels like a *tech demo* if it boots straight into play,
> can't be paused, can't be quit-and-resumed, and has no settings. The **shell** — the menu, pause,
> settings, rules, and save/continue around the gameplay — is what makes an MVP read as a finished
> game. It's cheap (all DOM/React) and almost identical between games, so build it as a **default
> baseline**, not a final-polish afterthought. First built in **Cull the Crown**; copy the shape.

## The baseline shell (every run-based / roguelike MVP should have all of these)

1. **A real main menu** — not a bare auto-start. Vertical menu of:
   - **Continue** (only shown when a saved run exists),
   - **New run** (+ an optional seed field),
   - **Past runs** (a history log),
   - **Settings**, **Rules**.
2. **A Pause screen** reached by a persistent **gear** button during a run (replaces the lone "?"
   help icon). It **actually pauses** (freezes the board — stop the Pixi ticker; block input). From
   it: **Resume**, **Settings**, **Rules**, **Save & quit to menu**, **Surrender/Abandon run**
   (with a confirm step). Esc resumes.
3. **Settings** — audio mixer (Music + SFX sliders + mute; see `audio-and-sound.md`) and any
   reduce-motion / animated-background toggles. Reachable from **both** the menu and pause.
4. **Rules** — a structured, scrollable reference (the old "How to Play" content, organized into
   sections), reachable from the menu and pause, and auto-shown once on first run.
5. **Outcome → menu path** — the win/loss end screen offers **New run** *and* **Main menu**, not a
   dead end.

## Run persistence (the part that makes it a "game", not a "session")

The engine's `RunState` is already **pure and JSON-serializable** (the same discipline that gives you
replay/sim tests) — so persistence is nearly free:

- **Autosave**: subscribe to the store; whenever the run object changes during an active phase
  (combat/shop/event — not menu/won/lost), `localStorage.setItem(SAVE_KEY, JSON.stringify(run))`.
  Compare object identity to avoid writing on pure selection/hover changes. Now **Continue** works
  even after a refresh or crash, with zero explicit "save" needed.
- **Save & quit** (from pause): persist the run, then drop back to the menu (`run = TITLE_RUN`).
- **Continue**: `JSON.parse` the save back into the store.
- **End-of-run**: on reaching `won`/`lost` (and on **Surrender**), clear the save and **append a
  summary to a history list** (`{seed, result: won|lost|surrendered, royals, gold, date}`, capped).
  **Past runs** reads that list.
- **New run** clears any stale save first.

Keep all of this in the **UI store**, not the engine (it's IO/session, not game logic). Expose
`hasSavedRun()` / `pastRuns()` as plain reads of localStorage for the menu to call at render.

## Gotchas (see `build-gotchas.md` for detail)

- **"Actually pause" = stop the render ticker**, not just overlay a modal — otherwise the background
  keeps animating behind the pause screen. Subscribe the Pixi host to a `paused` flag and
  `app.ticker.stop()/start()`.
- **Modal panels `stopPropagation`** on their content (so a click inside doesn't dismiss them) —
  which **kills a bubble-phase global listener** (e.g. the generic button-click SFX). Attach such
  global listeners in the **capture phase**.
- Guard the keyboard handler while paused (Esc resumes; swallow game keys).

## Reuse map (`cull-the-crown/app/src/ui/`)

- Main menu (Continue/New run/Past runs/Settings/Rules + seed): `App.tsx` (`TitleScreen`).
- Pause (gear → freeze + Resume/Settings/Rules/Save&quit/Surrender): `PauseMenu.tsx` + the gear
  button & `paused` wiring in `App.tsx`; ticker-freeze in `PixiBoard.tsx`.
- Settings (audio sliders + mute): `SettingsMenu.tsx`.
- Rules (structured reference, auto-shown first run): `HelpOverlay.tsx`.
- Past runs: `PastRunsOverlay.tsx`.
- Persistence (autosave/continue/surrender/history): `store.ts` (`SAVE_KEY`/`HISTORY_KEY`,
  `saveAndQuit`/`continueRun`/`surrender`, the autosave subscription, `hasSavedRun`/`pastRuns`).
