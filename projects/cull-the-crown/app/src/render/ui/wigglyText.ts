// The unified Pixi typeface — "living text" à la Balatro. Every headline/label/number is split into
// per-character glyphs that bob + tilt on a staggered phase, so text ripples like a gentle wave.
// A surface owns one WiggleField, rebuilds its labels each redraw (reset → build…), and ticks it every
// frame (update). Wrapped paragraphs stay a single Text (no wiggle). This is the shared kit module so
// the felt, sidebar, HUD and (Pixi) modals all read identically.

import { Container, Text } from "pixi.js";
import { PIXEL_FONT } from "../theme";

export interface TextOpts {
  font?: string;
  anchor?: number; // horizontal anchor 0..1
  anchorY?: number; // vertical anchor 0..1
  bold?: boolean;
  wrap?: number; // word-wrap width (wrapped text is a single Text, not per-character)
}

export class WiggleField {
  private glyphs: { t: Text; by: number; phase: number }[] = [];
  private seed = 0; // per-label phase offset, advanced as labels are built
  private time = 0;

  /** Clear the registry before a redraw (the caller then re-builds its labels). */
  reset(): void {
    this.glyphs = [];
    this.seed = 0;
  }

  /** Advance the wave; call once per frame with the elapsed seconds. */
  update(dtSec: number): void {
    this.time += dtSec;
    for (const w of this.glyphs) {
      w.t.rotation = Math.sin(this.time * 2.7 + w.phase) * 0.013;
      w.t.y = w.by + Math.sin(this.time * 2.1 + w.phase) * 0.45;
    }
  }

  /** Build a line of text into `parent`. Returns the node (a Text for wrapped, else a glyph Container). */
  build(parent: Container, s: string, x: number, y: number, size: number, color: number, opts: TextOpts = {}): Container {
    const style = { fill: color, fontSize: size, fontFamily: opts.font ?? PIXEL_FONT, fontWeight: (opts.bold ? "700" : "400") as "700" | "400", align: "left" as const, wordWrap: !!opts.wrap, wordWrapWidth: opts.wrap ?? 0, lineHeight: size + 3 };
    const ax = opts.anchor ?? 0;
    const ay = opts.anchorY ?? 0;
    if (opts.wrap) {
      const t = new Text({ text: s, style });
      t.anchor.set(ax, ay);
      t.position.set(x, y);
      parent.addChild(t);
      return t;
    }
    const cont = new Container();
    const chars: Text[] = [];
    let cx = 0;
    let maxH = 0;
    for (const ch of s) {
      const g = new Text({ text: ch, style });
      g.x = cx;
      cx += g.width;
      maxH = Math.max(maxH, g.height);
      cont.addChild(g);
      chars.push(g);
    }
    cont.pivot.set(cx * ax, maxH * ay);
    cont.position.set(x, y);
    parent.addChild(cont);
    const seed = this.seed;
    this.seed += 1.7;
    chars.forEach((g, i) => this.glyphs.push({ t: g, by: g.y, phase: seed + i * 0.5 }));
    return cont;
  }
}
