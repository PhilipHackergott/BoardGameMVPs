import { useEffect, useRef } from "react";
import { Application } from "pixi.js";
import { audio, music, SONG_INFO, SCREENS, SCREEN_LABEL, type SongId } from "../audio/chiptune";
import { useGame } from "./store";
import { ModalStage } from "../render/ui/modalStage";
import { THEME } from "../render/theme";
import { applyPixiFixes } from "../render/pixiFixes";

applyPixiFixes();

// Settings, migrated onto the Pixi modal kit: two draggable volume sliders (music + SFX — the kit's new
// ModalStage.slider), a master mute toggle, per-screen soundtrack pickers (the DOM <select> becomes a
// ◂ name ▸ cycle stepper, canvas-friendly), and the Debug section (infinite gold + defeat-royal).
// Live values live in refs so dragging a slider repaints without a React re-render.

export default function PixiSettings({ onClose }: { onClose: () => void }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const modalRef = useRef<ModalStage | null>(null);
  const musicVol = useRef(audio.musicVolume);
  const sfxVol = useRef(audio.sfxVolume);
  const muted = useRef(audio.muted);
  const songs = useRef<Record<string, SongId>>({ ...audio.screenSongs });

  const rebuild = () => {
    const m = modalRef.current;
    if (!m) return;
    const debug = useGame.getState().debug;
    const inCombat = useGame.getState().run.phase === "combat" && !useGame.getState().run.combat?.outcome;

    const rowH = 34;
    const tracksTop = 150;
    const tracksH = SCREENS.length * rowH;
    const debugTop = tracksTop + 22 + tracksH + 12;
    const debugH = debug ? 96 : 56;
    const panelH = 50 + debugTop + debugH + 16;

    m.show({
      title: "Settings",
      panelW: 540,
      panelH,
      build: (mm) => {
        const w = mm.width;
        // --- volume sliders ---
        mm.text("♪ Music", 0, 8, 13, THEME.goldBright, { bold: true });
        mm.slider(96, 12, w - 150, musicVol.current, THEME.gold, (v) => {
          musicVol.current = v;
          audio.setMusicVolume(v);
          music.start();
          rebuild();
        });
        mm.text(`${Math.round(musicVol.current * 100)}`, w, 8, 13, 0xffffff, { anchor: 1, bold: true });

        mm.text("♫ Sound FX", 0, 44, 13, THEME.goldBright, { bold: true });
        mm.slider(96, 48, w - 150, sfxVol.current, THEME.gold, (v) => {
          sfxVol.current = v;
          audio.setSfxVolume(v);
          rebuild();
        });
        mm.text(`${Math.round(sfxVol.current * 100)}`, w, 44, 13, 0xffffff, { anchor: 1, bold: true });

        // --- master mute ---
        mm.button(muted.current ? "🔇  All sound muted — tap to unmute" : "🔊  Mute all sound", 0, 80, w, 36, muted.current ? THEME.blood : THEME.gold, true, () => {
          const next = !muted.current;
          muted.current = next;
          audio.setMuted(next);
          music.start();
          rebuild();
        });

        // --- per-screen soundtrack steppers ---
        mm.text("♬ Soundtrack — a song per screen", 0, 128, 11, THEME.parchmentEdge);
        const cur = (screen: string) => SONG_INFO.findIndex((s) => s.id === songs.current[screen]);
        const setSong = (screen: string, idx: number) => {
          const id = SONG_INFO[(idx + SONG_INFO.length) % SONG_INFO.length].id;
          songs.current = { ...songs.current, [screen]: id };
          audio.setScreenSong(screen as Parameters<typeof audio.setScreenSong>[0], id);
          music.start();
          rebuild();
        };
        SCREENS.forEach((screen, i) => {
          const y = tracksTop + i * rowH;
          const ci = cur(screen);
          mm.rect(0, y, w, rowH - 6, 0x1c1430, { alpha: 0.85, radius: 6, stroke: THEME.frameDim });
          mm.text(SCREEN_LABEL[screen], 10, y + 8, 11, THEME.goldBright, { bold: true });
          mm.button("◂", 132, y + 2, 26, rowH - 10, THEME.gold, true, () => setSong(screen, ci - 1), 13);
          mm.text(SONG_INFO[ci]?.name ?? "—", 168, y + 8, 11, 0xffffff, { wrap: w - 168 - 40 });
          mm.button("▸", w - 28, y + 2, 26, rowH - 10, THEME.gold, true, () => setSong(screen, ci + 1), 13);
        });

        // --- debug ---
        mm.text("⚙ Debug", 0, debugTop, 11, THEME.parchmentEdge);
        mm.button(debug ? "✓ Infinite gold ON" : "Infinite gold OFF", 0, debugTop + 18, w, 32, debug ? THEME.good : THEME.frameDim, true, () => {
          useGame.getState().setDebug(!debug);
          rebuild();
        });
        if (debug) {
          mm.button("⚔ Defeat current royal", 0, debugTop + 54, w, 32, THEME.blood, inCombat, () => {
            useGame.getState().dispatch({ type: "debugDefeat" });
            onClose();
          });
        }
      },
    });
  };

  useEffect(() => {
    let cancelled = false;
    const app = new Application();
    void (async () => {
      await app.init({ resizeTo: window, backgroundAlpha: 0, antialias: false, roundPixels: true, resolution: Math.min(3, Math.max(2, Math.round(window.devicePixelRatio || 2))), autoDensity: true });
      try {
        await Promise.all([document.fonts.load("12px 'Silkscreen'"), document.fonts.load("16px 'Press Start 2P'")]);
      } catch {
        /* system font fallback */
      }
      if (cancelled) {
        app.destroy(true, { children: true });
        return;
      }
      const host = hostRef.current;
      if (host) {
        host.appendChild(app.canvas);
        const cv = app.canvas;
        cv.style.position = "fixed";
        cv.style.inset = "0";
        cv.style.width = "100vw";
        cv.style.height = "100vh";
        cv.style.zIndex = "9000";
        cv.style.imageRendering = "pixelated";
      }
      const modal = new ModalStage(app);
      modal.onClose = onClose;
      modalRef.current = modal;
      rebuild();
    })();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      cancelled = true;
      window.removeEventListener("keydown", onKey);
      const m = modalRef.current;
      modalRef.current = null;
      if (m) {
        m.destroy();
        m.app.destroy(true, { children: true });
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <div ref={hostRef} className="pixi-modal-host" />;
}
