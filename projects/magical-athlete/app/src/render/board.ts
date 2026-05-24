// Board view (PixiJS v8). Renders Magical Athlete as a wide printed board: a rectangular LOOP of
// bright candy-coloured tiles around the perimeter, a black frame, a START pill + checkered gate, and
// a big 3D block-letter title over the centre — matching the physical board's design language
// (retro / "Wacky Races"; original art, not CMYK's files). Standees ride the perimeter tiles.
// When the manifest supplies an official board image + space coords, that image is used instead.

import { Application, Assets, Container, Graphics, Sprite, Text, type TextStyleOptions } from 'pixi.js';
import type { MatchState, RaceState } from '../engine';
import { buildTrack, currentRacerIndex, featureAt } from '../engine';
import { boardArt, racerArt } from '../assets/manifest';

const W = 1600;
const H = 512;
const PAD = 16; // canvas edge → board (shadow shows here)
const INSET = 16; // board edge → tile ring

const DISPLAY = 'Bungee';
const HEAD = 'Righteous';

interface Theme {
  board: number;
  frame: number;
  frameInner: number;
  center: number;
  title: string;
  scene: 'mild' | 'wild';
}

const THEME: Record<'mild' | 'wild', Theme> = {
  mild: { board: 0x101015, frame: 0x18b39e, frameInner: 0x0c6f63, center: 0x07090d, title: 'MILD MILE', scene: 'mild' },
  wild: { board: 0x100913, frame: 0xb84cff, frameInner: 0x6a2c9c, center: 0x0a0610, title: 'WILD WILDS', scene: 'wild' },
};

// Bright flat tile palette, cycled around the loop (skips feature/START tiles).
const TILE_PALETTE = [
  0xe23b3b, 0xf2922b, 0xf2d23b, 0x57c34a, 0x1fb6a6, 0x3a7bd5, 0x8a5cf6, 0xe255b0, 0xc9a3f0, 0xff8fb2,
];

const PLAYER_PALETTE = [0x3aa0ff, 0xff8a3d, 0x27c2b4, 0xff5db1];
const playerColor = (p: number): number => PLAYER_PALETTE[p % PLAYER_PALETTE.length];

interface XY {
  x: number;
  y: number;
}
interface Tile extends XY {
  w: number;
  h: number;
}

interface Standee {
  c: Container;
  badgeBg: Graphics;
  badgeText: Text;
  progress: number;
  target: number;
  offset: number;
  active: boolean;
}

export class BoardView {
  private app: Application | null = null;
  private readonly backgroundLayer = new Container();
  private readonly trackLayer = new Container();
  private readonly standeeLayer = new Container();
  private readonly standees = new Map<string, Standee>();
  private tiles: Tile[] = [];
  private finishPt: XY = { x: 0, y: 0 };
  private tileStep = 60;
  private length = 0;
  private side = '';
  private destroyed = false;
  private latest: MatchState | null = null;

  async init(parent: HTMLElement): Promise<void> {
    const app = new Application();
    // render at the device pixel ratio (capped) so the upscaled-to-full-width board stays crisp
    await app.init({
      width: W,
      height: H,
      backgroundAlpha: 0,
      antialias: true,
      resolution: Math.min(window.devicePixelRatio || 1, 2),
      autoDensity: false,
    });
    app.ticker.maxFPS = 30; // the board is mostly static; 30fps keeps it smooth and light
    if (this.destroyed) {
      app.destroy(true);
      return;
    }
    this.app = app;
    parent.appendChild(app.canvas);
    app.canvas.style.width = '100%';
    app.canvas.style.height = 'auto';
    app.canvas.style.display = 'block';
    app.stage.addChild(this.backgroundLayer);
    app.stage.addChild(this.trackLayer);
    app.stage.addChild(this.standeeLayer);
    this.standeeLayer.sortableChildren = true;
    app.ticker.add(() => this.tick());
    if (this.latest) this.update(this.latest); // draw immediately; never gate on fonts/network

    // re-draw once display fonts load so the 3D title is crisp (Pixi measures text at creation)
    document.fonts?.ready
      ?.then(() => {
        if (this.destroyed || !this.app || !this.latest) return;
        this.length = -1;
        this.side = '';
        this.update(this.latest);
      })
      .catch(() => {});
  }

  destroy(): void {
    this.destroyed = true;
    this.standees.clear();
    if (this.app) {
      this.app.destroy(true, { children: true });
      this.app = null;
    }
  }

  /** Build the perimeter loop of tiles (clockwise from the top-left START) for a track of `length`. */
  private ring(length: number): Tile[] {
    const innerL = PAD + INSET;
    const innerT = PAD + INSET;
    const innerR = W - PAD - INSET;
    const innerB = H - PAD - INSET;
    const innerW = innerR - innerL;
    const innerH = innerB - innerT;

    const sideMid = length >= 8 ? 2 : 1;
    const remaining = length - 2 * sideMid;
    const topN = Math.ceil(remaining / 2);
    const bottomN = remaining - topN;

    const tileH = Math.max(56, Math.min(innerH * 0.27, 104));
    this.tileStep = innerW / topN;
    const tileWtop = innerW / topN;
    const tileWbot = innerW / Math.max(1, bottomN);
    const topY = innerT + tileH / 2;
    const botY = innerB - tileH / 2;
    const centerTop = innerT + tileH;
    const centerBot = innerB - tileH;
    const centerH = centerBot - centerTop;
    const sideYs: number[] = [];
    for (let k = 0; k < sideMid; k++) sideYs.push(centerTop + (k + 0.5) * (centerH / sideMid));
    const sideH = centerH / sideMid;

    const tiles: Tile[] = [];
    for (let i = 0; i < topN; i++) tiles.push({ x: innerL + (i + 0.5) * tileWtop, y: topY, w: tileWtop, h: tileH });
    for (let k = 0; k < sideMid; k++) tiles.push({ x: innerR - tileH / 2, y: sideYs[k], w: tileH, h: sideH });
    for (let i = 0; i < bottomN; i++) tiles.push({ x: innerR - (i + 0.5) * tileWbot, y: botY, w: tileWbot, h: tileH });
    for (let k = 0; k < sideMid; k++) tiles.push({ x: innerL + tileH / 2, y: sideYs[sideMid - 1 - k], w: tileH, h: sideH });
    return tiles;
  }

  private progressToXY(progress: number): XY {
    const pts = this.tiles;
    const n = pts.length;
    if (n === 0) return { x: W / 2, y: H / 2 };
    if (n === 1) return pts[0];
    const p = Math.max(0, Math.min(progress, n));
    if (p <= n - 1) {
      const i0 = Math.floor(p);
      const i1 = Math.min(i0 + 1, n - 1);
      const f = p - i0;
      return { x: pts[i0].x + (pts[i1].x - pts[i0].x) * f, y: pts[i0].y + (pts[i1].y - pts[i0].y) * f };
    }
    const f = p - (n - 1);
    const a = pts[n - 1];
    return { x: a.x + (this.finishPt.x - a.x) * f, y: a.y + (this.finishPt.y - a.y) * f };
  }

  private buildTrackGraphics(race: RaceState): void {
    this.trackLayer.removeChildren();
    this.backgroundLayer.removeChildren();
    this.length = race.length;
    this.side = race.side;

    const art = boardArt(race.side);
    if (art.src && art.spaces && art.spaces.length >= race.length) {
      this.tiles = art.spaces.slice(0, race.length).map((s) => ({ ...s, w: 40, h: 40 }));
      this.finishPt = this.tiles[this.tiles.length - 1];
      void Assets.load(art.src)
        .then((tex) => {
          if (this.destroyed) return;
          const sp = new Sprite(tex);
          const s = Math.min(W / sp.texture.width, H / sp.texture.height);
          sp.scale.set(s);
          sp.position.set((W - sp.texture.width * s) / 2, (H - sp.texture.height * s) / 2);
          this.backgroundLayer.addChild(sp);
        })
        .catch(() => this.drawPrintedBoard(race));
      return;
    }
    this.drawPrintedBoard(race);
  }

  private text(str: string, style: Partial<TextStyleOptions>): Text {
    const t = new Text({ text: str, style: { fontFamily: HEAD, fill: 0xffffff, fontSize: 14, ...style } });
    t.anchor.set(0.5);
    return t;
  }

  private drawPrintedBoard(race: RaceState): void {
    const th = THEME[race.side];
    const g = this.trackLayer;

    // drop shadow + black board + frame
    g.addChild(new Graphics().roundRect(PAD + 4, PAD + 8, W - 2 * PAD, H - 2 * PAD, 22).fill({ color: 0x000000, alpha: 0.5 }));
    const board = new Graphics();
    board.roundRect(PAD, PAD, W - 2 * PAD, H - 2 * PAD, 22).fill(th.board).stroke({ width: 7, color: th.frame });
    board.roundRect(PAD + 7, PAD + 7, W - 2 * PAD - 14, H - 2 * PAD - 14, 16).stroke({ width: 2, color: th.frameInner });
    g.addChild(board);

    this.tiles = this.ring(race.length);

    // finish point: a little past the last tile, closing toward START (the gate)
    const last = this.tiles[this.tiles.length - 1];
    const first = this.tiles[0];
    this.finishPt = { x: last.x + (first.x - last.x) * 0.45, y: last.y + (first.y - last.y) * 0.45 };

    this.drawCenter(th);
    this.drawTiles(race);
  }

  /** The centre: a dark panel with the big 3D block-letter title and a hint of the themed scene. */
  private drawCenter(th: Theme): void {
    const g = this.trackLayer;
    const t0 = this.tiles[0];
    const cl = (PAD + INSET) + t0.h; // ring thickness = top tile height
    const cr = (W - PAD - INSET) - t0.h;
    const ct = (PAD + INSET) + t0.h;
    const cb = (H - PAD - INSET) - t0.h;
    const cw = cr - cl;
    const ch = cb - ct;
    const cx = (cl + cr) / 2;
    const cy = (ct + cb) / 2;

    g.addChild(new Graphics().roundRect(cl, ct, cw, ch, 14).fill(th.center));

    // a hint of the whimsical scene (kept subtle so the title reads)
    const scene = new Graphics();
    if (th.scene === 'mild') {
      for (const [fx, fcol] of [[cl + 60, 0xff8fb2], [cr - 60, 0xf2d23b], [cl + 110, 0x57c34a]] as [number, number][]) {
        for (let k = 0; k < 6; k++) {
          const a = (k / 6) * Math.PI * 2;
          scene.circle(fx + Math.cos(a) * 12, cb - 26 + Math.sin(a) * 12, 9).fill({ color: fcol, alpha: 0.5 });
        }
        scene.circle(fx, cb - 26, 7).fill({ color: 0xf2d23b, alpha: 0.6 });
      }
    } else {
      for (const px of [cl + 50, cl + 95, cr - 50, cr - 95]) {
        scene.poly([px - 16, cb - 16, px + 16, cb - 16, px, cb - 60]).fill({ color: 0x2f7d4a, alpha: 0.5 });
      }
    }
    g.addChild(scene);

    const size = Math.min(ch * 0.62, (cw * 1.6) / th.title.length);
    const title = new Text({
      text: th.title,
      style: {
        fontFamily: DISPLAY,
        fontSize: size,
        fill: 0xffffff,
        stroke: { color: 0x000000, width: Math.max(4, size * 0.12), join: 'round' },
        dropShadow: { color: 0x000000, alpha: 0.55, blur: 0, distance: Math.max(3, size * 0.06), angle: Math.PI / 4 },
        letterSpacing: 2,
      },
    });
    title.anchor.set(0.5);
    title.position.set(cx, cy);
    g.addChild(title);
  }

  private drawTiles(race: RaceState): void {
    const track = buildTrack(race.side);
    const gap = 5;
    this.tiles.forEach((t, i) => {
      const f = featureAt(track, i);
      const isStart = i === 0;
      let fill = TILE_PALETTE[i % TILE_PALETTE.length];
      if (isStart) fill = 0x101015;
      else if (f?.kind === 'star') fill = 0xe255b0;
      else if (f?.kind === 'arrow') fill = 0x57c34a;
      else if (f?.kind === 'rock') fill = 0x5a3a8a;

      const g = new Graphics();
      g.roundRect(t.x - t.w / 2 + gap / 2, t.y - t.h / 2 + gap / 2, t.w - gap, t.h - gap, 8)
        .fill(fill)
        .stroke({ width: 2, color: isStart ? 0xe23b3b : 0x00000033 });
      this.trackLayer.addChild(g);

      if (isStart) {
        this.trackLayer.addChild(this.posText('START', t.x, t.y, { fontFamily: DISPLAY, fontSize: Math.min(t.h * 0.32, 18), fill: 0xe23b3b }));
        return;
      }

      // feature icon (centre) or position number
      if (f?.kind === 'star') {
        this.trackLayer.addChild(this.posText('★', t.x, t.y - 6, { fontFamily: HEAD, fontSize: 16, fill: 0xffffff }));
        this.trackLayer.addChild(this.posText('+1', t.x, t.y + 12, { fontFamily: HEAD, fontSize: 12, fill: 0xffffff }));
      } else if (f?.kind === 'arrow') {
        this.trackLayer.addChild(this.posText('»', t.x, t.y - 5, { fontFamily: HEAD, fontSize: 18, fill: 0xffffff }));
        this.trackLayer.addChild(this.posText(`+${f.delta ?? 0}`, t.x, t.y + 13, { fontFamily: HEAD, fontSize: 12, fill: 0xffffff }));
      } else if (f?.kind === 'rock') {
        this.trackLayer.addChild(this.posText('TRIP!', t.x, t.y, { fontFamily: DISPLAY, fontSize: Math.min(t.w * 0.26, 13), fill: 0xffffff }));
      } else {
        this.trackLayer.addChild(this.posText(String(i), t.x, t.y, { fontFamily: HEAD, fontSize: 15, fill: 0x1c1c28 }));
      }
    });

    // finish flag near the closing gate
    this.drawChecker(this.finishPt.x - 11, this.finishPt.y - 11, 5.5);
  }

  private drawChecker(x0: number, y0: number, sq: number): void {
    const cols = 4;
    const rows = 4;
    const base = new Graphics();
    base.roundRect(x0 - 2, y0 - 2, cols * sq + 4, rows * sq + 4, 3).fill(0xffffff).stroke({ width: 1.5, color: 0x111111 });
    this.trackLayer.addChild(base);
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if ((r + c) % 2 === 0) continue;
        this.trackLayer.addChild(new Graphics().rect(x0 + c * sq, y0 + r * sq, sq, sq).fill(0x111111));
      }
    }
  }

  private posText(str: string, x: number, y: number, style: Partial<TextStyleOptions>): Text {
    const t = this.text(str, style);
    t.position.set(x, y);
    return t;
  }

  private makeStandee(racerId: string, owner: number): Standee {
    const art = racerArt(racerId);
    const oc = playerColor(owner);
    const c = new Container();

    // a round "token": owner-coloured ring + white face holding the racer's character glyph
    c.addChild(new Graphics().ellipse(0, 16, 15, 5).fill({ color: 0x000000, alpha: 0.4 })); // ground shadow
    const token = new Graphics();
    token.circle(0, -2, 19).fill(oc); // owner-colour ring
    token.circle(0, -2, 15).fill(0xffffff); // white face
    c.addChild(token);

    const label = new Text({ text: art.glyph, style: { fontFamily: 'system-ui', fontSize: 22 } });
    label.anchor.set(0.5);
    label.position.set(0, -2);
    c.addChild(label);

    const badgeBg = new Graphics();
    badgeBg.visible = false;
    c.addChild(badgeBg);
    const badgeText = new Text({ text: '', style: { fontFamily: HEAD, fill: 0x1a1330, fontSize: 11 } });
    badgeText.anchor.set(0.5);
    badgeText.position.set(15, -16);
    badgeText.visible = false;
    c.addChild(badgeText);

    if (art.src) {
      void Assets.load(art.src)
        .then((tex) => {
          if (this.destroyed) return;
          const sp = new Sprite(tex);
          sp.anchor.set(0.5, 1);
          sp.position.set(0, 6);
          sp.scale.set(52 / Math.max(sp.texture.width, sp.texture.height));
          token.visible = false;
          label.visible = false;
          c.addChildAt(sp, 1);
        })
        .catch(() => {});
    }

    return { c, badgeBg, badgeText, progress: 0, target: 0, offset: 0, active: false };
  }

  update(match: MatchState): void {
    this.latest = match;
    if (!this.app) return;
    const race = match.race;
    if (!race) {
      this.trackLayer.removeChildren();
      this.backgroundLayer.removeChildren();
      this.standeeLayer.removeChildren();
      this.standees.clear();
      return;
    }
    if (this.length !== race.length || this.side !== race.side || this.trackLayer.children.length === 0) {
      this.buildTrackGraphics(race);
      this.standeeLayer.removeChildren();
      this.standees.clear();
    }

    const groups = new Map<number, number[]>();
    race.racers.forEach((r, i) => {
      const key = r.finished ? -(r.place ?? 0) : r.pos;
      const arr = groups.get(key) ?? [];
      arr.push(i);
      groups.set(key, arr);
    });

    const activeIdx = currentRacerIndex(race);
    race.racers.forEach((r, i) => {
      const id = `${r.owner}:${r.racerId}`;
      let s = this.standees.get(id);
      if (!s) {
        s = this.makeStandee(r.racerId, r.owner);
        s.progress = r.pos;
        s.target = r.pos;
        this.standeeLayer.addChild(s.c);
        this.standees.set(id, s);
      }
      const key = r.finished ? -(r.place ?? 0) : r.pos;
      const group = groups.get(key) ?? [i];
      s.offset = group.indexOf(i) - (group.length - 1) / 2;
      s.target = r.finished ? this.length : r.pos;
      s.active = i === activeIdx && match.phase === 'race';
      s.c.alpha = r.eliminated ? 0.3 : r.finished ? 0.85 : 1;

      if (r.finished && r.place) {
        s.badgeBg.clear().circle(15, -16, 9).fill(r.place === 1 ? 0xffc24b : 0xc7cede).stroke({ width: 1.5, color: 0x1a1330 });
        s.badgeBg.visible = true;
        s.badgeText.text = String(r.place);
        s.badgeText.visible = true;
      } else {
        s.badgeBg.visible = false;
        s.badgeText.visible = false;
      }
    });
  }

  private tick(): void {
    for (const s of this.standees.values()) {
      s.progress += (s.target - s.progress) * 0.2;
      const base = this.progressToXY(s.progress);
      s.c.x = base.x + s.offset * Math.min(this.tileStep * 0.32, 22);
      s.c.y = base.y + 2 + s.offset * 2;
      const scale = s.active ? 1.18 : 1;
      s.c.scale.set(s.c.scale.x + (scale - s.c.scale.x) * 0.2);
      s.c.zIndex = Math.round(s.c.y);
    }
  }
}
