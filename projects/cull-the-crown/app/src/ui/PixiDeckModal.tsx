import { useEffect, useRef, useState } from "react";
import { Application, Graphics } from "pixi.js";
import { useGame } from "./store";
import { Card, Suit } from "../engine/types";
import { deckById, displayOrder } from "../engine/index";
import { sfx } from "../audio/chiptune";
import { ModalStage } from "../render/ui/modalStage";
import { buildCardFace } from "../render/cardFace";
import { SUIT_GLYPH, suitInkColor, THEME } from "../render/theme";
import { applyPixiFixes } from "../render/pixiFixes";

applyPixiFixes();

// The deck overview / card-picker, migrated onto the Pixi modal kit (was a DOM shell wrapping the
// PixiDeckRows canvas). ONE ModalStage app draws the whole thing: the Remaining/Full tabs (mid-fight),
// a left stats column (pets/cards/total + per-suit counts), a per-rank count column, and the four
// overlapping suit rows of real card faces (buildCardFace — identical to the felt). As a picker
// (remove a card / aim a tarot) a tap on a card runs the pending callback and flashes the chosen card.

const SUIT_ROWS: Suit[] = ["S", "H", "C", "D"];
const RANKS = [10, 9, 8, 7, 6, 5, 4, 3, 2, 1]; // 1 = Ace / Animal Companion (shown last)
const CARD_W = 52;
const PANEL_W = 940;
const PANEL_H = 540;
const CONTENT_H = PANEL_H - 50 /* header */ - 20 /* bottom pad */;

export default function PixiDeckModal() {
  const which = useGame((s) => s.pileModal);
  if (!which) return null;
  return <DeckModalApp />;
}

function DeckModalApp() {
  const hostRef = useRef<HTMLDivElement>(null);
  const modalRef = useRef<ModalStage | null>(null);
  const inCombat = useGame.getState().run.phase === "combat";
  const opened = useGame.getState().pileModal;
  const [tab, setTab] = useState<"remaining" | "full">(opened === "deck" && inCombat ? "remaining" : "full");
  const tabRef = useRef(tab);
  tabRef.current = tab;
  const flashRef = useRef<string | null>(null);

  const close = () => {
    const g = useGame.getState();
    g.setPileModal(null);
    g.setPendingPick(null);
  };

  const rebuild = () => {
    const m = modalRef.current;
    if (!m) return;
    const g = useGame.getState();
    const run = g.run;
    const which = g.pileModal;
    if (!which) return;
    const combat = run.phase === "combat";
    const used = which === "discard";
    const picking = !!g.pendingPick;
    const showTabs = !used && !picking && combat;
    const effTab = combat ? tabRef.current : "full";
    const all = [...run.deck, ...run.hand, ...run.discard, ...run.table];
    const cards = used ? [...run.discard, ...run.table] : picking || effTab === "full" ? all : run.deck;
    const variant = deckById(run.deckId);
    const title = used ? "Used Pile" : picking ? g.pickLabel ?? "Choose a Card" : "Your Deck";

    const pick = (c: Card) => {
      const gg = useGame.getState();
      if (!gg.pendingPick) return;
      sfx.reward();
      flashRef.current = c.id;
      rebuild(); // paint the chosen card's sparkle before it resolves
      gg.pendingPick(c.id); // applies the upgrade/removal + clears pendingPick + wildSuits
      gg.setPendingPick(null);
      window.setTimeout(() => useGame.getState().setPileModal(null), 760);
    };

    m.show({
      title,
      panelW: PANEL_W,
      panelH: PANEL_H,
      accent: picking ? THEME.violet : THEME.gold,
      build: (mm) => {
        const w = mm.width;
        // --- tabs (mid-fight) or the pick prompt ---
        if (showTabs) {
          mm.button("Remaining", 0, 2, 124, 30, effTab === "remaining" ? THEME.gold : THEME.frameDim, true, () => setTab("remaining"), 11);
          mm.button("Full Deck", 130, 2, 124, 30, effTab === "full" ? THEME.gold : THEME.frameDim, true, () => setTab("full"), 11);
        } else if (picking) {
          mm.text("Tap a card to choose it.", 0, 11, 12, THEME.parchmentEdge);
        }

        const topY = 44;
        const bodyH = CONTENT_H - topY;

        // --- left stats column ---
        const colW = 150;
        mm.rect(0, topY, colW, bodyH, 0x1c1430, { alpha: 0.9, radius: 8, stroke: THEME.frameDim });
        let sy = topY + 12;
        if (variant) {
          mm.text(variant.name, 12, sy, 11, THEME.goldBright, { bold: true, wrap: colW - 24 });
          sy += 28;
        }
        const companions = cards.filter((c) => c.kind === "companion").length;
        const numbers = cards.filter((c) => c.kind === "number").length;
        const jesters = cards.filter((c) => c.kind === "jester").length;
        mm.text("BASE CARDS", 12, sy, 9, THEME.parchmentEdge);
        sy += 18;
        mm.text(`❀  ${companions} Pets`, 14, sy, 12, 0xffffff);
        sy += 20;
        mm.text(`#  ${numbers} Cards`, 14, sy, 12, 0xffffff);
        sy += 20;
        mm.text(`∑  ${cards.length} Total`, 14, sy, 13, THEME.goldBright, { bold: true });
        sy += 28;
        SUIT_ROWS.forEach((s, i) => {
          const bx = 12 + (i % 2) * 70;
          const byy = sy + Math.floor(i / 2) * 30;
          const col = suitInkColor(s);
          mm.rect(bx, byy, 62, 24, 0x140a1e, { radius: 5, stroke: col });
          mm.text(SUIT_GLYPH[s], bx + 9, byy + 5, 13, col);
          mm.text(`${cards.filter((c) => c.suit === s).length}`, bx + 54, byy + 5, 13, 0xffffff, { anchor: 1, bold: true });
        });
        sy += 66;
        if (jesters > 0) mm.text(`★ ${jesters} Jester${jesters > 1 ? "s" : ""}`, 14, sy, 11, THEME.violet);

        // --- per-rank count column ---
        const rankX = colW + 12;
        const rankW = 44;
        const rankH = bodyH / RANKS.length;
        RANKS.forEach((v, i) => {
          const ry = topY + i * rankH;
          const cnt = cards.filter((c) => c.value === v).length;
          mm.rect(rankX, ry + 1, rankW, rankH - 3, cnt ? 0x241836 : 0x18101f, { radius: 4, stroke: cnt ? THEME.frameDim : 0x2a2036 });
          mm.text(v === 1 ? "A" : `${v}`, rankX + 8, ry + rankH / 2, 11, cnt ? THEME.goldBright : THEME.frameDim, { anchorY: 0.5 });
          mm.text(`${cnt}`, rankX + rankW - 8, ry + rankH / 2, 11, cnt ? 0xffffff : THEME.frameDim, { anchor: 1, anchorY: 0.5 });
        });

        // --- the four overlapping suit rows of card faces ---
        const gridX = rankX + rankW + 16;
        const gridW = w - gridX;
        const ch = Math.round((CARD_W * 58) / 40);
        const rowGap = bodyH / SUIT_ROWS.length;
        SUIT_ROWS.forEach((s, ri) => {
          const cy = topY + ri * rowGap + rowGap / 2;
          mm.text(SUIT_GLYPH[s], gridX - 4, cy, 20, suitInkColor(s), { anchor: 0.5, anchorY: 0.5 });
          const rowCards = displayOrder(cards.filter((c) => c.suit === s));
          const n = rowCards.length;
          const x0 = gridX + 24;
          const avail = gridW - 30;
          const spacing = n > 1 ? Math.min(CARD_W + 8, avail / n) : 0;
          rowCards.forEach((c, i) => {
            const cx = x0 + i * spacing + CARD_W / 2;
            const t = n > 1 ? (i / (n - 1)) * 2 - 1 : 0; // -1..1 across the row → a gentle arc
            const yy = cy + Math.abs(t) * 6;
            const face = buildCardFace(c, CARD_W);
            face.rotation = t * 0.05;
            if (flashRef.current === c.id) {
              const glow = new Graphics();
              glow.roundRect(-CARD_W / 2 - 5, -ch / 2 - 5, CARD_W + 10, ch + 10, 9).fill({ color: THEME.goldBright, alpha: 0.95 });
              face.addChildAt(glow, 0);
              face.scale.set(1.14);
            }
            mm.node(face, cx, yy);
            if (picking) mm.hit(cx - CARD_W / 2, yy - ch / 2, CARD_W, ch, () => pick(c));
          });
        });
      },
    });
  };

  // Mount one full-window Pixi modal app while open (mirrors PixiRunMap).
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
      modal.onClose = close;
      modalRef.current = modal;
      rebuild();
    })();
    // Esc closes (App.tsx doesn't route Esc to the pile modal).
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
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

  // Repaint on tab switch.
  useEffect(() => {
    rebuild();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  return <div ref={hostRef} className="pixi-modal-host" />;
}
