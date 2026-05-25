import { useEffect, useRef, useState } from "react";
import { Application } from "pixi.js";
import { useGame } from "./store";
import Collection from "./Collection";
import PixiSettings from "./PixiSettings";
import { ModalStage } from "../render/ui/modalStage";
import { THEME } from "../render/theme";
import { applyPixiFixes } from "../render/pixiFixes";

applyPixiFixes();

// The pause menu, migrated onto the unified Pixi kit (the first DOM→Pixi modal). It mounts a
// full-window Pixi app while paused (modals are blocking, so capturing all input is correct);
// Compendium/Settings still open the DOM overlays for now (those migrate in a later pass).
export default function PixiPauseMenu() {
  const [view, setView] = useState<"menu" | "compendium" | "settings">("menu");
  if (view === "compendium") return <Collection onClose={() => setView("menu")} />;
  if (view === "settings") return <PixiSettings onClose={() => setView("menu")} />;
  return <PixiPauseModal onCompendium={() => setView("compendium")} onSettings={() => setView("settings")} />;
}

function PixiPauseModal({ onCompendium, onSettings }: { onCompendium: () => void; onSettings: () => void }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const modalRef = useRef<ModalStage | null>(null);
  const [confirm, setConfirm] = useState(false);

  const rebuild = () => {
    const m = modalRef.current;
    if (!m) return;
    m.show({
      title: "Paused",
      panelW: 372,
      panelH: confirm ? 250 : 296,
      build: (mm) => {
        const w = mm.width;
        if (!confirm) {
          mm.button("📖  Compendium & Rules", 0, 14, w, 46, THEME.gold, true, onCompendium);
          mm.button("⚙  Settings", 0, 70, w, 46, THEME.gold, true, onSettings);
          mm.button("💾  Save & Quit", 0, 126, w, 46, THEME.gold, true, () => useGame.getState().saveAndQuit());
          mm.button("🏳  Surrender Run", 0, 188, w, 46, THEME.blood, true, () => setConfirm(true));
        } else {
          mm.text("Surrender this run?", w / 2, 16, 13, THEME.parchmentLite, { anchor: 0.5 });
          mm.text("It will end as a loss.", w / 2, 40, 11, THEME.parchmentEdge, { anchor: 0.5 });
          mm.button("Yes, Surrender", 0, 78, w, 46, THEME.blood, true, () => useGame.getState().surrender());
          mm.button("Cancel", 0, 134, w, 46, THEME.frameDim, true, () => setConfirm(false));
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
      modal.onClose = () => useGame.getState().setPaused(false);
      modalRef.current = modal;
      rebuild();
    })();
    return () => {
      cancelled = true;
      const m = modalRef.current;
      modalRef.current = null;
      if (m) {
        m.destroy();
        m.app.destroy(true, { children: true });
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // re-paint when the surrender confirm toggles
  useEffect(() => {
    rebuild();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [confirm]);

  return <div ref={hostRef} className="pixi-modal-host" />;
}
