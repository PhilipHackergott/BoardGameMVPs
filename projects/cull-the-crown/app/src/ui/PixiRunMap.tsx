import { useEffect, useRef, useState } from "react";
import { Application } from "pixi.js";
import { useGame } from "./store";
import {
  activeEdicts,
  gauntletView,
  RoyalView,
  STAKE_IDS,
  STAKE_INFO,
  stakeIndex,
  FIGHTING_STYLE_IDS,
  FIGHTING_STYLE_NAME,
  FIGHTING_STYLE_PER_LEVEL,
} from "../engine/index";
import { Suit, SUIT_NAME, Tier, FightingStyleId } from "../engine/types";
import { ModalStage } from "../render/ui/modalStage";
import { STYLE_ART_SLUG } from "../render/sidebarStage";
import { SUIT_COLOR, THEME } from "../render/theme";
import { applyPixiFixes, releaseApp } from "../render/pixiFixes";

applyPixiFixes();

// "The Descent" run-info modal, migrated onto the Pixi kit (the first multi-tab Pixi modal). Four tabs —
// Fighting Styles / Opponents (current court) / Edicts / Stake — drawn into a full-window ModalStage app
// mounted while `mapOpen`. Opened via the ⌖ Run Info button or the M key (store.mapOpen).

type Tab = "styles" | "opponents" | "edicts" | "stake";
const TABS: [Tab, string][] = [
  ["styles", "Styles"],
  ["opponents", "Opponents"],
  ["edicts", "Edicts"],
  ["stake", "Stake"],
];

const GLYPH: Record<Suit, string> = { H: "♥", D: "♦", C: "♣", S: "♠" };
const RANK: Record<Tier, string> = { jack: "J", queen: "Q", king: "K" };
const ACTS: Record<Tier, { title: string; blurb: string }> = {
  jack: { title: "Act I · The Jack Court", blurb: "The lesser royals — your proving ground." },
  queen: { title: "Act II · The Queen Court", blurb: "Sharper, deadlier. The decrees bite harder." },
  king: { title: "Act III · The King Court", blurb: "The crowned tyrants — they enrage when wounded." },
};
const STYLE_TRIGGER: Record<FightingStyleId, string> = {
  twoHanded: "a single card",
  swordShield: "a pair — two of a rank",
  spear: "three of a rank",
  dualWield: "four of a rank",
  mage: "five of a rank — only via deck-shaping",
  mounted: "any play with an Animal Companion (Ace)",
};

// STAKE_INFO.color is a CSS hex string → a Pixi colour int.
function hexNum(c: string): number {
  const h = c.replace("#", "");
  const full = h.length === 3 ? h.split("").map((x) => x + x).join("") : h;
  return parseInt(full, 16) || THEME.gold;
}

function drawStyles(mm: ModalStage, levels: Record<FightingStyleId, number>): void {
  const w = mm.width;
  FIGHTING_STYLE_IDS.forEach((id, i) => {
    const ry = 50 + i * 58;
    const lvl = levels[id] ?? 0;
    const per = FIGHTING_STYLE_PER_LEVEL[id];
    const mult = (1 + lvl * per).toFixed(2);
    mm.rect(0, ry, w, 52, 0x1c1430, { alpha: 0.92, radius: 8, stroke: lvl > 0 ? THEME.good : THEME.frameDim });
    mm.sprite(`/art/styles/${STYLE_ART_SLUG[id]}.svg`, 6, ry + 3, 34, 46);
    mm.text(`Lv ${lvl}`, 48, ry + 8, 11, lvl > 0 ? THEME.good : THEME.frameDim, { bold: true });
    mm.text(FIGHTING_STYLE_NAME[id], 48, ry + 25, 13, THEME.goldBright, { bold: true });
    mm.text(STYLE_TRIGGER[id], 132, ry + 11, 10, THEME.parchmentEdge, { wrap: w - 132 - 92 });
    mm.text(`×${mult}`, w - 8, ry + 12, 17, lvl > 0 ? THEME.good : 0xffffff, { anchor: 1, bold: true });
    mm.text(`+${Math.round(per * 100)}% / lv`, w - 8, ry + 34, 9, THEME.parchmentEdge, { anchor: 1 });
  });
}

function drawOpponents(mm: ModalStage, royals: RoyalView[], enemyIndex: number): void {
  const w = mm.width;
  const curIdx = Math.min(enemyIndex, royals.length - 1);
  const curTier = royals[curIdx]?.tier ?? "jack";
  const act = ACTS[curTier];
  const actRoyals = royals.filter((r) => r.tier === curTier);
  mm.text(act.title, 0, 50, 15, THEME.goldBright, { bold: true });
  mm.text(`${act.blurb} — the current court.`, 0, 72, 10, THEME.parchmentEdge, { wrap: w });
  const n = Math.max(1, actRoyals.length);
  const tw = (w - (n - 1) * 8) / n;
  const ty = 96;
  const th = 248;
  actRoyals.forEach((r, i) => {
    const tx = i * (tw + 8);
    const sc = SUIT_COLOR[r.suit];
    const statusCol = r.status === "current" ? THEME.gold : r.status === "cleared" ? THEME.frameDim : THEME.parchmentEdge;
    mm.rect(tx, ty, tw, th, 0x140a1e, { alpha: 0.96, radius: 8, stroke: statusCol });
    mm.text(`#${r.index + 1}`, tx + 8, ty + 7, 9, THEME.parchmentEdge);
    const flag = r.status === "cleared" ? "✓ felled" : r.status === "current" ? "▶ now" : "… next";
    mm.text(flag, tx + tw - 8, ty + 7, 9, statusCol, { anchor: 1 });
    // suit-coloured face
    const fw = 40;
    mm.rect(tx + tw / 2 - fw / 2, ty + 24, fw, 50, sc, { radius: 6, alpha: 0.22, stroke: sc });
    mm.text(RANK[r.tier], tx + tw / 2, ty + 32, 18, sc, { anchor: 0.5, bold: true });
    mm.text(GLYPH[r.suit], tx + tw / 2, ty + 54, 16, sc, { anchor: 0.5 });
    mm.text(`♥ ${r.maxHealth}`, tx + tw / 2, ty + 84, 12, THEME.red, { anchor: 0.5, bold: true });
    mm.text(`⚔ ${r.attack}${r.enrages ? "+" : ""}`, tx + tw / 2, ty + 102, 12, THEME.blood, { anchor: 0.5, bold: true });
    mm.text(`⊘ ${GLYPH[r.suit]} ${SUIT_NAME[r.suit]}`, tx + tw / 2, ty + 122, 8, sc, { anchor: 0.5 });
    let dy = ty + 144;
    if (r.decrees.length) {
      for (const d of r.decrees) {
        mm.text(`⚜ ${d.name}`, tx + 6, dy, 8, THEME.goldBright, { wrap: tw - 12 });
        dy += 26;
      }
    } else {
      mm.text("— no decree —", tx + tw / 2, dy, 8, THEME.frameDim, { anchor: 0.5 });
    }
  });
}

function drawEdicts(mm: ModalStage, edictIds: string[] | undefined): void {
  const w = mm.width;
  const edicts = activeEdicts(edictIds);
  if (edicts.length === 0) {
    mm.text("No edicts decreed this run.", w / 2, 90, 12, THEME.parchmentEdge, { anchor: 0.5 });
    return;
  }
  edicts.forEach((e, i) => {
    const ry = 50 + i * 66;
    mm.rect(0, ry, w, 58, 0x1c1430, { alpha: 0.92, radius: 8, stroke: THEME.frameDim });
    mm.text("⚜", 12, ry + 18, 20, THEME.goldBright);
    mm.text(e.name, 44, ry + 9, 12, THEME.goldBright, { bold: true });
    mm.text(e.text, 44, ry + 29, 10, THEME.parchmentEdge, { wrap: w - 54 });
  });
}

function drawStake(mm: ModalStage, stakeId: string | null | undefined): void {
  const w = mm.width;
  const top = stakeIndex(stakeId);
  const cur = STAKE_INFO[STAKE_IDS[top]];
  mm.rect(0, 50, 32, 32, hexNum(cur.color), { radius: 7, stroke: THEME.ink });
  mm.text(cur.name, 44, 52, 15, hexNum(cur.color), { bold: true });
  mm.text(top === 0 ? "The base difficulty." : `Difficulty tier ${top + 1} of ${STAKE_IDS.length}.`, 44, 73, 10, THEME.parchmentEdge);
  const rules = STAKE_IDS.slice(0, top + 1)
    .filter((id) => id !== "white")
    .map((id) => STAKE_INFO[id]);
  if (rules.length === 0) {
    mm.text("No extra rules — a clean ascent.", 0, 100, 11, THEME.parchmentEdge, { wrap: w });
    return;
  }
  let y = 100;
  for (const info of rules) {
    mm.rect(0, y + 3, 10, 10, hexNum(info.color), { radius: 3 });
    mm.text(info.text, 20, y, 10, THEME.parchmentLite, { wrap: w - 26 });
    y += 30;
  }
}

export default function PixiRunMap() {
  const open = useGame((s) => s.mapOpen);
  if (!open) return null;
  return <RunMapModal />;
}

function RunMapModal() {
  const hostRef = useRef<HTMLDivElement>(null);
  const modalRef = useRef<ModalStage | null>(null);
  const [tab, setTab] = useState<Tab>("styles");
  const tabRef = useRef<Tab>(tab);
  tabRef.current = tab;

  const rebuild = () => {
    const m = modalRef.current;
    if (!m) return;
    const run = useGame.getState().run;
    const royals = gauntletView(run);
    m.show({
      title: "The Descent",
      panelW: 588,
      panelH: 474,
      build: (mm) => {
        const w = mm.width;
        const tw = (w - 3 * 6) / 4;
        TABS.forEach(([id, label], i) => {
          const active = id === tabRef.current;
          mm.button(label, i * (tw + 6), 4, tw, 32, active ? THEME.gold : THEME.frameDim, true, () => setTab(id), 11);
        });
        const cur = tabRef.current;
        if (cur === "styles") drawStyles(mm, run.styleLevels);
        else if (cur === "opponents") drawOpponents(mm, royals, run.enemyIndex);
        else if (cur === "edicts") drawEdicts(mm, run.edicts);
        else drawStake(mm, run.stakeId);
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
        releaseApp(app);
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
      modal.onClose = () => useGame.getState().setMapOpen(false);
      modalRef.current = modal;
      rebuild();
    })();
    return () => {
      cancelled = true;
      const m = modalRef.current;
      modalRef.current = null;
      if (m) {
        m.destroy();
        releaseApp(m.app);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    rebuild();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  return <div ref={hostRef} className="pixi-modal-host" />;
}
