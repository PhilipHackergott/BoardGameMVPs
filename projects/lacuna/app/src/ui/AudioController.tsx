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
    let prevSelA: number | null = null;
    let prevBeacons = 0;
    let prevFlights = 0;
    let prevWon = false;
    let prevReveal = 0;
    let lastCollect = 0;
    const unsub = useGame.subscribe((s) => {
      const g = s.game;
      if (!g) {
        prevSelA = null;
        prevBeacons = 0;
        prevFlights = 0;
        prevWon = false;
        prevReveal = 0;
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

      // Taking flowers (the placement pair, a claim, a free pick, a steal) rings the fifth
      // of that colour's terz, a beat after the pawn lands.
      const flights = s.flights.length;
      if (g.phase === "play" && flights > prevFlights) {
        const now = performance.now();
        if (now - lastCollect > 60) {
          const cf = s.flights[s.flights.length - 1]?.color ?? 0;
          audio.play("collect", cf, p);
          lastCollect = now;
        }
      }
      prevFlights = flights;

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

      const won = g.phase === "ended" && s.reveal >= (g.territory?.length ?? 0);
      if (won && !prevWon && s.revealAuto) audio.play("win", 0, typeof g.result === "number" ? g.result : 0);
      prevWon = won;
    });
    return unsub;
  }, []);

  return null;
}
