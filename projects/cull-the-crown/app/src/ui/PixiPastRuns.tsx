import { useEffect, useRef } from "react";
import { Application } from "pixi.js";
import { pastRuns, PastRun } from "./store";
import { ModalStage } from "../render/ui/modalStage";
import { THEME } from "../render/theme";
import { applyPixiFixes } from "../render/pixiFixes";

applyPixiFixes();

// Past Runs, migrated onto the Pixi modal kit — the first consumer of ModalStage.scroll(): a wheel-
// scrollable log of completed/abandoned runs (most recent first), read from localStorage.

const RESULT: Record<PastRun["result"], { label: string; color: number }> = {
  won: { label: "★ Crown Culled", color: THEME.good },
  surrendered: { label: "Surrendered", color: THEME.frameDim },
  lost: { label: "Fell", color: THEME.blood },
};

export default function PixiPastRuns({ onClose }: { onClose: () => void }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const modalRef = useRef<ModalStage | null>(null);

  const rebuild = () => {
    const m = modalRef.current;
    if (!m) return;
    const runs = pastRuns();
    const rowH = 56;
    const panelW = 580;
    const viewH = 420;
    const panelH = 50 + 16 + viewH + 16;

    m.show({
      title: "Past Runs",
      panelW,
      panelH,
      build: (mm) => {
        const w = mm.width;
        if (runs.length === 0) {
          mm.text("No runs yet — begin your first descent.", w / 2, viewH / 2, 12, THEME.parchmentEdge, { anchor: 0.5 });
          return;
        }
        const contentH = runs.length * rowH;
        mm.scroll(0, 8, w, viewH, contentH, () => {
          runs.forEach((r, i) => {
            const ry = i * rowH;
            const res = RESULT[r.result];
            mm.rect(0, ry, w, rowH - 8, 0x1c1430, { alpha: 0.92, radius: 8, stroke: res.color });
            mm.text(res.label, 14, ry + 9, 13, res.color, { bold: true });
            mm.text(`Royals ${r.royals}/${r.totalRoyals}`, 14, ry + 30, 11, 0xffffff);
            mm.text(`◆ ${r.gold}`, w - 14, ry + 9, 13, THEME.goldBright, { anchor: 1, bold: true });
            mm.text(`seed ${r.seed || "—"}`, w - 14, ry + 30, 9, THEME.parchmentEdge, { anchor: 1 });
            mm.text(new Date(r.date).toLocaleString(), 200, ry + 30, 9, THEME.parchmentEdge);
          });
        });
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
