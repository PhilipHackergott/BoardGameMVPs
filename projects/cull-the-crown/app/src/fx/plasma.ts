// A dynamic, flowing "plasma" background — the Balatro-style living backdrop, done without GLSL so
// it's robust across machines. A small offscreen canvas is filled each frame with a domain-warped
// sine field, mapped through a palette, and shown as a nearest-neighbour Pixi sprite (so it scales
// up into soft chunky pixel bands that fit an 8-bit look). Game-agnostic: pass any palette.

import { Container, Sprite, Texture } from "pixi.js";

export type Rgb = [number, number, number];

export interface PlasmaOptions {
  displayWidth: number;
  displayHeight: number;
  palette: Rgb[]; // colour stops, dark -> light
  bufferWidth?: number; // resolution of the simulation (small = chunkier + cheaper)
  bufferHeight?: number;
  speed?: number;
  warp?: number;
}

function sample(palette: Rgb[], f: number): Rgb {
  const n = palette.length - 1;
  const s = Math.max(0, Math.min(1, f)) * n;
  const i = Math.min(n - 1, Math.floor(s));
  const k = s - i;
  const a = palette[i];
  const b = palette[i + 1];
  return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
}

export class PlasmaBackground {
  readonly view = new Container();
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private img: ImageData;
  private texture: Texture;
  private sprite: Sprite;
  private bw: number;
  private bh: number;
  private palette: Rgb[];
  private speed: number;
  private warp: number;
  private t = Math.random() * 100;

  constructor(opts: PlasmaOptions) {
    this.bw = opts.bufferWidth ?? 96;
    this.bh = opts.bufferHeight ?? 54;
    this.palette = opts.palette;
    this.speed = opts.speed ?? 1;
    this.warp = opts.warp ?? 0.6;

    this.canvas = document.createElement("canvas");
    this.canvas.width = this.bw;
    this.canvas.height = this.bh;
    this.ctx = this.canvas.getContext("2d")!;
    this.img = this.ctx.createImageData(this.bw, this.bh);

    this.texture = Texture.from(this.canvas);
    this.texture.source.scaleMode = "nearest";
    this.sprite = new Sprite(this.texture);
    this.sprite.width = opts.displayWidth;
    this.sprite.height = opts.displayHeight;
    this.view.addChild(this.sprite);

    this.render();
  }

  private render(): void {
    const { bw, bh, t, warp } = this;
    const data = this.img.data;
    let p = 0;
    for (let y = 0; y < bh; y++) {
      const ny = y / bh;
      for (let x = 0; x < bw; x++) {
        const nx = x / bw;
        // domain warp for a painterly swirl
        const wx = nx + warp * Math.sin(ny * 3.0 + t * 0.7);
        const wy = ny + warp * Math.cos(nx * 3.0 - t * 0.5);
        let v =
          Math.sin(wx * 6.0 + t) +
          Math.sin(wy * 5.0 - t * 0.8) +
          Math.sin((wx + wy) * 4.0 + t * 1.3) +
          Math.sin(Math.sqrt(wx * wx + wy * wy) * 8.0 - t);
        v = (v + 4) / 8; // normalise ~[0,1]
        const c = sample(this.palette, v);
        data[p++] = c[0];
        data[p++] = c[1];
        data[p++] = c[2];
        data[p++] = 255;
      }
    }
    this.ctx.putImageData(this.img, 0, 0);
    this.texture.source.update();
  }

  update(dt: number): void {
    this.t += dt * this.speed;
    this.render();
  }

  destroy(): void {
    this.view.destroy({ children: true });
    this.texture.destroy(true);
  }
}
