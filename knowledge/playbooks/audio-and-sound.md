# Audio & sound: ship games that aren't silent (IP-clean, zero-asset)

> Why this exists: every factory MVP through **Cull the Crown** shipped **silent** for most of its
> life — sound was an afterthought bolted on at the very end. Silence is the single most obvious
> "unfinished demo" tell. Audio is **game-feel**, exactly like the `fx/` motion kit: a small,
> reusable, synthesized-in-code engine covers 95% of what an MVP needs with **no external assets**
> (so no licensing/IP risk and zero asset pipeline). **Bake sound in from the build, not the end.**
> First built in `projects/cull-the-crown/app/src/audio/chiptune.ts` — copy it and re-voice per game.

## The whole thing is synthesized — no .mp3/.wav, no licensing

Use the **Web Audio API** to generate everything live: a looping chiptune **score** (oscillators +
envelopes) and a palette of one-shot **SFX**. This is IP-clean (no sampled/licensed audio), weighs
nothing in the bundle, and re-voices trivially (it's just notes + waveforms). The exact same move as
the in-code SVG/`fx` art: original, procedural, recognizable, zero assets.

## Architecture that worked (`audio/chiptune.ts`)

One `AudioEngine` class, one `AudioContext`, a tiny node graph, exported as three thin objects:

```
voices ─▶ musicBus(gain) ─▶ lowpass ─┐
                                      ├─▶ master(gain)  ─▶ destination
sfx ────▶ sfxBus(gain) ──────────────┘
```

- `master` gain = the **mute** gate. `musicBus`/`sfxBus` = **per-channel volume**. Both layers gate
  mute (see "double-gate" below). A gentle lowpass on the music bus takes the shrill edge off square
  waves.
- **Exports:** `music` (`start()`), `sfx` (one method per effect — `hit/coin/draw/select/...`),
  `audio` (`muted`/`setMuted`, `musicVolume`/`setMusicVolume`, `sfxVolume`/`setSfxVolume`). UI imports
  only these; the engine class stays private.
- **SFX recipe:** each effect = a couple of short enveloped oscillators (`tone(freq,dur,type,peak,
  {slideTo,when})`) and/or a filtered **white-noise burst** (one cached noise `AudioBuffer`). e.g.
  coin = two square blips up an interval; hit = noise slash + a downward square thud scaled by damage;
  draw = a quick ascending noise riffle. Build ~12 and you've covered a game.
- **Music:** a bar/beat **scheduler** with a small lookahead (`setInterval` ~60ms, schedule notes
  ~0.25s ahead via `osc.start(when)`) playing a chord progression on a few voices (bass triangle +
  square arpeggio + lead). Lookahead scheduling = rock-steady timing the JS event loop can't provide.

## The four hard-won rules (each was a real bug)

1. **Browsers block audio before a user gesture.** The `AudioContext` starts *suspended*. Create/
   `resume()` it on the **first real gesture** (a global pointer/key listener that fires once), and
   again on the mute/settings controls. Until then, stay silent — don't fight it.
2. **Mute must DOUBLE-GATE: zero the buses *and* the master.** A master-only mute looked correct in
   code but "didn't mute the music" in practice. Ramp `master→0` **and** `musicBus→0`/`sfxBus→0` on
   mute (and back to their volumes on unmute, mute-aware so a muted start stays silent). Belt and
   suspenders — if any single path is bypassed, the others still gate.
3. **⚠ Pin the engine to `globalThis` so Vite HMR can't spawn duplicates.** THE big one. With plain
   `const engine = new AudioEngine()`, every hot-reload of the audio module (or anything it imports)
   re-runs it → a **new** engine + context + scheduler, while the **old** one's `setInterval` keeps
   the old loop playing on its own context. The UI now controls the new engine; **mute/volume appear
   completely broken** because the audible loop belongs to an orphaned engine. Fix:
   `const engine = (globalThis.__myAudio ??= new AudioEngine())` so one instance survives HMR. (In a
   prod build it's a harmless no-op — single instance anyway.) Symptom to recognize instantly:
   "sliders/mute don't affect the music, but click SFX work." After adding the guard, a **hard reload**
   is needed once to clear already-orphaned loops.
4. **Volumes + mute must be persisted** (localStorage) and applied on context creation, so settings
   survive reloads and a muted player isn't blasted on next launch.

## A settings mixer is table stakes

Expose **Music** and **Sound FX** as independent **volume sliders** plus a master **mute**, in a
Settings panel reachable from the menu and the pause screen (see `front-of-house-shell.md`). Play a
sample SFX as the SFX slider moves so the level is audible. Persist all three.

## Wire SFX to events, not to components

Trigger SFX from the same seams that drive the visual cascade: the typed store **`fxEvent`**
(`play/hit/coin/...`), the render layer's input callbacks (card pickup/`hold`, tap/`select`, pile
click), and a **capture-phase** global `click` listener for a generic UI tick on every button
(capture phase so modal panels that `stopPropagation` still trigger it — see `build-gotchas.md`).
One soft generic click + specific sounds layered on top feels tactile without per-button wiring.

## Per-context music (menu / combat / shop)

Distinct loops for distinct screens (menu vs. fight vs. shop) is a cheap, large jump in production
value — the player feels they've *entered* somewhere. Structure the score as **named tracks**
(each its own progression/tempo/voicing) and crossfade the music bus when the screen/phase changes;
keep one scheduler that swaps the active track. Longer, slower, more **hypnotic** loops (more bass,
longer phrase length before repeating) read as "produced," not "chiptune placeholder." _(Cull the
Crown's first pass was a single short combat loop — the upgrade path is multi-track + longer phrases.)_

## Pre-ship audio checklist (fold into the visual-first-try checklist)

- [ ] **Music** present (synthesized, looping, starts on first gesture).
- [ ] **SFX** on the key actions (the "number-go-up" beat, hits, gains, UI clicks).
- [ ] **Settings mixer**: independent Music + SFX volume sliders **and** a master mute, **persisted**.
- [ ] Mute **double-gates** (buses + master); engine pinned to `globalThis` (HMR-safe).
- [ ] Audio only starts after a user gesture (no autoplay-policy console errors).
- [ ] (Polish) per-screen music (menu / combat / shop).

## Reuse map

- Engine + SFX kit + mixer + mute: copy `cull-the-crown/app/src/audio/chiptune.ts` and re-voice.
- Settings UI (sliders + mute): `cull-the-crown/app/src/ui/SettingsMenu.tsx`.
- Wiring: SFX off `fxEvent`/input callbacks in `ui/PixiBoard.tsx` + `render/combatStage.ts`; generic
  capture-phase button click + first-gesture autostart in `ui/App.tsx`.
