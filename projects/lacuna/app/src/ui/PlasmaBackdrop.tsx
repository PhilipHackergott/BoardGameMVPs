import { useEffect, useRef } from "react";
import type { Rgb } from "./theme";

// A living backdrop — the GLSL-free domain-warped sine field from the factory's
// presentation-fx kit (cull-the-crown `fx/plasma.ts`), adapted to a plain DOM canvas
// (menus = React/DOM). A tiny 96×54 buffer is painted each frame and CSS-upscaled into
// soft drifting colour bands. The palette is supplied by the active theme.

const POND_PALETTE: Rgb[] = [
  [4, 6, 13],
  [9, 15, 34],
  [24, 24, 64],
  [49, 46, 129],
  [88, 101, 220],
  [129, 140, 248],
];

function sample(pal: Rgb[], f: number): Rgb {
  const n = pal.length - 1;
  const s = Math.max(0, Math.min(1, f)) * n;
  const i = Math.min(n - 1, Math.floor(s));
  const k = s - i;
  const a = pal[i];
  const b = pal[i + 1];
  return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
}

export function PlasmaBackdrop({ animated = true, palette = POND_PALETTE }: { animated?: boolean; palette?: Rgb[] }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const bw = 96;
    const bh = 54;
    canvas.width = bw;
    canvas.height = bh;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const img = ctx.createImageData(bw, bh);
    const warp = 0.55;
    const speed = 0.22;
    let t = Math.random() * 100;

    const render = () => {
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
          data[p++] = c[0];
          data[p++] = c[1];
          data[p++] = c[2];
          data[p++] = 255;
        }
      }
      ctx.putImageData(img, 0, 0);
    };

    render();
    if (!animated) return;

    let raf = 0;
    let last = performance.now();
    const loop = () => {
      const now = performance.now();
      t += Math.min((now - last) / 1000, 1 / 20) * speed;
      last = now;
      render();
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [animated, palette]);

  return <canvas ref={ref} className="plasma-backdrop" aria-hidden />;
}
