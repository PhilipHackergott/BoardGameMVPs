import { useEffect, useRef, useState } from "react";
import { Application, Assets, Container, Graphics, Sprite, Text, Texture } from "pixi.js";
import { useGame } from "./store";
import { contentMeta, makeCardFromTemplate, tarotById } from "../engine/index";
import { Card, PackKind } from "../engine/types";
import { ModalStage } from "../render/ui/modalStage";
import { buildCardFace } from "../render/cardFace";
import { CARD_W, CARD_H } from "../render/cardNode";
import { STYLE_ART_SLUG } from "../render/sidebarStage";
import { FightingStyleId } from "../engine/types";
import { PIXEL_FONT, THEME } from "../render/theme";
import { PACK_LABEL, SIZE_LABEL } from "./packMeta";
import { sfx } from "../audio/chiptune";
import { applyPixiFixes, releaseApp } from "../render/pixiFixes";
import { useTooltip } from "./tooltip";

applyPixiFixes();

// The pack-opening modal — a FULL-FELT takeover (the sidebar stays visible/interactive, the felt area
// is replaced). A bought pack enters `shop.openPack`; this reveals its contents on a ModalStage with a
// "crack open" scale-in transition. Joker/Relic/Card packs: tap a tile to keep it. Tarot & Spectral
// packs open over a fan of your deck's cards (the dealt 8-card hand) — a targeting consumable arms,
// then you tap a fan card to apply it; non-targeting ones apply on tap. ✕ / click-outside = skip.

const RARITY_ACCENT: Record<string, number> = { common: THEME.frameDim, uncommon: 0x5fb0e0, rare: 0xf2c14e };

function rankLabel(v: number): string {
  return v === 1 ? "Ace" : `${v}`;
}
function suitName(s: string | null): string {
  return s === "H" ? "Hearts" : s === "D" ? "Diamonds" : s === "C" ? "Clubs" : s === "S" ? "Spades" : "—";
}

// art dir per pack kind (mirrors CardArt: jokers / tarots / spectrals).
// Style packs contain drill IDs like "drill-spear" — there's no /art/tarots/drill-*.svg, so fall back
// to the existing fighting-style icon (matches HudLayer's pouch fallback).
function artUrl(kind: PackKind, id: string): string | null {
  if (kind === "relic") return `/art/jokers/${id}.svg`;
  if (kind === "tarot") return `/art/tarots/${id}.svg`;
  if (kind === "spectral") return `/art/spectrals/${id}.svg`;
  if (kind === "style" && id.startsWith("drill-")) {
    const slug = STYLE_ART_SLUG[id.slice(6) as FightingStyleId];
    return slug ? `/art/styles/${slug}.svg` : null;
  }
  return null;
}

export default function PixiPackModal() {
  const open = useGame((s) => !!s.run.shop?.openPack);
  if (!open) return null;
  return <PackModalApp />;
}

const TIP = Symbol("pack-pick");

interface FloatCard {
  view: Container;
  baseX: number;
  baseY: number;
  baseRot: number;
  phase: number;
}

function PackModalApp() {
  const hostRef = useRef<HTMLDivElement>(null);
  const modalRef = useRef<ModalStage | null>(null);
  const [armed, setArmed] = useState<string | null>(null); // a targeting consumable awaiting a fan card
  const armedRef = useRef<string | null>(armed);
  armedRef.current = armed;
  const texCache = useRef(new Map<string, Texture | null>());
  // Drawn-hand cards that bob/float each frame — gentle "in your hand" liveness rather than the rigid
  // fan-with-no-motion. Rebuilt each rebuild() call; the ticker just reads whatever's in here now.
  const floatCards = useRef<FloatCard[]>([]);
  // Pick-tile views (one per pack-content option) — so apply() can animate the chosen tile.
  const pickTiles = useRef<{ cid: string; view: Container; baseX: number; baseY: number }[]>([]);
  // FX layer for the apply-flash (target glow + particles) when a tarot/spectral lands on a hand card.
  const fxLayer = useRef<Container | null>(null);
  // FX timers we can clean up on close.
  const fxItems = useRef<{ g: Graphics; age: number; dur: number; step: (g: Graphics, t: number) => void; subject?: Container; baseScale?: number }[]>([]);

  const close = () => {
    setArmed(null);
    useTooltip.getState().hide(TIP);
    useGame.getState().dispatch({ type: "closePack" });
  };
  const apply = (contentId: string, targetCardId?: string) => {
    sfx.reward();
    if (targetCardId) {
      // Targeted pick (tarot/spectral landing on a card): flash the card before the pack resolves.
      const fc = floatCards.current.find((f) => (f.view as Container & { _cardId?: string })._cardId === targetCardId);
      if (fc) spawnApplyFx(fc);
      window.setTimeout(() => {
        useGame.getState().dispatch({ type: "pickPackContent", contentId, targetCardId });
        setArmed(null);
      }, 280);
    } else {
      // Untargeted pick (joker, card, style-pack drill): the CHOSEN TILE itself scales + glows before
      // the pack closes — clear "this one was selected" feedback.
      const tile = pickTiles.current.find((t) => t.cid === contentId);
      if (tile) spawnPickFx(tile);
      window.setTimeout(() => {
        useGame.getState().dispatch({ type: "pickPackContent", contentId, targetCardId });
        setArmed(null);
      }, 320);
    }
    useTooltip.getState().hide(TIP);
  };

  const spawnApplyFx = (fc: FloatCard): void => {
    const layer = fxLayer.current;
    if (!layer) return;
    const g = new Graphics();
    layer.addChild(g);
    fxItems.current.push({
      g, age: 0, dur: 0.55,
      step: (gr, t) => {
        gr.clear();
        const r = CARD_W * 0.5 + t * 16;
        const a = (1 - t) * 0.9;
        gr.roundRect(fc.baseX - r, fc.baseY - r * (CARD_H / CARD_W), r * 2, r * 2 * (CARD_H / CARD_W), 10).stroke({ width: 3, color: THEME.goldBright, alpha: a });
        // a couple of expanding sparkle rings inside
        for (let k = 0; k < 2; k++) {
          const tt = Math.max(0, t - k * 0.18);
          if (tt <= 0) continue;
          const rr = 6 + tt * 22;
          gr.circle(fc.baseX, fc.baseY, rr).stroke({ width: 1.5, color: THEME.parchmentLite, alpha: (1 - tt) * 0.6 });
        }
      },
    });
  };

  // The CHOSEN pick tile pops + glows: subject scales up then settles, a gold ring breathes around it.
  // Used for joker / card / drill (style) picks where there's no card to land on.
  const spawnPickFx = (tile: { view: Container; baseX: number; baseY: number }): void => {
    const layer = fxLayer.current;
    if (!layer) return;
    const baseScale = tile.view.scale.x || 1;
    const g = new Graphics();
    layer.addChild(g);
    fxItems.current.push({
      g, age: 0, dur: 0.36, subject: tile.view, baseScale,
      step: (gr, t) => {
        // ease-out scale bump: 1.0 → 1.25 → 1.12
        const k = t < 0.5 ? t * 2 : (1 - t) * 2;
        const s = baseScale * (1 + 0.22 * Math.sin(t * Math.PI));
        if (tile.view && !(tile.view as Container & { destroyed?: boolean }).destroyed) tile.view.scale.set(s);
        gr.clear();
        const a = (1 - t) * 0.9;
        const r = 48 + t * 24;
        gr.roundRect(tile.baseX - r, tile.baseY - r * 0.95, r * 2, r * 2, 12).stroke({ width: 3, color: THEME.goldBright, alpha: a });
        // a brief inner halo
        const ha = (1 - Math.abs(0.5 - t) * 2) * 0.5;
        gr.circle(tile.baseX, tile.baseY, 38 + k * 8).fill({ color: THEME.goldBright, alpha: ha * 0.18 });
      },
    });
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

  // The pickable "tile" — actually just the content's natural art at its native size, with a name
  // label below. No surrounding box — the icon/card IS the affordance. Effect text is a tooltip on
  // hover (routed via ModalStage.onHover → the shared tooltip surface).
  // Returns the cluster + the natural width of the "thing" (used for hit-box + spacing).
  const buildTile = (kind: PackKind, cid: string): { view: Container; w: number; h: number } => {
    const meta = contentMeta(kind, cid);
    const accent = meta.rarity ? RARITY_ACCENT[meta.rarity] ?? THEME.gold : THEME.gold;
    const c = new Container();
    let artW = 0, artH = 0;
    if (kind === "card") {
      // A new card joining the deck — show it AS the card face at natural felt-card scale.
      const face = buildCardFace(makeCardFromTemplate(cid, 0), CARD_W);
      face.position.set(0, 0);
      c.addChild(face);
      artW = CARD_W; artH = CARD_H;
    } else {
      // Tarot / Spectral / Style / Relic — render only the SVG art at its natural size (≈ 60px square)
      // anchored so its centre is the cluster's origin. A faint initial sits behind in case the SVG
      // hasn't loaded yet; once the texture arrives, loadArt drops the sprite on top.
      const badge = new Container();
      const initial = new Text({ text: (meta.name[0] ?? "?").toUpperCase(), style: { fill: accent, fontSize: 28, fontFamily: PIXEL_FONT, fontWeight: "700" } });
      initial.anchor.set(0.5);
      badge.addChild(initial);
      const url = artUrl(kind, cid);
      if (url) loadArt(url, badge, 64, 64);
      c.addChild(badge);
      artW = 64; artH = 64;
    }
    const name = new Text({ text: meta.name, style: { fill: THEME.goldBright, fontSize: 12, fontFamily: PIXEL_FONT, fontWeight: "700", align: "center", wordWrap: true, wordWrapWidth: Math.max(96, artW + 36) } });
    name.anchor.set(0.5, 0);
    name.position.set(0, artH / 2 + 8);
    c.addChild(name);
    return { view: c, w: artW, h: artH };
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

    // Hand cards: render at the FELT'S normal size (CARD_W) — readable + same as in combat.
    const fanCardW = CARD_W;
    const fanCardH = CARD_H;
    const fanH = isHandPack ? fanCardH + 28 : 0;

    floatCards.current = [];
    pickTiles.current = [];

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
            const spread = Math.min(fanCardW + 12, (w - 80) / Math.max(1, hand.length));
            const cx = w / 2 + (i - mid) * spread;
            const baseRot = (i - mid) * 0.04;
            const arcY = Math.abs(i - mid) * 3;
            const face = buildCardFace(c, fanCardW) as Container & { _cardId?: string };
            face._cardId = c.id;
            face.rotation = baseRot;
            if (armedNow) {
              const ring = new Graphics();
              ring.roundRect(-fanCardW / 2 - 3, -fanCardH / 2 - 3, fanCardW + 6, fanCardH + 6, 9).stroke({ width: 2.5, color: THEME.violet });
              face.addChildAt(ring, 0);
            }
            mm.node(face, cx, fy + arcY);
            const baseY = fy + arcY;
            floatCards.current.push({ view: face, baseX: cx, baseY, baseRot, phase: i * 0.55 });
            if (armedNow) {
              const cardTip = { title: `${rankLabel(c.value)} of ${suitName(c.suit)}`, text: `Apply the chosen ${pack.kind} to this card.` };
              mm.hit(cx - fanCardW / 2, baseY - fanCardH / 2, fanCardW, fanCardH, () => apply(armedNow, c.id), cardTip);
            }
          });
          rowY += fanH + 32;
        }

        // Pickable contents — no surrounding box. Tarot/Spectral/Style icons at natural size + name
        // label; card-pack picks render the card face. Tooltip on hover provides the effect text.
        const n = pack.contentIds.length;
        // Lay out by intrinsic width plus a comfortable gap (icons are smaller than the old tiles).
        const baseW = pack.kind === "card" ? CARD_W : 64;
        const slotW = Math.max(baseW + 56, 120); // hit-box wider than the art so hover/click is easy
        const totalW = n * slotW;
        const x0 = (w - totalW) / 2 + slotW / 2;
        const tilesY = Math.max(rowY + (pack.kind === "card" ? CARD_H / 2 : 32), Math.floor((panelH - (pack.kind === "card" ? CARD_H : 96)) / 2) - 8);
        pack.contentIds.forEach((cid, i) => {
          const tx = x0 + i * slotW;
          const { view, w: tw, h: th } = buildTile(pack.kind, cid);
          mm.node(view, tx, tilesY);
          pickTiles.current.push({ cid, view, baseX: tx, baseY: tilesY });
          const targets = isHandPack && !!tarotById(cid)?.target;
          const armedHere = armedNow === cid;
          if (targets) {
            mm.text(armedHere ? "↑ pick a card from the hand" : "tap, then a card", tx, tilesY + th / 2 + 38, 10, armedHere ? THEME.violet : THEME.parchmentEdge, { anchor: 0.5 });
          }
          // a violet ring around the armed pick so it's clear which one is "live"
          if (armedHere) {
            const ring = new Graphics();
            ring.roundRect(-tw / 2 - 6, -th / 2 - 6, tw + 12, th + 12, 8).stroke({ width: 2.5, color: THEME.violet });
            view.addChildAt(ring, 0);
          }
          // Hover tooltip — name + effect text routed to the shared tooltip surface
          const meta = contentMeta(pack.kind, cid);
          const tipType = pack.kind === "relic" ? "joker" : pack.kind === "card" ? "card" : pack.kind;
          const tip = { title: meta.name, text: meta.text, type: tipType, rarity: meta.rarity };
          // Generous hit-box around the art so the tooltip & click are forgiving.
          const hitW = Math.max(tw + 24, slotW - 12);
          const hitH = th + 56;
          mm.hit(tx - hitW / 2, tilesY - hitH * 0.45, hitW, hitH, () => {
            if (isHandPack && tarotById(cid)?.target) setArmed((cur) => (cur === cid ? null : cid));
            else apply(cid);
          }, tip);
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
      // Pack-pick hover → one shared tooltip surface (same one the DOM data-tip + Pixi modals use).
      // Anchors arrive in modal-canvas coords (1:1 with screen), so convert to viewport rect via the
      // canvas's bounding box.
      modal.onHover = (tip, rect) => {
        if (tip && rect) {
          const r = app.canvas.getBoundingClientRect();
          const scaleX = r.width / app.screen.width;
          const scaleY = r.height / app.screen.height;
          useTooltip.getState().show(TIP, {
            title: tip.title,
            text: tip.text,
            type: tip.type,
            rarity: tip.rarity,
            anchor: { left: r.left + rect.left * scaleX, right: r.left + rect.right * scaleX, top: r.top + rect.top * scaleY, height: rect.height * scaleY },
          });
        } else {
          useTooltip.getState().hide(TIP);
        }
      };
      modalRef.current = modal;
      // A dedicated FX layer above the modal content for apply flashes (the gold ring that fires when
      // a tarot/spectral lands on a chosen hand card).
      const fx = new Container();
      app.stage.addChild(fx);
      fxLayer.current = fx;
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
      // Continuous tick: drift the hand cards (gentle bob/sway) + drive the apply-flash fx.
      let floatTime = 0;
      const ticker = (t: { deltaMS: number }) => {
        const dt = t.deltaMS / 1000;
        floatTime += dt;
        for (const fc of floatCards.current) {
          const v = fc.view;
          if ((v as Container & { destroyed?: boolean }).destroyed) continue;
          v.y = fc.baseY + Math.sin(floatTime * 1.5 + fc.phase) * 2.4;
          v.x = fc.baseX + Math.cos(floatTime * 0.8 + fc.phase * 0.7) * 1.2;
          v.rotation = fc.baseRot + Math.sin(floatTime * 1.1 + fc.phase) * 0.012;
        }
        for (let i = fxItems.current.length - 1; i >= 0; i--) {
          const it = fxItems.current[i];
          it.age += dt;
          const tt = Math.min(1, it.age / it.dur);
          it.step(it.g, tt);
          if (tt >= 1) {
            // Restore the pick-fx subject's scale so it doesn't end frozen at the bump value.
            if (it.subject && it.baseScale != null && !(it.subject as Container & { destroyed?: boolean }).destroyed) {
              it.subject.scale.set(it.baseScale);
            }
            it.g.parent?.removeChild(it.g);
            it.g.destroy();
            fxItems.current.splice(i, 1);
          }
        }
      };
      app.ticker.add(ticker);
    })();
    return () => {
      cancelled = true;
      useTooltip.getState().hide(TIP);
      for (const it of fxItems.current) {
        it.g.parent?.removeChild(it.g);
        it.g.destroy();
      }
      fxItems.current = [];
      floatCards.current = [];
      pickTiles.current = [];
      fxLayer.current = null;
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
