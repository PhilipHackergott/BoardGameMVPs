// The themed living background — a Canvas2D domain-warped plasma (the Balatro-style backdrop) drawn
// to a tiny buffer and CSS-upscaled with nearest-neighbor for a chunky pixel look. No WebGL: robust
// across machines, zero teardown pitfalls. Ported from fx/plasma.ts (the factory's reusable kit).

import { useEffect, useRef } from "react";

type Rgb = [number, number, number];

function sample(palette: Rgb[], f: number): Rgb {
  const n = palette.length - 1;
  const s = Math.max(0, Math.min(1, f)) * n;
  const i = Math.min(n - 1, Math.floor(s));
  const k = s - i;
  const a = palette[i];
  const b = palette[i + 1];
  return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
}

export function PlasmaBackground({ palette, reduceMotion }: { palette: Rgb[]; reduceMotion?: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current!;
    const bw = 128, bh = 72;
    canvas.width = bw; canvas.height = bh;
    const ctx = canvas.getContext("2d")!;
    const img = ctx.createImageData(bw, bh);
    let t = Math.random() * 100;
    let raf = 0;
    let last = performance.now();
    const warp = 0.6;
    const draw = () => {
      const data = img.data;
      let p = 0;
      for (let y = 0; y < bh; y++) {
        const ny = y / bh;
        for (let x = 0; x < bw; x++) {
          const nx = x / bw;
          const wx = nx + warp * Math.sin(ny * 3 + t * 0.7);
          const wy = ny + warp * Math.cos(nx * 3 - t * 0.5);
          let v =
            Math.sin(wx * 6 + t) +
            Math.sin(wy * 5 - t * 0.8) +
            Math.sin((wx + wy) * 4 + t * 1.3) +
            Math.sin(Math.sqrt(wx * wx + wy * wy) * 8 - t);
          v = (v + 4) / 8;
          const c = sample(palette, v);
          data[p++] = c[0]; data[p++] = c[1]; data[p++] = c[2]; data[p++] = 255;
        }
      }
      ctx.putImageData(img, 0, 0);
    };
    if (reduceMotion) {
      draw();
      return;
    }
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      t += dt * 0.5;
      draw();
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [palette, reduceMotion]);
  return <canvas ref={ref} className="bg-canvas" aria-hidden="true" />;
}
