import { useEffect } from "react";
import { audio } from "../audio/audio";
import { useGame } from "../state/store";

// Drives all sound. Renders nothing. Browsers block audio until a user gesture, so the
// first pointer-down unlocks the context (and starts music if enabled); the same listener
// plays a soft click for any button. Game SFX are fired by diffing the store, and the
// Music/SFX settings keep the engine in sync.
export function AudioController() {
  const music = useGame((s) => s.settings.music);
  const sfx = useGame((s) => s.settings.sfx);
  const musicVolume = useGame((s) => s.settings.musicVolume);
  const sfxVolume = useGame((s) => s.settings.sfxVolume);

  // Initialise engine flags from settings once (before any gesture).
  useEffect(() => {
    const s = useGame.getState().settings;
    audio.music = s.music;
    audio.sfx = s.sfx;
    audio.musicVolume = s.musicVolume;
    audio.sfxVolume = s.sfxVolume;
  }, []);

  useEffect(() => audio.setMusic(music), [music]);
  useEffect(() => audio.setSfx(sfx), [sfx]);
  useEffect(() => audio.setMusicVolume(musicVolume), [musicVolume]);
  useEffect(() => audio.setSfxVolume(sfxVolume), [sfxVolume]);

  // First-gesture unlock + per-button click sound.
  useEffect(() => {
    const onDown = (e: PointerEvent) => {
      audio.unlock();
      const el = e.target as HTMLElement | null;
      if (el && el.closest("button")) audio.play("click");
    };
    window.addEventListener("pointerdown", onDown);
    return () => window.removeEventListener("pointerdown", onDown);
  }, []);

  // Game SFX. Each flower COLOUR has its own terz (triad); the PLAYER sets major/minor
  // (Gold major, Silver minor). The placement interaction arpeggiates that triad: select a
  // flower (root), place the pawn (third), and TAKING the flowers rings the fifth ~half a
  // second later. Reclaiming your own pawn rings the whole chord. At nightfall each leftover
  // flower rings its colour's whole chord as it's assigned — a final symphony — then the win
  // flourish plays once the harvest finishes.
  useEffect(() => {
    let prevSeed: number | null = null;
    let prevSelA: number | null = null;
    let prevBeacons = 0;
    let prevCollected = 0;
    let prevWon = false;
    let prevReveal = 0;
    let lastCollect = 0;
    const totalCollected = (g: { collected: number[][] }) => {
      let n = 0;
      for (const row of g.collected) for (const c of row) n += c;
      return n;
    };
    const unsub = useGame.subscribe((s) => {
      const g = s.game;
      if (!g) {
        prevSeed = null;
        prevSelA = null;
        prevBeacons = 0;
        prevCollected = 0;
        prevWon = false;
        prevReveal = 0;
        return;
      }
      // A brand-new game (incl. a fresh online match — same seed across its state updates):
      // snapshot the baselines so we don't retro-fire cues for the initial deal.
      if (g.seed !== prevSeed) {
        prevSeed = g.seed;
        prevSelA = s.selection.aStarId;
        prevBeacons = g.beacons.length;
        prevCollected = totalCollected(g);
        prevReveal = 0;
        prevWon = false;
        return;
      }
      const p = g.current;
      const sel = s.selection;
      const selColor = sel.aStarId !== null ? (g.stars.find((x) => x.id === sel.aStarId)?.color ?? 0) : 0;

      // Root: a new flower selected.
      if (g.phase === "play" && sel.aStarId !== null && sel.aStarId !== prevSelA) audio.play("select", selColor, p);
      prevSelA = sel.aStarId;

      const beacons = g.beacons.length;
      const placedNow = g.phase === "play" && beacons > prevBeacons;
      if (placedNow) {
        // Attribute to the PLACER (lastPlace.owner), not g.current — the turn has usually
        // advanced by now, so g.current would voice the third in the wrong player's quality.
        const placer = g.lastPlace ? g.lastPlace.owner : p;
        const placeColor = g.lastPlace ? g.lastPlace.color : selColor;
        audio.play("place", placeColor, placer); // third of the terz, in the placer's quality
      } else if (g.phase === "play" && beacons < prevBeacons) {
        audio.play("pickup", selColor, p);
      }
      prevBeacons = beacons;

      // Taking flowers (the placement pair, a claim, a free pick, a steal) rings the fifth of
      // that colour's terz, a beat after the pawn lands. Driven by the authoritative collected
      // TOTALS (not the local flight animation), so it fires for online matches too — the
      // server replaces the game state wholesale and never creates client-side flights.
      const collected = totalCollected(g);
      if (g.phase === "play" && collected > prevCollected) {
        const now = performance.now();
        if (now - lastCollect > 60) {
          const cf = g.lastPlace ? g.lastPlace.color : (s.flights[s.flights.length - 1]?.color ?? selColor);
          const owner = g.lastPlace ? g.lastPlace.owner : p;
          audio.play("collect", cf, owner);
          lastCollect = now;
        }
      }
      prevCollected = collected;

      // Nightfall harvest: each newly-assigned leftover flower rings its colour's whole chord
      // (in its owner's quality), so the assignment animation plays out as a final symphony.
      // Driven off the monotonic reveal counter; silent while the user scrubs the timeline.
      const terr = g.territory;
      if (g.phase === "ended" && terr) {
        if (s.revealAuto && s.reveal > prevReveal) {
          for (let i = prevReveal; i < s.reveal; i++) {
            const cell = terr[i];
            if (cell && cell.owner !== null) audio.play("harvest", cell.color, cell.owner);
          }
        }
        prevReveal = s.reveal;
      } else {
        prevReveal = 0;
      }

      const total = g.territory?.length ?? 0;
      const won = g.phase === "ended" && s.reveal >= total;
      if (won && !prevWon && s.revealAuto) {
        // The final chord is voiced on the LAST flower to land (its colour's triad), in the
        // winner's quality — it holds and tapers off as the win screen settles.
        const lastColor = total > 0 && g.territory ? g.territory[total - 1].color : (g.lastPlace?.color ?? 4);
        audio.play("win", lastColor, typeof g.result === "number" ? g.result : 0);
      }
      prevWon = won;
    });
    return unsub;
  }, []);

  return null;
}
