// A self-contained animated synthwave backdrop drawn to a 2D canvas: a deep-space gradient, a soft
// drifting plasma glow (the Balatro-style living backdrop, learned from the Cull the Crown project
// but recoloured for neon), and a perspective grid scrolling toward a horizon. No dependencies; the
// host React component owns the canvas element and lifecycle.

export class NeonBackground {
  private ctx: CanvasRenderingContext2D;
  private raf = 0;
  private t = Math.random() * 100;
  private w = 0;
  private h = 0;
  private dpr = 1;

  constructor(private canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext("2d", { alpha: false })!;
    this.resize();
    this.loop();
  }

  resize = (): void => {
    this.dpr = Math.min(2, window.devicePixelRatio || 1);
    this.w = window.innerWidth;
    this.h = window.innerHeight;
    this.canvas.width = Math.floor(this.w * this.dpr);
    this.canvas.height = Math.floor(this.h * this.dpr);
    this.canvas.style.width = this.w + "px";
    this.canvas.style.height = this.h + "px";
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  };

  private loop = (): void => {
    this.t += 0.006;
    this.draw();
    this.raf = requestAnimationFrame(this.loop);
  };

  private draw(): void {
    const { ctx, w, h, t } = this;

    // base vertical gradient: deep indigo -> near black
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, "#0a0618");
    g.addColorStop(0.55, "#0d0a22");
    g.addColorStop(1, "#05030f");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);

    // drifting plasma blobs (additive, blurred-ish via large soft radial gradients)
    ctx.globalCompositeOperation = "lighter";
    const blobs: [number, number, string][] = [
      [0.3 + 0.16 * Math.sin(t * 0.7), 0.32 + 0.1 * Math.cos(t * 0.5), "rgba(34,211,238,0.18)"],
      [0.72 + 0.14 * Math.cos(t * 0.6), 0.28 + 0.12 * Math.sin(t * 0.8), "rgba(244,114,182,0.16)"],
      [0.5 + 0.2 * Math.sin(t * 0.4 + 1), 0.5 + 0.08 * Math.cos(t * 0.9), "rgba(129,140,248,0.14)"],
    ];
    for (const [bx, by, color] of blobs) {
      const cx = bx * w;
      const cy = by * h;
      const r = Math.min(w, h) * 0.55;
      const rg = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
      rg.addColorStop(0, color);
      rg.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = rg;
      ctx.fillRect(0, 0, w, h);
    }
    ctx.globalCompositeOperation = "source-over";

    // perspective grid in the lower half, scrolling toward a horizon line
    const horizon = h * 0.62;
    ctx.save();
    ctx.strokeStyle = "rgba(120,90,220,0.35)";
    ctx.lineWidth = 1;

    // horizontal lines, spaced so they bunch up at the horizon (perspective)
    const scroll = (t * 60) % 1;
    for (let i = 0; i < 22; i++) {
      const f = (i + scroll) / 22;
      const y = horizon + (h - horizon) * f * f;
      const alpha = 0.06 + 0.3 * f;
      ctx.strokeStyle = `rgba(150,110,255,${alpha})`;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
    // vanishing-point verticals
    const vpx = w / 2;
    for (let i = -16; i <= 16; i++) {
      const x = vpx + (i / 16) * w * 0.9;
      ctx.strokeStyle = "rgba(120,90,220,0.22)";
      ctx.beginPath();
      ctx.moveTo(vpx + (x - vpx) * 0.04, horizon);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    // horizon glow
    const hg = ctx.createLinearGradient(0, horizon - 30, 0, horizon + 6);
    hg.addColorStop(0, "rgba(244,114,182,0)");
    hg.addColorStop(1, "rgba(244,114,182,0.5)");
    ctx.fillStyle = hg;
    ctx.fillRect(0, horizon - 30, w, 36);
    ctx.restore();
  }

  destroy(): void {
    cancelAnimationFrame(this.raf);
  }
}
