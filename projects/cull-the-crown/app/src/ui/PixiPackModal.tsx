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
const PAD = 20; // matches ModalStage.PAD — content origin offset inside an implied panel

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

  // The pickable "tile" — playing-card-sized art with the name below. Tarot/Spectral/Style/Relic
  // render in a portrait-card shape (the size of a playing card but slightly more vertical) so the
  // pack-reveal reads as "pick a card from the spread" the way Balatro does.
  const TILE_W = 50;
  const TILE_H = 78; // playing-card size (44×62) but slightly more vertical for tarot reveal feel
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
      // Tarot / Spectral / Style / Relic — portrait card frame with the art inside.
      const frame = new Graphics();
      frame.roundRect(-TILE_W / 2, -TILE_H / 2, TILE_W, TILE_H, 5).fill({ color: 0x140a1e }).stroke({ width: 1.5, color: accent });
      c.addChild(frame);
      const badge = new Container();
      const initial = new Text({ text: (meta.name[0] ?? "?").toUpperCase(), style: { fill: accent, fontSize: 20, fontFamily: PIXEL_FONT, fontWeight: "700" } });
      initial.anchor.set(0.5);
      badge.addChild(initial);
      const url = artUrl(kind, cid);
      if (url) loadArt(url, badge, TILE_W - 12, TILE_H - 12);
      c.addChild(badge);
      artW = TILE_W; artH = TILE_H;
    }
    const name = new Text({ text: meta.name, style: { fill: THEME.goldBright, fontSize: 11, fontFamily: PIXEL_FONT, fontWeight: "700", align: "center", wordWrap: true, wordWrapWidth: Math.max(96, artW + 36) } });
    name.anchor.set(0.5, 0);
    name.position.set(0, artH / 2 + 6);
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

    // FULL-canvas panel so we can centre everything against the felt area (not against a smaller
    // implied panel inside it). Bare mode still suppresses the panel frame; modalStage paints a
    // dim backdrop so the picks stand out from the shop tray behind.
    const canvasW = m.app.screen.width;
    const canvasH = m.app.screen.height;
    const panelW = canvasW;
    const panelH = canvasH;

    // Hand cards: FELT-normal size (so they read as "your cards"). Hand-pack only.
    const fanCardW = CARD_W;
    const fanCardH = CARD_H;

    floatCards.current = [];
    pickTiles.current = [];

    m.show({
      title: `${PACK_LABEL[pack.kind]}`,
      panelW,
      panelH,
      bare: true,
      accent: armedNow ? THEME.violet : THEME.gold,
      build: (mm) => {
        // Use the FULL canvas for positioning so things sit visually at the middle of the felt area,
        // not the middle of a smaller "panel". mm.width is panelW − 2·PAD, so adjust by adding back.
        const innerW = mm.width + PAD * 2;
        const cx = innerW / 2 - PAD; // offset so x=cx ends up at the canvas centre

        // --- title block ---
        mm.text(PACK_LABEL[pack.kind], cx, 4, 18, THEME.goldBright, { anchor: 0.5, bold: true });
        const sub = [SIZE_LABEL[pack.size], `choose ${pack.picksRemaining} of ${pack.contentIds.length}`].filter(Boolean).join(" · ");
        mm.text(sub, cx, 30, 12, THEME.parchmentEdge, { anchor: 0.5 });

        // --- hand (hand-packs only): centred horizontally, slightly above the vertical centre ---
        // Slightly-above-centre = canvasH * 0.34; vertical centre would be 0.5.
        const handY = isHandPack ? Math.floor(canvasH * 0.34) - PAD : 0;
        if (isHandPack) {
          mm.text(armedNow ? "▾ pick a card to apply to" : "cards drawn from your deck", cx, handY - fanCardH / 2 - 14, 11, armedNow ? THEME.violet : THEME.parchmentEdge, { anchor: 0.5 });
          const mid = (hand.length - 1) / 2;
          if (hand.length === 0) mm.text("Your deck is empty.", cx, handY, 13, THEME.frameDim, { anchor: 0.5 });
          hand.forEach((c: Card, i) => {
            const spread = Math.min(fanCardW + 10, (innerW - 80) / Math.max(1, hand.length));
            const cxi = cx + (i - mid) * spread;
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
            mm.node(face, cxi, handY + arcY);
            const baseY = handY + arcY;
            floatCards.current.push({ view: face, baseX: cxi, baseY, baseRot, phase: i * 0.55 });
            if (armedNow) {
              const cardTip = { title: `${rankLabel(c.value)} of ${suitName(c.suit)}`, text: `Apply the chosen ${pack.kind} to this card.` };
              // Hand-card hit-box is EXACTLY the card rect (no expansion) so a tile click below doesn't
              // bleed up into the hand. Without this the armed tarot couldn't be applied → user bug.
              mm.hit(cxi - fanCardW / 2, baseY - fanCardH / 2, fanCardW, fanCardH, () => apply(armedNow, c.id), cardTip);
            }
          });
        }

        // --- pick tiles: centred horizontally, BELOW the hand (or mid-screen for non-hand packs) ---
        const n = pack.contentIds.length;
        // Card packs use the felt-card size; everything else uses TILE_W/H from buildTile.
        const usingCardSize = pack.kind === "card";
        const tileW = usingCardSize ? CARD_W : 50;
        const tileH = usingCardSize ? CARD_H : 78;
        const slotW = tileW + 26; // gap between tiles
        const totalW = n * slotW;
        const tilesX0 = cx - totalW / 2 + slotW / 2;
        const tilesY = isHandPack
          ? handY + fanCardH / 2 + 30 + tileH / 2 // below the hand row
          : Math.floor(canvasH * 0.5) - PAD; // mid-screen for joker/card/style packs
        pack.contentIds.forEach((cid, i) => {
          const tx = tilesX0 + i * slotW;
          const { view, w: tw, h: th } = buildTile(pack.kind, cid);
          mm.node(view, tx, tilesY);
          pickTiles.current.push({ cid, view, baseX: tx, baseY: tilesY });
          const targets = isHandPack && !!tarotById(cid)?.target;
          const armedHere = armedNow === cid;
          if (targets) {
            mm.text(armedHere ? "↑ pick a card from the hand" : "tap, then a card", tx, tilesY + th / 2 + 24, 10, armedHere ? THEME.violet : THEME.parchmentEdge, { anchor: 0.5 });
          }
          if (armedHere) {
            const ring = new Graphics();
            ring.roundRect(-tw / 2 - 6, -th / 2 - 6, tw + 12, th + 12, 8).stroke({ width: 2.5, color: THEME.violet });
            view.addChildAt(ring, 0);
          }
          const meta = contentMeta(pack.kind, cid);
          const tipType = pack.kind === "relic" ? "joker" : pack.kind === "card" ? "card" : pack.kind;
          const tip = { title: meta.name, text: meta.text, type: tipType, rarity: meta.rarity };
          // Hit-box hugs the tile (with a tiny pad for hover ease) — NO upward expansion so a hand-card
          // sitting above never gets blocked by a tile's hit area.
          mm.hit(tx - tw / 2 - 4, tilesY - th / 2 - 4, tw + 8, th + 36, () => {
            if (isHandPack && tarotById(cid)?.target) setArmed((cur) => (cur === cid ? null : cid));
            else apply(cid);
          }, tip);
        });

        // Skip button — bare mode has no ✕, this is the deliberate way out.
        const skipW = 120;
        const skipH = 34;
        const skipX = cx - skipW / 2;
        const skipY = canvasH - skipH - 24 - PAD;
        mm.button("Skip ▸", skipX, skipY, skipW, skipH, THEME.frameDim, true, close, 13);
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
