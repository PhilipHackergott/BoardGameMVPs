import { useEffect, useRef, useState } from "react";
import { Application } from "pixi.js";
import { useGame } from "./store";
import { sfx } from "../audio/chiptune";
import { wonReward } from "../engine/index";
import { ModalStage } from "../render/ui/modalStage";
import { THEME } from "../render/theme";
import { applyPixiFixes } from "../render/pixiFixes";

applyPixiFixes();

// The end-of-fight gate, migrated onto the Pixi kit. Mounts a full-window modal app when the fight
// ends (after the kill/strike animation): won → spoils breakdown + a counting purse + Claim; lost →
// "You fall" + See the end. Mandatory (no ✕ / no backdrop dismiss) — you must take the button.
export default function PixiCombatGate() {
  const run = useGame((s) => s.run);
  const dispatch = useGame((s) => s.dispatch);
  const outcome = run.phase === "combat" ? run.combat?.outcome : null;
  const active = outcome === "won" || outcome === "lost";
  const lastRoyal = run.enemyIndex >= run.castle.length - 1;
  const won = outcome === "won";
  const reward = won ? wonReward(run) : null;
  const total = reward?.total ?? 0;

  const [shown, setShown] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [purse, setPurse] = useState(run.gold);

  useEffect(() => {
    if (!active) {
      setShown(false);
      setClaiming(false);
      return;
    }
    setPurse(run.gold);
    const t = window.setTimeout(() => setShown(true), outcome === "lost" ? 1500 : 1150);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, outcome]);

  function claim() {
    if (!won) {
      dispatch({ type: "advance" });
      return;
    }
    if (claiming) return;
    setClaiming(true);
    const coins = Math.min(6, Math.max(3, Math.round(total / 4)));
    for (let i = 0; i < coins; i++) window.setTimeout(() => sfx.coin(), i * 110);
    const start = run.gold;
    const end = run.gold + total;
    const t0 = performance.now();
    const dur = 650;
    const step = (now: number) => {
      const k = Math.min(1, (now - t0) / dur);
      setPurse(Math.round(start + (end - start) * k));
      if (k < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
    window.setTimeout(() => dispatch({ type: "advance" }), 820);
  }

  useEffect(() => {
    if (!shown) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") claim();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shown, claiming, won, total]);

  if (!active || !shown) return null;
  return <GateModal won={won} lastRoyal={lastRoyal} reward={reward} purse={purse} claiming={claiming} notice={run.notice ?? null} onClaim={claim} />;
}

interface GateProps {
  won: boolean;
  lastRoyal: boolean;
  reward: ReturnType<typeof wonReward> | null;
  purse: number;
  claiming: boolean;
  notice: string | null;
  onClaim: () => void;
}

function GateModal(props: GateProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const modalRef = useRef<ModalStage | null>(null);
  const propsRef = useRef(props);
  propsRef.current = props;

  const rebuild = () => {
    const m = modalRef.current;
    if (!m) return;
    const p = propsRef.current;
    const r = p.reward;
    const rows: [string, string][] = [];
    if (p.won && r) {
      rows.push([r.exact ? `Bounty (exact ×${r.exactMult})` : "Bounty", `+${r.reward} ◆`]);
      if (r.perFight > 0) rows.push(["Guild tribute", `+${r.perFight} ◆`]);
      if (r.interest > 0) rows.push(["Interest", `+${r.interest} ◆`]);
    }
    const title = p.won ? (p.lastRoyal ? "THE LAST ROYAL FALLS" : "ROYAL FELLED") : "YOU FALL";
    const accent = p.won ? THEME.gold : THEME.blood;
    const bodyH = p.won && r ? (r.exact ? 26 : 0) + rows.length * 26 + 36 + 32 + 60 : 70 + 60;
    m.show({
      title,
      panelW: 424,
      panelH: 60 + bodyH,
      dismissable: false,
      accent,
      build: (mm) => {
        const w = mm.width;
        let y = 14;
        if (p.won && r) {
          if (r.exact) {
            mm.text("★ EXACT KILL ★", w / 2, y, 12, THEME.goldBright, { anchor: 0.5, bold: true });
            y += 26;
          }
          for (const [lbl, val] of rows) {
            mm.text(lbl, 4, y, 12, THEME.parchmentLite);
            mm.text(val, w - 4, y, 12, THEME.goldBright, { anchor: 1 });
            y += 26;
          }
          mm.text("Spoils", 4, y, 13, THEME.gold, { bold: true });
          mm.text(`+${r.total} gold`, w - 4, y, 13, THEME.gold, { anchor: 1, bold: true });
          y += 36;
          mm.text(`Purse  ◆ ${p.purse}`, w / 2, y, 16, 0xffffff, { anchor: 0.5, bold: true });
          y += 32;
        } else {
          mm.text(p.notice ?? "The gauntlet claims you.", w / 2, y, 12, THEME.parchmentLite, { anchor: 0.5, wrap: w });
          y += 70;
        }
        mm.button(p.won ? (p.claiming ? "Claiming…" : "Claim ▸") : "See the End ▸", 0, y, w, 48, accent, !p.claiming, () => propsRef.current.onClaim());
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
      modal.onClose = () => {}; // mandatory gate — no dismiss
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

  useEffect(() => {
    rebuild();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.purse, props.claiming, props.won, props.notice]);

  return <div ref={hostRef} className="pixi-modal-host" />;
}
