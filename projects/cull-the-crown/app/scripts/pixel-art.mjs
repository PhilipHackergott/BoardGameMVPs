// Pixel-art generator for Cull the Crown card illustrations.
//
// Real pixel art (not smooth vector): we draw onto an integer pixel grid with primitives
// (rect/disc/ring/tri/line/plot) that rasterize to whole pixels, then emit an SVG of run-length
// <rect> pixels with shape-rendering=crispEdges. raster-jokers.mjs upscales it nearest-neighbour.
//
// Run from app/:  node scripts/pixel-art.mjs
import { writeFileSync, mkdirSync, readdirSync, copyFileSync } from "fs";
import { resolve, join } from "path";

// Mirror a folder's .svg files into app/public/art/<cat>/ so the running app can serve them at
// /art/<cat>/<slug>.svg (Vite serves public/ at the web root).
function mirrorToPublic(srcDir, cat) {
  const pub = resolve("public/art", cat);
  mkdirSync(pub, { recursive: true });
  for (const f of readdirSync(srcDir).filter((f) => f.endsWith(".svg"))) copyFileSync(join(srcDir, f), join(pub, f));
}

const JOKER_DIR = resolve("../cull the crown joker illustrations");

// ---- pixel canvas ---------------------------------------------------------
const W = 60,
  H = 84; // 5:7 card ratio, rendered up to 240x336

class Grid {
  constructor(w, h) {
    this.w = w;
    this.h = h;
    this.px = new Array(w * h).fill(null); // null = transparent
  }
  set(x, y, c) {
    x = Math.round(x);
    y = Math.round(y);
    if (x < 0 || y < 0 || x >= this.w || y >= this.h || c == null) return;
    this.px[y * this.w + x] = c;
  }
  get(x, y) {
    return this.px[y * this.w + x];
  }
  rect(x, y, w, h, c) {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.set(x + i, y + j, c);
  }
  // filled circle, rasterized to pixel centres
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
  // filled triangle (scanline via half-plane test)
  tri(ax, ay, bx, by, cx, cy, col) {
    const minX = Math.floor(Math.min(ax, bx, cx)),
      maxX = Math.ceil(Math.max(ax, bx, cx));
    const minY = Math.floor(Math.min(ay, by, cy)),
      maxY = Math.ceil(Math.max(ay, by, cy));
    const sign = (px, py, x0, y0, x1, y1) => (px - x1) * (y0 - y1) - (x0 - x1) * (py - y1);
    for (let y = minY; y <= maxY; y++)
      for (let x = minX; x <= maxX; x++) {
        const px = x + 0.5,
          py = y + 0.5;
        const d1 = sign(px, py, ax, ay, bx, by),
          d2 = sign(px, py, bx, by, cx, cy),
          d3 = sign(px, py, cx, cy, ax, ay);
        const hasNeg = d1 < 0 || d2 < 0 || d3 < 0,
          hasPos = d1 > 0 || d2 > 0 || d3 > 0;
        if (!(hasNeg && hasPos)) this.set(x, y, col);
      }
  }
  line(x0, y0, x1, y1, c) {
    x0 = Math.round(x0);
    y0 = Math.round(y0);
    x1 = Math.round(x1);
    y1 = Math.round(y1);
    const dx = Math.abs(x1 - x0),
      dy = -Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1,
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
}

// run-length encode each row into <rect> pixels
function toSvg(g, extra = "") {
  let rects = "";
  for (let y = 0; y < g.h; y++) {
    let x = 0;
    while (x < g.w) {
      const c = g.get(x, y);
      if (c == null) {
        x++;
        continue;
      }
      let run = 1;
      while (x + run < g.w && g.get(x + run, y) === c) run++;
      rects += `<rect x="${x}" y="${y}" width="${run}" height="1" fill="${c}"/>`;
      x += run;
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${g.w} ${g.h}" shape-rendering="crispEdges">\n<style>@import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&amp;display=swap'); .jk{font-family:'Press Start 2P',monospace}</style>\n${rects}\n${extra}\n</svg>\n`;
}

// vertical "JOKER" wordmark up both margins (kept as the pixel-font vector overlay)
function jokerWordmark(fill, size = 4.4) {
  const t = (x, dir) =>
    `<text class="jk" x="${x}" y="42" transform="rotate(${dir} ${x} 42)" text-anchor="middle" font-size="${size}" letter-spacing="2" fill="${fill}">JOKER</text>`;
  return t(6, -90) + t(54, 90);
}

// ---- shared card frame ----------------------------------------------------
const CREAM = "#efe6cf",
  BEVEL = "#f7f2e6";
function cardBase(g, faceColor) {
  g.rect(0, 0, W, H, CREAM); // edge
  // rounded corners: clip 2px corner pixels
  for (const [cx, cy] of [
    [0, 0],
    [W - 1, 0],
    [0, H - 1],
    [W - 1, H - 1],
  ]) {
    g.set(cx, cy, null);
  }
  g.rect(2, 2, W - 4, H - 4, BEVEL); // thin white bevel
  g.rect(4, 4, W - 8, H - 8, faceColor); // dark face
  // corner nibble on the face for a card-y feel
  g.set(4, 4, BEVEL);
  g.set(W - 5, 4, BEVEL);
  g.set(4, H - 5, BEVEL);
  g.set(W - 5, H - 5, BEVEL);
}

// =====================================================================================
// COURT JESTER  — portrait, the literal joker.  (exemplar for the pixel-art bar)
// =====================================================================================
function courtJester() {
  const P = {
    ink: "#1c1230",
    win: "#2c2048",
    winLo: "#241a3c",
    band: "#3a2a5e",
    skin: "#efce9b",
    skinHi: "#fce6c4",
    skinLo: "#d4a875",
    eye: "#1c1230",
    glint: "#ffffff",
    cheek: "#e87f99",
    mouth: "#9c2440",
    red: "#d8394e",
    redLo: "#a3263a",
    blue: "#3f8fd0",
    blueLo: "#2c6aa0",
    grn: "#57b56a",
    grnLo: "#3d8a4c",
    gold: "#f2c14e",
    goldHi: "#ffe9a0",
    ruff: "#f3eede",
    ruffLo: "#cdbf9a",
    frame: "#d9c08a",
  };
  const g = new Grid(W, H);
  cardBase(g, P.ink);

  // ---- portrait "photo" window ----
  const wx = 7,
    wy = 11,
    ww = 46,
    wh = 50;
  g.rect(wx, wy, ww, wh, P.win);
  // radiating court banners
  for (const a of [-1.1, -0.55, 0, 0.55, 1.1]) {
    g.line(30, 40, 30 + Math.sin(a) * 40, 40 - Math.cos(a) * 40, P.band);
  }
  g.rect(wx, wy, ww, wh, null) && 0; // (no-op safety)

  // ---- ruff collar (behind head) ----
  for (let i = 0; i < 6; i++) {
    const bx = 14 + i * 6;
    g.tri(bx, 54, bx + 3, 62, bx + 6, 54, P.ruff);
  }
  g.rect(13, 53, 35, 3, P.ruff);
  g.rect(13, 56, 35, 1, P.ruffLo);

  // ---- head (outline, shadow, base, highlight) ----
  g.disc(30, 40, 13, P.ink); // 1px ink outline
  g.disc(30, 40, 12, P.skinLo);
  g.disc(29, 39, 11, P.skin);
  g.disc(26, 36, 6, P.skinHi);

  // eyes
  g.disc(25, 39, 2.2, P.eye);
  g.disc(35, 39, 2.2, P.eye);
  g.set(24, 38, P.glint);
  g.set(34, 38, P.glint);
  // cheeks
  g.disc(23, 45, 2.4, P.cheek);
  g.disc(37, 45, 2.4, P.cheek);
  // smile
  for (let x = 25; x <= 35; x++) {
    const y = 45 + Math.round(2 * Math.sin(((x - 25) / 10) * Math.PI));
    g.set(x, y, P.mouth);
    if (x > 26 && x < 34) g.set(x, y + 1, P.mouth);
  }

  // ---- three-point cap (ink outline under each lobe, then colour, then trim) ----
  // left (red), centre (blue), right (green)
  const lobes = [
    [P.red, P.redLo, 18, 30, 9, 14, 25, 30],
    [P.blue, P.blueLo, 24, 30, 30, 6, 36, 30],
    [P.grn, P.grnLo, 35, 30, 51, 14, 42, 30],
  ];
  for (const [c, lo, ax, ay, bx, by, cx, cy] of lobes) {
    g.tri(ax - 1, ay, bx, by - 1, cx + 1, cy, P.ink);
  }
  for (const [c, lo, ax, ay, bx, by, cx, cy] of lobes) {
    g.tri(ax, ay, bx, by, cx, cy, c);
    // shaded right half of each lobe
    g.tri((ax + bx) / 2, (ay + by) / 2, bx, by, cx, cy, lo);
  }
  // cap band trim
  g.rect(16, 28, 28, 3, P.gold);
  g.rect(16, 31, 28, 1, "#b9892f");
  for (let x = 17; x < 44; x += 3) g.set(x, 29, P.goldHi);

  // bells at the three tips
  for (const [bx, by] of [
    [9, 13],
    [30, 6],
    [51, 13],
  ]) {
    g.disc(bx, by, 2.4, P.ink);
    g.disc(bx, by, 1.8, P.gold);
    g.set(bx - 1, by - 1, P.goldHi);
  }

  // ---- photo frame + title pip ----
  g.ring(0, 0, 0, null); // noop
  // frame border
  for (let x = wx; x < wx + ww; x++) {
    g.set(x, wy, P.frame);
    g.set(x, wy + wh - 1, P.frame);
  }
  for (let y = wy; y < wy + wh; y++) {
    g.set(wx, y, P.frame);
    g.set(wx + ww - 1, y, P.frame);
  }
  // faux signature on the lower cream margin
  for (let x = 16; x <= 40; x++) {
    const y = 66 + Math.round(1.6 * Math.sin(((x - 16) / 6) * Math.PI));
    g.set(x, y, "#5b4a36");
  }

  return toSvg(g, jokerWordmark("#7a5232", 4.2));
}

// ---- shared motifs --------------------------------------------------------
// ray from (cx,cy) to the inner-face rectangle edge (angle 0 = up, clockwise)
function faceEdge(cx, cy, ang) {
  const x0 = 4,
    x1 = W - 5,
    y0 = 4,
    y1 = H - 5;
  const dx = Math.sin(ang),
    dy = -Math.cos(ang);
  let t = Infinity;
  if (dx > 1e-6) t = Math.min(t, (x1 - cx) / dx);
  else if (dx < -1e-6) t = Math.min(t, (x0 - cx) / dx);
  if (dy > 1e-6) t = Math.min(t, (y1 - cy) / dy);
  else if (dy < -1e-6) t = Math.min(t, (y0 - cy) / dy);
  return [cx + dx * t, cy + dy * t];
}
function sunburst(g, cx, cy, light) {
  const n = 12;
  for (let k = 0; k < n; k += 2) {
    const [x0, y0] = faceEdge(cx, cy, (k / n) * 2 * Math.PI);
    const [x1, y1] = faceEdge(cx, cy, ((k + 1) / n) * 2 * Math.PI);
    g.tri(cx, cy, x0, y0, x1, y1, light);
  }
}
function photoWindow(g, fill, banner) {
  const wx = 7,
    wy = 11,
    ww = 46,
    wh = 50;
  g.rect(wx, wy, ww, wh, fill);
  for (const a of [-1.1, -0.55, 0, 0.55, 1.1])
    g.line(30, 40, 30 + Math.sin(a) * 40, 40 - Math.cos(a) * 40, banner);
  return { wx, wy, ww, wh };
}
function frameWindow(g, w, c) {
  for (let x = w.wx; x < w.wx + w.ww; x++) {
    g.set(x, w.wy, c);
    g.set(x, w.wy + w.wh - 1, c);
  }
  for (let y = w.wy; y < w.wy + w.wh; y++) {
    g.set(w.wx, y, c);
    g.set(w.wx + w.ww - 1, y, c);
  }
}
function spade(g, cx, cy, r, c) {
  g.tri(cx, cy - r, cx - r, cy + r - 1, cx + r, cy + r - 1, c); // body (point up)
  g.disc(cx - r * 0.5, cy + r - 1, r * 0.55, c); // left lobe
  g.disc(cx + r * 0.5, cy + r - 1, r * 0.55, c); // right lobe
  g.rect(cx - 1, cy + r - 1, 2, r - 1, c); // stem
  g.tri(cx - r * 0.5, cy + 2 * r - 2, cx + r * 0.5, cy + 2 * r - 2, cx, cy + r, c);
}

// =====================================================================================
// BLOODLETTER — ♥ heal specialist.  Bold object: anatomical heart bleeding into a chalice.
// =====================================================================================
function bloodletter() {
  const g = new Grid(W, H);
  cardBase(g, "#240a12");
  sunburst(g, 30, 38, "#46121f");
  const HRT = "#e0405f",
    HLO = "#a3263a",
    HHI = "#ff86a0",
    INK = "#3a0a14";
  g.disc(23, 33, 9, INK);
  g.disc(37, 33, 9, INK);
  g.tri(15, 36, 45, 36, 30, 56, INK);
  g.disc(23, 33, 8, HRT);
  g.disc(37, 33, 8, HRT);
  g.tri(16, 36, 44, 36, 30, 54, HRT);
  g.disc(37, 35, 7, HLO);
  g.tri(31, 40, 44, 38, 30, 53, HLO);
  g.disc(22, 32, 7, HRT);
  g.disc(20, 29, 4, HHI);
  // aorta tubes
  g.rect(26, 22, 3, 7, HLO);
  g.rect(32, 22, 3, 7, HRT);
  g.set(27, 21, INK);
  g.set(33, 21, INK);
  // drip
  g.rect(29, 54, 2, 8, HLO);
  g.disc(30, 64, 2, HLO);
  // chalice
  const CUP = "#d9c08a",
    CUPHI = "#fff0c8",
    CUPLO = "#b9975a",
    WINE = "#9e2238";
  g.tri(22, 67, 38, 67, 34, 77, CUP);
  g.tri(26, 67, 34, 67, 30, 76, WINE);
  g.rect(22, 67, 17, 2, CUPHI);
  g.rect(28, 76, 4, 6, CUPLO);
  g.rect(23, 82, 14, 3, CUP);
  g.rect(23, 82, 14, 1, CUPHI);
  return toSvg(g, jokerWordmark("#efe6cf", 4.2));
}

// =====================================================================================
// PROSPECTOR — ♦ gold.  Bold object: a glowing diamond rising over a panning dish of coins.
// =====================================================================================
function prospector() {
  const g = new Grid(W, H);
  cardBase(g, "#0a1a22");
  sunburst(g, 30, 42, "#143542");
  const C = "#7fd6ff",
    CD = "#3f8fc0",
    CL = "#bdeaff",
    INK = "#0c2230";
  g.tri(30, 19, 43, 36, 17, 36, INK);
  g.tri(30, 59, 43, 37, 17, 37, INK);
  g.tri(30, 21, 41, 36, 19, 36, C);
  g.tri(30, 55, 41, 37, 19, 37, CD);
  g.tri(30, 21, 41, 36, 30, 36, CL);
  g.set(33, 24, "#ffffff");
  // sparkle
  g.line(47, 21, 47, 30, "#fff0c8");
  g.line(43, 25, 51, 25, "#fff0c8");
  // pan
  g.disc(30, 60, 17, "#8a8f97");
  g.disc(30, 57, 14, "#2f363e");
  g.rect(13, 58, 34, 1, "#aab2ba");
  // coins
  const GO = "#f2c14e",
    GH = "#ffe9a0";
  g.disc(23, 60, 3, GO);
  g.disc(30, 62, 3.4, GH);
  g.disc(37, 60, 3, GO);
  g.set(22, 59, GH);
  g.set(36, 59, GH);
  return toSvg(g, jokerWordmark("#efe6cf", 4.2));
}

// =====================================================================================
// WAR CHEST — economy/scaling.  Bold object: an iron-bound chest overflowing with gold.
// =====================================================================================
function warChest() {
  const g = new Grid(W, H);
  cardBase(g, "#15110a");
  sunburst(g, 30, 48, "#3a2d12");
  const WOOD = "#5a3d24",
    WHI = "#6b4a2a",
    IRON = "#2f261c",
    GO = "#f2c14e",
    GH = "#ffe9a0",
    INK = "#120c05";
  // lid dome
  g.disc(30, 52, 15, INK);
  g.disc(30, 52, 14, WHI);
  // body
  g.rect(16, 52, 28, 22, WOOD);
  for (let x = 16; x < 44; x++) g.set(x, 73, INK);
  for (let y = 52; y < 74; y++) {
    g.set(16, y, INK);
    g.set(43, y, INK);
  }
  g.rect(16, 52, 28, 1, WHI);
  // iron bands
  g.rect(22, 52, 3, 22, IRON);
  g.rect(38, 52, 3, 22, IRON);
  g.rect(16, 60, 28, 3, IRON);
  // lock
  g.rect(27, 62, 6, 7, GO);
  g.rect(29, 65, 2, 3, IRON);
  // spilling gold along the open mouth
  g.rect(18, 49, 24, 3, GH);
  g.disc(20, 47, 3, GO);
  g.disc(27, 44, 3, GH);
  g.disc(34, 44, 3, GH);
  g.disc(40, 47, 3, GO);
  // coins at base + sparkles
  g.disc(13, 74, 2, GO);
  g.disc(47, 74, 2, GH);
  g.set(24, 40, "#fff0c8");
  g.set(38, 39, "#fff0c8");
  return toSvg(g, jokerWordmark("#efe6cf", 4.2));
}

// =====================================================================================
// HEADSMAN'S PRIDE — ♠ damage.  Portrait: hooded executioner with a spade-edged axe.
// =====================================================================================
function headsman() {
  const g = new Grid(W, H);
  cardBase(g, "#1a1422");
  const w = photoWindow(g, "#221a2c", "#322846");
  // cloak shoulders
  const CL = "#2a2030";
  g.tri(12, 60, 30, 46, 48, 60, CL);
  g.rect(12, 58, 36, 4, CL);
  g.tri(27, 48, 33, 48, 30, 54, "#1c1626"); // collar V
  spade(g, 30, 51, 2, "#f2c14e"); // gold spade clasp
  // hood
  const HOOD = "#161020";
  g.disc(30, 38, 13, "#0c0814");
  g.disc(30, 38, 12, HOOD);
  g.rect(18, 38, 24, 15, HOOD);
  // face shadow + glowing eyes
  g.disc(30, 42, 8, "#3a2e22");
  g.rect(23, 41, 14, 9, "#3a2e22");
  g.rect(25, 42, 4, 3, "#ffd24a");
  g.rect(33, 42, 4, 3, "#ffd24a");
  g.set(26, 42, "#fff0b0");
  g.set(34, 42, "#fff0b0");
  // axe haft + spade-edged blade
  g.line(40, 18, 49, 60, "#6b4a2a");
  g.line(41, 18, 50, 60, "#8a6a3a");
  g.tri(40, 18, 56, 24, 46, 41, "#cdd4dc");
  g.tri(40, 18, 46, 41, 43, 31, "#9aa3ad");
  g.set(55, 24, "#fff0c8");
  frameWindow(g, w, "#d9c08a");
  spade(g, 30, 67, 4, "#2c2436");
  return toSvg(g, jokerWordmark("#7a5232", 4.0));
}

// =====================================================================================
// MIRROR KNIGHT — meta (copy a joker).  Two helms meeting at a glowing mirror seam.
// =====================================================================================
function helm(g, cx, steel, steelLo, plume, ink) {
  // crest plume
  g.tri(cx - 5, 27, cx, 16, cx + 4, 27, plume);
  g.set(cx, 15, plume);
  // ink silhouette (great helm: rounded top, straight sides, flat base)
  g.disc(cx, 35, 11, ink);
  g.rect(cx - 11, 35, 22, 25, ink);
  // steel
  g.disc(cx, 35, 10, steel);
  g.rect(cx - 10, 35, 20, 22, steel);
  g.rect(cx - 10, 57, 20, 2, steelLo); // bottom rim
  g.rect(cx + 3, 35, 7, 22, steelLo); // shaded right third
  // cross reinforcement: vertical nasal bar + horizontal visor band
  g.rect(cx - 1, 28, 2, 29, steelLo);
  g.rect(cx - 9, 41, 18, 3, ink); // visor slit
  // breath holes, lower face
  for (const hy of [49, 52])
    for (const hx of [-6, -3, 3, 6]) g.set(cx + hx, hy, ink);
  // rivets at the brow
  g.set(cx - 7, 37, steelLo);
  g.set(cx + 7, 37, ink);
}
function mirrorKnight() {
  const g = new Grid(W, H);
  cardBase(g, "#1b1230");
  g.rect(4, 4, 26, H - 8, "#241a3c");
  g.rect(30, 4, W - 9 - 30, H - 8, "#191130");
  // helms
  helm(g, 18, "#c9d0d8", "#9aa3ad", "#e0405f", "#15102a");
  helm(g, 42, "#7e8794", "#5a626c", "#8a2a3c", "#0e0a1e");
  // mirror seam, glowing
  g.rect(29, 6, 2, H - 12, "#b9a0e8");
  g.rect(29, 6, 1, H - 12, "#ffffff");
  g.disc(30, 30, 1.6, "#ffffff");
  g.disc(30, 64, 1.6, "#dccbf2");
  return toSvg(g, jokerWordmark("#efe6cf", 4.2));
}

// =====================================================================================
// THE PHALANX — combo (four-of-a-kind).  Filigree card-back + medallion of four cards.
// =====================================================================================
function phalanx() {
  const g = new Grid(W, H);
  cardBase(g, "#3a0f18");
  const RED = "#c0273f",
    GOLD = "#f2c14e",
    GH = "#ffe9a0";
  const corners = [
    [12, 12, 8, 26],
    [48, 12, 52, 26],
    [12, 72, 8, 58],
    [48, 72, 52, 58],
  ];
  for (const [cxr, cyr, bx, by] of corners) {
    const mx = (30 + cxr) / 2,
      my = (42 + cyr) / 2;
    g.line(30, 42, mx, my, RED);
    g.line(mx, my, cxr, cyr, RED);
    g.line(mx, my, bx, by, RED);
  }
  for (const [cxr, cyr, bx, by] of corners) {
    const mx = (30 + cxr) / 2,
      my = (42 + cyr) / 2;
    g.line(30, 42, mx, my, GOLD);
    g.line(mx, my, cxr, cyr, GOLD);
    g.disc(cxr, cyr, 1.4, GH);
  }
  // medallion
  g.rect(19, 33, 22, 18, "#160810");
  for (let x = 19; x < 41; x++) {
    g.set(x, 33, GOLD);
    g.set(x, 50, GOLD);
  }
  for (let y = 33; y <= 50; y++) {
    g.set(19, y, GOLD);
    g.set(40, y, GOLD);
  }
  // four matching pip-cards
  const cardX = [21, 26, 31, 36];
  for (let i = 0; i < 4; i++) {
    const cx = cardX[i],
      cy = i % 2 ? 36 : 37;
    g.rect(cx, cy, 4, 11, "#f3eede");
    spade(g, cx + 2, cy + 3, 1.4, "#1a0a10");
  }
  return toSvg(g, jokerWordmark("#efe6cf", 4.2));
}

// NOTE: Joker illustrations moved to the dedicated, higher-fidelity `joker-art.mjs` (80×112 full
// scenes with shading/dither). This file now generates the fighting-style / deck / tarot / spectral
// sets only. The joker builder functions above are kept for reference but no longer emitted here.
void [courtJester, bloodletter, prospector, warChest, headsman, mirrorKnight, phalanx, JOKER_DIR];

// =====================================================================================
// FIGHTING STYLES — the "planet card" analog (level up the hand of N cards).
// Cosmic navy card, starfield, top name-plate, one glowing weapon "celestial body".
// =====================================================================================
const STYLE_DIR = resolve("../cull the crown fighting style illustrations");
const COSMOS = "#0e1830";
const STEEL = "#cdd4dc",
  STEEL_LO = "#8b95a6",
  GOLD = "#f2c14e",
  GOLD_HI = "#ffe9a0",
  WOOD = "#6b4a2a",
  SINK = "#141d33"; // steel-on-navy ink outline

// thick rounded stroke (sampled discs) — for blades/shafts at any angle
function thick(g, x0, y0, x1, y1, c, half) {
  const steps = Math.max(1, Math.round(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0))) * 2);
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    g.disc(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, half, c);
  }
}
function glow(g, cx, cy, r) {
  g.disc(cx, cy, r, "#16223e"); // subtle lighter navy halo
  g.ring(cx, cy, r, "#243657", 1);
}
function starfield(g) {
  for (const [x, y] of [
    [10, 22], [16, 14], [44, 14], [50, 22], [11, 44], [49, 44],
    [10, 64], [50, 64], [20, 74], [40, 74], [37, 68], [23, 68],
  ])
    g.set(x, y, "#cdd9f0");
  for (const [x, y] of [[14, 32], [47, 33], [30, 72]]) {
    g.set(x, y, "#ffffff");
    g.set(x - 1, y, "#6f83ad");
    g.set(x + 1, y, "#6f83ad");
    g.set(x, y - 1, "#6f83ad");
    g.set(x, y + 1, "#6f83ad");
  }
}
function namePlate(g, twoLine) {
  const px = 6,
    py = 7,
    pw = 48,
    ph = twoLine ? 15 : 11;
  g.rect(px, py, pw, ph, "#ede0c0");
  for (let x = px; x < px + pw; x++) {
    g.set(x, py, "#b9975a");
    g.set(x, py + ph - 1, "#b9975a");
  }
  for (let y = py; y < py + ph; y++) {
    g.set(px, y, "#b9975a");
    g.set(px + pw - 1, y, "#b9975a");
  }
  for (const [cx, cy] of [
    [px, py],
    [px + pw - 1, py],
    [px, py + ph - 1],
    [px + pw - 1, py + ph - 1],
  ])
    g.set(cx, cy, null);
}
function styleName(lines) {
  const two = lines.length > 1;
  const fs = two ? 3.4 : 4.0;
  const y0 = two ? 12 : 14.4;
  return lines
    .map(
      (ln, i) =>
        `<text class="jk" x="30" y="${y0 + i * 4.6}" text-anchor="middle" font-size="${fs}" letter-spacing="0.3" fill="#3a2e22">${ln}</text>`,
    )
    .join("");
}
// a sword drawn from hilt (hx,hy) toward tip (tx,ty)
function sword(g, hx, hy, tx, ty, half, guardLen) {
  thick(g, hx, hy, tx, ty, SINK, half + 0.8);
  thick(g, hx, hy, tx, ty, STEEL, half);
  const dx = tx - hx,
    dy = ty - hy,
    L = Math.hypot(dx, dy),
    ux = dx / L,
    uy = dy / L,
    px = -uy,
    py = ux;
  // edge shade along one side
  thick(g, hx + px, hy + py, tx + px, ty + py, STEEL_LO, half - 0.8);
  const gx = hx + ux * 7,
    gy = hy + uy * 7; // guard a little up the blade
  thick(g, gx - px * guardLen, gy - py * guardLen, gx + px * guardLen, gy + py * guardLen, SINK, 1.8);
  thick(g, gx - px * guardLen, gy - py * guardLen, gx + px * guardLen, gy + py * guardLen, GOLD, 1.2);
  thick(g, hx, hy, gx, gy, WOOD, 1.3); // grip
  g.disc(hx, hy, 2.2, SINK);
  g.disc(hx, hy, 1.5, GOLD); // pommel
  g.disc(tx, ty, half - 0.4, STEEL); // rounded point
}

function twoHanded() {
  const g = new Grid(W, H);
  cardBase(g, COSMOS);
  starfield(g);
  glow(g, 30, 50, 18);
  namePlate(g, false);
  sword(g, 30, 76, 30, 26, 2.4, 8); // one big greatsword
  g.disc(30, 24, 1.6, STEEL); // tip
  return toSvg(g, styleName(["TWO-HANDED"]));
}
function swordShield() {
  const g = new Grid(W, H);
  cardBase(g, COSMOS);
  starfield(g);
  glow(g, 30, 50, 18);
  namePlate(g, true);
  sword(g, 16, 72, 47, 30, 1.8, 6); // sword behind, diagonal
  // round shield over the centre
  g.disc(30, 52, 14, SINK);
  g.disc(30, 52, 13, "#7a5a34");
  g.ring(30, 52, 13, STEEL_LO, 2);
  g.rect(29, 40, 2, 24, GOLD); // heraldic cross
  g.rect(18, 51, 24, 2, GOLD);
  g.disc(30, 52, 3, STEEL); // boss
  g.disc(30, 52, 2, GOLD_HI);
  return toSvg(g, styleName(["SWORD &", "SHIELD"]));
}
function spear() {
  const g = new Grid(W, H);
  cardBase(g, COSMOS);
  starfield(g);
  glow(g, 30, 50, 18);
  namePlate(g, false);
  thick(g, 30, 78, 30, 34, SINK, 2.1); // shaft outline
  thick(g, 30, 78, 30, 34, WOOD, 1.5);
  thick(g, 29.4, 78, 29.4, 34, "#8a6a3a", 0.7); // shaft highlight
  // leaf blade
  g.tri(30, 22, 35, 36, 25, 36, SINK);
  g.tri(30, 24, 34, 36, 26, 36, STEEL);
  g.tri(30, 24, 34, 36, 30, 36, STEEL_LO);
  g.rect(27, 35, 6, 2, GOLD); // collar
  // butt cap + side tassel
  g.disc(30, 79, 2, GOLD);
  return toSvg(g, styleName(["SPEAR"]));
}
function dualWielding() {
  const g = new Grid(W, H);
  cardBase(g, COSMOS);
  starfield(g);
  glow(g, 30, 50, 18);
  namePlate(g, true);
  sword(g, 15, 74, 47, 28, 1.7, 5);
  sword(g, 45, 74, 13, 28, 1.7, 5);
  return toSvg(g, styleName(["DUAL", "WIELDING"]));
}
function mage() {
  const g = new Grid(W, H);
  cardBase(g, COSMOS);
  starfield(g);
  namePlate(g, false);
  // radiating arcane rays from the orb
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * 2 * Math.PI;
    g.line(30, 40, 30 + Math.cos(a) * 16, 40 + Math.sin(a) * 16, k % 2 ? "#7e5fd0" : "#3f6fd0");
  }
  thick(g, 30, 78, 30, 44, SINK, 2.0); // staff
  thick(g, 30, 78, 30, 44, WOOD, 1.4);
  // crystal orb
  g.disc(30, 38, 9, SINK);
  g.disc(30, 38, 8, "#7fb0ff");
  g.disc(30, 38, 6, "#bfe0ff");
  g.disc(28, 36, 3, "#ffffff");
  g.ring(30, 38, 8, "#cfe6ff", 1);
  // claw mount holding the orb
  g.rect(26, 44, 8, 2, GOLD);
  // floating sparks
  g.set(18, 30, GOLD_HI);
  g.set(43, 32, "#bfe0ff");
  g.set(40, 22, "#ffffff");
  return toSvg(g, styleName(["MAGE"]));
}
function mounted() {
  const g = new Grid(W, H);
  cardBase(g, COSMOS);
  starfield(g);
  glow(g, 30, 46, 18);
  namePlate(g, false);
  // horseshoe (opening down): ink ring, gold ring, then carve the bottom gap
  g.ring(30, 44, 13, SINK, 5);
  g.ring(30, 44, 13, GOLD, 4);
  g.ring(30, 44, 9, GOLD_HI, 1); // inner shine
  // carve opening at the bottom (re-fill with face + glow)
  g.tri(30, 44, 21, 64, 39, 64, COSMOS);
  g.rect(24, 50, 12, 16, COSMOS);
  g.disc(30, 46, 9, "#16223e"); // restore inner glow disc
  // shoe tips + nail holes
  g.disc(22, 56, 2.2, GOLD);
  g.disc(38, 56, 2.2, GOLD);
  for (const [x, y] of [[19, 40], [21, 48], [41, 40], [39, 48]]) g.set(x, y, "#7a5a1e");
  // Ace pip glowing in the opening (spade)
  spade(g, 30, 50, 3.4, "#f3eede");
  spade(g, 30, 50, 2.2, "#2c2436");
  return toSvg(g, styleName(["MOUNTED"]));
}

const STYLES = {
  "two-handed": twoHanded,
  "sword-and-shield": swordShield,
  spear,
  "dual-wielding": dualWielding,
  mage,
  mounted,
};
mkdirSync(STYLE_DIR, { recursive: true });
for (const [slug, fn] of Object.entries(STYLES)) {
  writeFileSync(join(STYLE_DIR, `${slug}.svg`), fn());
  console.log("wrote style", slug);
}

// =====================================================================================
// DECKS — each starting deck variant as an ornate playing-card BACK: cream edge → themed
// face → double border + lattice → central medallion with a theme emblem → name banner.
// =====================================================================================
const DECK_DIR = resolve("../cull the crown deck illustrations");
const RED = "#e04060",
  BLU = "#5fb0e0",
  GRN = "#7ad06f",
  VIO = "#b070e0";

// suit pips (small, for emblems)
function heart(g, cx, cy, r, c) {
  g.disc(cx - r * 0.5, cy - r * 0.3, r * 0.62, c);
  g.disc(cx + r * 0.5, cy - r * 0.3, r * 0.62, c);
  g.tri(cx - r, cy - r * 0.1, cx + r, cy - r * 0.1, cx, cy + r * 1.3, c);
}
function diamond(g, cx, cy, r, c) {
  g.tri(cx, cy - r * 1.2, cx - r * 0.85, cy, cx + r * 0.85, cy, c);
  g.tri(cx, cy + r * 1.2, cx - r * 0.85, cy, cx + r * 0.85, cy, c);
}
function club(g, cx, cy, r, c) {
  g.disc(cx, cy - r * 0.5, r * 0.6, c);
  g.disc(cx - r * 0.6, cy + r * 0.25, r * 0.6, c);
  g.disc(cx + r * 0.6, cy + r * 0.25, r * 0.6, c);
  g.rect(Math.round(cx - 1), cy, 2, Math.round(r * 1.2), c);
}

function deckBack(g, face, accent, deep) {
  cardBase(g, face);
  // diagonal lattice texture across the face
  for (let y = 12; y < H - 12; y++) for (let x = 12; x < W - 12; x++) if ((x + y) % 6 === 0) g.set(x, y, deep);
  // ornate double border
  for (let x = 8; x < W - 8; x++) {
    g.set(x, 8, accent);
    g.set(x, H - 9, accent);
  }
  for (let y = 8; y < H - 8; y++) {
    g.set(8, y, accent);
    g.set(W - 9, y, accent);
  }
  for (let x = 10; x < W - 10; x++) {
    g.set(x, 10, deep);
    g.set(x, H - 11, deep);
  }
  for (let y = 10; y < H - 10; y++) {
    g.set(10, y, deep);
    g.set(W - 11, y, deep);
  }
  // central medallion
  g.disc(30, 38, 16, deep);
  g.ring(30, 38, 16, accent, 1);
  g.ring(30, 38, 14, accent, 1);
  // bottom name banner
  g.rect(9, 69, W - 18, 10, deep);
  for (let x = 9; x < W - 9; x++) {
    g.set(x, 69, accent);
    g.set(x, 78, accent);
  }
}
function deckName(name) {
  return `<text class="jk" x="30" y="76" text-anchor="middle" font-size="3.3" letter-spacing="0.3" fill="#f3eede">${name}</text>`;
}

// emblems (centred ~30,38)
function emCrown(g) {
  g.rect(22, 40, 16, 5, GOLD);
  g.rect(22, 44, 16, 2, "#b9892f");
  g.tri(22, 41, 25, 30, 28, 41, GOLD);
  g.tri(27, 41, 30, 28, 33, 41, GOLD);
  g.tri(32, 41, 35, 30, 38, 41, GOLD);
  g.disc(25, 30, 1.4, RED);
  g.disc(30, 28, 1.6, BLU);
  g.disc(35, 30, 1.4, RED);
  g.disc(30, 43, 1.6, RED);
}
function emCoins(g) {
  for (const [y, hi] of [[45, GOLD], [40, GOLD_HI], [35, GOLD]]) {
    g.disc(30, y, 6.2, "#b9892f");
    g.disc(30, y, 5, hi);
  }
  g.set(28, 33, "#fff0c8");
}
function emBanner(g, deep) {
  g.rect(27, 27, 2, 22, "#8a6a3a"); // pole
  g.disc(28, 27, 1.6, GOLD); // finial
  g.rect(29, 30, 11, 13, RED);
  g.rect(29, 30, 11, 3, "#f0909a");
  g.tri(33, 43, 37, 43, 35, 39, deep); // swallowtail notch
  spade(g, 34, 35, 2.2, "#f3eede"); // crest pip
}
function emSwords(g) {
  sword(g, 22, 47, 41, 29, 1.4, 4);
  sword(g, 38, 47, 19, 29, 1.4, 4);
}
function emChest(g) {
  g.disc(30, 41, 8, "#3a2818");
  g.disc(30, 41, 7, "#6b4a2a"); // lid dome
  g.rect(22, 41, 16, 10, "#5a3d24");
  for (let x = 22; x < 38; x++) g.set(x, 50, "#3a2818");
  for (let y = 41; y < 51; y++) {
    g.set(22, y, "#3a2818");
    g.set(37, y, "#3a2818");
  }
  g.rect(29, 43, 3, 5, GOLD);
  g.disc(26, 36, 2, GOLD);
  g.disc(34, 36, 2, GOLD_HI);
}
function emCompass(g) {
  g.ring(30, 38, 11, "#7fc0e0", 1);
  g.tri(30, 27, 33, 38, 27, 38, "#cdd9f0");
  g.tri(30, 49, 33, 38, 27, 38, "#5f90b0");
  g.tri(19, 38, 30, 35, 30, 41, "#9ab2c8");
  g.tri(41, 38, 30, 35, 30, 41, "#9ab2c8");
  g.disc(30, 38, 2, GOLD);
}
function emPouch(g) {
  g.rect(26, 27, 4, 9, "#f3eede");
  g.rect(31, 27, 4, 9, "#cbe0a8");
  g.set(28, 30, "#7a5232");
  g.set(33, 30, "#5a7a32");
  g.disc(30, 45, 9, "#3d7a48");
  g.disc(30, 45, 8, GRN);
  g.rect(25, 37, 10, 4, "#3d7a48");
  g.rect(25, 38, 10, 2, GOLD);
  g.disc(27, 43, 2, "#a0e090");
}
function emEye(g, deep) {
  g.tri(30, 27, 43, 49, 17, 49, VIO);
  g.tri(30, 31, 39, 47, 21, 47, deep);
  g.disc(30, 41, 5, "#f3eede");
  g.disc(30, 41, 2.6, VIO);
  g.disc(30, 41, 1.2, deep);
  g.set(29, 40, "#ffffff");
}
function emSpadeClub(g) {
  spade(g, 25, 37, 4.5, VIO);
  club(g, 37, 39, 4.5, GRN);
}
function emHeartDiamond(g) {
  heart(g, 25, 37, 5, RED);
  diamond(g, 37, 39, 5, BLU);
}
function emStaff(g) {
  thick(g, 23, 50, 37, 27, "#6b4a2a", 1.5);
  g.disc(37, 27, 2.2, "#8a6a3a");
  // scallop shell
  g.disc(27, 44, 5, "#e6d2a0");
  g.tri(22, 44, 32, 44, 27, 49, "#e6d2a0");
  for (const dx of [-3, 0, 3]) g.line(27, 40, 27 + dx, 49, "#b9975a");
}
function emErratic(g) {
  heart(g, 24, 31, 3.2, RED);
  diamond(g, 38, 32, 3.2, BLU);
  club(g, 24, 45, 3.2, GRN);
  spade(g, 38, 44, 3.2, VIO);
  g.disc(31, 38, 1.4, GOLD_HI);
}
function emRunes(g) {
  const cy = "#7fd6ff";
  g.line(25, 31, 25, 45, cy);
  g.line(25, 31, 29, 35, cy);
  g.line(35, 31, 35, 45, cy);
  g.line(35, 38, 39, 34, cy);
  g.line(35, 38, 39, 42, cy);
  g.disc(30, 38, 1.6, "#bfe0ff");
  g.set(22, 30, "#ffffff");
  g.set(40, 46, "#ffffff");
  g.set(21, 47, "#ffffff");
}

function deckSprite(face, accent, deep, emblem, name, carve) {
  const g = new Grid(W, H);
  deckBack(g, face, accent, deep);
  if (carve) emblem(g, deep);
  else emblem(g);
  return toSvg(g, deckName(name));
}
const DECKS = {
  royal: () => deckSprite("#2a1a4a", GOLD, "#190f30", emCrown, "ROYAL"),
  merchant: () => deckSprite("#2a2410", GOLD, "#181405", emCoins, "MERCHANT"),
  bannerman: () => deckSprite("#163048", "#cdd9f0", "#0e2030", (g, d) => emBanner(g, d), "BANNERMAN", true),
  warband: () => deckSprite("#3a1a1a", "#e0707a", "#240e0e", emSwords, "WARBAND"),
  coffer: () => deckSprite("#2a2012", GOLD, "#160f08", emChest, "COFFER"),
  tactician: () => deckSprite("#142838", "#7fc0e0", "#0c1822", emCompass, "TACTICIAN"),
  "fools-pouch": () => deckSprite("#2c2048", GRN, "#1a1030", emPouch, "FOOL'S POUCH"),
  occult: () => deckSprite("#1a0e22", VIO, "#0e0614", (g, d) => emEye(g, d), "OCCULT", true),
  iron: () => deckSprite("#1c2026", "#aab2ba", "#10141a", emSpadeClub, "IRON"),
  vital: () => deckSprite("#3a1424", "#e8809a", "#240a14", emHeartDiamond, "VITAL"),
  pilgrim: () => deckSprite("#243018", "#b9a05a", "#141c0c", emStaff, "PILGRIM"),
  erratic: () => deckSprite("#1c1830", "#ccccd8", "#100c1c", emErratic, "ERRATIC"),
  enchanter: () => deckSprite("#142038", "#7fd6ff", "#0c1422", emRunes, "ENCHANTER"),
};
mkdirSync(DECK_DIR, { recursive: true });
for (const [slug, fn] of Object.entries(DECKS)) {
  writeFileSync(join(DECK_DIR, `${slug}.svg`), fn());
  console.log("wrote deck", slug);
}

// =====================================================================================
// TAROTS — the 22 major arcana, adapted (see TAROT-ADAPTATIONS.md). A mystic card: cream
// edge → deep violet face → gold border + starfield → top numeral → central emblem → name.
// =====================================================================================
const TAROT_DIR = resolve("../cull the crown tarot illustrations");
const PARCH = "#efe0b8";

function star4(g, cx, cy, r, c) {
  g.tri(cx, cy - r, cx - r * 0.32, cy, cx + r * 0.32, cy, c);
  g.tri(cx, cy + r, cx - r * 0.32, cy, cx + r * 0.32, cy, c);
  g.tri(cx - r, cy, cx, cy - r * 0.32, cx, cy + r * 0.32, c);
  g.tri(cx + r, cy, cx, cy - r * 0.32, cx, cy + r * 0.32, c);
}
function tarotFrame(g) {
  cardBase(g, "#241638");
  // tiny starfield
  for (const [x, y] of [[14, 20], [46, 18], [12, 50], [48, 52], [30, 14], [20, 60], [40, 60]]) g.set(x, y, "#6a5a9a");
  // gold double border
  for (let x = 7; x < W - 7; x++) {
    g.set(x, 7, GOLD);
    g.set(x, H - 8, GOLD);
  }
  for (let y = 7; y < H - 7; y++) {
    g.set(7, y, GOLD);
    g.set(W - 8, y, GOLD);
  }
  // bottom name banner
  g.rect(8, 68, W - 16, 11, "#160c26");
  for (let x = 8; x < W - 8; x++) {
    g.set(x, 68, GOLD);
    g.set(x, 78, GOLD);
  }
  // top numeral plate
  g.rect(20, 9, 20, 7, "#160c26");
  for (let x = 20; x < 40; x++) {
    g.set(x, 9, GOLD);
    g.set(x, 15, GOLD);
  }
}
function tarotText(numeral, name) {
  return (
    `<text class="jk" x="30" y="14.3" text-anchor="middle" font-size="3.4" letter-spacing="0.3" fill="${"#f2c14e"}">${numeral}</text>` +
    `<text class="jk" x="30" y="75.5" text-anchor="middle" font-size="${name.length > 9 ? 2.7 : 3.2}" letter-spacing="0.2" fill="#f3eede">${name}</text>`
  );
}
const tarot = (numeral, name, emblem) => {
  const g = new Grid(W, H);
  tarotFrame(g);
  emblem(g);
  return toSvg(g, tarotText(numeral, name));
};

// emblems centred ~ (30, 40)
const TAROTS = {
  "the-fool": () =>
    tarot("0", "THE FOOL", (g) => {
      thick(g, 26, 52, 36, 24, "#8a6a3a", 1.2); // staff
      g.disc(36, 23, 3, "#d83a4e"); // bindle
      g.rect(35, 20, 2, 4, "#8a6a3a");
      star4(g, 22, 26, 4, GOLD_HI); // guiding star
      g.disc(27, 56, 3, GRN); // a step into the void
    }),
  "the-magician": () =>
    tarot("I", "THE MAGICIAN", (g) => {
      thick(g, 30, 56, 30, 24, "#f3eede", 1.2); // wand
      g.disc(30, 23, 3, GOLD_HI);
      g.disc(30, 56, 3, GOLD);
      star4(g, 22, 30, 3, "#7fd6ff");
      star4(g, 39, 46, 3, "#7fd6ff");
    }),
  "the-high-priestess": () =>
    tarot("II", "PRIESTESS", (g) => {
      g.rect(20, 24, 4, 30, PARCH); // pillars
      g.rect(36, 24, 4, 30, PARCH);
      // crescent moon
      g.disc(30, 38, 9, "#bfe0ff");
      g.disc(34, 35, 8, "#241638");
    }),
  "the-empress": () =>
    tarot("III", "THE EMPRESS", (g) => {
      emCrown(g);
      heart(g, 30, 54, 4, RED);
    }),
  "the-emperor": () =>
    tarot("IV", "THE EMPEROR", (g) => {
      g.rect(22, 30, 16, 22, "#7a1828"); // throne
      g.rect(22, 28, 16, 4, GOLD);
      g.rect(20, 26, 4, 6, GOLD); // arm rests
      g.rect(36, 26, 4, 6, GOLD);
      thick(g, 44, 50, 40, 28, "#8a6a3a", 1); // scepter
      g.disc(44, 27, 2.4, GOLD_HI);
    }),
  "the-hierophant": () =>
    tarot("V", "HIEROPHANT", (g) => {
      thick(g, 30, 54, 30, 24, GOLD, 1.2); // triple-cross staff
      for (const y of [30, 36, 42]) g.rect(24 + (y - 30) / 3, y, 12 - (2 * (y - 30)) / 3, 2, GOLD);
      g.disc(30, 23, 2.4, GOLD_HI);
    }),
  "the-lovers": () =>
    tarot("VI", "THE LOVERS", (g) => {
      heart(g, 25, 38, 6, RED);
      heart(g, 36, 40, 6, "#ff8aa0");
    }),
  "the-chariot": () =>
    tarot("VII", "THE CHARIOT", (g) => {
      g.rect(20, 30, 20, 14, "#9aa3ad"); // car
      g.rect(20, 28, 20, 3, GOLD);
      g.ring(24, 50, 6, STEEL, 2); // wheels
      g.ring(38, 50, 6, STEEL, 2);
      star4(g, 30, 26, 3, "#7fd6ff");
    }),
  strength: () =>
    tarot("VIII", "STRENGTH", (g) => {
      // up-chevron (rank +1) over a lion-gold disc
      g.disc(30, 42, 9, GOLD);
      g.tri(30, 28, 22, 40, 38, 40, "#ffe9a0");
      g.tri(30, 33, 25, 41, 35, 41, GOLD);
      g.disc(27, 41, 1.2, "#7a1828");
      g.disc(33, 41, 1.2, "#7a1828");
    }),
  "the-hermit": () =>
    tarot("IX", "THE HERMIT", (g) => {
      g.rect(26, 30, 8, 14, "#8a6a3a"); // lantern body
      g.rect(24, 28, 12, 3, GOLD);
      g.disc(30, 37, 4, GOLD_HI); // glowing flame
      g.disc(30, 37, 2, "#fffae0");
      g.rect(29, 44, 2, 8, "#8a6a3a");
    }),
  "wheel-of-fortune": () =>
    tarot("X", "WHEEL", (g) => {
      g.ring(30, 40, 13, GOLD, 2);
      g.ring(30, 40, 4, GOLD, 2);
      for (let a = 0; a < 8; a++) g.line(30, 40, 30 + Math.cos((a / 8) * 6.28) * 12, 40 + Math.sin((a / 8) * 6.28) * 12, "#b9892f");
      g.disc(30, 40, 2, GOLD_HI);
    }),
  justice: () =>
    tarot("XI", "JUSTICE", (g) => {
      g.rect(29, 24, 2, 26, GOLD); // beam post
      g.rect(16, 28, 28, 2, GOLD); // beam
      for (const bx of [18, 42]) {
        g.line(bx, 30, bx - 4, 40, "#b9892f");
        g.line(bx, 30, bx + 4, 40, "#b9892f");
        g.disc(bx, 42, 4, STEEL);
      }
      g.disc(30, 23, 2, GOLD_HI);
    }),
  "the-hanged-man": () =>
    tarot("XII", "HANGED MAN", (g) => {
      g.rect(18, 22, 24, 2, "#8a6a3a"); // gallows beam
      g.rect(28, 22, 2, 8, "#cbe0a8"); // rope
      g.disc(30, 36, 5, PARCH); // head (hanging)
      g.rect(27, 30, 6, 8, "#3f8fd0"); // body inverted
      g.line(27, 30, 24, 24, "#3f8fd0");
      g.line(33, 30, 36, 24, "#3f8fd0");
    }),
  death: () =>
    tarot("XIII", "DEATH", (g) => {
      thick(g, 24, 56, 30, 22, "#8a6a3a", 1); // scythe shaft
      g.tri(30, 22, 44, 26, 32, 30, STEEL); // blade
      g.tri(30, 22, 32, 30, 34, 26, "#9aa3ad");
      // skull
      g.disc(28, 48, 5, PARCH);
      g.set(26, 47, "#160c26");
      g.set(30, 47, "#160c26");
      g.rect(27, 51, 3, 2, "#160c26");
    }),
  temperance: () =>
    tarot("XIV", "TEMPERANCE", (g) => {
      g.tri(22, 30, 30, 30, 26, 40, GOLD); // upper cup
      g.tri(34, 40, 42, 40, 38, 50, GOLD); // lower cup
      for (let i = 0; i < 6; i++) g.set(27 + i, 40 + i, "#7fd6ff"); // stream
      g.disc(38, 52, 2, GOLD_HI);
    }),
  "the-devil": () =>
    tarot("XV", "THE DEVIL", (g) => {
      g.disc(30, 42, 10, "#1a0e14"); // head silhouette
      g.tri(20, 36, 24, 26, 26, 36, GOLD); // horns
      g.tri(40, 36, 36, 26, 34, 36, GOLD);
      g.disc(26, 41, 2, RED); // eyes
      g.disc(34, 41, 2, RED);
      g.tri(26, 46, 34, 46, 30, 50, GOLD); // grin
    }),
  "the-tower": () =>
    tarot("XVI", "THE TOWER", (g) => {
      g.rect(24, 30, 12, 24, "#7a6a5a"); // tower
      g.rect(24, 28, 12, 3, "#9a8a7a");
      for (let y = 34; y < 52; y += 5) g.rect(26, y, 8, 2, "#4a3a2e"); // courses
      g.line(40, 16, 32, 30, GOLD_HI); // lightning
      g.line(32, 30, 36, 32, GOLD_HI);
      g.disc(30, 24, 2, RED); // flame
    }),
  "the-star": () =>
    tarot("XVII", "THE STAR", (g) => {
      star4(g, 30, 38, 12, BLU);
      star4(g, 30, 38, 6, "#bfe0ff");
      star4(g, 18, 28, 3, BLU);
      star4(g, 42, 48, 3, BLU);
    }),
  "the-moon": () =>
    tarot("XVIII", "THE MOON", (g) => {
      g.disc(30, 38, 12, GRN);
      g.disc(35, 34, 11, "#241638"); // crescent
      g.disc(20, 26, 1.4, "#a0e090");
      g.disc(42, 50, 1.4, "#a0e090");
    }),
  "the-sun": () =>
    tarot("XIX", "THE SUN", (g) => {
      for (let a = 0; a < 12; a++) g.line(30, 40, 30 + Math.cos((a / 12) * 6.28) * 15, 40 + Math.sin((a / 12) * 6.28) * 15, RED);
      g.disc(30, 40, 9, "#ff8aa0");
      g.disc(30, 40, 7, RED);
      g.disc(27, 37, 2, "#ffd0d8");
    }),
  judgement: () =>
    tarot("XX", "JUDGEMENT", (g) => {
      // trumpet
      thick(g, 22, 46, 38, 34, GOLD, 1.4);
      g.tri(38, 30, 38, 38, 46, 34, GOLD_HI);
      // sound notes
      g.disc(48, 28, 1.6, "#7fd6ff");
      g.disc(46, 22, 1.2, "#7fd6ff");
    }),
  "the-world": () =>
    tarot("XXI", "THE WORLD", (g) => {
      g.ring(30, 40, 13, GRN, 2); // laurel wreath
      g.ring(30, 40, 12, "#5aa84c", 1);
      spade(g, 30, 36, 5, VIO); // (World → Spades in our suit map)
      for (const [x, y] of [[18, 28], [42, 28], [18, 52], [42, 52]]) star4(g, x, y, 2, GOLD_HI);
    }),
};
mkdirSync(TAROT_DIR, { recursive: true });
for (const [slug, fn] of Object.entries(TAROTS)) {
  writeFileSync(join(TAROT_DIR, `${slug}.svg`), fn());
  console.log("wrote tarot", slug);
}

// =====================================================================================
// SPECTRALS — rare, eerie consumables (see SPECTRAL-ADAPTATIONS.md). A haunted card: cream
// edge → near-black face → spectral-teal border + mist → central emblem → name banner.
// =====================================================================================
const SPECTRAL_DIR = resolve("../cull the crown spectral illustrations");
const GHOST = "#7fe0c8",
  GHOST_HI = "#c8fff0",
  SPFACE = "#0f1622",
  SPDEEP = "#080f18";

function spectralFrame(g) {
  cardBase(g, SPFACE);
  // drifting mist (faint horizontal streaks)
  for (const y of [22, 30, 46, 54]) for (let x = 12; x < W - 12; x += 2) g.set(x, y, "#1a2430");
  // spectral border
  for (let x = 7; x < W - 7; x++) {
    g.set(x, 7, GHOST);
    g.set(x, H - 8, GHOST);
  }
  for (let y = 7; y < H - 7; y++) {
    g.set(7, y, GHOST);
    g.set(W - 8, y, GHOST);
  }
  // wisps at the corners
  for (const [x, y] of [[10, 10], [W - 11, 10], [10, H - 11], [W - 11, H - 11]]) g.set(x, y, GHOST_HI);
  // name banner
  g.rect(8, 68, W - 16, 11, SPDEEP);
  for (let x = 8; x < W - 8; x++) {
    g.set(x, 68, GHOST);
    g.set(x, 78, GHOST);
  }
}
function spectralText(name) {
  return `<text class="jk" x="30" y="75.5" text-anchor="middle" font-size="${name.length > 9 ? 2.7 : 3.2}" letter-spacing="0.2" fill="${GHOST_HI}">${name}</text>`;
}
const spectral = (name, emblem) => {
  const g = new Grid(W, H);
  spectralFrame(g);
  emblem(g);
  return toSvg(g, spectralText(name));
};
// a wax-seal stamp disc (for the four Seal spectrals)
function emSeal(g, color) {
  g.disc(30, 38, 11, "#2a1a1a");
  g.disc(30, 38, 10, color);
  g.ring(30, 38, 10, GHOST_HI, 1);
  star4(g, 30, 38, 5, "#160c14");
  g.disc(30, 38, 2, color);
}
// a classic sheet-ghost
function emGhost(g, cx = 30) {
  g.disc(cx, 36, 9, GHOST);
  g.rect(cx - 9, 36, 18, 12, GHOST);
  for (const dx of [-7, -2, 3, 8]) g.tri(cx + dx, 48, cx + dx + 3, 48, cx + dx + 1.5, 53, GHOST); // tattered hem
  g.disc(cx - 3, 35, 1.6, SPDEEP);
  g.disc(cx + 3, 35, 1.6, SPDEEP);
}

const SPECTRALS = {
  familiar: () =>
    spectral("FAMILIAR", (g) => {
      // spectral cat: head + ears + glowing eyes
      g.disc(30, 40, 9, GHOST);
      g.tri(22, 36, 25, 26, 28, 36, GHOST); // ears
      g.tri(38, 36, 35, 26, 32, 36, GHOST);
      g.disc(26, 40, 1.8, "#d83a4e");
      g.disc(34, 40, 1.8, "#d83a4e");
      g.rect(29, 43, 2, 2, SPDEEP);
    }),
  grim: () =>
    spectral("GRIM", (g) => {
      g.disc(30, 38, 10, "#2a3440"); // hood
      g.disc(30, 40, 7, SPDEEP); // shadow
      g.disc(27, 40, 1.8, GHOST_HI); // eyes in the dark
      g.disc(33, 40, 1.8, GHOST_HI);
      spade(g, 30, 52, 3, GHOST); // ace mark
    }),
  incantation: () =>
    spectral("INCANTATION", (g) => {
      g.rect(20, 32, 20, 16, "#3a2e4a"); // open book
      g.rect(20, 32, 10, 16, "#4a3e5a");
      g.set(30, 32, GHOST);
      g.line(30, 32, 30, 48, GHOST_HI); // spine
      for (const [x, y] of [[24, 38], [24, 42], [35, 38], [35, 42]]) g.line(x, y, x + 3, y, GHOST); // runes
      star4(g, 30, 26, 3, GHOST_HI);
    }),
  talisman: () => spectral("TALISMAN", (g) => emSeal(g, GOLD)),
  "deja-vu": () => spectral("DEJA VU", (g) => emSeal(g, RED)),
  trance: () => spectral("TRANCE", (g) => emSeal(g, BLU)),
  medium: () => spectral("MEDIUM", (g) => emSeal(g, VIO)),
  aura: () =>
    spectral("AURA", (g) => {
      g.ring(30, 40, 13, RED, 1);
      g.ring(30, 40, 10, GOLD, 1);
      g.ring(30, 40, 7, GRN, 1);
      g.ring(30, 40, 4, BLU, 1);
      g.disc(30, 40, 2, GHOST_HI);
    }),
  wraith: () =>
    spectral("WRAITH", (g) => {
      emGhost(g);
      g.disc(40, 30, 2, "#d83a4e"); // money-to-zero omen
    }),
  sigil: () =>
    spectral("SIGIL", (g) => {
      g.ring(30, 40, 12, GHOST, 1);
      for (let a = 0; a < 5; a++) {
        const a2 = (a / 5) * 6.28 - 1.57;
        g.line(30, 40, 30 + Math.cos(a2) * 11, 40 + Math.sin(a2) * 11, GHOST);
      }
      diamond(g, 30, 40, 4, BLU); // a (random) suit at the centre
    }),
  ouija: () =>
    spectral("OUIJA", (g) => {
      g.tri(30, 28, 18, 50, 42, 50, PARCH); // planchette
      g.tri(30, 33, 23, 48, 37, 48, SPDEEP);
      g.disc(30, 42, 3, GHOST_HI); // viewing hole
      g.disc(30, 42, 1.4, SPDEEP);
    }),
  ectoplasm: () =>
    spectral("ECTOPLASM", (g) => {
      g.disc(30, 38, 9, GRN); // blob
      g.rect(22, 38, 16, 8, GRN);
      for (const dx of [-6, 0, 6]) g.disc(30 + dx, 48, 2.5, GRN); // drips
      g.disc(27, 36, 2, "#b0ffb0"); // sheen
    }),
  immolate: () =>
    spectral("IMMOLATE", (g) => {
      g.tri(30, 22, 22, 48, 38, 48, "#ff7a3a"); // flame
      g.tri(30, 30, 25, 48, 35, 48, GOLD);
      g.tri(30, 38, 28, 48, 32, 48, "#fffae0");
      g.disc(26, 52, 2, "#ff7a3a");
      g.disc(35, 52, 2, GOLD);
    }),
  ankh: () =>
    spectral("ANKH", (g) => {
      g.ring(30, 30, 6, GOLD, 2); // loop
      g.rect(28, 36, 4, 18, GOLD); // stem
      g.rect(20, 40, 20, 4, GOLD); // arms
    }),
  hex: () =>
    spectral("HEX", (g) => {
      g.tri(30, 26, 19, 46, 41, 46, VIO); // hexagram
      g.tri(30, 54, 19, 34, 41, 34, "#d090ff");
      g.disc(30, 40, 2, GHOST_HI);
    }),
  cryptid: () =>
    spectral("CRYPTID", (g) => {
      g.rect(22, 30, 13, 20, "#2a3440"); // card 1
      g.rect(22, 30, 13, 20, null);
      g.rect(27, 34, 13, 20, "#3a4450"); // card 2 (the copy)
      for (let y = 30; y < 50; y++) {
        g.set(27, y, GHOST);
        g.set(39, y, GHOST);
      }
      g.set(33, 44, GHOST_HI);
    }),
  "the-soul": () =>
    spectral("THE SOUL", (g) => {
      for (let a = 0; a < 12; a++) g.line(30, 38, 30 + Math.cos((a / 12) * 6.28) * 14, 38 + Math.sin((a / 12) * 6.28) * 14, "#3a5a6a");
      g.disc(30, 38, 8, GHOST);
      g.disc(30, 38, 5, GHOST_HI);
      g.disc(29, 36, 2, "#ffffff");
      star4(g, 30, 38, 13, GHOST_HI);
    }),
  "black-hole": () =>
    spectral("BLACK HOLE", (g) => {
      g.ring(30, 40, 14, VIO, 1);
      g.ring(30, 40, 12, BLU, 1);
      g.ring(30, 40, 10, "#3a5a8c", 1);
      g.disc(30, 40, 8, "#05080e"); // event horizon
      g.set(22, 32, GHOST_HI);
      g.set(40, 50, GHOST_HI);
    }),
};
mkdirSync(SPECTRAL_DIR, { recursive: true });
for (const [slug, fn] of Object.entries(SPECTRALS)) {
  writeFileSync(join(SPECTRAL_DIR, `${slug}.svg`), fn());
  console.log("wrote spectral", slug);
}

// mirror every set into app/public/art so the app can render them in-game
mirrorToPublic(STYLE_DIR, "styles");
mirrorToPublic(DECK_DIR, "decks");
mirrorToPublic(TAROT_DIR, "tarots");
mirrorToPublic(SPECTRAL_DIR, "spectrals");
console.log("mirrored art → public/art");
