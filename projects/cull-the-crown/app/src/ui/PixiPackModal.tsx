import { useEffect, useRef, useState } from "react";
import { Application, Assets, Container, Graphics, Sprite, Text, Texture } from "pixi.js";
import { useGame } from "./store";
import { contentMeta, makeCardFromTemplate, tarotById } from "../engine/index";
import { Card, PackKind } from "../engine/types";
import { ModalStage } from "../render/ui/modalStage";
import { buildCardFace } from "../render/cardFace";
import { PIXEL_FONT, THEME } from "../render/theme";
import { PACK_LABEL, SIZE_LABEL } from "./packMeta";
import { sfx } from "../audio/chiptune";
import { applyPixiFixes, releaseApp } from "../render/pixiFixes";

applyPixiFixes();

// The pack-opening modal — a FULL-FELT takeover (the sidebar stays visible/interactive, the felt area
// is replaced). A bought pack enters `shop.openPack`; this reveals its contents on a ModalStage with a
// "crack open" scale-in transition. Joker/Relic/Card packs: tap a tile to keep it. Tarot & Spectral
// packs open over a fan of your deck's cards (the dealt 8-card hand) — a targeting consumable arms,
// then you tap a fan card to apply it; non-targeting ones apply on tap. ✕ / click-outside = skip.

const RARITY_ACCENT: Record<string, number> = { common: THEME.frameDim, uncommon: 0x5fb0e0, rare: 0xf2c14e };

// art dir per pack kind (mirrors CardArt: jokers / tarots / spectrals)
function artUrl(kind: PackKind, id: string): string | null {
  if (kind === "relic") return `/art/jokers/${id}.svg`;
  if (kind === "tarot") return `/art/tarots/${id}.svg`;
  if (kind === "spectral") return `/art/spectrals/${id}.svg`;
  return null;
}

export default function PixiPackModal() {
  const open = useGame((s) => !!s.run.shop?.openPack);
  if (!open) return null;
  return <PackModalApp />;
}

function PackModalApp() {
  const hostRef = useRef<HTMLDivElement>(null);
  const modalRef = useRef<ModalStage | null>(null);
  const [armed, setArmed] = useState<string | null>(null); // a targeting consumable awaiting a fan card
  const armedRef = useRef<string | null>(armed);
  armedRef.current = armed;
  const texCache = useRef(new Map<string, Texture | null>());

  const close = () => {
    setArmed(null);
    useGame.getState().dispatch({ type: "closePack" });
  };
  const apply = (contentId: string, targetCardId?: string) => {
    sfx.reward();
    useGame.getState().dispatch({ type: "pickPackContent", contentId, targetCardId });
    setArmed(null);
  };

  // load (and cache) a pixel-art texture, dropping it into `into` once ready; redraws on arrival.
  const loadArt = (url: string, into: Container, w: number, h: number) => {
    const cache = texCache.current;
    const tex = cache.get(url);
    if (tex) {
      const s = new Sprite(tex);
      s.anchor.set(0.5);
      s.scale.set(Math.min(w / tex.width, h / tex.height));
      s.position.set(0, 0);
      s.roundPixels = true;
      into.addChild(s);
      return;
    }
    if (cache.has(url)) return; // in-flight / failed
    cache.set(url, null);
    void Assets.load(url)
      .then((t: Texture) => {
        if (t.source) t.source.scaleMode = "nearest";
        cache.set(url, t);
        rebuild();
      })
      .catch(() => {});
  };

  // a framed content tile (frame + art|cardface + name + text), self-contained so it fades in as a unit
  const buildTile = (kind: PackKind, cid: string, w: number, h: number): Container => {
    const meta = contentMeta(kind, cid);
    const accent = meta.rarity ? RARITY_ACCENT[meta.rarity] ?? THEME.gold : THEME.gold;
    const c = new Container();
    const frame = new Graphics();
    frame.roundRect(-w / 2, 0, w, h, 8).fill({ color: 0x1c1430, alpha: 0.96 }).stroke({ width: 2, color: accent });
    c.addChild(frame);
    if (kind === "card") {
      const face = buildCardFace(makeCardFromTemplate(cid, 0), 60);
      face.position.set(0, 46);
      c.addChild(face);
    } else {
      // art badge (with a fallback initial behind it)
      const badge = new Container();
      badge.position.set(0, 40);
      const initial = new Text({ text: (meta.name[0] ?? "?").toUpperCase(), style: { fill: accent, fontSize: 22, fontFamily: PIXEL_FONT, fontWeight: "700" } });
      initial.anchor.set(0.5);
      badge.addChild(initial);
      const url = artUrl(kind, cid);
      if (url) loadArt(url, badge, 52, 52);
      c.addChild(badge);
    }
    const name = new Text({ text: meta.name, style: { fill: THEME.goldBright, fontSize: 11, fontFamily: PIXEL_FONT, fontWeight: "700", align: "center", wordWrap: true, wordWrapWidth: w - 12 } });
    name.anchor.set(0.5, 0);
    name.position.set(0, h - 56);
    c.addChild(name);
    const text = new Text({ text: meta.text, style: { fill: THEME.parchmentEdge, fontSize: 8.5, fontFamily: PIXEL_FONT, align: "center", wordWrap: true, wordWrapWidth: w - 14 } });
    text.anchor.set(0.5, 0);
    text.position.set(0, h - 38);
    c.addChild(text);
    return c;
  };

  const rebuild = () => {
    const m = modalRef.current;
    if (!m) return;
    const run = useGame.getState().run;
    const pack = run.shop?.openPack;
    if (!pack) return;
    const isHandPack = pack.kind === "tarot" || pack.kind === "spectral";
    const hand = run.hand;
    const armedNow = armedRef.current;

    // FULL-FELT panel: fill the bounded canvas (which is the felt area in CSS — the sidebar is a
    // separate column). Pad in so the panel breathes against the edges of the screen.
    const canvasW = m.app.screen.width;
    const canvasH = m.app.screen.height;
    const panelW = Math.max(400, canvasW - 48);
    const panelH = Math.max(360, canvasH - 48);

    // Card / tile sizes scale with the panel — "normal sized" cards (no longer the cramped 46px fan).
    const tileW = Math.min(176, Math.max(132, Math.floor(panelW / Math.max(4, pack.contentIds.length + 0.6))));
    const tileH = Math.round(tileW * 1.22);
    const gap = Math.round(tileW * 0.1);
    const fanCardW = 84; // matches the "normal" felt-hand size, scaled up from the old 46
    const fanCardH = Math.round((fanCardW * 58) / 40);
    const fanH = isHandPack ? fanCardH + 28 : 0;

    m.show({
      title: `${PACK_LABEL[pack.kind]}`,
      panelW,
      panelH,
      accent: armedNow ? THEME.violet : THEME.gold,
      build: (mm) => {
        const w = mm.width;
        const sub = [SIZE_LABEL[pack.size], `choose ${pack.picksRemaining} of ${pack.contentIds.length}`].filter(Boolean).join(" · ");
        mm.text(sub, w / 2, 10, 13, THEME.parchmentEdge, { anchor: 0.5 });

        let rowY = 44;
        if (isHandPack) {
          mm.text(armedNow ? "▾ pick a card to apply to" : "cards drawn from your deck", w / 2, rowY, 12, armedNow ? THEME.violet : THEME.parchmentEdge, { anchor: 0.5 });
          const fy = rowY + 24 + fanCardH / 2;
          const mid = (hand.length - 1) / 2;
          if (hand.length === 0) mm.text("Your deck is empty.", w / 2, fy, 13, THEME.frameDim, { anchor: 0.5 });
          hand.forEach((c: Card, i) => {
            const spread = Math.min(fanCardW + 14, (w - 80) / Math.max(1, hand.length));
            const cx = w / 2 + (i - mid) * spread;
            const face = buildCardFace(c, fanCardW);
            face.rotation = (i - mid) * 0.05;
            face.y = Math.abs(i - mid) * 5;
            if (armedNow) {
              const ring = new Graphics();
              ring.roundRect(-fanCardW / 2 - 3, -fanCardH / 2 - 3, fanCardW + 6, fanCardH + 6, 9).stroke({ width: 2.5, color: THEME.violet });
              face.addChildAt(ring, 0);
            }
            mm.node(face, cx, fy);
            if (armedNow) mm.hit(cx - fanCardW / 2, fy - fanCardH / 2, fanCardW, fanCardH, () => apply(armedNow, c.id));
          });
          rowY += fanH + 24;
        }

        // the pickable contents — laid out big and centred across the remaining vertical space
        const n = pack.contentIds.length;
        const totalW = n * (tileW + gap) - gap;
        const x0 = (w - totalW) / 2 + tileW / 2;
        const tilesY = Math.max(rowY, Math.floor((panelH - tileH) / 2) - 8);
        pack.contentIds.forEach((cid, i) => {
          const tx = x0 + i * (tileW + gap);
          const tile = buildTile(pack.kind, cid, tileW, tileH);
          mm.node(tile, tx, tilesY);
          const targets = isHandPack && !!tarotById(cid)?.target;
          if (targets) {
            mm.text(armedNow === cid ? "↑ pick a card from the hand" : "tap, then a card", tx, tilesY + tileH - 14, 10, armedNow === cid ? THEME.violet : THEME.parchmentEdge, { anchor: 0.5 });
          }
          mm.hit(tx - tileW / 2, tilesY, tileW, tileH, () => {
            if (isHandPack && tarotById(cid)?.target) setArmed((cur) => (cur === cid ? null : cid));
            else apply(cid);
          });
        });
      },
    });
  };

  useEffect(() => {
    let cancelled = false;
    const app = new Application();
    void (async () => {
      const host = hostRef.current;
      // Bind the canvas to the FELT host (the .combat-field div) so the pack take-over covers the felt
      // area only — the sidebar column stays untouched.
      await app.init({ resizeTo: host ?? window, backgroundAlpha: 0, antialias: false, roundPixels: true, resolution: Math.min(3, Math.max(2, Math.round(window.devicePixelRatio || 2))), autoDensity: true });
      try {
        await Promise.all([document.fonts.load("12px 'Silkscreen'"), document.fonts.load("16px 'Press Start 2P'")]);
      } catch {
        /* system font fallback */
      }
      if (cancelled) {
        releaseApp(app);
        return;
      }
      if (host) {
        host.appendChild(app.canvas);
        const cv = app.canvas;
        cv.style.position = "absolute";
        cv.style.inset = "0";
        cv.style.width = "100%";
        cv.style.height = "100%";
        cv.style.zIndex = "60"; // above the felt + DeckPeek (44), below any global tooltip (9500)
        cv.style.imageRendering = "pixelated";
      }
      const modal = new ModalStage(app);
      modal.onClose = close;
      modalRef.current = modal;
      rebuild();
      // Crack-open transition — scale + fade so the pack feels like it's bursting onto the felt.
      app.stage.alpha = 0;
      app.stage.scale.set(0.86);
      app.stage.position.set(app.screen.width * 0.07, app.screen.height * 0.07);
      const start = performance.now();
      const ease = (t: number) => 1 - Math.pow(1 - t, 3); // ease-out cubic
      const animate = () => {
        const t = Math.min(1, (performance.now() - start) / 320);
        const k = ease(t);
        app.stage.alpha = k;
        const s = 0.86 + 0.14 * k;
        app.stage.scale.set(s);
        const off = (1 - s) * 0.5;
        app.stage.position.set(app.screen.width * off, app.screen.height * off);
        if (t >= 1) {
          app.stage.position.set(0, 0);
          app.stage.scale.set(1);
          app.ticker.remove(animate);
        }
      };
      app.ticker.add(animate);
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

  // repaint when the armed target changes
  useEffect(() => {
    rebuild();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [armed]);

  return <div ref={hostRef} className="pixi-modal-host" />;
}
