# Build Gotchas

Recurring engineering pitfalls so the next project doesn't rediscover them. The build agent reads
this proactively and treats relevant items as a pre-flight checklist.

> Seeded with anticipated issues; confirm/refine as real builds happen.

## Candidate gotchas to watch (unconfirmed until hit)
- **Pixi + React lifecycle:** initialize the Pixi app once and tear it down on unmount; don't
  recreate the canvas on every React render. Keep the Pixi instance outside React state.
- **Determinism leaks:** any `Math.random()` or `Date.now()` inside `engine/` breaks replay/tests.
  Inject a seeded RNG.
- **Engine purity drift:** UI/render importing engine internals is fine; engine importing UI is a
  bug. Enforce with lint/path rules.
- **Vite static base path:** set `base` correctly or wrapped (Tauri/Capacitor) builds break asset
  loading.

## Confirmed (Lacuna)
- **PixiJS v8 path/fill semantics.** `.fill()`/`.stroke()` consume the *current* path; the next
  shape primitive after a fill/stroke starts a fresh path. So `g.circle(...).fill(X).stroke(Y)`
  fills+strokes one shape, but a loop of `g.circle(...).fill(...)` draws separate shapes (good for
  petals). Build a multi-segment custom shape with `moveTo/lineTo/closePath` then a single
  `fill()`/`stroke()`. _Source: projects/lacuna `src/render/board.ts` (flowers, gem pawns)._
- **Transparent canvas needs an explicit hitArea.** A Pixi background `Graphics` with no opaque
  fill won't receive pointer events; set `bg.hitArea = new Rectangle(0,0,w,h)` and
  `eventMode = "static"` so empty-space clicks/moves fire. _Source: lacuna board background._
- **Smooth overlays cheaply:** render a coarse grid into a `Graphics`, wrap it in a `Container`
  with a `BlurFilter`, and clip with a circular mask — beats per-cell anti-aliasing for soft
  Voronoi-style zones. _Source: lacuna influence lens._
- **Events bubble to ancestors, not siblings.** Pointer events on a child (a flower) reach the
  stage, not a sibling background layer. Put the catch-all hit target where it can actually
  receive the event, and `stopPropagation()` on pieces that should swallow the click.

## Confirmed (Magical Athlete)
- **Symptom:** `tsc --noEmit` fails on `vite.config.ts` (`'test' does not exist`, or a `Plugin<any>`
  type mismatch) even though `vitest run` works. **Cause:** Vitest can resolve a *second nested* copy
  of Vite, so `@vitejs/plugin-react`'s `Plugin` type ≠ the one `vitest/config` expects. **Fix:** import
  `defineConfig` from `vitest/config` in the config, **and** drop `vite.config.ts` from the app
  `tsconfig` `include` (Vite/Vitest run it via esbuild regardless — it doesn't need type-checking by
  the app config). _Source: magical-athlete `vite.config.ts`, `tsconfig.json`._
- **Symptom:** Pixi v8 throws/leaks when a React component using it unmounts quickly. **Cause:**
  `Application.init()` is **async**; the component can unmount before init resolves. **Fix:** keep a
  `destroyed` flag on the view; if it's set when `init()` resolves, destroy the freshly-made app
  immediately. Create the view in a mount-only `useEffect` (init once) and feed engine state via a
  separate `useEffect` keyed on state. _Source: magical-athlete `render/board.ts` + `ui/GameCanvas.tsx`._
- **Pattern that worked — asset manifest seam.** Reference every visual asset by key in a single
  manifest with `src: string | null`; the render layer draws a procedural placeholder when `src` is
  null and loads the real sprite when set. Lets the build proceed at full speed before art/licensing
  is resolved, with zero rework when files arrive. _Source: magical-athlete `src/assets/manifest.ts`._
- **Operational (this dev machine):** Node lives at `C:\Program Files\nodejs` but is **not on PATH**.
  Prepend it per shell (`$env:Path = "C:\Program Files\nodejs;$env:Path"`) and run npm via
  `npm --prefix <app-dir> ...`. The Bash tool's git-bash has no node; use PowerShell.
- **Operational — keep a dev server alive across turns: launch it _detached_, not as a tracked
  background task.** A long-running server started as a harness-tracked background command gets
  reaped (exit 255) when the task lifecycle ends, so `localhost` dies between turns. Instead spawn
  it detached so the harness sees a quick, completed command: `Start-Process cmd.exe -ArgumentList
  '/c npm run dev > "<app>\vite-dev.log" 2>&1' -WorkingDirectory <app> -WindowStyle Hidden`. It
  inherits the `$env:Path` you set first, streams to a log you can `Read`, and survives. Verify with
  a quick `Invoke-WebRequest http://localhost:5173/`. Stop it via `Stop-Process`/closing the hidden
  window. _Source: lacuna dev-server sessions._

## Confirmed (Roomies)
- **Symptom:** Playwright clicks time out with **"element is not stable"**, retrying for the full
  30s, on a button that is clearly visible and enabled. **Cause:** CSS `animation`/`transition` on
  the element (or an entrance `@keyframes pop`, or a continuously-animating ancestor) means its
  bounding box never settles, so Playwright's actionability "stable" check never passes. The
  visual-polish push (animated backdrops, card pops, phase banners) *creates* this failure mode.
  **Fix:** disable animation in the e2e — after `page.goto`, inject
  `await page.addStyleTag({ content: "*,*::before,*::after{animation:none!important;transition:none!important}" })`.
  It makes every element instantly stable **and** runs the suite much faster. (Web-Animations-API
  `element.animate()` flights are unaffected by this CSS and remain pointer-events-none, so they
  don't need handling.) _Source: roomies `tests/e2e/playtest.spec.ts`._
- **Pattern that worked — DOM card-flight animation without Pixi.** To animate a card moving between
  piles in a DOM/React game: capture the **source rect** from the click event (`e.currentTarget`),
  spawn a fixed-position floating clone (an emoji glyph), and on mount animate it with the
  **Web Animations API** to the **destination element found by a `data-*` selector**
  (`[data-pool="2"]`, `[data-room="17"]`), then pulse the destination and remove the clone. A generic
  `FlyLayer` reads a `flights[]` array from the store. Generalizes Lacuna's flower FlyLayer to any
  card via `{from, toSel, glyph}`. _Source: roomies `src/ui/FlyLayer.tsx` + `state/store.ts`._

## Confirmed (Cull the Crown)
- **Symptom:** mute & volume sliders "don't affect the music" (but click SFX still play) — only in
  the dev server. **Cause:** Vite **HMR** re-runs the audio module on edit, so `const engine = new
  AudioEngine()` builds a *second* engine + AudioContext + scheduler; the **old** one's `setInterval`
  keeps the old loop playing while the UI controls the new (silent) one. **Fix:** pin the singleton to
  globalThis — `const engine = (globalThis.__app_audio ??= new AudioEngine())` — so HMR reuses one
  instance (harmless no-op in prod). A **hard reload** is needed once to clear already-orphaned loops.
  Applies to ANY long-lived stateful singleton holding timers/contexts (audio, websockets, RAF loops),
  not just audio. _Source: cull-the-crown `src/audio/chiptune.ts`._
- **Symptom:** PixiJS v8 throws `Cannot read properties of undefined (reading 'push')` deep in
  `TexturePoolClass.returnTexture`, intermittently, during render or idle. **Cause:** Pixi's automatic
  **texture/renderable GC** sweeps `Text` glyph textures and trips an internal pool bug. **Fix:** for a
  game with a small, fixed texture set, the GC buys nothing — disable it at init:
  `app.init({ ..., textureGCActive:false, renderableGCActive:false })`, and additionally avoid
  re-rasterizing `Text` you don't need to (guard `if (t.text !== v) t.text = v;` before assigning).
  _Source: cull-the-crown `src/ui/PixiBoard.tsx` (init flags) + `render/combatStage.ts` (`setText`)._
- **Symptom:** a generic global handler (e.g. a button-click SFX on `window`) fires for board/HUD
  buttons but **not** for buttons inside modals/menus. **Cause:** modal panels call
  `e.stopPropagation()` on their content (so an inside click doesn't dismiss them), which halts
  bubble-phase propagation before it reaches `window`. **Fix:** register the global listener in the
  **capture phase**: `window.addEventListener("click", fn, true)` — capture runs top-down before any
  `stopPropagation`. _Source: cull-the-crown `src/ui/App.tsx` (generic click SFX)._
- **Symptom (game-state, not crash):** a `Container`/board that **remounts** between rounds re-fires
  the previous round's terminal animation (Cull the Crown re-played the "kill/OVERTHROWN" cascade on
  the next fight's first input). **Cause:** the render layer tracks "last handled event id" in a ref
  that **resets to 0 on remount**, while the store still holds the *old* terminal `fxEvent` (higher
  id) — so the first post-mount store update looks "new". **Fix:** on mount, seed the cursor with the
  *current* event id (`lastFx.current = store.getState().fxEvent?.id ?? 0`) so pre-existing events are
  treated as already-seen. _Source: cull-the-crown `src/ui/PixiBoard.tsx`._
- **Symptom (game-state):** by the 3rd fight the player had **no starting hand** (it dwindled to 0).
  **Cause:** the per-fight setup created a fresh enemy/combat but **never re-dealt the hand**, and the
  win handler only recycled played cards — so the leftover hand carried over and depleted across
  fights. **Fix:** deal a **full hand at the start of every fight** (`drawToFull`: top up to hand-max,
  reshuffling the discard back into the deck if it runs low). Lesson: when each "level/blind" should
  open fresh, explicitly **reset/redraw at the level boundary** — don't assume within-fight draw logic
  covers it. Cover it with a multi-fight regression test (`tests/e2e/multifight.spec.ts`). _Source:
  cull-the-crown `src/engine/combat.ts` (`startFight`/`drawToFull`)._

## Template for a confirmed entry
- **Symptom:** **Cause:** **Fix:** **Source project:**
