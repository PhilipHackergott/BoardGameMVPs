import { useEffect, useRef } from "react";
import { Application, Container, Graphics, Text } from "pixi.js";
import { Card, Suit } from "../engine/types";
import { displayOrder } from "../engine/index";
import { buildCardFace } from "../render/cardFace";
import { applyPixiFixes } from "../render/pixiFixes";
import { PIXEL_FONT, suitInkColor, SUIT_GLYPH, THEME } from "../render/theme";

applyPixiFixes();

// The deck view's card grid, rendered in Pixi (the same card model as the felt): four suit rows of the
// deck's cards by rank, slightly OVERLAPPING so they read large (Balatro's Full-Deck view). When the
// modal is a picker, tapping a card fires onPick + the parent flashes it. A transparent canvas — the
// DOM modal provides the panel/stats around it.

const VW = 820;
const VH = 432;
const CARD_W = 66;
const SUIT_ROWS: Suit[] = ["S", "H", "C", "D"];

export default function PixiDeckRows({ cards, picking, onPick, flashId }: { cards: Card[]; picking: boolean; onPick: (id: string) => void; flashId: string | null }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<Application | null>(null);
  const rootRef = useRef<Container | null>(null);
  const hits = useRef<{ id: string; x: number; y: number; w: number; h: number }[]>([]);
  const cardsRef = useRef(cards);
  const flashRef = useRef(flashId);
  const pickingRef = useRef(picking);
  const onPickRef = useRef(onPick);
  cardsRef.current = cards;
  flashRef.current = flashId;
  pickingRef.current = picking;
  onPickRef.current = onPick;
  const relayout = useRef<() => void>(() => {});

  useEffect(() => {
    let cancelled = false;
    const app = new Application();
    void (async () => {
      await app.init({ width: VW, height: VH, backgroundAlpha: 0, antialias: false, roundPixels: true, resolution: 2, autoDensity: false, textureGCActive: false, renderableGCActive: false });
      if (cancelled) {
        app.destroy(true, { children: true });
        return;
      }
      const host = hostRef.current;
      if (host) {
        host.appendChild(app.canvas);
        app.canvas.style.width = "100%";
        app.canvas.style.height = "100%";
        app.canvas.style.display = "block";
        app.canvas.style.imageRendering = "pixelated";
      }
      const root = new Container();
      app.stage.addChild(root);
      app.stage.eventMode = "static";
      app.stage.hitArea = { contains: () => true } as { contains: () => boolean };
      app.stage.on("pointerdown", (e) => {
        if (!pickingRef.current) return;
        const gx = e.global.x;
        const gy = e.global.y;
        for (let i = hits.current.length - 1; i >= 0; i--) {
          const c = hits.current[i];
          if (Math.abs(gx - c.x) <= c.w / 2 && Math.abs(gy - c.y) <= c.h / 2) {
            onPickRef.current(c.id);
            return;
          }
        }
      });
      app.stage.cursor = picking ? "pointer" : "default";
      appRef.current = app;
      rootRef.current = root;

      relayout.current = () => {
        const r = rootRef.current;
        if (!r) return;
        r.removeChildren();
        hits.current = [];
        const h = Math.round((CARD_W * 58) / 40);
        const x0 = 46;
        const avail = VW - x0 - 20;
        const rowGap = (VH - 16) / SUIT_ROWS.length;
        SUIT_ROWS.forEach((s, ri) => {
          const cy = 8 + ri * rowGap + rowGap / 2;
          const pip = new Text({ text: SUIT_GLYPH[s], style: { fill: suitInkColor(s), fontSize: 24, fontFamily: PIXEL_FONT } });
          pip.anchor.set(0.5);
          pip.position.set(22, cy);
          r.addChild(pip);
          const rowCards = displayOrder(cardsRef.current.filter((c) => c.suit === s));
          const n = rowCards.length;
          const spacing = n > 1 ? Math.min(CARD_W + 6, avail / n) : 0;
          rowCards.forEach((c, i) => {
            const cx = x0 + i * spacing + CARD_W / 2;
            const t = n > 1 ? (i / (n - 1)) * 2 - 1 : 0; // -1..1 across the row
            const face = buildCardFace(c, CARD_W);
            face.position.set(cx, cy + Math.abs(t) * 7); // a gentle downward arc at the ends
            face.rotation = t * 0.05;
            if (flashRef.current === c.id) {
              const glow = new Graphics();
              glow.roundRect(-CARD_W / 2 - 5, -h / 2 - 5, CARD_W + 10, h + 10, 9).fill({ color: THEME.goldBright, alpha: 0.95 });
              face.addChildAt(glow, 0);
              face.scale.set(1.14);
            }
            r.addChild(face);
            hits.current.push({ id: c.id, x: cx, y: cy + Math.abs(t) * 7, w: CARD_W, h });
          });
        });
      };
      relayout.current();
    })();
    return () => {
      cancelled = true;
      const a = appRef.current;
      appRef.current = null;
      rootRef.current = null;
      if (a) a.destroy(true, { children: true });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (appRef.current) appRef.current.stage.cursor = picking ? "pointer" : "default";
    relayout.current();
  }, [cards, flashId, picking]);

  return <div className="pixi-deck-rows" ref={hostRef} />;
}
