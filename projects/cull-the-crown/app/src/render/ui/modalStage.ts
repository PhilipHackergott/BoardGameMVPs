// The unified Pixi modal shell. A modal mounts a full-window Pixi app while open (modals are blocking,
// so capturing every pointer event is correct) and renders: a dimmed backdrop, a centered framed panel
// with a title bar + close (✕), and a content area drawn by a callback via m.text()/m.button(). Clicking
// the backdrop (outside the panel) or the ✕ closes; the host also wires Esc. Stage-level geometry
// hit-testing (the felt/sidebar pattern). Content coords are RELATIVE to the panel's content area.

import { Application, Assets, Graphics, Container, Sprite, Texture } from "pixi.js";
import { THEME, TITLE_FONT } from "../theme";
import { shade } from "./tokens";
import { drawButton } from "./pixiButton";
import { TextOpts, WiggleField } from "./wigglyText";

interface Hit {
  x: number;
  y: number;
  w: number;
  h: number;
  fn: () => void;
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
  private wig = new WiggleField();
  private wigTick = (tk: { deltaMS: number }) => this.wig.update(tk.deltaMS / 1000);
  private hits: Hit[] = [];
  private hoverIdx = -1;
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
    app.ticker.add(this.wigTick);
    app.stage.addChild(this.root);
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
    app.stage.on("globalpointermove", (e) => {
      const i = this.hits.findIndex((h) => this.inside(h, e.global.x, e.global.y));
      if (i !== this.hoverIdx) {
        this.hoverIdx = i;
        app.stage.cursor = i >= 0 ? "pointer" : "default";
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
    this.content = content;
    this.draw();
  }

  // --- content helpers (coords relative to the content area top-left) ---
  text(s: string, x: number, y: number, size: number, color: number, opts: TextOpts = {}): void {
    this.wig.build(this.root, s, this.cx + x, this.cy + y, size, color, opts);
  }
  button(label: string, x: number, y: number, w: number, h: number, accent: number, enabled: boolean, fn: () => void, fontSize?: number): void {
    const sx = this.cx + x;
    const sy = this.cy + y;
    const hovered = this.hoverIdx === this.hits.length && enabled;
    drawButton(this.root, this.wig, label, sx, sy, w, h, { accent, enabled, hovered, fontSize });
    this.hits.push({ x: sx, y: sy, w, h, fn: enabled ? fn : () => {} });
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
      this.root.addChild(s);
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
    this.root.addChild(g);
  }

  private inside(h: Hit, x: number, y: number): boolean {
    return x >= h.x && x <= h.x + h.w && y >= h.y && y <= h.y + h.h;
  }
  private insidePanel(x: number, y: number): boolean {
    const c = this.content;
    return !!c && x >= this.panelX && x <= this.panelX + c.panelW && y >= this.panelY && y <= this.panelY + c.panelH;
  }
  private hitAt(x: number, y: number): Hit | undefined {
    return this.hits.find((h) => this.inside(h, x, y));
  }

  private draw(): void {
    this.root.removeChildren();
    this.hits = [];
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
      this.hits.push({ x: xx, y: xy, w: xw, h: xw, fn: () => this.onClose?.() });
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
