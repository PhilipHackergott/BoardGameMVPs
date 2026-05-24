// PixiJS v8 pond renderer. Pure presentation: draws engine state, emits pointer
// intents via callbacks. No game rules. All artwork is drawn from scratch here.

import { Application, BlurFilter, Circle, Container, Graphics, Rectangle } from "pixi.js";
import { AGILE_RADIUS, beaconsPlacedBy, GRAVITY_RADIUS, hasPower, REPEL_RADIUS, WARD_RADIUS } from "../engine";
import type { GameConfig, GameState, PlayerId } from "../engine";
import type { Selection } from "../state/store";
import {
  FLOWER_SHAPES,
  LENS_COLORS,
  LINE_BLOCKED,
  LINE_CLEAR,
  LINE_FLY,
  PAWN_BASE,
  PAWN_CORE,
  PAWN_SHINE,
  PREVIEW_COLORS,
} from "../ui/colors";
import type { Theme } from "../ui/theme";
import { getTheme } from "../ui/theme";

export const MARGIN = 40;

export interface BoardCallbacks {
  onStarClick: (id: number) => void;
  onBoardHover: (x: number, y: number) => void;
  onBoardCommit: (x: number, y: number) => void;
}

export class BoardView {
  readonly app: Application;
  private cfg: GameConfig;
  private center: number;
  private cb: BoardCallbacks;
  private theme: Theme;

  private bg: Graphics;
  private fieldGfx: Graphics;
  private lensContainer: Container;
  private lensGfx: Graphics;
  private lensMask: Graphics;
  private lensOutlineGfx: Graphics;
  private powerGfx: Graphics;
  private beaconGfx: Graphics;
  private overlayGfx: Graphics;
  private starLayer: Container;

  private lastStars: GameState["stars"] | null = null;
  private lastStarsSig = "";
  private lastBeacons: GameState["beacons"] | null = null;
  private lastLensSig = "";
  private lastPowerSig = "";

  constructor(app: Application, cfg: GameConfig, cb: BoardCallbacks, theme: Theme = getTheme("pond")) {
    this.app = app;
    this.cfg = cfg;
    this.cb = cb;
    this.theme = theme;
    this.center = cfg.fieldR + MARGIN;

    const size = this.center * 2;
    // Transparent, full-canvas hit target so empty water reports hover/commit.
    this.bg = new Graphics();
    this.bg.rect(0, 0, size, size).fill({ color: 0x000000, alpha: 0.001 });
    this.bg.hitArea = new Rectangle(0, 0, size, size);
    this.bg.eventMode = "static";
    this.bg.on("pointertap", (e) =>
      this.cb.onBoardCommit(e.global.x - this.center, e.global.y - this.center),
    );
    this.bg.on("pointermove", (e) =>
      this.cb.onBoardHover(e.global.x - this.center, e.global.y - this.center),
    );

    this.fieldGfx = new Graphics();
    this.fieldGfx.eventMode = "none";

    // Lens: a soft-blurred grid, clipped to the pond by a circular mask. The blur
    // dissolves the grid cells into smooth zones with no stair-step edges.
    const R = cfg.fieldR + cfg.starR + 10;
    this.lensGfx = new Graphics();
    this.lensContainer = new Container();
    this.lensContainer.eventMode = "none";
    this.lensContainer.addChild(this.lensGfx);
    this.lensContainer.filters = [new BlurFilter({ strength: 14, quality: 4 })];
    this.lensMask = new Graphics();
    this.lensMask.circle(this.center, this.center, R).fill(0xffffff);
    this.lensContainer.mask = this.lensMask;

    // Power areas of influence (ward rings, barriers) — under the pawns/flowers.
    this.powerGfx = new Graphics();
    this.powerGfx.eventMode = "none";
    this.beaconGfx = new Graphics();
    this.beaconGfx.eventMode = "none";
    // Crisp gold/silver zone outlines on each flower (sits above the flowers).
    this.lensOutlineGfx = new Graphics();
    this.lensOutlineGfx.eventMode = "none";
    this.overlayGfx = new Graphics();
    this.overlayGfx.eventMode = "none";
    this.starLayer = new Container();

    // Lens fill sits over the water but under the flowers/pawns so they stay legible.
    app.stage.addChild(
      this.bg,
      this.fieldGfx,
      this.lensContainer,
      this.lensMask,
      this.powerGfx,
      this.beaconGfx,
      this.starLayer,
      this.lensOutlineGfx,
      this.overlayGfx,
    );
    this.drawPond();
  }

  private sx(x: number): number {
    return this.center + x;
  }
  private sy(y: number): number {
    return this.center + y;
  }

  private drawPond(): void {
    const c = this.center;
    const R = this.cfg.fieldR + this.cfg.starR + 10;
    const p = this.theme.pond;
    this.fieldGfx.clear();
    // Concentric discs (edge → center) fake a soft radial gradient of the field.
    const steps = 14;
    for (let i = steps; i >= 0; i--) {
      const t = i / steps; // 1 at the rim, 0 at the middle
      const rr = R * t;
      const col = t < 0.5 ? blend(p.center, p.mid, t * 2) : blend(p.mid, p.edge, (t - 0.5) * 2);
      this.fieldGfx.circle(c, c, rr).fill({ color: col });
    }
    this.fieldGfx.circle(c, c, R).stroke({ width: 4, color: p.ring, alpha: 1 });
    this.fieldGfx.circle(c, c, R - 6).stroke({ width: 1, color: p.ringSoft, alpha: 0.15 });
    // Zodiac: a faint scatter of background stars inside the chart for celestial depth.
    if (this.theme.glyphs) {
      let s = 1234.5;
      const rnd = () => {
        s = (s * 9301 + 49297) % 233280;
        return s / 233280;
      };
      for (let i = 0; i < 70; i++) {
        const ang = rnd() * Math.PI * 2;
        const rad = Math.sqrt(rnd()) * (R - 8);
        const sr = 0.6 + rnd() * 1.2;
        this.fieldGfx
          .circle(c + Math.cos(ang) * rad, c + Math.sin(ang) * rad, sr)
          .fill({ color: 0xe9d5ff, alpha: 0.18 + rnd() * 0.4 });
      }
    }
  }

  update(game: GameState, selection: Selection, reveal: number, lens: boolean): void {
    // At end, claimed flowers vanish from the board as they fly to the piles, so the
    // star layer is rebuilt as the reveal advances; during play it changes only on a move.
    let hidden: Set<number> | null = null;
    let starsSig = "play";
    if (game.phase === "ended" && game.territory) {
      hidden = new Set<number>();
      const n = Math.min(reveal, game.territory.length);
      for (let i = 0; i < n; i++) hidden.add(game.territory[i].starId);
      starsSig = `end:${n}`;
    }
    if (game.stars !== this.lastStars || starsSig !== this.lastStarsSig) {
      this.drawStars(game, hidden);
      this.lastStars = game.stars;
      this.lastStarsSig = starsSig;
    }
    if (game.beacons !== this.lastBeacons) {
      this.drawBeacons(game);
      this.lastBeacons = game.beacons;
    }

    // Power areas of influence (ward rings + intercept barriers).
    const powerSig = `${game.beacons.length}|${game.barriers.length}`;
    if (powerSig !== this.lastPowerSig) {
      this.drawPowers(game);
      this.lastPowerSig = powerSig;
    }

    // Influence lens: recompute only when something that shapes the zones changed.
    const h = selection.hover;
    const lensSig = lens
      ? `${game.seed}|${game.beacons.length}|${game.phase}|${game.current}|${reveal}|${h ? `${h.x.toFixed(1)},${h.y.toFixed(1)}` : ""}`
      : "off";
    if (lensSig !== this.lastLensSig) {
      this.drawLens(game, selection, lens, hidden);
      this.lastLensSig = lensSig;
    }

    if (game.phase === "ended") this.drawTerritory(game, reveal);
    else this.drawOverlay(game, selection);
  }

  // Voronoi-style "zones of influence": shade each patch of water by the owner of
  // the nearest pawn. During placement the snapped preview pawn is included, so the
  // zones shift live as the cursor glides along a guide line. A thin neutral seam is
  // left along contested borders.
  private drawLens(
    game: GameState,
    selection: Selection,
    lensOn: boolean,
    hidden: Set<number> | null,
  ): void {
    const g = this.lensGfx;
    const outline = this.lensOutlineGfx;
    g.clear();
    outline.clear();
    if (!lensOn) return;

    const pts: { owner: number; x: number; y: number }[] = game.beacons.map((b) => ({
      owner: b.owner,
      x: b.x,
      y: b.y,
    }));
    if (game.phase === "play" && selection.hover) {
      pts.push({ owner: game.current, x: selection.hover.x, y: selection.hover.y });
    }
    if (pts.length === 0) return;

    const nearestOwner = (x: number, y: number): number => {
      let bd = Infinity;
      let owner = 0;
      for (const p of pts) {
        const dx = x - p.x;
        const dy = y - p.y;
        const d = dx * dx + dy * dy;
        if (d < bd) {
          bd = d;
          owner = p.owner;
        }
      }
      return owner;
    };

    const c = this.center;
    const R = this.cfg.fieldR + this.cfg.starR + 10;
    const R2 = R * R;
    // Fine grid; the blur filter on the container melts the cells into smooth zones.
    const cell = 8;
    for (let ex = -R; ex <= R; ex += cell) {
      for (let ey = -R; ey <= R; ey += cell) {
        const px = ex + cell / 2;
        const py = ey + cell / 2;
        if (px * px + py * py > R2) continue;
        const owner = nearestOwner(px, py);
        g.rect(c + ex, c + ey, cell, cell).fill({ color: LENS_COLORS[owner], alpha: 0.18 });
      }
    }

    // Crisp ring on each flower marking which zone it currently sits in.
    const rr = this.cfg.starR + 3;
    for (const star of game.stars) {
      if (hidden && hidden.has(star.id)) continue;
      const owner = nearestOwner(star.x, star.y);
      outline
        .circle(this.sx(star.x), this.sy(star.y), rr)
        .stroke({ width: 2.5, color: LENS_COLORS[owner], alpha: 0.95 });
    }
  }

  private drawStars(game: GameState, hidden: Set<number> | null): void {
    const old = this.starLayer.removeChildren();
    for (const child of old) child.destroy();

    for (const star of game.stars) {
      if (hidden && hidden.has(star.id)) continue;
      const g = new Graphics();
      const cx = this.sx(star.x);
      const cy = this.sy(star.y);
      drawFlower(g, star.color, cx, cy, this.cfg.starR, this.theme);

      g.eventMode = "static";
      g.cursor = "pointer";
      g.hitArea = new Circle(cx, cy, this.cfg.starR + 2);
      const id = star.id;
      g.on("pointertap", (e) => {
        e.stopPropagation();
        this.cb.onStarClick(id);
      });
      this.starLayer.addChild(g);
    }
  }

  private drawBeacons(game: GameState): void {
    this.beaconGfx.clear();
    for (const b of game.beacons) drawPawn(this.beaconGfx, b.owner, this.sx(b.x), this.sy(b.y), 1, b.phantom);
  }

  // Dotted areas of influence: Warding rings around warded pawns, Intercept barriers.
  private drawPowers(game: GameState): void {
    const g = this.powerGfx;
    g.clear();
    for (const b of game.beacons) {
      if (hasPower(game, b.owner, "warding")) {
        strokeDashedCircle(g, this.sx(b.x), this.sy(b.y), WARD_RADIUS, PAWN_BASE[b.owner], 0.5);
      }
    }
    for (const bar of game.barriers) {
      strokeDashedLine(
        g,
        this.sx(bar.ax),
        this.sy(bar.ay),
        this.sx(bar.bx),
        this.sy(bar.by),
        PAWN_BASE[bar.owner],
        0.55,
      );
    }
  }

  private drawOverlay(game: GameState, selection: Selection): void {
    const g = this.overlayGfx;
    g.clear();
    // Repeller: while aiming, show the reach ring around the just-placed pawn.
    if (game.repelOrigin) {
      strokeDashedCircle(
        g,
        this.sx(game.repelOrigin.x),
        this.sy(game.repelOrigin.y),
        REPEL_RADIUS,
        PAWN_BASE[game.current],
        0.6,
      );
    }
    if (selection.aStarId === null) return;
    const a = game.stars.find((s) => s.id === selection.aStarId);
    if (!a) return;
    const ax = this.sx(a.x);
    const ay = this.sy(a.y);
    const r = this.cfg.starR;

    // Blocked partners: soft red dashed lines.
    for (const id of selection.blocked) {
      const b = game.stars.find((s) => s.id === id);
      if (!b) continue;
      this.dashedLine(ax, ay, this.sx(b.x), this.sy(b.y), LINE_BLOCKED, 0.4);
    }

    // Clear partners: glowing emerald lines + a highlight ring on the partner.
    for (const id of selection.partners) {
      const b = game.stars.find((s) => s.id === id);
      if (!b) continue;
      const bx = this.sx(b.x);
      const by = this.sy(b.y);
      g.moveTo(ax, ay).lineTo(bx, by).stroke({ width: 6, color: LINE_CLEAR, alpha: 0.12 });
      g.moveTo(ax, ay).lineTo(bx, by).stroke({ width: 2, color: LINE_CLEAR, alpha: 0.6 });
      g.circle(bx, by, r + 6).stroke({ width: 1.5, color: LINE_CLEAR, alpha: 0.85 });
    }

    // Flying-only partners: sky-blue lines (this connection is enabled by Flying).
    for (const id of selection.flyPartners) {
      const b = game.stars.find((s) => s.id === id);
      if (!b) continue;
      const bx = this.sx(b.x);
      const by = this.sy(b.y);
      g.moveTo(ax, ay).lineTo(bx, by).stroke({ width: 6, color: LINE_FLY, alpha: 0.12 });
      g.moveTo(ax, ay).lineTo(bx, by).stroke({ width: 2, color: LINE_FLY, alpha: 0.7 });
      g.circle(bx, by, r + 6).stroke({ width: 1.5, color: LINE_FLY, alpha: 0.85 });
    }

    // The flower in hand: dashed white ring.
    g.circle(ax, ay, r + 8).stroke({ width: 1.5, color: 0xffffff, alpha: 0.9 });

    // Live preview: pawn snapped to a green line + a white alignment guide A→pawn→B.
    const hover = selection.hover;
    if (hover) {
      const b = game.stars.find((s) => s.id === hover.bStarId);
      const px = this.sx(hover.x);
      const py = this.sy(hover.y);
      if (b) {
        g.moveTo(ax, ay)
          .lineTo(px, py)
          .lineTo(this.sx(b.x), this.sy(b.y))
          .stroke({ width: 2, color: 0xffffff, alpha: 0.55 });
      }
      drawPreviewPawn(g, game.current, px, py);
      // Gravity: show the area whose flowers will be pulled toward this drop.
      if (hasPower(game, game.current, "gravity")) {
        strokeDashedCircle(g, px, py, GRAVITY_RADIUS, PAWN_BASE[game.current], 0.5);
      }
      // Warding: show the protected area this drop will project.
      if (hasPower(game, game.current, "warding")) {
        strokeDashedCircle(g, px, py, WARD_RADIUS, PAWN_BASE[game.current], 0.55);
      }
      // Agile: dotted white line to the bonus 3rd flower this drop would also grab.
      if (hasPower(game, game.current, "agile") && beaconsPlacedBy(game, game.current) < 2) {
        let best: GameState["stars"][number] | null = null;
        let bestD = AGILE_RADIUS;
        for (const s of game.stars) {
          if (s.id === a.id || (b && s.id === b.id)) continue;
          const d = Math.hypot(s.x - hover.x, s.y - hover.y);
          if (d < bestD) {
            bestD = d;
            best = s;
          }
        }
        if (best) {
          strokeDashedLine(g, px, py, this.sx(best.x), this.sy(best.y), 0xffffff, 0.85);
          g.circle(this.sx(best.x), this.sy(best.y), r + 4).stroke({ width: 1.5, color: 0xffffff, alpha: 0.85 });
        }
      }
    }
  }

  // End-game: reveal who claimed each leftover flower, one by one. The first
  // `reveal` flowers get a line to their claiming pawn + a ring in its colour;
  // equidistant (discarded) flowers get a faint grey ring and drift away.
  private drawTerritory(game: GameState, reveal: number): void {
    const g = this.overlayGfx;
    g.clear();
    const terr = game.territory;
    if (!terr) return;
    const n = Math.min(reveal, terr.length);
    const r = this.cfg.starR;
    for (let i = 0; i < n; i++) {
      const t = terr[i];
      const fx = this.sx(t.x);
      const fy = this.sy(t.y);
      if (t.owner === null || t.beaconX === null || t.beaconY === null) {
        g.circle(fx, fy, r + 3).stroke({ width: 1.5, color: 0x64748b, alpha: 0.45 });
        continue;
      }
      const col = PAWN_BASE[t.owner];
      g.moveTo(fx, fy)
        .lineTo(this.sx(t.beaconX), this.sy(t.beaconY))
        .stroke({ width: 1.5, color: col, alpha: 0.32 });
      g.circle(fx, fy, r + 3).fill({ color: col, alpha: 0.14 }).stroke({ width: 2, color: col, alpha: 0.85 });
    }
  }

  private dashedLine(x1: number, y1: number, x2: number, y2: number, color: number, alpha: number): void {
    strokeDashedLine(this.overlayGfx, x1, y1, x2, y2, color, alpha);
  }

  destroy(): void {
    this.bg.destroy();
    this.fieldGfx.destroy();
    this.lensContainer.mask = null;
    this.lensContainer.destroy({ children: true });
    this.lensMask.destroy();
    this.lensOutlineGfx.destroy();
    this.powerGfx.destroy();
    this.beaconGfx.destroy();
    this.overlayGfx.destroy();
    const old = this.starLayer.removeChildren();
    for (const child of old) child.destroy();
    this.starLayer.destroy();
  }
}

// Fake a dashed stroke by emitting short sub-segments, then stroking once.
function strokeDashedLine(
  g: Graphics,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  color: number,
  alpha: number,
): void {
  const len = Math.hypot(x2 - x1, y2 - y1);
  if (len === 0) return;
  const ux = (x2 - x1) / len;
  const uy = (y2 - y1) / len;
  const dash = 6;
  const gap = 5;
  let d = 0;
  while (d < len) {
    const e = Math.min(d + dash, len);
    g.moveTo(x1 + ux * d, y1 + uy * d).lineTo(x1 + ux * e, y1 + uy * e);
    d = e + gap;
  }
  g.stroke({ width: 2, color, alpha });
}

// A dotted ring (chord dashes around the circle).
function strokeDashedCircle(g: Graphics, cx: number, cy: number, r: number, color: number, alpha: number): void {
  const circ = 2 * Math.PI * r;
  const n = Math.max(10, Math.floor(circ / 13));
  const dashFrac = 0.55; // portion of each step that is drawn
  for (let i = 0; i < n; i++) {
    const a0 = (i / n) * Math.PI * 2;
    const a1 = a0 + (dashFrac / n) * Math.PI * 2;
    g.moveTo(cx + Math.cos(a0) * r, cy + Math.sin(a0) * r).lineTo(cx + Math.cos(a1) * r, cy + Math.sin(a1) * r);
  }
  g.stroke({ width: 1.5, color, alpha });
}

function blend(a: number, b: number, t: number): number {
  const ar = (a >> 16) & 0xff,
    ag = (a >> 8) & 0xff,
    ab = a & 0xff;
  const br = (b >> 16) & 0xff,
    bg = (b >> 8) & 0xff,
    bb = b & 0xff;
  const r = Math.round(ar + (br - ar) * t);
  const g = Math.round(ag + (bg - ag) * t);
  const bl = Math.round(ab + (bb - ab) * t);
  return (r << 16) | (g << 8) | bl;
}

// A board collectible drawn from scratch. Pond: a per-kind petal blossom. Zodiac: a soft
// watercolor star — layered translucent halos, a bright core, and a 4-point sparkle.
function drawFlower(g: Graphics, colorIndex: number, cx: number, cy: number, r: number, theme: Theme): void {
  const color = theme.starColors[colorIndex];
  const glow = theme.starGlows[colorIndex];

  if (theme.glyphs) {
    g.circle(cx, cy, r + 6).fill({ color: glow, alpha: 0.16 }); // soft outer wash
    g.circle(cx, cy, r + 1).fill({ color, alpha: 0.24 }); // inner wash
    g.circle(cx, cy, r * 0.62).fill({ color, alpha: 0.92 }); // bright body
    const sp = r * 1.35;
    g.moveTo(cx, cy - sp).lineTo(cx, cy + sp);
    g.moveTo(cx - sp, cy).lineTo(cx + sp, cy);
    g.stroke({ width: 1.1, color: 0xffffff, alpha: 0.45 }); // sparkle
    g.circle(cx, cy, r * 0.3).fill({ color: 0xffffff, alpha: 0.95 }); // glint
    return;
  }

  const { petals, style } = FLOWER_SHAPES[colorIndex];
  g.circle(cx, cy, r + 4).fill({ color: glow, alpha: 0.14 });

  if (style === "ray") {
    for (let i = 0; i < petals; i++) {
      const a = (Math.PI * 2 * i) / petals - Math.PI / 2;
      g.moveTo(cx, cy).lineTo(cx + Math.cos(a) * r * 0.95, cy + Math.sin(a) * r * 0.95);
    }
    g.stroke({ width: 2.4, color });
  } else if (style === "round") {
    const ring = r * 0.74;
    const pr = r * 0.46;
    for (let i = 0; i < petals; i++) {
      const a = (Math.PI * 2 * i) / petals - Math.PI / 2;
      g.circle(cx + Math.cos(a) * ring, cy + Math.sin(a) * ring, pr).fill({ color });
    }
  } else {
    // pointed: narrow kite petals radiating outward
    const tip = r * 1.05;
    const base = r * 0.22;
    const half = r * 0.3;
    for (let i = 0; i < petals; i++) {
      const a = (Math.PI * 2 * i) / petals - Math.PI / 2;
      const ca = Math.cos(a);
      const sa = Math.sin(a);
      const px = -sa;
      const py = ca;
      g.moveTo(cx + ca * tip, cy + sa * tip)
        .lineTo(cx + ca * base + px * half, cy + sa * base + py * half)
        .lineTo(cx + ca * base - px * half, cy + sa * base - py * half)
        .closePath();
    }
    g.fill({ color });
  }

  g.circle(cx, cy, r * 0.46).fill({ color: 0xffffff });
}

function diamondPath(g: Graphics, cx: number, cy: number, r: number): void {
  g.moveTo(cx, cy - r)
    .lineTo(cx + r, cy)
    .lineTo(cx, cy + r)
    .lineTo(cx - r, cy)
    .closePath();
}

// A pawn is a faceted gem (a diamond) — a deliberately non-floral silhouette with
// a dark outline + colour halo, so it reads clearly against the petaled flowers.
function drawPawn(
  g: Graphics,
  owner: PlayerId,
  cx: number,
  cy: number,
  alpha: number,
  phantom = false,
): void {
  const r = 11;
  if (phantom) {
    // A ghostly, outline-only token — collects a pair but doesn't claim territory.
    g.circle(cx, cy, r + 5).fill({ color: PAWN_BASE[owner], alpha: 0.1 * alpha });
    diamondPath(g, cx, cy, r);
    g.stroke({ width: 2, color: PAWN_BASE[owner], alpha: 0.75 * alpha });
    diamondPath(g, cx, cy, r * 0.45);
    g.stroke({ width: 1, color: PAWN_SHINE[owner], alpha: 0.6 * alpha });
    return;
  }
  g.circle(cx, cy, r + 6).fill({ color: PAWN_BASE[owner], alpha: 0.28 * alpha }); // glow
  diamondPath(g, cx + 1.5, cy + 2.5, r); // drop shadow
  g.fill({ color: 0x05070e, alpha: 0.5 * alpha });
  diamondPath(g, cx, cy, r); // body + dark outline
  g.fill({ color: PAWN_BASE[owner], alpha }).stroke({ width: 2.5, color: 0x0a0e1f, alpha });
  diamondPath(g, cx, cy + 2, r * 0.34); // lower facet
  g.fill({ color: PAWN_CORE[owner], alpha: 0.85 * alpha });
  diamondPath(g, cx, cy - 1, r * 0.5); // upper facet highlight
  g.fill({ color: PAWN_SHINE[owner], alpha: 0.9 * alpha });
}

function drawPreviewPawn(g: Graphics, owner: PlayerId, cx: number, cy: number): void {
  const r = 12;
  const col = PREVIEW_COLORS[owner];
  g.circle(cx, cy, r + 4).fill({ color: col, alpha: 0.18 });
  diamondPath(g, cx, cy, r);
  g.fill({ color: col, alpha: 0.4 }).stroke({ width: 1.5, color: col, alpha: 0.95 });
}
