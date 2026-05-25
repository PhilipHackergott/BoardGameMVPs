// Per-fighting-style attack animations for the combat felt. Each play spawns a Pixi-Graphics effect
// that ORIGINATES from the played cards and travels DIRECTIONALLY toward the royal (the sidebar HUD,
// top-left of the felt — the same target enemyHit() flies its damage streak to). The effect's size
// scales with the play's combo point total and its intensity with the damage dealt, so a fat combo /
// big hit reads as a heavier blow.
//
// Five size-styles (by card count) + a Mounted overlay (an Animal Companion rode along):
//   twoHanded (1)  — a single heavy overhead cleave
//   swordShield (2)— a slash with a shield-bash glint
//   spear (3)      — a fast piercing thrust
//   dualWield (4)  — twin crossing slashes
//   mage (5)       — an arcane bolt that detonates on impact
//   +mounted       — a low charging dust-streak overlay
//
// Self-contained: owns its own Graphics layer and a tiny timer; reuses the stage's Particles + shake.

import { Container, Graphics } from "pixi.js";
import { Particles } from "../fx";
import { clamp01, easeOutCubic, easeOutBack, lerp } from "../fx/easing";
import { FightingStyleId } from "../engine/types";

interface Elem {
  g: Graphics;
  age: number;
  dur: number;
  step: (g: Graphics, p: number) => void;
}

interface PlayOpts {
  style: FightingStyleId;
  mounted: boolean;
  ox: number; // origin (the played cards)
  oy: number;
  tx: number; // target (the royal / sidebar HUD)
  ty: number;
  power: number; // damage dealt → intensity
  value: number; // combo point total → size
  particles: Particles;
  shake: (amount: number) => void;
}

interface Geom {
  ox: number;
  oy: number;
  tx: number;
  ty: number;
  ux: number; // unit vector toward the target
  uy: number;
  px: number; // unit perpendicular
  py: number;
  dist: number;
  sizeK: number; // scales lengths/widths (from combo value)
  intK: number; // scales particle counts/speeds (from damage)
}

const PALETTE: Record<FightingStyleId, { edge: number; core: number; spark: number[] }> = {
  twoHanded: { edge: 0xf2c14e, core: 0xffffff, spark: [0xf2c14e, 0xffe9a0, 0xffffff] },
  swordShield: { edge: 0xb070e0, core: 0xffffff, spark: [0xb070e0, 0xd8b8f5, 0xffffff] },
  spear: { edge: 0xffe9a0, core: 0xffffff, spark: [0xffe9a0, 0xf2c14e, 0xffffff] },
  dualWield: { edge: 0xe04060, core: 0xffffff, spark: [0xc0273f, 0xe04060, 0xffffff] },
  mage: { edge: 0x5fb0e0, core: 0xe0f4ff, spark: [0x5fb0e0, 0x9fdcff, 0xffffff] },
  mounted: { edge: 0xd8b88a, core: 0xfff0c0, spark: [0xd8b88a, 0xf2c14e, 0xfff0c0] },
};

export class StyleFxLayer {
  readonly layer = new Container();
  private elems: Elem[] = [];
  private timers: { at: number; fn: () => void }[] = [];
  private clock = 0;
  private particles!: Particles;
  private shakeFn: (n: number) => void = () => {};

  private addElem(dur: number, step: (g: Graphics, p: number) => void): void {
    const g = new Graphics();
    this.layer.addChild(g);
    this.elems.push({ g, age: 0, dur, step });
  }

  private after(delay: number, fn: () => void): void {
    this.timers.push({ at: this.clock + delay, fn });
  }

  /** Fire the animation for one play. */
  play(o: PlayOpts): void {
    this.particles = o.particles;
    this.shakeFn = o.shake;
    const dx = o.tx - o.ox;
    const dy = o.ty - o.oy;
    const dist = Math.max(1, Math.hypot(dx, dy));
    const sizeK = 0.75 + Math.min(1.35, o.value / 12); // combo total → size
    const intK = 0.7 + Math.min(1.9, o.power / 26); // damage → intensity
    const geom: Geom = { ox: o.ox, oy: o.oy, tx: o.tx, ty: o.ty, ux: dx / dist, uy: dy / dist, px: -dy / dist, py: dx / dist, dist, sizeK, intK };

    // a small muzzle flash off the played cards so the strike reads as coming FROM them
    this.particles.burst(o.ox, o.oy, {
      count: Math.round(6 * intK),
      colors: PALETTE[o.style].spark,
      speed: 90 * intK,
      angle: Math.atan2(dy, dx),
      spread: Math.PI * 0.7,
      gravity: 0,
      life: 0.32,
      size: 2,
    });

    switch (o.style) {
      case "twoHanded": this.cleave(geom); break;
      case "swordShield": this.slashShield(geom); break;
      case "spear": this.thrust(geom); break;
      case "dualWield": this.dualWield(geom); break;
      case "mage": this.bolt(geom); break;
    }
    if (o.mounted) this.mountedCharge(geom);
  }

  // A directional moving streak from a tail point to a head point, head sliding origin→target.
  private streak(g: Geom, opts: { dur: number; len: number; width: number; edge: number; core: number; ease?: (t: number) => number; offset?: number }): void {
    const ease = opts.ease ?? easeOutCubic;
    const off = opts.offset ?? 0;
    this.addElem(opts.dur, (gr, p) => {
      const e = ease(p);
      const hx = lerp(g.ox, g.tx, e) + g.px * off;
      const hy = lerp(g.oy, g.ty, e) + g.py * off;
      const txp = hx - g.ux * opts.len;
      const typ = hy - g.uy * opts.len;
      const a = p < 0.65 ? 1 : clamp01((1 - p) / 0.35);
      gr.clear();
      gr.moveTo(txp, typ).lineTo(hx, hy).stroke({ width: opts.width, color: opts.edge, alpha: 0.9 * a });
      gr.moveTo(txp, typ).lineTo(hx, hy).stroke({ width: Math.max(1, opts.width * 0.4), color: opts.core, alpha: a });
    });
  }

  // impact spray at the royal, scaled by intensity
  private impact(g: Geom, colors: number[], extra = 1): void {
    this.after(0.14, () => {
      this.particles.burst(g.tx, g.ty, {
        count: Math.round(12 * g.intK * extra),
        colors,
        speed: 150 * g.intK,
        angle: Math.atan2(g.uy, g.ux),
        spread: Math.PI * 1.1,
        gravity: 60,
        life: 0.5,
        size: 3,
      });
      this.shakeFn(Math.min(0.4, 0.08 + g.intK * 0.12));
    });
  }

  private cleave(g: Geom): void {
    const pal = PALETTE.twoHanded;
    // one broad, heavy slash
    this.streak(g, { dur: 0.26, len: 34 * g.sizeK, width: 9 * g.sizeK, edge: pal.edge, core: pal.core });
    // a trailing crescent arc that swings across the path
    this.addElem(0.3, (gr, p) => {
      const e = easeOutCubic(p);
      const cx = lerp(g.ox, g.tx, e);
      const cy = lerp(g.oy, g.ty, e);
      const r = 16 * g.sizeK;
      const a = clamp01(1 - p);
      gr.clear();
      gr.arc(cx, cy, r, Math.atan2(g.uy, g.ux) - 1.1, Math.atan2(g.uy, g.ux) + 1.1).stroke({ width: 3 * g.sizeK, color: pal.core, alpha: a * 0.8 });
    });
    this.impact(g, pal.spark, 1.2);
  }

  private slashShield(g: Geom): void {
    const pal = PALETTE.swordShield;
    this.streak(g, { dur: 0.24, len: 28 * g.sizeK, width: 6 * g.sizeK, edge: pal.edge, core: pal.core });
    // a hexagonal shield glint pops off the cards (sword & board)
    this.addElem(0.34, (gr, p) => {
      const s = easeOutBack(clamp01(p / 0.5)) * (1 - clamp01((p - 0.5) / 0.5));
      const r = 11 * g.sizeK * s;
      gr.clear();
      if (r > 0.5) {
        const pts: number[] = [];
        for (let i = 0; i < 6; i++) {
          const ang = (i / 6) * Math.PI * 2 - Math.PI / 2;
          pts.push(g.ox + Math.cos(ang) * r, g.oy + Math.sin(ang) * r);
        }
        gr.poly(pts).fill({ color: 0x2c1c3c, alpha: 0.55 * s }).stroke({ width: 2, color: pal.edge, alpha: s });
      }
    });
    this.impact(g, pal.spark);
  }

  private thrust(g: Geom): void {
    const pal = PALETTE.spear;
    // fast, long, thin lance
    this.streak(g, { dur: 0.18, len: 46 * g.sizeK, width: 4 * g.sizeK, edge: pal.edge, core: pal.core });
    this.impact(g, pal.spark, 0.9);
  }

  private dualWield(g: Geom): void {
    const pal = PALETTE.dualWield;
    const off = 7 * g.sizeK;
    // two crossing blades, slightly staggered, on opposite sides of the line
    this.streak(g, { dur: 0.22, len: 30 * g.sizeK, width: 4 * g.sizeK, edge: pal.edge, core: pal.core, offset: off });
    this.after(0.05, () => this.streak(g, { dur: 0.22, len: 30 * g.sizeK, width: 4 * g.sizeK, edge: pal.edge, core: pal.core, offset: -off }));
    this.impact(g, pal.spark, 1.1);
  }

  private bolt(g: Geom): void {
    const pal = PALETTE.mage;
    // a glowing orb that flies to the target, trailing arcane sparks, then detonates
    this.addElem(0.3, (gr, p) => {
      const e = easeOutCubic(clamp01(p / 0.8));
      const cx = lerp(g.ox, g.tx, e);
      const cy = lerp(g.oy, g.ty, e);
      const grow = p < 0.8 ? 1 : clamp01((1 - p) / 0.2);
      const r = 7 * g.sizeK * grow;
      gr.clear();
      gr.circle(cx, cy, r * 1.9).fill({ color: pal.edge, alpha: 0.25 * grow });
      gr.circle(cx, cy, r).fill({ color: pal.edge, alpha: 0.7 * grow });
      gr.circle(cx, cy, r * 0.5).fill({ color: pal.core, alpha: grow });
      if (p < 0.8 && Math.random() < 0.8) {
        this.particles.burst(cx, cy, { count: 2, colors: pal.spark, speed: 40, spread: Math.PI * 2, gravity: 0, life: 0.4, size: 2 });
      }
    });
    // detonation
    this.after(0.24, () => {
      this.particles.burst(g.tx, g.ty, {
        count: Math.round(18 * g.intK),
        colors: pal.spark,
        speed: 170 * g.intK,
        spread: Math.PI * 2,
        gravity: 0,
        life: 0.6,
        size: 3,
        shape: "circle",
      });
      this.shakeFn(Math.min(0.5, 0.12 + g.intK * 0.14));
    });
  }

  // overlay: a low, fast charging dust-streak under the main strike (cavalry charge)
  private mountedCharge(g: Geom): void {
    const pal = PALETTE.mounted;
    for (let i = 0; i < 3; i++) {
      this.after(i * 0.04, () =>
        this.streak(g, { dur: 0.2, len: 22 * g.sizeK, width: 2.5 * g.sizeK, edge: pal.edge, core: pal.core, offset: (i - 1) * 5 * g.sizeK }),
      );
    }
    // dust kicked off the cards
    this.particles.burst(g.ox, g.oy, {
      count: Math.round(8 * g.intK),
      colors: pal.spark,
      speed: 70,
      angle: Math.atan2(g.uy, g.ux),
      spread: Math.PI * 0.5,
      gravity: 140,
      life: 0.5,
      size: 2,
    });
  }

  update(dt: number): void {
    this.clock += dt;
    for (let i = this.timers.length - 1; i >= 0; i--) {
      if (this.clock >= this.timers[i].at) {
        const fn = this.timers[i].fn;
        this.timers.splice(i, 1);
        fn();
      }
    }
    for (let i = this.elems.length - 1; i >= 0; i--) {
      const el = this.elems[i];
      el.age += dt;
      el.step(el.g, clamp01(el.age / el.dur));
      if (el.age >= el.dur) {
        el.g.destroy();
        this.elems.splice(i, 1);
      }
    }
  }

  /** Cancel + remove any in-flight effects (e.g. when a new turn supersedes the last). Keeps the
   *  layer; just clears its transient children so overlapping turns can't pile up Graphics. */
  reset(): void {
    for (const el of this.elems) el.g.destroy();
    this.elems = [];
    this.timers = [];
  }

  // Clear pending work only. The `layer` itself is owned by the stage's `world` container, which is
  // destroyed with `{ children: true }` — so destroying it here too would double-destroy it.
  destroy(): void {
    this.elems = [];
    this.timers = [];
  }
}
