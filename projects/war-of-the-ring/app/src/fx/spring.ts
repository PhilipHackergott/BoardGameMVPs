// A critically-tunable numeric spring — pure math, no dependencies. This is the workhorse of
// "juicy" motion: instead of tweening to a target over a fixed duration, a value chases its
// target with stiffness + damping, so it accelerates, overshoots a little, and settles. Drive
// any sprite property (x, y, rotation, scale) with one of these.
//
// Reusable across the whole factory — it knows nothing about Pixi or the DOM.

export interface SpringOpts {
  stiffness?: number; // higher = snappier
  damping?: number; // higher = less overshoot
  precision?: number; // settle threshold
}

export class Spring {
  value: number;
  target: number;
  velocity = 0;
  private stiffness: number;
  private damping: number;
  private precision: number;

  constructor(value = 0, opts: SpringOpts = {}) {
    this.value = value;
    this.target = value;
    this.stiffness = opts.stiffness ?? 170;
    this.damping = opts.damping ?? 18;
    this.precision = opts.precision ?? 0.01;
  }

  /** Set a new target to chase. */
  to(target: number): void {
    this.target = target;
  }

  /** Jump instantly to a value (no motion). */
  snap(value: number): void {
    this.value = value;
    this.target = value;
    this.velocity = 0;
  }

  /** Give the spring a velocity kick (e.g. on click) for extra life. */
  kick(velocity: number): void {
    this.velocity += velocity;
  }

  get atRest(): boolean {
    return Math.abs(this.velocity) < this.precision && Math.abs(this.value - this.target) < this.precision;
  }

  /** Advance by dt seconds. Returns the new value. Stable for dt up to ~1/30s; we sub-step. */
  update(dt: number): number {
    // sub-step for stability under large frame gaps
    const steps = Math.max(1, Math.ceil(dt / (1 / 120)));
    const h = dt / steps;
    for (let i = 0; i < steps; i++) {
      const force = -this.stiffness * (this.value - this.target);
      const damp = -this.damping * this.velocity;
      this.velocity += (force + damp) * h;
      this.value += this.velocity * h;
    }
    if (this.atRest) {
      this.value = this.target;
      this.velocity = 0;
    }
    return this.value;
  }
}
