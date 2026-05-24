// A tiny, allocation-light particle system for Pixi v8. Burst confetti/sparks/embers on impact.
// Each particle is a small Graphics shape; we pool nothing fancy but destroy on death. Add the
// `.layer` to your stage once, then call `.burst()` and pump `.update(dt)` from your ticker.

import { Container, Graphics } from "pixi.js";

export interface BurstOptions {
  count?: number;
  colors?: number[];
  speed?: number; // base px/sec
  spread?: number; // angular spread in radians (full = 2π)
  angle?: number; // base direction
  gravity?: number; // px/sec^2 downward
  life?: number; // seconds
  size?: number; // px
  shape?: "rect" | "circle";
}

interface Particle {
  g: Graphics;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  spin: number;
  gravity: number;
}

export class Particles {
  readonly layer = new Container();
  private items: Particle[] = [];

  burst(x: number, y: number, opts: BurstOptions = {}): void {
    const count = opts.count ?? 18;
    const colors = opts.colors ?? [0xffffff];
    const speed = opts.speed ?? 260;
    const spread = opts.spread ?? Math.PI * 2;
    const baseAngle = opts.angle ?? -Math.PI / 2;
    const gravity = opts.gravity ?? 700;
    const life = opts.life ?? 0.7;
    const size = opts.size ?? 7;
    const shape = opts.shape ?? "rect";

    for (let i = 0; i < count; i++) {
      const g = new Graphics();
      const color = colors[(Math.random() * colors.length) | 0];
      if (shape === "circle") g.circle(0, 0, size / 2).fill(color);
      else g.rect(-size / 2, -size / 2, size, size).fill(color);
      g.position.set(x, y);
      const a = baseAngle + (Math.random() - 0.5) * spread;
      const sp = speed * (0.5 + Math.random());
      this.layer.addChild(g);
      this.items.push({
        g,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        life,
        maxLife: life,
        spin: (Math.random() - 0.5) * 12,
        gravity,
      });
    }
  }

  update(dt: number): void {
    for (let i = this.items.length - 1; i >= 0; i--) {
      const p = this.items[i];
      p.life -= dt;
      if (p.life <= 0) {
        p.g.destroy();
        this.items.splice(i, 1);
        continue;
      }
      p.vy += p.gravity * dt;
      p.g.x += p.vx * dt;
      p.g.y += p.vy * dt;
      p.g.rotation += p.spin * dt;
      const k = p.life / p.maxLife;
      p.g.alpha = k;
      p.g.scale.set(0.4 + 0.6 * k);
    }
  }

  clear(): void {
    for (const p of this.items) p.g.destroy();
    this.items = [];
  }
}
