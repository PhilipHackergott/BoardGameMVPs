// The unified Pixi modal shell. A modal mounts a full-window Pixi app while open (modals are blocking,
// so capturing every pointer event is correct) and renders: a dimmed backdrop, a centered framed panel
// with a title bar + close (✕), and a content area drawn by a callback via m.text()/m.button(). Clicking
// the backdrop (outside the panel) or the ✕ closes; the host also wires Esc. Stage-level geometry
// hit-testing (the felt/sidebar pattern). Content coords are RELATIVE to the panel's content area.

import { Application, Assets, Graphics, Container, Sprite, Text, Texture } from "pixi.js";
import { PIXEL_FONT, THEME, TITLE_FONT } from "../theme";
import { shade } from "./tokens";
import { drawButton } from "./pixiButton";
import { TextOpts, WiggleField } from "./wigglyText";

interface Hit {
  x: number;
  y: number;
  w: number;
  h: number;
  fn: () => void;
  hover?: boolean; // true for buttons (redraw to show a hover state); false for plain hit regions (cards)
  clip?: { x: number; y: number; w: number; h: number }; // only hittable inside this rect (scroll regions)
}

export interface ModalContent {
  title: string;
  panelW: number;
  panelH: number;
  build: (m: ModalStage) => void;
  dismissable?: boolean; // default true — ✕ + click-outside close; false for mandatory gates
  accent?: number; // panel frame + title tint (default gold)
}

const PAD = 20;
const HEADER_H = 50;

export class ModalStage {
  readonly app: Application;
  onClose?: () => void;

  private root = new Container();
  private target: Container; // where content helpers draw (root, or a scroll layer inside scroll())
  private clip: { x: number; y: number; w: number; h: number } | null = null; // active scroll-region clip for hits
  private scrollY = 0;
  private scrollRegion: { x: number; y: number; w: number; h: number; max: number } | null = null;
  private wig = new WiggleField();
  private wigTick = (tk: { deltaMS: number }) => this.wig.update(tk.deltaMS / 1000);
  private hits: Hit[] = [];
  private hoverIdx = -1;
  private sliders: { x: number; y: number; w: number; h: number; onChange: (v: number) => void }[] = [];
  private dragSlider: { x: number; w: number; onChange: (v: number) => void } | null = null;
  private content?: ModalContent;
  private panelX = 0;
  private panelY = 0;
  private cx = 0; // content-area origin (screen coords)
  private cy = 0;
  private innerW = 0;
  private texCache = new Map<string, Texture | null>(); // url → art texture (null = in-flight/failed)
  private onResize = () => this.draw();

  constructor(app: Application) {
    this.app = app;
    this.target = this.root;
    app.ticker.add(this.wigTick);
    app.stage.addChild(this.root);
    // mouse-wheel scrolls the active scroll region (Compendium / Past Runs)
    app.canvas.addEventListener("wheel", (e) => {
      if (!this.scrollRegion) return;
      const r = this.scrollRegion;
      // only when the pointer is over the region (canvas-relative ≈ screen for a full-window modal)
      const rect = app.canvas.getBoundingClientRect();
      const px = e.clientX - rect.left;
      const py = e.clientY - rect.top;
      if (px < r.x || px > r.x + r.w || py < r.y || py > r.y + r.h) return;
      e.preventDefault();
      this.scrollY = Math.max(0, Math.min(r.max, this.scrollY + e.deltaY));
      this.draw();
    }, { passive: false });
    app.stage.eventMode = "static";
    app.stage.hitArea = { contains: () => true } as { contains: () => boolean };
    app.stage.on("pointertap", (e) => {
      const h = this.hitAt(e.global.x, e.global.y);
      if (h) {
        h.fn();
      } else if (this.content && this.content.dismissable !== false && !this.insidePanel(e.global.x, e.global.y)) {
        this.onClose?.(); // click outside the panel = dismiss (Balatro)
      }
    });
    app.stage.on("pointerdown", (e) => {
      const s = this.sliders.find((sl) => e.global.x >= sl.x - 8 && e.global.x <= sl.x + sl.w + 8 && e.global.y >= sl.y - 10 && e.global.y <= sl.y + sl.h + 10);
      if (s) {
        this.dragSlider = { x: s.x, w: s.w, onChange: s.onChange };
        s.onChange(Math.max(0, Math.min(1, (e.global.x - s.x) / s.w)));
      }
    });
    const endDrag = () => {
      this.dragSlider = null;
    };
    app.stage.on("pointerup", endDrag);
    app.stage.on("pointerupoutside", endDrag);
    app.stage.on("globalpointermove", (e) => {
      if (this.dragSlider) {
        const d = this.dragSlider;
        this.app.stage.cursor = "pointer";
        d.onChange(Math.max(0, Math.min(1, (e.global.x - d.x) / d.w)));
        return;
      }
      const i = this.hitIndexAt(e.global.x, e.global.y);
      app.stage.cursor = i >= 0 ? "pointer" : "default";
      // Only buttons restyle on hover; plain hit regions (cards) don't, so moving across a big card
      // grid never triggers a full rebuild (which would churn textures — removeChildren doesn't destroy).
      const hoverBtn = i >= 0 && this.hits[i].hover ? i : -1;
      if (hoverBtn !== this.hoverIdx) {
        this.hoverIdx = hoverBtn;
        this.draw();
      }
    });
    app.renderer.on("resize", this.onResize);
  }

  /** The content area width (panel minus padding) — for laying out full-width rows. */
  get width(): number {
    return this.innerW;
  }

  show(content: ModalContent): void {
    if (content !== this.content) this.scrollY = 0; // reset scroll when the content object changes (new view/tab)
    this.content = content;
    this.draw();
  }

  // --- content helpers (coords relative to the content area top-left) ---
  text(s: string, x: number, y: number, size: number, color: number, opts: TextOpts = {}): void {
    this.wig.build(this.target, s, this.cx + x, this.cy + y, size, color, opts);
  }
  /** A word-wrapped paragraph (plain Text, not per-char wiggle). Returns its rendered height so callers
   *  can flow the next block beneath it — used for the Compendium's long-form rules prose. */
  para(s: string, x: number, y: number, w: number, size: number, color: number, opts: { bold?: boolean } = {}): number {
    const t = new Text({ text: s, style: { fill: color, fontSize: size, fontFamily: PIXEL_FONT, fontWeight: opts.bold ? "700" : "400", wordWrap: true, wordWrapWidth: w, lineHeight: size + 7, letterSpacing: 0.3 } });
    t.position.set(this.cx + x, this.cy + y);
    t.roundPixels = true;
    this.target.addChild(t);
    return t.height;
  }
  button(label: string, x: number, y: number, w: number, h: number, accent: number, enabled: boolean, fn: () => void, fontSize?: number): void {
    const sx = this.cx + x;
    const sy = this.cy + y;
    const hovered = this.hoverIdx === this.hits.length && enabled;
    drawButton(this.target, this.wig, label, sx, sy, w, h, { accent, enabled, hovered, fontSize });
    this.hits.push({ x: sx, y: sy, w, h, fn: enabled ? fn : () => {}, hover: true, clip: this.clip ?? undefined });
  }
  /** A pixel-art sprite from a URL, fit into (w,h) at (x,y) relative to the content area. Async-loaded + cached. */
  sprite(url: string, x: number, y: number, w: number, h: number): void {
    const tex = this.texCache.get(url);
    if (tex) {
      const s = new Sprite(tex);
      s.anchor.set(0.5);
      const sc = Math.min(w / tex.width, h / tex.height);
      s.scale.set(sc);
      s.position.set(this.cx + x + w / 2, this.cy + y + h / 2);
      s.roundPixels = true;
      this.target.addChild(s);
      return;
    }
    if (this.texCache.has(url)) return; // null = in-flight/failed
    this.texCache.set(url, null);
    void Assets.load(url)
      .then((t: Texture) => {
        if (t.source) t.source.scaleMode = "nearest";
        this.texCache.set(url, t);
        this.draw();
      })
      .catch(() => {});
  }
  /** A filled rounded rect (panel/chip/divider) at content-relative coords. */
  rect(x: number, y: number, w: number, h: number, color: number, opts: { alpha?: number; radius?: number; stroke?: number } = {}): void {
    const g = new Graphics();
    g.roundRect(this.cx + x, this.cy + y, w, h, opts.radius ?? 6).fill({ color, alpha: opts.alpha ?? 1 });
    if (opts.stroke !== undefined) g.stroke({ width: 1.5, color: opts.stroke });
    this.target.addChild(g);
  }
  /** Drop a pre-built display object (e.g. a card face) into the content area at content-relative
   *  coords. The object's own origin/anchor is preserved — pass the centre for an anchored sprite. */
  node(obj: Container, x: number, y: number): void {
    obj.position.set(this.cx + x, this.cy + y);
    this.target.addChild(obj);
  }
  /** Register a clickable region without drawing a button (e.g. a tappable card). Content-relative.
   *  No hover restyle — moving across many of these never forces a rebuild. */
  hit(x: number, y: number, w: number, h: number, fn: () => void): void {
    this.hits.push({ x: this.cx + x, y: this.cy + y, w, h, fn, hover: false, clip: this.clip ?? undefined });
  }
  /** A vertically-scrollable region: `build` draws the content (starting at y=0) into a masked layer;
   *  its height is MEASURED, so wrapped prose works without knowing the height up front. The wheel
   *  scrolls it. One scroll region per modal. */
  scroll(x: number, y: number, w: number, h: number, build: () => void): void {
    const ox = this.cx + x;
    const oy = this.cy + y;
    const layer = new Container();
    const mask = new Graphics();
    mask.rect(ox, oy, w, h).fill(0xffffff);
    layer.addChild(mask);
    layer.mask = mask;
    const inner = new Container(); // content lives here; inner.y applies the scroll offset
    layer.addChild(inner);
    this.root.addChild(layer);
    // draw content into `inner` at region-local coords (cy = oy); hits land at oy+y and are shifted by
    // the scroll offset once it's known/clamped below.
    const pT = this.target;
    const pCx = this.cx;
    const pCy = this.cy;
    const pClip = this.clip;
    const hitStart = this.hits.length;
    this.target = inner;
    this.cx = ox;
    this.cy = oy;
    this.clip = { x: ox, y: oy, w, h };
    build();
    this.target = pT;
    this.cx = pCx;
    this.cy = pCy;
    this.clip = pClip;
    // measure the rendered content, clamp the scroll, apply the offset, fix up the hit y's
    const contentH = inner.height;
    const max = Math.max(0, Math.ceil(contentH - h));
    this.scrollY = Math.min(this.scrollY, max);
    inner.y = -this.scrollY;
    for (let i = hitStart; i < this.hits.length; i++) this.hits[i].y -= this.scrollY;
    this.scrollRegion = { x: ox, y: oy, w, h, max };
    if (max > 0) {
      const thumbH = Math.max(24, (h / contentH) * h);
      const thumbY = oy + (this.scrollY / max) * (h - thumbH);
      const bar = new Graphics();
      bar.roundRect(ox + w + 4, oy, 5, h, 2).fill({ color: 0x140a1e });
      bar.roundRect(ox + w + 4, thumbY, 5, thumbH, 2).fill({ color: THEME.frameDim });
      this.root.addChild(bar);
    }
  }
  /** A draggable 0..1 slider track (content-relative). onChange fires live while dragging or on click. */
  slider(x: number, y: number, w: number, value01: number, accent: number, onChange: (v: number) => void): void {
    const sx = this.cx + x;
    const sy = this.cy + y;
    const h = 8;
    const v = Math.max(0, Math.min(1, value01));
    const track = new Graphics();
    track.roundRect(sx, sy, w, h, 4).fill({ color: 0x140a1e }).stroke({ width: 1.5, color: THEME.frameDim });
    if (v > 0.001) track.roundRect(sx, sy, w * v, h, 4).fill({ color: shade(accent, -0.15) });
    this.root.addChild(track);
    const thumb = new Graphics();
    thumb.circle(sx + w * v, sy + h / 2, 9).fill({ color: shade(accent, 0.3) }).stroke({ width: 2, color: THEME.ink });
    this.root.addChild(thumb);
    this.sliders.push({ x: sx, y: sy, w, h, onChange });
  }

  private inside(h: Hit, x: number, y: number): boolean {
    return x >= h.x && x <= h.x + h.w && y >= h.y && y <= h.y + h.h;
  }
  private insidePanel(x: number, y: number): boolean {
    const c = this.content;
    return !!c && x >= this.panelX && x <= this.panelX + c.panelW && y >= this.panelY && y <= this.panelY + c.panelH;
  }
  // Topmost-first: later-pushed hits draw on top (e.g. overlapping cards), so they win the click.
  // A hit inside a scroll region is only live while the point is within that region (clipped rows).
  private hitIndexAt(x: number, y: number): number {
    for (let i = this.hits.length - 1; i >= 0; i--) {
      const h = this.hits[i];
      if (h.clip && (x < h.clip.x || x > h.clip.x + h.clip.w || y < h.clip.y || y > h.clip.y + h.clip.h)) continue;
      if (this.inside(h, x, y)) return i;
    }
    return -1;
  }
  private hitAt(x: number, y: number): Hit | undefined {
    const i = this.hitIndexAt(x, y);
    return i >= 0 ? this.hits[i] : undefined;
  }

  private draw(): void {
    this.root.removeChildren();
    this.hits = [];
    this.sliders = [];
    this.target = this.root;
    this.clip = null;
    this.scrollRegion = null;
    this.wig.reset();
    const c = this.content;
    if (!c) return;
    const sw = this.app.screen.width;
    const sh = this.app.screen.height;

    // dimmed backdrop
    const bd = new Graphics();
    bd.rect(0, 0, sw, sh).fill({ color: 0x000000, alpha: 0.72 });
    this.root.addChild(bd);

    // centered panel
    this.panelX = Math.round((sw - c.panelW) / 2);
    this.panelY = Math.round((sh - c.panelH) / 2);
    const px = this.panelX;
    const py = this.panelY;
    const accent = c.accent ?? THEME.gold;
    const accentBright = shade(accent, 0.5);
    const panel = new Graphics();
    panel.roundRect(px - 3, py - 3, c.panelW + 6, c.panelH + 6, 16).fill(THEME.ink);
    panel.roundRect(px, py, c.panelW, c.panelH, 14).fill({ color: 0x140a1e }).stroke({ width: 3, color: accent });
    // header band
    panel.roundRect(px + 6, py + 6, c.panelW - 12, HEADER_H - 8, 9).fill({ color: shade(accent, -0.62) }).stroke({ width: 2, color: shade(accent, -0.2) });
    this.root.addChild(panel);
    this.wig.build(this.root, c.title, px + c.panelW / 2, py + 6 + (HEADER_H - 8) / 2, 19, accentBright, { font: TITLE_FONT, anchor: 0.5, anchorY: 0.5, bold: true });

    // close ✕ (top-right of the panel) — omitted for mandatory (non-dismissable) modals
    if (c.dismissable !== false) {
      const xw = 30;
      const xx = px + c.panelW - xw - 8;
      const xy = py + 10;
      const xHover = this.hoverIdx === this.hits.length;
      const xg = new Graphics();
      xg.roundRect(xx, xy, xw, xw, 6).fill({ color: xHover ? shade(THEME.blood, -0.4) : shade(THEME.blood, -0.62) }).stroke({ width: 2, color: THEME.blood });
      this.root.addChild(xg);
      this.wig.build(this.root, "✕", xx + xw / 2, xy + xw / 2, 14, shade(THEME.blood, 0.7), { anchor: 0.5, anchorY: 0.5, bold: true });
      this.hits.push({ x: xx, y: xy, w: xw, h: xw, fn: () => this.onClose?.(), hover: true });
    }

    // content area
    this.cx = px + PAD;
    this.cy = py + HEADER_H;
    this.innerW = c.panelW - PAD * 2;
    c.build(this);
  }

  destroy(): void {
    this.app.ticker.remove(this.wigTick);
    this.app.renderer.off("resize", this.onResize);
    this.root.destroy({ children: true });
  }
}
