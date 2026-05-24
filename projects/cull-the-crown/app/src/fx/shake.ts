// Trauma-based screen shake (after Squirrel Eiserloh's "juicing your cameras"). Add trauma on
// impactful events; the shake intensity is trauma^2 so small hits barely register and big ones
// punch. Decays over time. Apply to any Pixi Container that has a known base position.

import { Container } from "pixi.js";

export class Shake {
  private trauma = 0;
  private decay: number;
  private maxOffset: number;
  private maxRotation: number;

  constructor(opts: { decay?: number; maxOffset?: number; maxRotation?: number } = {}) {
    this.decay = opts.decay ?? 1.4;
    this.maxOffset = opts.maxOffset ?? 22;
    this.maxRotation = opts.maxRotation ?? 0.05;
  }

  /** Add trauma in [0, 1]. */
  add(amount: number): void {
    this.trauma = Math.min(1, this.trauma + amount);
  }

  /** Advance and apply the offset to `target` relative to (baseX, baseY). */
  update(dt: number, target: Container, baseX: number, baseY: number): void {
    const shake = this.trauma * this.trauma;
    if (shake <= 0) {
      target.position.set(baseX, baseY);
      target.rotation = 0;
      return;
    }
    const rnd = () => Math.random() * 2 - 1;
    target.position.set(baseX + this.maxOffset * shake * rnd(), baseY + this.maxOffset * shake * rnd());
    target.rotation = this.maxRotation * shake * rnd();
    this.trauma = Math.max(0, this.trauma - this.decay * dt);
  }
}
