// A tiny full-screen particle layer for the celebratory beats: compiles, control swings, wins.
// Self-contained 2D-canvas system, additive blending for a neon bloom. The board calls burst() at
// screen coordinates; everything else is automatic.

interface P {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  size: number;
  r: number;
  g: number;
  b: number;
}

export class ParticleLayer {
  private ctx: CanvasRenderingContext2D;
  private raf = 0;
  private ps: P[] = [];
  private last = performance.now();
  private dpr = 1;

  constructor(private canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext("2d")!;
    this.resize();
    this.loop();
  }

  resize = (): void => {
    this.dpr = Math.min(2, window.devicePixelRatio || 1);
    this.canvas.width = Math.floor(window.innerWidth * this.dpr);
    this.canvas.height = Math.floor(window.innerHeight * this.dpr);
    this.canvas.style.width = window.innerWidth + "px";
    this.canvas.style.height = window.innerHeight + "px";
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  };

  burst(x: number, y: number, rgb: [number, number, number], count = 30, power = 1): void {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = (40 + Math.random() * 220) * power;
      this.ps.push({
        x,
        y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp - 30 * power,
        life: 0,
        max: 0.5 + Math.random() * 0.8,
        size: 2 + Math.random() * 3,
        r: rgb[0],
        g: rgb[1],
        b: rgb[2],
      });
    }
  }

  private loop = (): void => {
    const now = performance.now();
    const dt = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;
    const { ctx } = this;
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    ctx.globalCompositeOperation = "lighter";
    for (let i = this.ps.length - 1; i >= 0; i--) {
      const p = this.ps[i];
      p.life += dt;
      if (p.life >= p.max) {
        this.ps.splice(i, 1);
        continue;
      }
      p.vy += 220 * dt; // gravity
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      const k = 1 - p.life / p.max;
      ctx.fillStyle = `rgba(${p.r},${p.g},${p.b},${k})`;
      ctx.fillRect(p.x, p.y, p.size, p.size);
    }
    ctx.globalCompositeOperation = "source-over";
    this.raf = requestAnimationFrame(this.loop);
  };

  destroy(): void {
    cancelAnimationFrame(this.raf);
    this.ps = [];
  }
}
