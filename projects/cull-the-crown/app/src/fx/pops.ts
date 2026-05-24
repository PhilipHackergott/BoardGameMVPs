// Floating text "pops" for Pixi v8 — damage numbers, "x2 CLUBS!", "+gold", etc. Each pop scales
// in with an overshoot, drifts upward, holds, then fades. Supports a start delay so a sequence of
// pops can be staggered into a satisfying cascade.

import { Container, Text } from "pixi.js";
import { clamp01, easeOutBack } from "./easing";

export interface PopOptions {
  color?: number;
  fontSize?: number;
  delay?: number; // seconds before it appears
  rise?: number; // px it floats up over its life
  life?: number; // seconds visible (after delay)
  drift?: number; // horizontal drift px
}

interface Pop {
  text: Text;
  x: number;
  y: number;
  age: number;
  delay: number;
  life: number;
  rise: number;
  drift: number;
}

export class Pops {
  readonly layer = new Container();
  private items: Pop[] = [];

  spawn(x: number, y: number, label: string, opts: PopOptions = {}): void {
    const text = new Text({
      text: label,
      style: {
        fill: opts.color ?? 0xffffff,
        fontSize: opts.fontSize ?? 30,
        fontFamily: "Georgia, 'Times New Roman', serif",
        fontWeight: "700",
        stroke: { color: 0x000000, width: 4 },
        align: "center",
      },
    });
    text.anchor.set(0.5);
    text.position.set(x, y);
    text.alpha = 0;
    text.scale.set(0);
    this.layer.addChild(text);
    this.items.push({
      text,
      x,
      y,
      age: 0,
      delay: opts.delay ?? 0,
      life: opts.life ?? 0.9,
      rise: opts.rise ?? 54,
      drift: opts.drift ?? 0,
    });
  }

  get busy(): boolean {
    return this.items.length > 0;
  }

  update(dt: number): void {
    for (let i = this.items.length - 1; i >= 0; i--) {
      const p = this.items[i];
      p.age += dt;
      const t = p.age - p.delay;
      if (t < 0) continue; // still delayed
      if (t >= p.life) {
        p.text.destroy();
        this.items.splice(i, 1);
        continue;
      }
      const k = clamp01(t / p.life);
      // scale in (first 30%), then hold
      const sIn = clamp01(t / (p.life * 0.3));
      p.text.scale.set(easeOutBack(sIn));
      // float up + drift
      p.text.position.set(p.x + p.drift * k, p.y - p.rise * k);
      // fade out over the last 40%
      p.text.alpha = k < 0.6 ? 1 : 1 - (k - 0.6) / 0.4;
    }
  }

  clear(): void {
    for (const p of this.items) p.text.destroy();
    this.items = [];
  }
}
