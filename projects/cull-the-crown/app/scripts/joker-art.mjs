// Higher-fidelity joker illustrations — "ambitious full scenes" on an 80×112 pixel grid
// (the rasterizer's exact aspect). Richer than pixel-art.mjs: gradient skies, dithering, a corner
// vignette, and rim-lit / shaded subjects with multi-tone ramps. Run from app/:
//   node scripts/joker-art.mjs   →   node scripts/raster-jokers.mjs
import { writeFileSync, mkdirSync, readdirSync, copyFileSync } from "fs";
import { resolve, join } from "path";

const JOKER_DIR = resolve("../cull the crown joker illustrations");
const W = 80,
  H = 112;

class Grid {
  constructor() {
    this.px = new Array(W * H).fill(null);
  }
  set(x, y, c) {
    x = Math.round(x);
    y = Math.round(y);
    if (x < 0 || y < 0 || x >= W || y >= H || c == null) return;
    this.px[y * W + x] = c;
  }
  get(x, y) {
    return this.px[y * W + x];
  }
  rect(x, y, w, h, c) {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.set(x + i, y + j, c);
  }
  disc(cx, cy, r, c) {
    const r2 = r * r;
    for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++)
      for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) {
        const dx = x + 0.5 - cx,
          dy = y + 0.5 - cy;
        if (dx * dx + dy * dy <= r2) this.set(x, y, c);
      }
  }
  ring(cx, cy, r, c, t = 1) {
    const ro = r * r,
      ri = (r - t) * (r - t);
    for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++)
      for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) {
        const dx = x + 0.5 - cx,
          dy = y + 0.5 - cy,
          d = dx * dx + dy * dy;
        if (d <= ro && d >= ri) this.set(x, y, c);
      }
  }
  tri(ax, ay, bx, by, cx, cy, col) {
    const minX = Math.floor(Math.min(ax, bx, cx)),
      maxX = Math.ceil(Math.max(ax, bx, cx));
    const minY = Math.floor(Math.min(ay, by, cy)),
      maxY = Math.ceil(Math.max(ay, by, cy));
    const sgn = (px, py, x0, y0, x1, y1) => (px - x1) * (y0 - y1) - (x0 - x1) * (py - y1);
    for (let y = minY; y <= maxY; y++)
      for (let x = minX; x <= maxX; x++) {
        const px = x + 0.5,
          py = y + 0.5;
        const d1 = sgn(px, py, ax, ay, bx, by),
          d2 = sgn(px, py, bx, by, cx, cy),
          d3 = sgn(px, py, cx, cy, ax, ay);
        if (!((d1 < 0 || d2 < 0 || d3 < 0) && (d1 > 0 || d2 > 0 || d3 > 0))) this.set(x, y, col);
      }
  }
  line(x0, y0, x1, y1, c) {
    x0 = Math.round(x0);
    y0 = Math.round(y0);
    x1 = Math.round(x1);
    y1 = Math.round(y1);
    const dx = Math.abs(x1 - x0),
      dy = -Math.abs(y1 - y0),
      sx = x0 < x1 ? 1 : -1,
      sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    for (;;) {
      this.set(x0, y0, c);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) {
        err += dy;
        x0 += sx;
      }
      if (e2 <= dx) {
        err += dx;
        y0 += sy;
      }
    }
  }
  thick(x0, y0, x1, y1, c, half) {
    const steps = Math.max(1, Math.round(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0))) * 2);
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      this.disc(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, half, c);
    }
  }
}

function toSvg(g, extra = "") {
  let rects = "";
  for (let y = 0; y < H; y++) {
    let x = 0;
    while (x < W) {
      const c = g.get(x, y);
      if (c == null) {
        x++;
        continue;
      }
      let run = 1;
      while (x + run < W && g.get(x + run, y) === c) run++;
      rects += `<rect x="${x}" y="${y}" width="${run}" height="1" fill="${c}"/>`;
      x += run;
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" shape-rendering="crispEdges">\n<style>@import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&amp;display=swap'); .jk{font-family:'Press Start 2P',monospace}</style>\n${rects}\n${extra}\n</svg>\n`;
}

// ── shared frame + shading helpers ──────────────────────────────────────────
const CREAM = "#efe6cf",
  BEVEL = "#f7f2e6",
  GOLD = "#f2c14e",
  GOLD_HI = "#ffe9a0";
function cardBase(g, face) {
  g.rect(0, 0, W, H, CREAM);
  g.rect(2, 2, W - 4, H - 4, BEVEL);
  g.rect(5, 5, W - 10, H - 10, face);
  for (const [cx, cy] of [
    [0, 0],
    [W - 1, 0],
    [0, H - 1],
    [W - 1, H - 1],
  ])
    g.set(cx, cy, null);
  for (const [cx, cy] of [
    [5, 5],
    [W - 6, 5],
    [5, H - 6],
    [W - 6, H - 6],
  ])
    g.set(cx, cy, BEVEL);
}
function wordmark(fill, size = 4.6) {
  const t = (x, dir) =>
    `<text class="jk" x="${x}" y="56" transform="rotate(${dir} ${x} 56)" text-anchor="middle" font-size="${size}" letter-spacing="2.5" fill="${fill}">JOKER</text>`;
  return t(7, -90) + t(73, 90);
}
// vertical gradient (banded) inside the face
function vgrad(g, x, y, w, h, colors) {
  const n = colors.length;
  for (let j = 0; j < h; j++) {
    const idx = Math.min(n - 1, Math.floor((j / h) * n));
    for (let i = 0; i < w; i++) g.set(x + i, y + j, colors[idx]);
    // dither the seam between bands
    const idx2 = Math.min(n - 1, Math.floor(((j + 1) / h) * n));
    if (idx2 !== idx) for (let i = 0; i < w; i++) if ((x + i + j) % 2 === 0) g.set(x + i, y + j, colors[idx2]);
  }
}
// checkerboard dither of a colour over a region (shadow/texture)
function dither(g, x, y, w, h, c, parity = 0) {
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) if ((x + i + y + j) % 2 === parity) g.set(x + i, y + j, c);
}
// soft radial glow (dithered annulus)
function glow(g, cx, cy, r, c) {
  for (let y = Math.floor(cy - r); y <= cy + r; y++)
    for (let x = Math.floor(cx - r); x <= cx + r; x++) {
      const dx = x + 0.5 - cx,
        dy = y + 0.5 - cy,
        d = Math.sqrt(dx * dx + dy * dy);
      if (d <= r && d > r * 0.45 && (x + y) % 2 === 0) g.set(x, y, c);
    }
}
// a shaded sphere: ink rim, base, shadow (lower-right), highlight (upper-left)
function sphere(g, cx, cy, r, base, hi, lo, ink) {
  g.disc(cx, cy, r + 0.6, ink);
  g.disc(cx, cy, r, base);
  g.disc(cx + r * 0.32, cy + r * 0.36, r * 0.7, lo);
  g.disc(cx - r * 0.12, cy - r * 0.08, r * 0.72, base);
  g.disc(cx - r * 0.34, cy - r * 0.4, r * 0.42, hi);
}
// corner vignette: dither dark ink into the face corners
function vignette(g, ink) {
  for (let y = 6; y < H - 6; y++)
    for (let x = 6; x < W - 6; x++) {
      const dx = (x - W / 2) / (W / 2 - 6),
        dy = (y - H / 2) / (H / 2 - 6);
      if (dx * dx + dy * dy > 0.66 && (x + y) % 2 === 0 && g.get(x, y)) g.set(x, y, ink);
    }
}

// ============================================================================
// THE 7 ORIGINALS, re-done as full scenes (the new ambitious bar).
// ============================================================================

// COURT JESTER — a jester in a torch-lit throne room
function courtJester() {
  const g = new Grid();
  cardBase(g, "#1a1230");
  vgrad(g, 5, 5, W - 10, H - 10, ["#43306e", "#33255a", "#271d46", "#1c1636"]);
  // arched throne-room window glow
  g.disc(40, 40, 22, "#4d3a78");
  g.rect(18, 40, 44, 34, "#4d3a78");
  glow(g, 40, 36, 26, "#6048a0");
  // hanging banners
  for (const bx of [11, 63]) {
    g.rect(bx, 11, 6, 40, "#7a1e3a");
    g.tri(bx, 51, bx + 6, 51, bx + 3, 57, "#7a1e3a");
    g.rect(bx, 11, 6, 3, "#f2c14e");
    g.disc(bx + 3, 30, 1.6, "#f2c14e");
  }
  // checker floor
  for (let r = 0; r < 4; r++) dither(g, 9, 86 + r * 5, W - 18, 5, "#0f0a1c", r % 2);
  vignette(g, "#120a20");
  // ruff collar
  for (let i = 0; i < 7; i++) g.tri(17 + i * 7, 60, 20 + i * 7, 69, 23 + i * 7, 60, "#f3eede");
  g.rect(15, 59, 50, 3, "#f3eede");
  g.rect(15, 62, 50, 1, "#cdbf9a");
  // head (shaded)
  sphere(g, 40, 43, 15, "#efce9b", "#fce6c4", "#cf9f6e", "#1c1230");
  g.disc(34, 42, 2.4, "#1c1230");
  g.disc(46, 42, 2.4, "#1c1230");
  g.set(33, 41, "#ffffff");
  g.set(45, 41, "#ffffff");
  g.disc(31, 49, 2.6, "#e87f99");
  g.disc(49, 49, 2.6, "#e87f99");
  for (let x = 33; x <= 47; x++) {
    const y = 50 + Math.round(2.4 * Math.sin(((x - 33) / 14) * Math.PI));
    g.set(x, y, "#9c2440");
    if (x > 34 && x < 46) g.set(x, y + 1, "#9c2440");
  }
  // three-point cap, shaded
  const lobes = [
    ["#d8394e", "#a3263a", 24, 31, 12, 14, 31, 31],
    ["#3f8fd0", "#2c6aa0", 30, 31, 40, 6, 49, 31],
    ["#57b56a", "#3d8a4c", 35, 31, 68, 14, 44, 31],
  ];
  for (const [, , ax, ay, bx, by, cx, cy] of lobes) g.tri(ax - 1, ay, bx, by - 1, cx + 1, cy, "#1c1230");
  for (const [c, lo, ax, ay, bx, by, cx, cy] of lobes) {
    g.tri(ax, ay, bx, by, cx, cy, c);
    g.tri((ax + bx) / 2, (ay + by) / 2, bx, by, cx, cy, lo);
  }
  g.rect(21, 29, 38, 3, "#f2c14e");
  g.rect(21, 32, 38, 1, "#b9892f");
  for (const [bx, by] of [
    [12, 14],
    [40, 6],
    [68, 14],
  ]) {
    g.disc(bx, by, 2.6, "#1c1230");
    g.disc(bx, by, 1.9, "#f2c14e");
    g.set(bx - 1, by - 1, "#ffe9a0");
  }
  return toSvg(g, wordmark("#d6c096"));
}

// BLOODLETTER — a heart bleeding into a chalice on a blood-altar
function bloodletter() {
  const g = new Grid();
  cardBase(g, "#240a12");
  vgrad(g, 5, 5, W - 10, H - 10, ["#5a1626", "#43101e", "#310b16", "#220810"]);
  glow(g, 40, 40, 28, "#7a1e30");
  // gothic arch behind
  g.disc(40, 40, 20, "#3a0e1a");
  g.rect(20, 40, 40, 36, "#3a0e1a");
  vignette(g, "#160509");
  // anatomical heart (shaded)
  sphere(g, 33, 38, 9, "#e0405f", "#ff86a0", "#a3263a", "#3a0a14");
  sphere(g, 46, 38, 9, "#e0405f", "#ff86a0", "#a3263a", "#3a0a14");
  g.tri(22, 41, 57, 41, 40, 64, "#c0273f");
  g.tri(28, 44, 52, 44, 40, 60, "#a3263a");
  g.tri(24, 42, 40, 42, 34, 56, "#e0405f");
  g.rect(31, 24, 3, 8, "#a3263a");
  g.rect(38, 23, 3, 9, "#c0273f");
  g.rect(45, 24, 3, 8, "#a3263a");
  // drip
  g.rect(39, 64, 2, 9, "#c0273f");
  g.disc(40, 75, 2.4, "#c0273f");
  // chalice (shaded gold + wine)
  g.tri(27, 78, 53, 78, 47, 90, "#b9975a");
  g.tri(27, 78, 53, 78, 49, 86, "#d9c08a");
  g.rect(27, 78, 26, 2, "#fff0c8");
  g.tri(32, 80, 48, 80, 40, 88, "#9e2238");
  g.rect(37, 90, 6, 8, "#9a7a44");
  g.rect(30, 98, 20, 3, "#d9c08a");
  g.rect(30, 98, 20, 1, "#fff0c8");
  return toSvg(g, wordmark("#e0b0b8"));
}

// PROSPECTOR — panning gold in a teal cavern stream
function prospector() {
  const g = new Grid();
  cardBase(g, "#0a1a22");
  vgrad(g, 5, 5, W - 10, H - 10, ["#1c4252", "#143542", "#0e2832", "#0a1c24"]);
  glow(g, 40, 34, 24, "#2a6a7a");
  vignette(g, "#06141a");
  // diamond gem (shaded, rising)
  g.tri(40, 18, 54, 38, 26, 38, "#0c2230");
  g.tri(40, 58, 54, 39, 26, 39, "#0c2230");
  g.tri(40, 20, 52, 38, 28, 38, "#7fd6ff");
  g.tri(40, 56, 52, 39, 28, 39, "#3f8fc0");
  g.tri(40, 20, 52, 38, 40, 38, "#bdeaff");
  g.tri(40, 39, 52, 39, 40, 56, "#2f7aa8");
  g.set(35, 26, "#ffffff");
  glow(g, 40, 36, 16, "#bdeaff");
  // sparkle
  g.line(58, 22, 58, 32, "#fff0c8");
  g.line(53, 27, 63, 27, "#fff0c8");
  // pan
  g.disc(40, 70, 20, "#9aa3ad");
  g.disc(40, 66, 16, "#2f363e");
  g.rect(18, 67, 44, 1, "#cdd4dc");
  // coins (shaded)
  for (const [x, hi] of [
    [30, "#f2c14e"],
    [40, "#ffe9a0"],
    [50, "#f2c14e"],
  ]) {
    g.disc(x, 70, 4, "#b9892f");
    g.disc(x, 70, 3, hi);
    g.set(x - 1, 69, "#fff0c8");
  }
  return toSvg(g, wordmark("#bcd0d8"));
}

// WAR CHEST — an overflowing vault chest under god-rays
function warChest() {
  const g = new Grid();
  cardBase(g, "#15110a");
  vgrad(g, 5, 5, W - 10, H - 10, ["#3a2d12", "#2c220e", "#201808", "#150f06"]);
  // god-rays
  for (let k = -3; k <= 3; k++) g.thick(40, 8, 40 + k * 11, 60, "#473714", 1.2);
  glow(g, 40, 46, 26, "#5a4518");
  vignette(g, "#0e0a04");
  // chest lid (shaded dome)
  sphere(g, 40, 52, 16, "#6b4a2a", "#8a6a3a", "#4a3018", "#150d06");
  g.rect(18, 52, 44, 1, "#8a6a3a");
  // body
  g.rect(18, 52, 44, 26, "#5a3d24");
  g.rect(18, 52, 44, 4, "#6b4a2a");
  dither(g, 18, 64, 44, 14, "#4a3018");
  for (let x = 18; x < 62; x++) g.set(x, 77, "#150d06");
  for (let y = 52; y < 78; y++) {
    g.set(18, y, "#150d06");
    g.set(61, y, "#150d06");
  }
  // iron bands + lock
  g.rect(27, 52, 4, 26, "#2f261c");
  g.rect(49, 52, 4, 26, "#2f261c");
  g.rect(18, 63, 44, 4, "#2f261c");
  g.rect(36, 65, 8, 9, "#f2c14e");
  g.rect(36, 65, 8, 1, "#ffe9a0");
  g.rect(39, 68, 2, 4, "#2f261c");
  // mounded gold spilling
  g.rect(20, 48, 40, 4, "#ffe9a0");
  for (const [x, r, hi] of [
    [26, 4, "#f2c14e"],
    [34, 4.5, "#ffe9a0"],
    [42, 4.5, "#ffe9a0"],
    [50, 4, "#f2c14e"],
  ]) {
    g.disc(x, 47, r, "#b9892f");
    g.disc(x, 46, r - 1, hi);
  }
  g.disc(13, 80, 2.4, "#f2c14e");
  g.disc(67, 80, 2.4, "#ffe9a0");
  return toSvg(g, wordmark("#cbb27a"));
}

// HEADSMAN'S PRIDE — hooded executioner on a dusk scaffold
function headsman() {
  const g = new Grid();
  cardBase(g, "#1a1422");
  vgrad(g, 5, 5, W - 10, H - 10, ["#6a3a2a", "#4a2a30", "#2e2030", "#1c1626"]); // dusk sky
  g.disc(40, 30, 11, "#c85a3a"); // setting sun
  glow(g, 40, 30, 18, "#a8482e");
  // scaffold planks
  dither(g, 9, 88, W - 18, 16, "#120c1a");
  for (let x = 12; x < 68; x += 6) g.line(x, 86, x, 104, "#0e0814");
  vignette(g, "#120a18");
  // cloak shoulders (shaded)
  g.tri(12, 82, 40, 60, 68, 82, "#2a2030");
  g.tri(40, 60, 68, 82, 52, 82, "#1c1626");
  g.rect(12, 80, 56, 6, "#2a2030");
  // hood + dark face
  sphere(g, 40, 44, 14, "#1c1626", "#2e2640", "#120c1c", "#0c0814");
  g.disc(40, 47, 9, "#2a1e16");
  g.rect(26, 45, 28, 9, "#2a1e16");
  // glowing eyes
  g.rect(33, 46, 5, 3, "#ffd24a");
  g.rect(43, 46, 5, 3, "#ffd24a");
  glow(g, 35.5, 47.5, 4, "#7a5a10");
  glow(g, 45.5, 47.5, 4, "#7a5a10");
  // axe (haft + steel head with rim light)
  g.thick(52, 18, 60, 84, "#6b4a2a", 1.6);
  g.thick(53, 18, 61, 84, "#8a6a3a", 0.8);
  g.tri(52, 16, 70, 24, 58, 44, "#9aa3ad");
  g.tri(52, 16, 64, 30, 58, 44, "#cdd4dc");
  g.line(70, 24, 58, 44, "#eef2f6"); // edge highlight
  g.set(69, 23, "#fff0c8");
  // spade pip plate
  g.tri(40, 92, 33, 99, 47, 99, "#2c2436");
  g.disc(36, 99, 3, "#2c2436");
  g.disc(44, 99, 3, "#2c2436");
  g.rect(39, 99, 2, 4, "#2c2436");
  return toSvg(g, wordmark("#c0a890"));
}

// MIRROR KNIGHT — two great-helms across a glowing mirror seam
function mirrorKnight() {
  const g = new Grid();
  cardBase(g, "#1b1230");
  vgrad(g, 5, 31, 25, H - 36, ["#2c2048", "#241a3c", "#1c1430"]);
  vgrad(g, 31, 31, W - 36, H - 36, ["#221646", "#191130", "#140d28"]);
  g.rect(5, 5, W - 10, 26, "#241a3c");
  glow(g, 40, 56, 30, "#3a2a5e");
  vignette(g, "#100a20");
  helm(g, 24, "#c9d0d8", "#9aa3ad", "#eef2f6", "#e0405f", "#15102a");
  helm(g, 56, "#7e8794", "#5a626c", "#a8b0ba", "#8a2a3c", "#0e0a1e");
  // mirror seam
  g.rect(38, 8, 4, H - 16, "#15102a");
  g.rect(39, 8, 2, H - 16, "#b9a0e8");
  g.rect(39, 8, 1, H - 16, "#ffffff");
  glow(g, 40, 56, 8, "#d8c8ff");
  g.disc(40, 30, 2, "#ffffff");
  g.disc(40, 84, 2, "#dccbf2");
  return toSvg(g, wordmark("#cbb8e8"));
}
function helm(g, cx, steel, lo, hi, plume, ink) {
  g.tri(cx - 6, 36, cx, 20, cx + 5, 36, plume);
  g.set(cx, 18, plume);
  g.disc(cx, 48, 14, ink);
  g.rect(cx - 14, 48, 28, 34, ink);
  sphere(g, cx, 48, 13, steel, hi, lo, ink);
  g.rect(cx - 13, 48, 26, 30, steel);
  g.rect(cx + 4, 48, 9, 28, lo);
  g.rect(cx - 13, 49, 26, 2, hi);
  g.rect(cx - 2, 38, 3, 40, lo); // nasal bar
  g.rect(cx - 12, 56, 24, 4, ink); // visor
  for (const hy of [66, 70]) for (const hx of [-8, -4, 4, 8]) g.set(cx + hx, hy, ink);
  g.rect(cx - 13, 80, 26, 2, lo);
}

// THE PHALANX — a locked shield-wall of four, spears bristling
function phalanx() {
  const g = new Grid();
  cardBase(g, "#3a0f18");
  vgrad(g, 5, 5, W - 10, H - 10, ["#5a1a26", "#46121e", "#330d16", "#250910"]);
  glow(g, 40, 50, 30, "#7a2030");
  // bristling spears behind
  for (const sx of [16, 28, 52, 64]) {
    g.thick(sx, 10, sx, 60, "#6b4a2a", 1);
    g.tri(sx, 6, sx - 2, 12, sx + 2, 12, "#cdd4dc");
  }
  vignette(g, "#1c0810");
  // four interlocked shields (heater shape), shaded
  const sh = (cx, cy, accent) => {
    g.disc(cx, cy, 11, "#160810");
    g.rect(cx - 10, cy - 9, 20, 10, "#5a3d24");
    g.disc(cx, cy + 1, 10, "#5a3d24");
    g.rect(cx - 10, cy - 9, 20, 5, "#6b4a2a");
    g.rect(cx + 3, cy - 6, 6, 14, "#4a3018"); // shade side
    g.ring(cx, cy, 10, "#b9975a", 1);
    g.disc(cx, cy, 3, accent); // boss
    g.disc(cx, cy, 1.6, "#f2c14e");
  };
  sh(28, 44, "#c0273f");
  sh(52, 44, "#3f8fd0");
  sh(28, 70, "#57b56a");
  sh(52, 70, "#b070e0");
  g.rect(39, 30, 2, 56, "#2a0a12"); // seam
  g.rect(16, 56, 48, 2, "#2a0a12");
  return toSvg(g, wordmark("#d49aa2"));
}

// ============================================================================
// §J FIGHTING-STYLE JOKERS (match the wired effects in content.JOKER_LIBRARY).
// ============================================================================

// LONE CHAMPION (Two-Handed) — a heroic greatsword planted on a spotlit field
function loneChampion() {
  const g = new Grid();
  cardBase(g, "#161826");
  vgrad(g, 5, 5, W - 10, H - 10, ["#3a4a6a", "#2c3a56", "#202c44", "#151e30"]);
  for (let k = -2; k <= 2; k++) g.thick(40, 6, 40 + k * 9, 72, "#44546e", 1.1);
  glow(g, 40, 48, 24, "#5a6e92");
  g.rect(5, 74, W - 10, 7, "#1a2236"); // far ridge
  vignette(g, "#0e1422");
  g.thick(40, 84, 40, 22, "#10141f", 2.7); // blade ink
  g.thick(40, 82, 40, 23, "#cdd4dc", 1.9);
  g.thick(38.4, 80, 38.4, 25, "#9aa3ad", 0.7);
  g.thick(41.2, 80, 41.2, 25, "#eef2f6", 0.5);
  g.disc(40, 22, 1.8, "#f4f8fc");
  g.thick(28, 31, 52, 31, "#10141f", 2.3); // crossguard
  g.thick(28, 31, 52, 31, "#f2c14e", 1.4);
  g.disc(28, 31, 2, "#ffe9a0");
  g.disc(52, 31, 2, "#ffe9a0");
  g.thick(40, 31, 40, 42, "#6b4a2a", 1.5); // grip
  g.disc(40, 44, 2.6, "#f2c14e");
  g.set(39, 43, "#ffe9a0");
  return toSvg(g, wordmark("#b8c0d0"));
}

// SHIELD WALL (Sword & Shield) — a locked row of tower shields, sword laid across
function shieldWall() {
  const g = new Grid();
  cardBase(g, "#1a1422");
  vgrad(g, 5, 5, W - 10, H - 10, ["#4a3a2e", "#3a2e26", "#2a2220", "#1c1822"]);
  glow(g, 40, 50, 26, "#5a4636");
  vignette(g, "#120e16");
  const tower = (cx, accent) => {
    g.rect(cx - 9, 30, 18, 30, "#160f0a");
    g.disc(cx, 60, 9, "#160f0a");
    g.rect(cx - 8, 31, 16, 28, "#5a3d24");
    g.disc(cx, 59, 8, "#5a3d24");
    g.rect(cx - 8, 31, 16, 4, "#6b4a2a");
    g.rect(cx + 3, 31, 5, 27, "#46301c");
    g.rect(cx - 1, 32, 2, 26, "#b9975a");
    g.rect(cx - 8, 44, 16, 2, "#b9975a");
    g.disc(cx, 45, 2.4, accent);
    g.disc(cx, 45, 1.2, "#ffe9a0");
  };
  tower(23, "#c0273f");
  tower(40, "#3f8fd0");
  tower(57, "#57b56a");
  g.thick(14, 74, 64, 26, "#10141f", 1.9); // sword laid across
  g.thick(14, 74, 64, 26, "#cdd4dc", 1.3);
  g.thick(16, 72, 30, 60, "#6b4a2a", 1.4); // hilt
  g.disc(15, 75, 2.2, "#f2c14e");
  return toSvg(g, wordmark("#cbb290"));
}

// PHALANX DRILLMASTER (Spear) — a bristling fan of spears behind a command banner
function phalanxDrillmaster() {
  const g = new Grid();
  cardBase(g, "#161e22");
  vgrad(g, 5, 5, W - 10, H - 10, ["#2a4248", "#203438", "#18282c", "#121e22"]);
  glow(g, 40, 50, 26, "#386068");
  vignette(g, "#0c1618");
  for (const [bx, ang] of [[18, -0.32], [29, -0.14], [51, 0.14], [62, 0.32]]) {
    const tx = bx + Math.sin(ang) * 64,
      ty = 86 - Math.cos(ang) * 64;
    g.thick(bx, 86, tx, ty, "#6b4a2a", 1.1);
    g.tri(tx, ty - 6, tx - 2.4, ty + 2, tx + 2.4, ty + 2, "#cdd4dc"); // leaf blade
    g.set(tx, ty - 5, "#eef2f6");
  }
  // command banner
  g.thick(40, 88, 40, 18, "#8a6a3a", 1.4);
  g.disc(40, 17, 2, "#f2c14e");
  g.rect(40, 22, 16, 18, "#7a1e3a");
  g.rect(40, 22, 16, 3, "#a83048");
  g.tri(52, 40, 56, 40, 56, 46, "#161e22"); // swallowtail
  spade(g, 48, 31, 3, "#f2c14e");
  return toSvg(g, wordmark("#a8c0c4"));
}
function spade(g, cx, cy, r, c) {
  g.tri(cx, cy - r, cx - r, cy + r - 1, cx + r, cy + r - 1, c);
  g.disc(cx - r * 0.5, cy + r - 1, r * 0.55, c);
  g.disc(cx + r * 0.5, cy + r - 1, r * 0.55, c);
  g.rect(Math.round(cx - 1), Math.round(cy + r - 1), 2, Math.round(r - 1), c);
}

// TWIN FURY (Dual Wielding) — two crossed sabres wreathed in battle-fury
function twinFury() {
  const g = new Grid();
  cardBase(g, "#1c1018");
  vgrad(g, 5, 5, W - 10, H - 10, ["#5a1e1e", "#451818", "#301212", "#200e10"]);
  glow(g, 40, 48, 26, "#7a2a24");
  // fury sparks
  for (const [x, y] of [[18, 24], [60, 28], [22, 70], [58, 72], [40, 18]]) {
    g.set(x, y, "#ffb04a");
    g.set(x + 1, y, "#ff7a3a");
  }
  vignette(g, "#160809");
  const sabre = (hx, hy, tx, ty) => {
    g.thick(hx, hy, tx, ty, "#10141f", 2);
    g.thick(hx, hy, tx, ty, "#cdd4dc", 1.4);
    g.thick(hx + 1, hy, tx + 1, ty, "#eef2f6", 0.5);
    g.disc(tx, ty, 1.5, "#eef2f6");
    g.thick(hx - 3, hy + 3, hx + 3, hy - 3, "#f2c14e", 1.1); // guard
    g.disc(hx, hy, 2, "#f2c14e"); // pommel
  };
  sabre(20, 76, 58, 24);
  sabre(60, 76, 22, 24);
  glow(g, 40, 50, 10, "#ff9a4a");
  return toSvg(g, wordmark("#d49a92"));
}

// ARCANE SURGE (Mage) — a staff erupting with arcane energy
function arcaneSurge() {
  const g = new Grid();
  cardBase(g, "#13182c");
  vgrad(g, 5, 5, W - 10, H - 10, ["#2a2a5e", "#222048", "#1a1838", "#121028"]);
  // arcane bolts radiating
  for (let k = 0; k < 10; k++) {
    const a = (k / 10) * 6.28;
    g.thick(40, 40, 40 + Math.cos(a) * 22, 40 + Math.sin(a) * 22, k % 2 ? "#7e5fd0" : "#4f7fe0", 0.8);
  }
  vignette(g, "#0c0a1e");
  g.thick(40, 86, 40, 46, "#10141f", 2); // staff
  g.thick(40, 86, 40, 46, "#6b4a2a", 1.3);
  g.thick(41, 84, 41, 48, "#8a6a3a", 0.5);
  // claw mount
  g.tri(34, 46, 46, 46, 40, 40, "#f2c14e");
  // orb (shaded, glowing)
  glow(g, 40, 36, 16, "#9a7fff");
  sphere(g, 40, 36, 9, "#7fb0ff", "#dff0ff", "#3f6fd0", "#1a1838");
  g.disc(37, 33, 2.4, "#ffffff");
  for (const [x, y] of [[18, 22], [62, 26], [60, 54], [20, 56]]) g.set(x, y, "#dff0ff");
  return toSvg(g, wordmark("#b6a8e8"));
}

// CAVALIER (Mounted) — a couched lance with pennon over a glowing horseshoe
function cavalier() {
  const g = new Grid();
  cardBase(g, "#181226");
  vgrad(g, 5, 5, W - 10, H - 10, ["#3a2e5a", "#2e2448", "#221a38", "#181228"]);
  glow(g, 40, 52, 26, "#4a3a72");
  vignette(g, "#0e0a1c");
  // horseshoe (opening up, behind)
  g.ring(40, 60, 16, "#1c1226", 5);
  g.ring(40, 60, 16, "#f2c14e", 4);
  g.ring(40, 60, 12, "#ffe9a0", 1);
  // open the top of the shoe with a disc carve, then restore the soft glow so there's no hard notch
  g.disc(40, 50, 13, "#221a38");
  glow(g, 40, 52, 26, "#4a3a72");
  for (const [x, y] of [[27, 64], [29, 70], [53, 64], [51, 70]]) g.set(x, y, "#7a5a1e"); // nail holes
  // couched lance with pennon (diagonal)
  g.thick(16, 80, 62, 22, "#10141f", 1.8);
  g.thick(16, 80, 62, 22, "#8a6a3a", 1.2);
  g.disc(62, 22, 2, "#cdd4dc"); // steel tip
  g.tri(54, 30, 64, 26, 56, 38, "#c0273f"); // pennon
  g.tri(54, 30, 60, 33, 56, 38, "#a83048");
  return toSvg(g, wordmark("#bca8d8"));
}

// ============================================================================
// §A–C / §F / §H catalogue jokers (match wired effects in JOKER_LIBRARY).
// ============================================================================

// BLUDGEON (§A ♣) — a spiked mace on a green glow
function bludgeon() {
  const g = new Grid();
  cardBase(g, "#0e1f12");
  vgrad(g, 5, 5, W - 10, H - 10, ["#1e4a2c", "#163a22", "#0f2a18", "#0a1d10"]);
  glow(g, 46, 34, 24, "#2a6a3e");
  vignette(g, "#08160c");
  g.thick(18, 86, 44, 40, "#10141f", 2.2); // haft
  g.thick(18, 86, 44, 40, "#6b4a2a", 1.5);
  g.thick(19, 84, 45, 40, "#8a6a3a", 0.6);
  for (let a = 0; a < 8; a++) {
    const r = (a / 8) * 6.28;
    g.thick(46, 33, 46 + Math.cos(r) * 17, 33 + Math.sin(r) * 17, "#10141f", 1.6);
    g.thick(46, 33, 46 + Math.cos(r) * 16, 33 + Math.sin(r) * 16, "#aab2ba", 1);
  }
  sphere(g, 46, 33, 11, "#8a93a0", "#dfe6ee", "#4a505c", "#10141f");
  g.disc(42, 29, 2.4, "#eef2f6");
  return toSvg(g, wordmark("#a8d0b0"));
}

// EVEN HAND (§C) — balance scales weighing coins
function evenHand() {
  const g = new Grid();
  cardBase(g, "#16162a");
  vgrad(g, 5, 5, W - 10, H - 10, ["#3a3a5e", "#2c2c48", "#202038", "#16162a"]);
  glow(g, 40, 44, 22, "#4a4a72");
  vignette(g, "#100e20");
  g.rect(39, 22, 2, 42, GOLD);
  g.rect(20, 62, 20, 3, "#b9892f");
  g.rect(14, 28, 52, 2, GOLD);
  g.disc(40, 22, 2.4, GOLD_HI);
  for (const bx of [18, 62]) {
    g.line(bx, 30, bx - 5, 44, "#b9892f");
    g.line(bx, 30, bx + 5, 44, "#b9892f");
    g.disc(bx, 46, 6, "#9aa3ad");
    g.disc(bx, 45, 5, "#cdd4dc");
    g.disc(bx - 2, 44, 2, GOLD_HI);
    g.disc(bx + 2, 44, 2, GOLD_HI);
  }
  return toSvg(g, wordmark("#bcbce0"));
}

// SPIRAL FRIAR (§C Fibonacci) — a glowing golden spiral
function spiralFriar() {
  const g = new Grid();
  cardBase(g, "#161226");
  vgrad(g, 5, 5, W - 10, H - 10, ["#2e2a5a", "#241f48", "#1a1638", "#120e28"]);
  glow(g, 40, 44, 26, "#4a3f82");
  vignette(g, "#0e0a1e");
  let a = 0,
    r = 1.5;
  for (let i = 0; i < 64; i++) {
    a += 0.34;
    r += 0.32;
    g.disc(40 + Math.cos(a) * r, 44 + Math.sin(a) * r, 1.3, i % 6 < 3 ? GOLD : GOLD_HI);
  }
  g.disc(40, 44, 2, "#fff0c8");
  return toSvg(g, wordmark("#cbb8e8"));
}

// WAR COUNCIL (§H) — a cluster of war banners
function warCouncil() {
  const g = new Grid();
  cardBase(g, "#1a1018");
  vgrad(g, 5, 5, W - 10, H - 10, ["#4a2030", "#3a1824", "#2a121a", "#1c0c12"]);
  glow(g, 40, 48, 24, "#6a2838");
  vignette(g, "#14060c");
  const banner = (bx, col, hi) => {
    g.thick(bx, 88, bx, 20, "#8a6a3a", 1.1);
    g.disc(bx, 19, 1.6, GOLD);
    g.rect(bx, 24, 12, 17, col);
    g.rect(bx, 24, 12, 3, hi);
    g.tri(bx + 6, 41, bx + 12, 41, bx + 12, 47, "#1a1018");
  };
  banner(18, "#3f8fd0", "#7fb8e0");
  banner(33, "#c0273f", "#e0707a");
  banner(48, "#57b56a", "#86d090");
  spade(g, 24, 32, 3, GOLD);
  return toSvg(g, wordmark("#d49aa8"));
}

// TITHE BARN (§F) — a granary under a harvest moon
function titheBarn() {
  const g = new Grid();
  cardBase(g, "#161e2a");
  vgrad(g, 5, 5, W - 10, H - 10, ["#3a4a6a", "#2c3a52", "#20283a", "#161e2a"]);
  g.disc(40, 26, 9, "#e8c46a");
  glow(g, 40, 26, 16, "#c8a84a");
  dither(g, 9, 82, W - 18, 18, "#0e1018");
  vignette(g, "#0c0e16");
  g.rect(24, 50, 32, 26, "#7a3028"); // barn body
  g.tri(21, 50, 40, 33, 59, 50, "#9a4030"); // roof
  g.rect(24, 50, 32, 2, "#5a2018");
  g.rect(36, 58, 8, 18, "#3a1810"); // door
  g.rect(35, 58, 10, 2, "#5a2018");
  for (let i = 0; i < 4; i++) g.line(58 + i, 70, 60 + i, 81, "#d8b84a"); // wheat
  g.disc(16, 81, 3, GOLD);
  g.disc(63, 82, 2.4, GOLD_HI);
  return toSvg(g, wordmark("#bcc8d8"));
}

// WARDEN'S EYE (§A ♠) — a watchful eye set in a tower shield
function wardensEye() {
  const g = new Grid();
  cardBase(g, "#161226");
  vgrad(g, 5, 5, W - 10, H - 10, ["#2e2a5a", "#241f48", "#1a1638", "#120e28"]);
  glow(g, 40, 46, 24, "#4a3f82");
  vignette(g, "#0e0a1e");
  g.disc(40, 50, 17, "#160810");
  g.rect(23, 32, 34, 20, "#5a3d24");
  g.disc(40, 50, 16, "#5a3d24");
  g.rect(23, 32, 34, 4, "#6b4a2a");
  g.rect(45, 32, 8, 30, "#46301c");
  g.ring(40, 47, 15, "#b9975a", 1);
  g.tri(40, 36, 53, 52, 27, 52, "#b070e0");
  g.tri(40, 40, 49, 51, 31, 51, "#241638");
  g.disc(40, 47, 5, "#f3eede");
  g.disc(40, 47, 2.4, "#b070e0");
  g.disc(40, 47, 1.2, "#241638");
  g.set(39, 46, "#ffffff");
  return toSvg(g, wordmark("#bca8e0"));
}

// TWIN BLADES (§B pair) — two parallel daggers
function twinBlades() {
  const g = new Grid();
  cardBase(g, "#101820");
  vgrad(g, 5, 5, W - 10, H - 10, ["#2a3a4a", "#203038", "#182428", "#101820"]);
  glow(g, 40, 46, 24, "#3a5a6a");
  vignette(g, "#0a1014");
  for (const x of [31, 49]) {
    g.thick(x, 80, x, 30, "#10141f", 1.8);
    g.thick(x, 80, x, 30, "#cdd4dc", 1.2);
    g.thick(x + 1, 78, x + 1, 32, "#eef2f6", 0.4);
    g.disc(x, 29, 1.4, "#eef2f6");
    g.thick(x - 4, 70, x + 4, 70, "#10141f", 1.6);
    g.thick(x - 4, 70, x + 4, 70, "#f2c14e", 1);
    g.disc(x, 82, 2, "#f2c14e");
  }
  return toSvg(g, wordmark("#a8c0cc"));
}

// TRIUMVIRATE (§B three-of-a-kind) — three fanned swords
function triumvirate() {
  const g = new Grid();
  cardBase(g, "#1a1018");
  vgrad(g, 5, 5, W - 10, H - 10, ["#4a2838", "#3a1e2a", "#2a161e", "#1c0e14"]);
  glow(g, 40, 46, 24, "#6a3048");
  vignette(g, "#140810");
  for (const ang of [-0.42, 0, 0.42]) {
    const ex = 40 + Math.sin(ang) * 52,
      ey = 82 - Math.cos(ang) * 56;
    g.thick(40, 82, ex, ey, "#10141f", 1.8);
    g.thick(40, 82, ex, ey, "#cdd4dc", 1.2);
    g.disc(ex, ey, 1.4, "#eef2f6");
  }
  g.thick(28, 70, 52, 70, "#10141f", 1.8);
  g.thick(28, 70, 52, 70, "#f2c14e", 1.2);
  g.disc(40, 81, 2.6, "#f2c14e");
  return toSvg(g, wordmark("#d49aa8"));
}

// DRILLMASTER (§C 10/4) — a war drum with crossed sticks
function drillmaster2() {
  const g = new Grid();
  cardBase(g, "#1a1410");
  vgrad(g, 5, 5, W - 10, H - 10, ["#3a2e1a", "#2c2414", "#201a0e", "#14100a"]);
  glow(g, 40, 50, 24, "#5a4624");
  vignette(g, "#0e0a06");
  g.rect(22, 40, 36, 24, "#7a3028");
  g.rect(20, 38, 40, 3, "#e8d8b0");
  g.rect(20, 63, 40, 3, "#e8d8b0");
  for (let x = 24; x < 56; x += 6) {
    g.line(x, 41, x + 3, 63, "#f2c14e");
    g.line(x + 3, 63, x + 6, 41, "#f2c14e");
  }
  g.thick(14, 24, 40, 48, "#8a6a3a", 1.5);
  g.thick(66, 24, 40, 48, "#8a6a3a", 1.5);
  g.disc(14, 23, 2.4, "#cdd4dc");
  g.disc(66, 23, 2.4, "#cdd4dc");
  return toSvg(g, wordmark("#cbb890"));
}

// BEASTMASTER (§C Aces) — a wolf's head with glowing eyes
function beastmaster() {
  const g = new Grid();
  cardBase(g, "#1a1410");
  vgrad(g, 5, 5, W - 10, H - 10, ["#3a3020", "#2c2418", "#201a10", "#14100a"]);
  glow(g, 40, 44, 24, "#5a4a2e");
  vignette(g, "#0e0a06");
  g.tri(24, 18, 31, 40, 19, 40, "#2a2218"); // ears
  g.tri(56, 18, 49, 40, 61, 40, "#2a2218");
  sphere(g, 40, 44, 15, "#6a5a44", "#8a7a5e", "#48402e", "#15100a");
  g.tri(33, 52, 47, 52, 40, 66, "#48402e"); // snout
  g.disc(40, 60, 2, "#15100a"); // nose
  g.rect(31, 42, 5, 3, "#ffd24a"); // eyes
  g.rect(44, 42, 5, 3, "#ffd24a");
  glow(g, 33, 43, 4, "#7a5a10");
  glow(g, 47, 43, 4, "#7a5a10");
  return toSvg(g, wordmark("#cbb890"));
}

// ============================================================================
// Base-pool relics (the original JOKER_LIBRARY ids) — so common jokers show art.
// ============================================================================
function glassCannon() {
  const g = new Grid();
  cardBase(g, "#0e1622");
  vgrad(g, 5, 5, W - 10, H - 10, ["#2a3a52", "#203040", "#182430", "#101822"]);
  glow(g, 40, 50, 24, "#3a5a7a");
  vignette(g, "#0a1018");
  g.thick(20, 72, 58, 40, "#1a2a3a", 4);
  g.thick(20, 72, 58, 40, "#bdeaff", 3);
  g.thick(21, 71, 57, 40, "#dff4ff", 1.1);
  g.disc(58, 40, 4, "#7fb8d8");
  g.disc(58, 40, 2.4, "#0e1622");
  g.disc(24, 74, 5, "#6b4a2a");
  g.ring(24, 74, 5, "#8a6a3a", 1);
  g.disc(24, 74, 1.6, "#3a2818");
  g.disc(60, 38, 2, "#ffe9a0");
  return toSvg(g, wordmark("#a8d0e0"));
}
function duelist() {
  const g = new Grid();
  cardBase(g, "#1a1018");
  vgrad(g, 5, 5, W - 10, H - 10, ["#4a2838", "#3a1e2a", "#2a161e", "#1c0e14"]);
  glow(g, 40, 46, 24, "#6a3048");
  vignette(g, "#140810");
  g.thick(40, 82, 40, 22, "#10141f", 1.4);
  g.thick(40, 82, 40, 22, "#dfe6ee", 0.9);
  g.disc(40, 21, 1.2, "#ffffff");
  g.ring(40, 74, 5, "#f2c14e", 1.4);
  g.disc(40, 84, 2, "#f2c14e");
  g.disc(30, 70, 3, "#c0273f");
  g.disc(30, 70, 1.6, "#e0506a");
  g.line(30, 73, 28, 82, "#57b56a");
  return toSvg(g, wordmark("#d49aa8"));
}
function fieldMedic() {
  const g = new Grid();
  cardBase(g, "#1c0e12");
  vgrad(g, 5, 5, W - 10, H - 10, ["#4a1e28", "#3a1620", "#2a1018", "#1c0a10"]);
  glow(g, 40, 50, 24, "#7a2838");
  vignette(g, "#140609");
  g.rect(36, 24, 8, 5, "#8a6a3a");
  g.rect(34, 28, 12, 4, "#d9c08a");
  g.thick(40, 30, 40, 36, "#d9c08a", 1.2);
  sphere(g, 40, 54, 14, "#e0506a", "#ff8aa0", "#a3263a", "#3a0a14");
  g.rect(38, 48, 4, 14, "#f4eee0");
  g.rect(33, 53, 14, 4, "#f4eee0");
  return toSvg(g, wordmark("#e0b0b8"));
}
function bottledCourage() {
  const g = new Grid();
  cardBase(g, "#0e1620");
  vgrad(g, 5, 5, W - 10, H - 10, ["#2a3a5a", "#203048", "#182438", "#101828"]);
  glow(g, 40, 52, 22, "#3f6fd0");
  vignette(g, "#0a1018");
  g.rect(34, 24, 12, 5, "#8a6a3a");
  g.thick(40, 28, 40, 38, "#cdd4dc", 2);
  sphere(g, 40, 56, 15, "#3f8fd0", "#bdeaff", "#2c6aa0", "#0e1620");
  g.rect(28, 52, 24, 2, "#7fd6ff");
  glow(g, 40, 56, 12, "#bdeaff");
  g.disc(36, 60, 1.4, "#dff4ff");
  g.disc(44, 54, 1.2, "#dff4ff");
  g.disc(40, 64, 1.4, "#dff4ff");
  return toSvg(g, wordmark("#a8c8e8"));
}
function whetstone() {
  const g = new Grid();
  cardBase(g, "#16130e");
  vgrad(g, 5, 5, W - 10, H - 10, ["#3a3220", "#2c2618", "#201c10", "#14110a"]);
  glow(g, 40, 54, 22, "#5a4a2e");
  vignette(g, "#0e0a06");
  sphere(g, 36, 56, 15, "#7a8088", "#aab2ba", "#4a505c", "#15110a");
  g.disc(36, 56, 3, "#3a2818");
  g.thick(44, 40, 60, 30, "#10141f", 1.8);
  g.thick(44, 40, 60, 30, "#dfe6ee", 1.1);
  for (const [x, y] of [[48, 38], [52, 34], [46, 42], [54, 30]]) {
    g.set(x, y, "#ffd24a");
    g.set(x + 1, y, "#ff9a3a");
  }
  return toSvg(g, wordmark("#cbb890"));
}
function spikedAegis() {
  const g = new Grid();
  cardBase(g, "#12101a");
  vgrad(g, 5, 5, W - 10, H - 10, ["#2e2a4a", "#241f3c", "#1a1630", "#120e24"]);
  glow(g, 40, 48, 24, "#4a3f72");
  vignette(g, "#0c0a18");
  for (let a = 0; a < 12; a++) {
    const r = (a / 12) * 6.28;
    g.thick(40, 48, 40 + Math.cos(r) * 22, 48 + Math.sin(r) * 22, "#9aa3ad", 1.1);
  }
  g.disc(40, 48, 16, "#160810");
  g.rect(26, 34, 28, 12, "#5a3d24");
  g.disc(40, 46, 15, "#5a3d24");
  g.rect(26, 34, 28, 4, "#6b4a2a");
  g.ring(40, 46, 14, "#b9975a", 1);
  g.disc(40, 46, 4, "#cdd4dc");
  g.disc(40, 46, 2, "#e0506a");
  return toSvg(g, wordmark("#bca8e0"));
}

function star4(g, cx, cy, r, c) {
  g.tri(cx, cy - r, cx - r * 0.32, cy, cx + r * 0.32, cy, c);
  g.tri(cx, cy + r, cx - r * 0.32, cy, cx + r * 0.32, cy, c);
  g.tri(cx - r, cy, cx, cy - r * 0.32, cx, cy + r * 0.32, c);
  g.tri(cx + r, cy, cx, cy - r * 0.32, cx, cy + r * 0.32, c);
}
// compact coin helper
function coin(g, x, y, r, hi) {
  g.disc(x, y, r, "#b9892f");
  g.disc(x, y, r - 1, hi);
  g.set(x - 1, y - 1, "#fff0c8");
}
function swornNumber() {
  const g = new Grid();
  cardBase(g, "#16130e");
  vgrad(g, 5, 5, W - 10, H - 10, ["#3a3220", "#2c2618", "#201c10", "#14110a"]);
  glow(g, 40, 46, 24, "#5a4a2e");
  vignette(g, "#0e0a06");
  sphere(g, 40, 46, 16, "#e8d8b0", "#fff4d8", "#b9a070", "#3a2818"); // die
  for (const [x, y] of [[33, 39], [47, 39], [40, 46], [33, 53], [47, 53]]) g.disc(x, y, 2, "#7a1828"); // 5 pips
  return toSvg(g, wordmark("#cbb088"));
}
function cutpurse() {
  const g = new Grid();
  cardBase(g, "#16110a");
  vgrad(g, 5, 5, W - 10, H - 10, ["#3a2c18", "#2c2212", "#20180e", "#150f08"]);
  glow(g, 40, 50, 24, "#5a4222");
  vignette(g, "#0e0a06");
  g.disc(38, 52, 12, "#6b4a2a"); // purse
  g.rect(30, 40, 16, 5, "#5a3d24");
  g.rect(30, 41, 16, 2, "#f2c14e"); // drawstring
  coin(g, 50, 60, 3, "#ffe9a0");
  coin(g, 56, 56, 2.4, "#f2c14e");
  g.thick(20, 70, 44, 38, "#cdd4dc", 1.3); // knife slicing
  g.disc(20, 71, 1.6, "#9aa3ad");
  return toSvg(g, wordmark("#cbb088"));
}
function sanguinePact() {
  const g = new Grid();
  cardBase(g, "#220a12");
  vgrad(g, 5, 5, W - 10, H - 10, ["#5a1626", "#46101e", "#310b16", "#220810"]);
  glow(g, 40, 46, 26, "#7a1e30");
  vignette(g, "#160509");
  g.thick(28, 26, 48, 50, "#cdd4dc", 1.6); // dagger
  g.thick(28, 26, 48, 50, "#9aa3ad", 0.7);
  g.disc(28, 25, 1.4, "#eef2f6");
  g.disc(24, 40, 9, "#e0405f"); // heart lobes
  g.disc(36, 40, 9, "#e0405f");
  g.tri(15, 44, 45, 44, 30, 64, "#c0273f");
  g.disc(20, 36, 3, "#ff86a0");
  for (const y of [60, 66, 72]) g.disc(40, y, 1.6, "#c0273f"); // blood drip
  return toSvg(g, wordmark("#e0b0b8"));
}
function loneWolf() {
  const g = new Grid();
  cardBase(g, "#12101c");
  vgrad(g, 5, 5, W - 10, H - 10, ["#2a2a44", "#202036", "#18182a", "#10101e"]);
  g.disc(52, 24, 8, "#cdd0e0"); // moon
  glow(g, 52, 24, 14, "#3a3a5e");
  vignette(g, "#0a0a16");
  // wolf silhouette (sitting, head up howling)
  g.tri(28, 64, 40, 30, 44, 64, "#0e0e16"); // body/head
  g.tri(30, 34, 26, 24, 36, 36, "#0e0e16"); // muzzle up
  g.tri(38, 30, 42, 22, 44, 32, "#0e0e16"); // ear
  g.rect(26, 60, 22, 8, "#0e0e16"); // haunches
  g.set(34, 33, "#ffd24a"); // eye
  return toSvg(g, wordmark("#aab0d0"));
}
function banneret() {
  const g = new Grid();
  cardBase(g, "#101c2c");
  vgrad(g, 5, 5, W - 10, H - 10, ["#1e3a5a", "#163048", "#102438", "#0c1a28"]);
  glow(g, 40, 46, 24, "#2a5a8c");
  vignette(g, "#081420");
  g.thick(40, 88, 40, 16, "#8a6a3a", 1.4);
  g.disc(40, 15, 2, "#f2c14e");
  g.rect(40, 22, 22, 32, "#3f8fd0");
  for (let i = 0; i < 3; i++) g.tri(40, 28 + i * 9, 51, 33 + i * 9, 40, 38 + i * 9, "#7fb8e0"); // chevrons
  g.tri(56, 54, 62, 54, 62, 62, "#101c2c");
  g.tri(40, 54, 46, 54, 46, 60, "#101c2c");
  return toSvg(g, wordmark("#a8c8e8"));
}
function quartermastersLedger() {
  const g = new Grid();
  cardBase(g, "#16110a");
  vgrad(g, 5, 5, W - 10, H - 10, ["#3a2c18", "#2c2212", "#20180e", "#150f08"]);
  glow(g, 40, 46, 24, "#5a4222");
  vignette(g, "#0e0a06");
  g.rect(20, 28, 40, 34, "#e8d8b0"); // open ledger
  g.rect(39, 28, 2, 34, "#8a6a3a"); // spine
  for (const y of [34, 39, 44, 49, 54]) { g.rect(24, y, 12, 1, "#8a6a3a"); g.rect(44, y, 12, 1, "#8a6a3a"); }
  coin(g, 30, 70, 4, "#ffe9a0");
  coin(g, 40, 70, 4, "#f2c14e");
  coin(g, 50, 70, 4, "#ffe9a0");
  return toSvg(g, wordmark("#cbb088"));
}
function cullsReward() {
  const g = new Grid();
  cardBase(g, "#1c0c0c");
  vgrad(g, 5, 5, W - 10, H - 10, ["#5a2018", "#481814", "#341210", "#200c0a"]);
  glow(g, 40, 50, 24, "#a8482e");
  vignette(g, "#160706");
  // burning culled cards
  for (const [x, rot] of [[30, -1], [40, 0], [50, 1]]) {
    g.rect(x - 4, 50, 8, 16, "#cbbf9a");
    g.set(x, 56, "#7a5232");
  }
  for (const x of [28, 36, 44, 52]) {
    g.tri(x - 3, 50, x + 3, 50, x, 32, "#ff7a3a");
    g.tri(x - 2, 50, x + 2, 50, x, 38, "#ffd24a");
  }
  g.rect(22, 66, 36, 3, "#3a2818"); // log
  return toSvg(g, wordmark("#e0a090"));
}
function executionersTally() {
  const g = new Grid();
  cardBase(g, "#161422");
  vgrad(g, 5, 5, W - 10, H - 10, ["#2e2a3a", "#24202e", "#1a1824", "#12101a"]);
  glow(g, 40, 46, 24, "#3a3450");
  vignette(g, "#0a0810");
  // tally marks scratched on stone
  for (let s = 0; s < 2; s++) {
    const x0 = 22 + s * 22;
    for (let i = 0; i < 4; i++) g.thick(x0 + i * 4, 32, x0 + i * 4, 52, "#cdd4dc", 0.8);
    g.thick(x0 - 2, 52, x0 + 14, 32, "#e04060", 1); // the 5th, slashed
  }
  // a small axe at the bottom
  g.thick(34, 76, 46, 62, "#6b4a2a", 1.2);
  g.tri(44, 60, 54, 64, 48, 72, "#9aa3ad");
  return toSvg(g, wordmark("#b0aac0"));
}
function bloodthirst() {
  const g = new Grid();
  cardBase(g, "#1c0810");
  vgrad(g, 5, 5, W - 10, H - 10, ["#5a1220", "#46101a", "#320c14", "#20080e"]);
  glow(g, 40, 44, 24, "#8a1e2e");
  vignette(g, "#160409");
  // a fanged maw
  g.disc(40, 40, 16, "#2a0a12");
  for (let i = 0; i < 5; i++) g.tri(24 + i * 8, 34, 28 + i * 8, 34, 26 + i * 8, 46, "#f3eede"); // top fangs
  for (let i = 0; i < 4; i++) g.tri(28 + i * 8, 50, 32 + i * 8, 50, 30 + i * 8, 40, "#f3eede"); // bottom
  // blood drips
  for (const x of [30, 40, 50]) { g.rect(x, 50, 2, 8, "#c0273f"); g.disc(x + 1, 60, 2, "#c0273f"); }
  return toSvg(g, wordmark("#e0a0a8"));
}
function momentum() {
  const g = new Grid();
  cardBase(g, "#101820");
  vgrad(g, 5, 5, W - 10, H - 10, ["#1e4250", "#163440", "#102832", "#0a1c24"]);
  glow(g, 40, 44, 24, "#2a6a7a");
  vignette(g, "#081418");
  g.ring(40, 44, 16, "#7fd6ff", 2); // momentum loop
  // arrowhead on the ring
  g.tri(54, 38, 60, 44, 52, 50, "#bdeaff");
  for (const [x, y] of [[24, 30], [30, 24], [22, 40]]) g.set(x, y, "#dff4ff"); // speed sparks
  return toSvg(g, wordmark("#a8d0e0"));
}
function patientTactician() {
  const g = new Grid();
  cardBase(g, "#14130e");
  vgrad(g, 5, 5, W - 10, H - 10, ["#3a3420", "#2c2818", "#201c10", "#14110a"]);
  glow(g, 40, 44, 24, "#5a4a2e");
  vignette(g, "#0e0a06");
  // hourglass
  g.rect(28, 26, 24, 3, "#8a6a3a");
  g.rect(28, 62, 24, 3, "#8a6a3a");
  g.tri(30, 29, 50, 29, 40, 45, "#f2c14e"); // top sand
  g.tri(30, 61, 50, 61, 40, 45, "#b9892f"); // bottom glass
  g.tri(33, 32, 47, 32, 40, 44, "#ffe9a0");
  g.rect(39, 44, 2, 4, "#ffe9a0"); // falling sand
  return toSvg(g, wordmark("#cbb890"));
}
function twinCast() {
  const g = new Grid();
  cardBase(g, "#13182c");
  vgrad(g, 5, 5, W - 10, H - 10, ["#2a2a5e", "#222048", "#1a1838", "#121028"]);
  glow(g, 40, 44, 26, "#5a3f9a");
  vignette(g, "#0c0a1e");
  sphere(g, 32, 44, 10, "#7fb0ff", "#dff0ff", "#3f6fd0", "#1a1838"); // orb 1
  sphere(g, 48, 44, 10, "#b07fff", "#e8d0ff", "#6f3fd0", "#1a1838"); // orb 2
  g.disc(29, 41, 2.4, "#ffffff");
  g.disc(45, 41, 2.4, "#ffffff");
  return toSvg(g, wordmark("#bca8e8"));
}
function courtAstrologer() {
  const g = new Grid();
  cardBase(g, "#10101e");
  vgrad(g, 5, 5, W - 10, H - 10, ["#1e1e44", "#181836", "#12122a", "#0c0c1e"]);
  for (const [x, y] of [[16, 22], [60, 18], [22, 56], [56, 58], [40, 14]]) g.set(x, y, "#cdd9f0");
  glow(g, 42, 42, 22, "#2a2a5e");
  vignette(g, "#080814");
  g.thick(22, 68, 56, 30, "#8a93a0", 2.4); // telescope
  g.thick(22, 68, 56, 30, "#cdd4dc", 1.4);
  g.disc(57, 29, 4, "#3a3450");
  g.disc(22, 68, 3, "#f2c14e"); // eyepiece
  star4(g, 50, 24, 4, "#ffe9a0"); // an "8-ball" star omen
  return toSvg(g, wordmark("#aab0d0"));
}
function twinSoul() {
  const g = new Grid();
  cardBase(g, "#101c1a");
  vgrad(g, 5, 5, W - 10, H - 10, ["#1e4a44", "#163a36", "#102c28", "#0a1e1c"]);
  glow(g, 40, 44, 26, "#2a7a6e");
  vignette(g, "#081614");
  for (const [cx, c] of [[32, "#7fe0c8"], [48, "#c8fff0"]]) {
    g.disc(cx, 44, 8, c);
    g.disc(cx, 36, 4, c);
    g.disc(cx, 30, 2, c);
  }
  g.disc(31, 42, 2, "#ffffff");
  return toSvg(g, wordmark("#a8e0d4"));
}
function vampiricCrest() {
  const g = new Grid();
  cardBase(g, "#16101c");
  vgrad(g, 5, 5, W - 10, H - 10, ["#3a1a3a", "#2c142c", "#200e20", "#160a16"]);
  glow(g, 40, 44, 24, "#6a2050");
  vignette(g, "#0c0610");
  // a crest shield with bat wings
  g.tri(20, 40, 40, 44, 30, 36, "#2a1024"); // left wing
  g.tri(60, 40, 40, 44, 50, 36, "#2a1024"); // right wing
  g.tri(18, 40, 28, 38, 24, 46, "#1a0a16");
  g.tri(62, 40, 52, 38, 56, 46, "#1a0a16");
  g.rect(32, 38, 16, 12, "#7a1828"); // shield
  g.disc(40, 48, 8, "#7a1828");
  g.tri(34, 38, 40, 36, 46, 38, "#9a2238");
  g.disc(40, 46, 3, "#e0405f"); // gem (draining)
  // fangs
  g.tri(36, 50, 38, 50, 37, 56, "#f3eede");
  g.tri(42, 50, 44, 50, 43, 56, "#f3eede");
  return toSvg(g, wordmark("#cb9ac8"));
}
function usurer() {
  const g = new Grid();
  cardBase(g, "#16130a");
  vgrad(g, 5, 5, W - 10, H - 10, ["#3a3014", "#2c2410", "#20180c", "#150f08"]);
  glow(g, 40, 48, 24, "#5a4622");
  vignette(g, "#0e0a06");
  for (let i = 0; i < 4; i++) coin(g, 40, 64 - i * 7, 7, i % 2 ? "#ffe9a0" : "#f2c14e"); // coin stack
  // up arrow (interest grows)
  g.tri(40, 18, 32, 28, 48, 28, "#7ad06f");
  g.rect(37, 28, 6, 8, "#7ad06f");
  return toSvg(g, wordmark("#cbb088"));
}
function siegeEngineer() {
  const g = new Grid();
  cardBase(g, "#161208");
  vgrad(g, 5, 5, W - 10, H - 10, ["#3a3018", "#2c2412", "#20180e", "#150f08"]);
  glow(g, 40, 50, 24, "#5a4422");
  vignette(g, "#0e0a04");
  // catapult: a frame + arm + boulder
  g.thick(20, 70, 40, 70, "#6b4a2a", 2);
  g.thick(24, 70, 30, 50, "#6b4a2a", 1.6); // upright
  g.thick(30, 50, 56, 36, "#8a6a3a", 1.8); // arm
  g.disc(58, 34, 5, "#7a8088"); // boulder
  g.disc(58, 34, 4, "#9aa3ad");
  g.disc(24, 72, 4, "#3a2818"); // wheel
  g.ring(24, 72, 4, "#5a3d24", 1);
  return toSvg(g, wordmark("#cbb088"));
}
function nestEgg() {
  const g = new Grid();
  cardBase(g, "#16130c");
  vgrad(g, 5, 5, W - 10, H - 10, ["#2e3a1e", "#243018", "#1a2410", "#12180a"]);
  glow(g, 40, 48, 24, "#4a5a2a");
  vignette(g, "#0c1006");
  // nest
  g.disc(40, 56, 18, "#3a2818");
  g.disc(40, 54, 15, "#5a3d24");
  g.disc(40, 58, 13, "#2a1c10");
  for (let a = 0; a < 10; a++) g.line(40 + Math.cos((a / 10) * 6.28) * 16, 56 + Math.sin((a / 10) * 6.28) * 8, 40 + Math.cos((a / 10) * 6.28) * 19, 56 + Math.sin((a / 10) * 6.28) * 10, "#6b4a2a");
  // golden egg
  sphere(g, 40, 48, 9, "#f2c14e", "#ffe9a0", "#b9892f", "#6a4c10");
  g.disc(37, 45, 2, "#fff0c8");
  return toSvg(g, wordmark("#bcc88a"));
}
function almsgiver() {
  const g = new Grid();
  cardBase(g, "#16130a");
  vgrad(g, 5, 5, W - 10, H - 10, ["#3a3418", "#2c2814", "#201c0e", "#150f08"]);
  glow(g, 40, 50, 24, "#5a4a2e");
  vignette(g, "#0e0a06");
  // open palm
  g.disc(40, 60, 14, "#caa377");
  g.rect(26, 56, 28, 10, "#caa377");
  for (let i = 0; i < 4; i++) g.rect(28 + i * 7, 48, 5, 10, "#caa377"); // fingers
  g.disc(40, 60, 12, "#b08a5a");
  // coins floating up (given)
  coin(g, 32, 36, 3.5, "#ffe9a0");
  coin(g, 44, 30, 3.5, "#f2c14e");
  coin(g, 40, 44, 3, "#ffe9a0");
  return toSvg(g, wordmark("#cbb088"));
}
function lastStand() {
  const g = new Grid();
  cardBase(g, "#12101a");
  vgrad(g, 5, 5, W - 10, H - 10, ["#3a2030", "#2c1824", "#20121a", "#160c12"]);
  glow(g, 40, 46, 26, "#7a2a3a");
  vignette(g, "#0c0610");
  // a battered shield held defiant, cracked
  g.disc(40, 46, 18, "#160810");
  g.rect(24, 30, 32, 14, "#8a93a0");
  g.disc(40, 44, 16, "#8a93a0");
  g.rect(24, 30, 32, 4, "#cdd4dc");
  g.ring(40, 44, 15, "#5a626c", 1);
  g.disc(40, 44, 4, "#e0405f"); // boss
  // crack
  g.line(40, 28, 36, 40, "#2a2436");
  g.line(36, 40, 42, 50, "#2a2436");
  g.line(42, 50, 38, 62, "#2a2436");
  glow(g, 40, 44, 17, "#e0c060"); // defiant glow
  return toSvg(g, wordmark("#cb9aa8"));
}
function looseGrip() {
  const g = new Grid();
  cardBase(g, "#16130a");
  vgrad(g, 5, 5, W - 10, H - 10, ["#3a3418", "#2c2814", "#201c0e", "#150f08"]);
  glow(g, 40, 44, 24, "#5a4a2e");
  vignette(g, "#0e0a06");
  // a hand letting cards slip
  for (let i = 0; i < 5; i++) {
    const x = 18 + i * 9;
    const y = 30 + i * 5;
    g.rect(x, y, 11, 18, "#f3eede");
    for (let yy = y; yy < y + 18; yy++) { g.set(x, yy, "#cbbf9a"); g.set(x + 10, yy, "#cbbf9a"); }
  }
  g.disc(24, 66, 8, "#caa377"); // hand
  g.rect(20, 60, 22, 8, "#caa377");
  return toSvg(g, wordmark("#cbb088"));
}
function theCollector() {
  const g = new Grid();
  cardBase(g, "#101626");
  vgrad(g, 5, 5, W - 10, H - 10, ["#2a2a5a", "#202048", "#181838", "#101028"]);
  glow(g, 40, 44, 26, "#3a3a7a");
  vignette(g, "#0a0a1c");
  // a grand fan of cards
  for (let i = 0; i < 7; i++) {
    const a = (i - 3) * 0.22;
    const cx = 40 + Math.sin(a) * 22;
    const cy = 56 - Math.cos(a) * 8;
    g.rect(cx - 5, cy - 14, 10, 22, "#f3eede");
    for (let yy = cy - 14; yy < cy + 8; yy++) { g.set(cx - 5, yy, "#b9a878"); g.set(cx + 4, yy, "#b9a878"); }
    g.set(cx, cy - 8, ["#e04060", "#5fb0e0", "#7ad06f", "#b070e0"][i % 4]);
  }
  return toSvg(g, wordmark("#aab0e0"));
}
function echoSquire() {
  const g = new Grid();
  cardBase(g, "#161024");
  vgrad(g, 5, 5, W - 10, H - 10, ["#2e2a5a", "#241f48", "#1a1638", "#120e28"]);
  glow(g, 38, 48, 24, "#4a3f82");
  vignette(g, "#0c0a18");
  helm(g, 48, "#3a3450", "#2a2440", "#4a4460", "#5a2a3c", "#120e22"); // ghost echo (behind, dim)
  helm(g, 34, "#c9d0d8", "#9aa3ad", "#eef2f6", "#e0405f", "#15102a"); // solid knight
  g.tri(18, 48, 27, 41, 27, 55, "#f2c14e"); // left arrow (copies the joker to its left)
  g.rect(27, 45, 9, 6, "#f2c14e");
  return toSvg(g, wordmark("#cbb8e8"));
}
function theGlutton() {
  const g = new Grid();
  cardBase(g, "#1a1208");
  vgrad(g, 5, 5, W - 10, H - 10, ["#4a3818", "#3a2c12", "#2a200e", "#1a1208"]);
  glow(g, 38, 48, 24, "#6a4e22");
  vignette(g, "#0e0a04");
  g.thick(44, 54, 58, 66, "#cbbf9a", 2.4); // bone
  g.disc(58, 67, 3, "#f3eede");
  sphere(g, 36, 48, 13, "#7a3a24", "#a85e3a", "#4a2014", "#1a0e08"); // meat
  g.disc(31, 43, 4, "#b86a44");
  g.set(30, 40, "#ffe9a0");
  // a fly (spoilage omen)
  g.disc(50, 32, 1.6, "#15110a");
  g.line(48, 30, 50, 32, "#3a3a40");
  g.line(52, 30, 50, 32, "#3a3a40");
  return toSvg(g, wordmark("#cbb088"));
}
function theEncore() {
  const g = new Grid();
  cardBase(g, "#1a1230");
  vgrad(g, 5, 5, W - 10, H - 10, ["#3a2a5e", "#2c2048", "#221a3c", "#1a1430"]);
  glow(g, 40, 48, 24, "#5a3f9a");
  vignette(g, "#100a20");
  g.disc(40, 26, 2.4, "#ffe9a0"); // top loop
  g.disc(40, 32, 5, "#f2c14e"); // bell crown
  g.tri(40, 30, 28, 60, 52, 60, "#b9892f"); // bell body
  g.tri(40, 33, 31, 58, 49, 58, "#f2c14e");
  g.disc(34, 40, 3, "#ffe9a0"); // shine
  g.rect(27, 60, 26, 4, "#b9892f"); // rim
  g.disc(40, 65, 3, "#8a6a3a"); // clapper
  for (const [x, y] of [[18, 30], [62, 30], [16, 44], [64, 44]]) g.set(x, y, "#cabfff"); // sound sparks
  return toSvg(g, wordmark("#cbb8e8"));
}
function letterOfCredit() {
  const g = new Grid();
  cardBase(g, "#161210");
  vgrad(g, 5, 5, W - 10, H - 10, ["#3a3020", "#2c2418", "#201a10", "#14100a"]);
  glow(g, 40, 48, 24, "#5a4a2e");
  vignette(g, "#0e0a06");
  g.rect(22, 26, 36, 42, "#e8d8b0"); // parchment
  for (let x = 22; x < 58; x++) { g.set(x, 26, "#cbb787"); g.set(x, 67, "#cbb787"); }
  for (let y = 26; y < 68; y++) { g.set(22, y, "#cbb787"); g.set(57, y, "#cbb787"); }
  for (const y of [34, 39, 44, 49]) g.rect(27, y, 26, 1, "#8a6a3a"); // text lines
  g.disc(40, 60, 5, "#a3263a"); // wax seal
  g.disc(40, 60, 3, "#c0273f");
  g.disc(18, 68, 4, "#b9892f"); // coins
  g.disc(18, 68, 3, "#f2c14e");
  g.disc(60, 68, 3.4, "#ffe9a0");
  return toSvg(g, wordmark("#cbb088"));
}
function cowardsGambit() {
  const g = new Grid();
  cardBase(g, "#101820");
  vgrad(g, 5, 5, W - 10, H - 10, ["#2a3a4a", "#203038", "#182428", "#101820"]);
  glow(g, 40, 48, 24, "#3a5a6a");
  vignette(g, "#0a1014");
  g.rect(22, 42, 12, 18, "#e8d8b0"); // a low card
  g.rect(22, 42, 12, 4, "#cbb787");
  g.set(27, 50, "#7a5232");
  g.thick(28, 74, 54, 30, "#10141f", 1.9); // dagger over
  g.thick(28, 74, 54, 30, "#cdd4dc", 1.2);
  g.disc(54, 29, 1.2, "#ffffff");
  g.thick(30, 68, 40, 60, "#6b4a2a", 1.3);
  g.disc(28, 74, 2, "#f2c14e");
  return toSvg(g, wordmark("#a8c0cc"));
}
function blackBanner() {
  const g = new Grid();
  cardBase(g, "#0c0c12");
  vgrad(g, 5, 5, W - 10, H - 10, ["#26262f", "#1c1c26", "#15151d", "#0c0c12"]);
  glow(g, 40, 46, 26, "#2c2c3e");
  vignette(g, "#070709");
  g.thick(40, 88, 40, 18, "#5a5a66", 1.4);
  g.disc(40, 17, 2, "#9aa3ad");
  g.rect(40, 22, 22, 30, "#1a1a24");
  g.rect(40, 22, 22, 3, "#2e2e3a");
  g.tri(56, 52, 62, 52, 62, 60, "#0c0c12");
  g.tri(40, 52, 46, 52, 46, 58, "#0c0c12");
  spade(g, 46, 31, 4, "#b070e0");
  clubPip(g, 54, 42, 3.5, "#57b56a");
  return toSvg(g, wordmark("#9a9ab0"));
}
function hoardersGrip() {
  const g = new Grid();
  cardBase(g, "#161020");
  vgrad(g, 5, 5, W - 10, H - 10, ["#3a2e4a", "#2c243c", "#201a30", "#161024"]);
  glow(g, 40, 48, 24, "#4a3a62");
  vignette(g, "#0c0a18");
  for (let i = 0; i < 5; i++) {
    const x = 18 + i * 9;
    g.rect(x, 38 + Math.abs(i - 2) * 2, 11, 24, "#f3eede");
    for (let y = 38 + Math.abs(i - 2) * 2; y < 62 + Math.abs(i - 2) * 2; y++) g.set(x, y, "#cbbf9a");
    g.set(x + 4, 44 + Math.abs(i - 2) * 2, "#7a5232");
  }
  g.disc(40, 70, 3, "#f2c14e");
  return toSvg(g, wordmark("#bca8d8"));
}
function veteransInstinct() {
  const g = new Grid();
  cardBase(g, "#16130e");
  vgrad(g, 5, 5, W - 10, H - 10, ["#3a3220", "#2c2618", "#201c10", "#14110a"]);
  glow(g, 40, 46, 24, "#5a4a2e");
  vignette(g, "#0e0a06");
  g.ring(40, 50, 19, "#57b56a", 1); // laurel ring
  g.ring(40, 50, 17, "#3d8a4c", 1);
  g.thick(40, 78, 40, 24, "#10141f", 1.9); // veteran blade
  g.thick(40, 78, 40, 24, "#cdd4dc", 1.2);
  g.disc(40, 23, 1.2, "#ffffff");
  g.set(38, 38, "#5a626c"); // notches/scars
  g.set(42, 46, "#5a626c");
  g.set(38, 54, "#5a626c");
  g.thick(30, 66, 50, 66, "#10141f", 1.7);
  g.thick(30, 66, 50, 66, "#f2c14e", 1.1);
  g.disc(40, 80, 2.2, "#f2c14e");
  return toSvg(g, wordmark("#a8d0b0"));
}
function grindstone2() {
  const g = new Grid();
  cardBase(g, "#16130e");
  vgrad(g, 5, 5, W - 10, H - 10, ["#3a3220", "#2c2618", "#201c10", "#14110a"]);
  glow(g, 40, 50, 24, "#5a4a2e");
  vignette(g, "#0e0a06");
  for (const x of [27, 40, 53]) {
    g.thick(x, 70, x, 26, "#10141f", 1.4);
    g.thick(x, 70, x, 26, "#cdd4dc", 0.9);
    g.disc(x, 25, 1, "#ffffff");
    g.thick(x - 3, 62, x + 3, 62, "#f2c14e", 0.8);
  }
  g.rect(20, 70, 40, 4, "#5a4a2e"); // rack
  for (const [sx, sy] of [[24, 64], [46, 60], [56, 64]]) {
    g.set(sx, sy, "#ffd24a");
    g.set(sx + 1, sy, "#ff9a3a");
  }
  return toSvg(g, wordmark("#cbb890"));
}
function echoHerald() {
  const g = new Grid();
  cardBase(g, "#141826");
  vgrad(g, 5, 5, W - 10, H - 10, ["#2a3a5e", "#20304a", "#182438", "#101828"]);
  glow(g, 30, 46, 24, "#3a5a8c");
  vignette(g, "#0a1018");
  g.thick(22, 58, 46, 40, "#b9892f", 2.4); // horn body
  g.thick(22, 58, 46, 40, "#f2c14e", 1.6);
  g.tri(44, 32, 44, 48, 58, 40, "#10141f"); // bell ink
  g.tri(45, 34, 45, 46, 56, 40, "#ffe9a0"); // bell
  g.disc(22, 58, 2.4, "#f2c14e");
  for (const rr of [7, 12, 17]) for (let a = -0.6; a < 0.6; a += 0.18) g.set(56 + Math.cos(a) * rr, 40 + Math.sin(a) * rr, "#7fd6ff"); // echo arcs
  return toSvg(g, wordmark("#a8c8e8"));
}
function soothsayerArt() {
  const g = new Grid();
  cardBase(g, "#161226");
  vgrad(g, 5, 5, W - 10, H - 10, ["#3a2e5a", "#2e2448", "#221a38", "#161028"]);
  glow(g, 40, 46, 26, "#5a3f9a");
  vignette(g, "#0e0a1e");
  g.rect(18, 28, 7, 14, "#f3eede"); // tarot peeking
  g.set(21, 33, "#7a5232");
  sphere(g, 40, 46, 14, "#7f6fd0", "#cabfff", "#4f3f90", "#15101c"); // crystal ball
  glow(g, 40, 46, 13, "#bfaeff");
  g.disc(35, 42, 3.5, "#dfd0ff");
  g.line(36, 50, 44, 44, "#dfd0ff");
  g.line(40, 53, 47, 48, "#cabfff");
  g.tri(34, 60, 46, 60, 40, 68, "#6b4a2a"); // stand
  g.rect(30, 60, 20, 3, "#8a6a3a");
  return toSvg(g, wordmark("#cbb8e8"));
}
function conscriptorArt() {
  const g = new Grid();
  cardBase(g, "#1a1018");
  vgrad(g, 5, 5, W - 10, H - 10, ["#4a2030", "#3a1824", "#2a121a", "#1c0c12"]);
  glow(g, 40, 46, 26, "#6a2838");
  vignette(g, "#14060c");
  g.thick(40, 86, 40, 18, "#8a6a3a", 1.4);
  g.disc(40, 17, 2, "#f2c14e");
  g.rect(28, 24, 24, 22, "#c0273f");
  g.rect(28, 24, 24, 3, "#e0707a");
  g.tri(28, 46, 40, 46, 34, 52, "#1a1018");
  g.tri(40, 46, 52, 46, 46, 52, "#1a1018");
  g.thick(32, 42, 48, 28, "#cdd4dc", 1.1);
  g.thick(48, 42, 32, 28, "#cdd4dc", 1.1);
  g.disc(32, 42, 1.6, "#f2c14e");
  g.disc(48, 42, 1.6, "#f2c14e");
  return toSvg(g, wordmark("#d49aa8"));
}
function jestersTwin() {
  const g = new Grid();
  cardBase(g, "#1a1230");
  vgrad(g, 5, 5, W - 10, H - 10, ["#3a2a5e", "#2c2048", "#221a3c", "#1a1430"]);
  glow(g, 40, 44, 24, "#4a3a72");
  vignette(g, "#100a20");
  const cap = (cx, c1, c2, c3) => {
    g.tri(cx - 9, 46, cx - 13, 30, cx - 3, 46, c1);
    g.tri(cx - 4, 46, cx, 27, cx + 4, 46, c2);
    g.tri(cx + 3, 46, cx + 13, 30, cx + 9, 46, c3);
    g.rect(cx - 10, 45, 20, 3, "#f2c14e");
    g.disc(cx - 13, 29, 1.8, "#ffe9a0");
    g.disc(cx, 26, 1.8, "#ffe9a0");
    g.disc(cx + 13, 29, 1.8, "#ffe9a0");
    for (let i = 0; i < 4; i++) g.tri(cx - 9 + i * 5, 48, cx - 6 + i * 5, 54, cx - 3 + i * 5, 48, "#f3eede");
  };
  cap(24, "#d8394e", "#3f8fd0", "#57b56a");
  cap(56, "#57b56a", "#d8394e", "#3f8fd0");
  return toSvg(g, wordmark("#c8b8e8"));
}
function titheCollector() {
  const g = new Grid();
  cardBase(g, "#160f0a");
  vgrad(g, 5, 5, W - 10, H - 10, ["#3a2e16", "#2c2412", "#201a0e", "#150f08"]);
  glow(g, 40, 50, 24, "#5a4622");
  vignette(g, "#0e0a06");
  g.rect(20, 28, 22, 26, "#e8d8b0"); // ledger
  g.rect(20, 28, 22, 4, "#cbb787");
  for (let y = 36; y < 52; y += 4) g.rect(24, y, 14, 1, "#8a6a3a");
  g.disc(38, 34, 2, "#c0273f"); // wax seal
  for (const [x, n] of [[50, 3], [58, 2]]) // coin stacks
    for (let i = 0; i < n; i++) {
      g.disc(x, 60 - i * 4, 4, "#b9892f");
      g.disc(x, 60 - i * 4, 3, i % 2 ? "#ffe9a0" : "#f2c14e");
    }
  return toSvg(g, wordmark("#cbb088"));
}
function twinDaggers() {
  const g = new Grid();
  cardBase(g, "#101820");
  vgrad(g, 5, 5, W - 10, H - 10, ["#2a3a4a", "#203038", "#182428", "#101820"]);
  glow(g, 40, 48, 24, "#3a5a6a");
  vignette(g, "#0a1014");
  const dagger = (hx, hy, tx, ty) => {
    g.thick(hx, hy, tx, ty, "#10141f", 1.7);
    g.thick(hx, hy, tx, ty, "#cdd4dc", 1.1);
    g.disc(tx, ty, 1.2, "#eef2f6");
    const dx = tx - hx, dy = ty - hy, L = Math.hypot(dx, dy), px = -dy / L, py = dx / L;
    g.thick(hx - px * 4, hy - py * 4, hx + px * 4, hy + py * 4, "#f2c14e", 1);
    g.disc(hx, hy, 1.8, "#f2c14e");
  };
  dagger(26, 74, 54, 30);
  dagger(54, 74, 26, 30);
  return toSvg(g, wordmark("#a8c0cc"));
}
function lightfoot() {
  const g = new Grid();
  cardBase(g, "#101a18");
  vgrad(g, 5, 5, W - 10, H - 10, ["#2a4a44", "#203a36", "#182c28", "#101e1c"]);
  glow(g, 40, 48, 24, "#2a6a5e");
  vignette(g, "#0a1614");
  // winged boot
  g.rect(30, 42, 14, 18, "#6b4a2a"); // leg
  g.rect(30, 56, 24, 8, "#5a3d24"); // foot
  g.rect(30, 60, 26, 4, "#3a2818"); // sole
  g.rect(30, 42, 14, 4, "#8a6a3a"); // cuff
  // wings
  for (const dir of [-1, 1]) {
    const bx = dir < 0 ? 30 : 44;
    for (let i = 0; i < 3; i++) g.tri(bx, 48 + i * 4, bx + dir * (14 - i * 3), 46 + i * 4, bx, 52 + i * 4, "#dfe6ee");
  }
  // motion sparks
  g.set(20, 64, "#9fe0d0");
  g.set(58, 64, "#9fe0d0");
  return toSvg(g, wordmark("#a8d0c8"));
}
function oddOmen() {
  const g = new Grid();
  cardBase(g, "#12101c");
  vgrad(g, 5, 5, W - 10, H - 10, ["#2a2a44", "#202036", "#18182a", "#10101e"]);
  g.disc(54, 26, 8, "#bcc0d8"); // moon
  g.disc(57, 24, 7, "#12101c");
  glow(g, 36, 50, 22, "#2a2a48");
  vignette(g, "#0a0a16");
  // raven body
  sphere(g, 38, 52, 13, "#1c1c28", "#34343f", "#0e0e16", "#070709");
  g.tri(25, 50, 38, 48, 30, 58, "#1c1c28"); // tail
  g.tri(26, 44, 22, 42, 28, 48, "#34343f"); // beak (pointing left-up)
  g.disc(31, 44, 1.6, "#ffd24a"); // eye
  // wing fold
  g.tri(40, 46, 50, 54, 38, 60, "#0e0e16");
  return toSvg(g, wordmark("#aab0d0"));
}
function bootstraps() {
  const g = new Grid();
  cardBase(g, "#16110a");
  vgrad(g, 5, 5, W - 10, H - 10, ["#3a2c18", "#2c2212", "#20180e", "#150f08"]);
  glow(g, 40, 50, 24, "#5a4222");
  vignette(g, "#0e0a06");
  g.rect(30, 36, 16, 20, "#6b4a2a"); // boot leg
  g.rect(28, 54, 28, 9, "#5a3d24"); // foot
  g.rect(28, 59, 30, 4, "#3a2818"); // sole
  g.rect(30, 36, 16, 4, "#8a6a3a");
  g.thick(32, 38, 44, 38, "#3a2818", 1); // bootstrap loop
  // gold spilling from the top
  for (const [x, r, hi] of [[34, 3, "#ffe9a0"], [40, 3.4, "#f2c14e"], [46, 3, "#ffe9a0"]]) {
    g.disc(x, 33, r, "#b9892f");
    g.disc(x, 32, r - 1, hi);
  }
  return toSvg(g, wordmark("#cbb088"));
}
function squiresPack() {
  const g = new Grid();
  cardBase(g, "#160f0a");
  vgrad(g, 5, 5, W - 10, H - 10, ["#3a2a1a", "#2c2014", "#20160e", "#150e08"]);
  glow(g, 40, 50, 24, "#5a3e22");
  vignette(g, "#0e0906");
  g.rect(26, 40, 28, 26, "#6b4a2a"); // pack body
  g.rect(26, 40, 28, 26, null);
  for (let y = 40; y < 66; y++) { g.set(26, y, "#3a2818"); g.set(53, y, "#3a2818"); }
  for (let x = 26; x < 54; x++) g.set(x, 65, "#3a2818");
  g.rect(26, 30, 28, 8, "#8a6a3a"); // bedroll on top
  g.ring(28, 34, 4, "#6b4a2a", 1);
  g.ring(52, 34, 4, "#6b4a2a", 1);
  g.rect(36, 46, 8, 10, "#5a3d24"); // front pocket
  g.rect(38, 44, 4, 4, "#f2c14e"); // buckle
  return toSvg(g, wordmark("#cbb088"));
}
function warhorse() {
  const g = new Grid();
  cardBase(g, "#161020");
  vgrad(g, 5, 5, W - 10, H - 10, ["#3a2e4a", "#2c243c", "#201a30", "#161024"]);
  glow(g, 40, 46, 24, "#4a3a62");
  vignette(g, "#0c0a18");
  // stylised horse head facing left
  g.disc(44, 46, 13, "#15101c"); // ink base
  sphere(g, 44, 46, 12, "#5a5060", "#7a7080", "#3a3444", "#15101c");
  g.tri(22, 44, 44, 38, 40, 56, "#5a5060"); // muzzle
  g.tri(22, 44, 40, 42, 34, 52, "#3a3444"); // muzzle shade
  g.tri(46, 30, 54, 34, 44, 40, "#5a5060"); // ear
  g.tri(48, 32, 52, 35, 46, 39, "#3a3444");
  g.disc(34, 44, 1.6, "#ffd24a"); // eye
  // mane
  g.tri(52, 32, 60, 56, 48, 56, "#241c30");
  // barding (gold chamfron strap)
  g.thick(30, 50, 46, 44, "#f2c14e", 1.2);
  g.disc(30, 51, 2, "#ffe9a0");
  return toSvg(g, wordmark("#bcacd0"));
}
function clubPip(g, cx, cy, r, c) {
  g.disc(cx, cy - r * 0.5, r * 0.6, c);
  g.disc(cx - r * 0.6, cy + r * 0.25, r * 0.6, c);
  g.disc(cx + r * 0.6, cy + r * 0.25, r * 0.6, c);
  g.rect(Math.round(cx - 1), cy, 2, Math.round(r * 1.1), c);
}
function diamondCrown() {
  const g = new Grid();
  cardBase(g, "#0e1622");
  vgrad(g, 5, 5, W - 10, H - 10, ["#2a3a5e", "#20304c", "#182438", "#101828"]);
  glow(g, 40, 38, 24, "#3a5a8c");
  vignette(g, "#0a1018");
  g.rect(22, 52, 36, 6, "#f2c14e");
  g.rect(22, 56, 36, 2, "#b9892f");
  g.tri(22, 52, 28, 40, 34, 52, "#f2c14e");
  g.tri(34, 52, 40, 38, 46, 52, "#f2c14e");
  g.tri(46, 52, 52, 40, 58, 52, "#f2c14e");
  g.tri(40, 18, 52, 36, 28, 36, "#0c2230");
  g.tri(40, 20, 50, 36, 30, 36, "#7fd6ff");
  g.tri(40, 50, 50, 37, 30, 37, "#3f8fc0");
  g.tri(40, 20, 50, 36, 40, 36, "#bdeaff");
  glow(g, 40, 34, 14, "#bdeaff");
  g.set(35, 26, "#ffffff");
  return toSvg(g, wordmark("#a8c8e8"));
}
function spadeswornArt() {
  const g = new Grid();
  cardBase(g, "#14101f");
  vgrad(g, 5, 5, W - 10, H - 10, ["#3a2e5a", "#2e2448", "#221a38", "#161028"]);
  glow(g, 40, 44, 26, "#4a3a72");
  vignette(g, "#0c0a18");
  spade(g, 40, 40, 16, "#7a4fb0");
  spade(g, 40, 38, 13, "#b070e0");
  g.disc(34, 34, 4, "#d8b0f0");
  g.rect(16, 50, 48, 5, "#f2c14e");
  g.rect(16, 50, 48, 1, "#ffe9a0");
  g.tri(16, 55, 10, 52, 10, 58, "#14101f");
  g.tri(64, 55, 70, 52, 70, 58, "#14101f");
  return toSvg(g, wordmark("#cba8e8"));
}
function opportunistArt() {
  const g = new Grid();
  cardBase(g, "#0e1f12");
  vgrad(g, 5, 5, W - 10, H - 10, ["#1e4a2c", "#163a22", "#0f2a18", "#0a1d10"]);
  glow(g, 40, 48, 24, "#2a6a3e");
  vignette(g, "#08160c");
  g.thick(22, 76, 52, 30, "#10141f", 1.9);
  g.thick(22, 76, 52, 30, "#cdd4dc", 1.2);
  g.disc(52, 29, 1.2, "#ffffff");
  g.thick(24, 74, 34, 64, "#6b4a2a", 1.4);
  g.disc(23, 76, 2, "#f2c14e");
  g.thick(30, 66, 38, 58, "#10141f", 1.6);
  g.thick(30, 66, 38, 58, "#f2c14e", 1);
  clubPip(g, 54, 26, 5, "#7ad06f");
  return toSvg(g, wordmark("#a8d0b0"));
}
function quartermasterArt() {
  const g = new Grid();
  cardBase(g, "#160f0a");
  vgrad(g, 5, 5, W - 10, H - 10, ["#3a2a1a", "#2c2014", "#20160e", "#150e08"]);
  glow(g, 40, 50, 24, "#5a3e22");
  vignette(g, "#0e0906");
  g.rect(28, 24, 7, 14, "#f3eede");
  g.rect(38, 24, 7, 14, "#cbe0a8");
  g.set(31, 30, "#7a5232");
  g.set(41, 30, "#5a7a32");
  g.rect(20, 40, 40, 28, "#6b4a2a");
  g.rect(20, 40, 40, 28, null);
  for (let x = 20; x < 60; x++) g.set(x, 67, "#3a2818");
  for (let y = 40; y < 68; y++) { g.set(20, y, "#3a2818"); g.set(59, y, "#3a2818"); }
  g.tri(20, 40, 40, 30, 60, 40, "#8a6a3a");
  g.rect(20, 46, 40, 6, "#5a3d24");
  g.rect(36, 50, 8, 8, "#f2c14e");
  g.set(39, 53, "#3a2818");
  return toSvg(g, wordmark("#cbb088"));
}
function sapperArt() {
  const g = new Grid();
  cardBase(g, "#0e0e14");
  vgrad(g, 5, 5, W - 10, H - 10, ["#2a2a3a", "#202030", "#181824", "#0e0e16"]);
  glow(g, 38, 54, 22, "#3a3a52");
  vignette(g, "#08080e");
  sphere(g, 38, 56, 15, "#26262e", "#46464f", "#121218", "#050507");
  g.disc(32, 50, 3, "#5a5a66");
  g.rect(36, 38, 5, 6, "#3a3a44");
  g.thick(38, 38, 50, 24, "#8a6a3a", 1.1);
  g.disc(50, 24, 3, "#ffd24a");
  g.disc(50, 24, 1.6, "#fff0c8");
  g.set(54, 20, "#ff9a3a");
  g.set(47, 19, "#ffe9a0");
  return toSvg(g, wordmark("#b0b0c0"));
}
function warBannerArt() {
  const g = new Grid();
  cardBase(g, "#1a1018");
  vgrad(g, 5, 5, W - 10, H - 10, ["#4a2030", "#3a1824", "#2a121a", "#1c0c12"]);
  glow(g, 40, 46, 26, "#6a2838");
  vignette(g, "#14060c");
  g.thick(40, 90, 40, 16, "#8a6a3a", 1.6);
  g.disc(40, 15, 2.4, "#f2c14e");
  g.rect(40, 22, 22, 30, "#c0273f");
  g.rect(40, 22, 22, 4, "#e0707a");
  g.tri(56, 52, 62, 52, 62, 60, "#1a1018");
  g.tri(40, 52, 46, 52, 46, 58, "#1a1018");
  spade(g, 51, 36, 5, "#f2c14e");
  g.thick(28, 30, 40, 24, "#8a6a3a", 1.2); // crossed second pole
  return toSvg(g, wordmark("#d49aa8"));
}
function bloodstainedShield() {
  const g = new Grid();
  cardBase(g, "#1a0a10");
  vgrad(g, 5, 5, W - 10, H - 10, ["#4a1820", "#3a1218", "#2a0e12", "#1c080c"]);
  glow(g, 40, 48, 24, "#6a2028");
  vignette(g, "#140609");
  g.disc(40, 48, 17, "#160810");
  g.rect(24, 34, 32, 14, "#8a93a0");
  g.disc(40, 46, 16, "#8a93a0");
  g.rect(24, 34, 32, 4, "#cdd4dc");
  g.rect(44, 38, 8, 22, "#5a626c");
  g.ring(40, 46, 15, "#dfe6ee", 1);
  for (const [x, len] of [[33, 16], [40, 22], [47, 14]]) {
    g.thick(x, 40, x, 40 + len, "#c0273f", 1.4);
    g.disc(x, 40 + len, 2, "#a3263a");
  }
  g.disc(40, 44, 4, "#e0506a");
  return toSvg(g, wordmark("#d49aa0"));
}
function usurpersSigil() {
  const g = new Grid();
  cardBase(g, "#16101f");
  vgrad(g, 5, 5, W - 10, H - 10, ["#3a2e5a", "#2e2448", "#221a38", "#161028"]);
  glow(g, 40, 46, 24, "#4a3a72");
  vignette(g, "#0c0a18");
  g.rect(22, 46, 36, 6, "#f2c14e");
  g.rect(22, 50, 36, 2, "#b9892f");
  g.tri(22, 46, 28, 34, 34, 46, "#f2c14e");
  g.tri(34, 46, 40, 32, 46, 46, "#f2c14e");
  g.tri(46, 46, 52, 34, 58, 46, "#f2c14e");
  g.disc(28, 34, 1.6, "#e04060");
  g.disc(40, 32, 2, "#5fb0e0");
  g.disc(52, 34, 1.6, "#e04060");
  g.thick(40, 20, 40, 72, "#10141f", 1.8);
  g.thick(40, 20, 40, 72, "#cdd4dc", 1.1);
  g.disc(40, 19, 1.2, "#ffffff");
  g.thick(32, 30, 48, 30, "#10141f", 1.6);
  g.thick(32, 30, 48, 30, "#9aa3ad", 1);
  return toSvg(g, wordmark("#bca8e0"));
}
function heartswornArt() {
  const g = new Grid();
  cardBase(g, "#220a12");
  vgrad(g, 5, 5, W - 10, H - 10, ["#5a1626", "#46101e", "#310b16", "#220810"]);
  glow(g, 40, 46, 26, "#7a1e30");
  vignette(g, "#160509");
  g.disc(31, 40, 11, "#3a0a14");
  g.disc(49, 40, 11, "#3a0a14");
  g.tri(18, 44, 62, 44, 40, 68, "#3a0a14");
  g.disc(31, 40, 10, "#e0405f");
  g.disc(49, 40, 10, "#e0405f");
  g.tri(20, 44, 60, 44, 40, 66, "#e0405f");
  g.disc(49, 42, 8, "#a3263a");
  g.disc(28, 36, 5, "#ff86a0");
  g.rect(18, 48, 44, 5, "#f2c14e");
  g.rect(18, 48, 44, 1, "#ffe9a0");
  g.tri(18, 53, 12, 50, 12, 56, "#220a12");
  g.tri(62, 53, 68, 50, 68, 56, "#220a12");
  return toSvg(g, wordmark("#e0b0b8"));
}
function clubmasterArt() {
  const g = new Grid();
  cardBase(g, "#0e1f12");
  vgrad(g, 5, 5, W - 10, H - 10, ["#1e4a2c", "#163a22", "#0f2a18", "#0a1d10"]);
  glow(g, 40, 46, 24, "#2a6a3e");
  vignette(g, "#08160c");
  g.disc(40, 34, 9, "#57b56a");
  g.disc(30, 48, 9, "#57b56a");
  g.disc(50, 48, 9, "#57b56a");
  g.rect(37, 44, 6, 18, "#3d8a4c");
  g.disc(40, 34, 7, "#7ad06f");
  g.disc(30, 48, 7, "#7ad06f");
  g.disc(50, 48, 7, "#7ad06f");
  g.disc(37, 32, 3, "#a0e090");
  g.rect(30, 20, 20, 3, "#f2c14e");
  g.tri(30, 20, 35, 14, 40, 20, "#f2c14e");
  g.tri(40, 20, 45, 14, 50, 20, "#f2c14e");
  return toSvg(g, wordmark("#a8d0b0"));
}
function reapersToll() {
  const g = new Grid();
  cardBase(g, "#14110a");
  vgrad(g, 5, 5, W - 10, H - 10, ["#3a3220", "#2c2618", "#201c10", "#14110a"]);
  glow(g, 40, 48, 24, "#5a4a2e");
  vignette(g, "#0e0a06");
  g.thick(24, 84, 40, 24, "#8a6a3a", 1.6);
  g.thick(24, 84, 40, 24, "#6b4a2a", 1);
  g.tri(40, 24, 60, 30, 44, 38, "#cdd4dc");
  g.tri(44, 38, 60, 30, 56, 44, "#9aa3ad");
  g.line(60, 30, 44, 38, "#eef2f6");
  for (const [x, hi] of [[28, "#f2c14e"], [36, "#ffe9a0"], [44, "#f2c14e"]]) {
    g.disc(x, 78, 4, "#b9892f");
    g.disc(x, 78, 3, hi);
  }
  return toSvg(g, wordmark("#cbb890"));
}
function recklessCharge() {
  const g = new Grid();
  cardBase(g, "#1c0c0c");
  vgrad(g, 5, 5, W - 10, H - 10, ["#5a2018", "#481814", "#341210", "#200c0a"]);
  glow(g, 40, 46, 24, "#8a3020");
  vignette(g, "#160706");
  g.thick(40, 82, 40, 24, "#10141f", 1.8);
  g.thick(40, 82, 40, 24, "#cdd4dc", 1.2);
  g.disc(40, 23, 1.2, "#ffffff");
  g.line(40, 40, 42, 46, "#3a3a40");
  g.line(42, 46, 38, 52, "#3a3a40");
  g.line(38, 52, 41, 58, "#3a3a40");
  g.thick(30, 72, 50, 72, "#10141f", 1.6);
  g.thick(30, 72, 50, 72, "#f2c14e", 1.1);
  g.disc(40, 84, 2, "#f2c14e");
  for (const x of [30, 40, 50]) {
    g.tri(x - 3, 70, x + 3, 70, x, 58, "#ff7a3a");
    g.tri(x - 2, 70, x + 2, 70, x, 62, "#ffd24a");
  }
  return toSvg(g, wordmark("#e0a090"));
}

const SPRITES = {
  "court-jester": courtJester,
  bloodletter,
  prospector,
  "war-chest": warChest,
  "headsmans-pride": headsman,
  "mirror-knight": mirrorKnight,
  "the-phalanx": phalanx,
  "lone-champion": loneChampion,
  "shield-wall": shieldWall,
  "phalanx-drillmaster": phalanxDrillmaster,
  "twin-fury": twinFury,
  "arcane-surge": arcaneSurge,
  cavalier,
  bludgeon,
  "even-hand": evenHand,
  "spiral-friar": spiralFriar,
  "war-council": warCouncil,
  "tithe-barn": titheBarn,
  "wardens-eye": wardensEye,
  "twin-blades": twinBlades,
  triumvirate,
  drillmaster: drillmaster2,
  beastmaster,
  "glass-cannon": glassCannon,
  duelist,
  "field-medic": fieldMedic,
  "bottled-courage": bottledCourage,
  whetstone,
  "spiked-aegis": spikedAegis,
  "bloodstained-shield": bloodstainedShield,
  "usurpers-sigil": usurpersSigil,
  heartsworn: heartswornArt,
  clubmaster: clubmasterArt,
  "reapers-toll": reapersToll,
  "reckless-charge": recklessCharge,
  "diamond-crown": diamondCrown,
  spadesworn: spadeswornArt,
  opportunist: opportunistArt,
  quartermaster: quartermasterArt,
  sapper: sapperArt,
  "war-banner": warBannerArt,
  "jesters-twin": jestersTwin,
  "tithe-collector": titheCollector,
  "twin-daggers": twinDaggers,
  lightfoot,
  "odd-omen": oddOmen,
  bootstraps,
  "squires-pack": squiresPack,
  warhorse,
  soothsayer: soothsayerArt,
  conscriptor: conscriptorArt,
  "cowards-gambit": cowardsGambit,
  "black-banner": blackBanner,
  "hoarders-grip": hoardersGrip,
  "veterans-instinct": veteransInstinct,
  grindstone: grindstone2,
  "echo-herald": echoHerald,
  "the-glutton": theGlutton,
  "the-encore": theEncore,
  "letter-of-credit": letterOfCredit,
  "echo-squire": echoSquire,
  "sworn-number": swornNumber,
  cutpurse,
  "sanguine-pact": sanguinePact,
  "lone-wolf": loneWolf,
  banneret,
  "quartermasters-ledger": quartermastersLedger,
  "culls-reward": cullsReward,
  "executioners-tally": executionersTally,
  bloodthirst,
  momentum,
  "patient-tactician": patientTactician,
  "twin-cast": twinCast,
  "court-astrologer": courtAstrologer,
  "twin-soul": twinSoul,
  "vampiric-crest": vampiricCrest,
  usurer,
  "siege-engineer": siegeEngineer,
  "nest-egg": nestEgg,
  almsgiver,
  "last-stand": lastStand,
  "loose-grip": looseGrip,
  "the-collector": theCollector,
};
mkdirSync(JOKER_DIR, { recursive: true });
for (const [slug, fn] of Object.entries(SPRITES)) {
  writeFileSync(join(JOKER_DIR, `${slug}.svg`), fn());
  console.log("wrote joker", slug);
}
// mirror into app/public/art/jokers so the app can render them in-game
const pubJ = resolve("public/art/jokers");
mkdirSync(pubJ, { recursive: true });
for (const f of readdirSync(JOKER_DIR).filter((f) => f.endsWith(".svg"))) copyFileSync(join(JOKER_DIR, f), join(pubJ, f));
console.log("mirrored jokers → public/art/jokers");
