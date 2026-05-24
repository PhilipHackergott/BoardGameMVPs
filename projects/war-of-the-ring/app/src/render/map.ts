// MapView (PixiJS v8) — a perspective-tilted Middle-earth map. Region anchors come from
// data/map REGION_POS; each region draws a RegionStack: a legible readout of 1→10 units plus
// Leaders/Nazgul/Characters and the Fellowship marker. The hard problem is stacking density, so a
// region with 1–3 units shows individual fanned standees and 4–10 shows a representative cluster
// plus a composition/strength/leadership badge — never 10 discrete minis. Living background: drifting
// fog + an ember glow toward Mordor that intensifies with Corruption. Init once, guard async, destroy
// on unmount (the Pixi-v8/React lifecycle gotcha).

import { Application, Container, Graphics, Text, type TextStyleOptions } from 'pixi.js';
import type { GameView } from '../engine';
import { REGION_POS, REGIONS } from '../engine';
import { FACTION, NATION_TINT } from '../assets/manifest';

const W = 1280;
const H = 920;
const M = 70;

const SETTLEMENT_ICON: Record<string, string> = { town: '◦', city: '◉', stronghold: '✦', none: '' };

interface RegionSummary {
  id: string;
  name: string;
  side: 'fp' | 'shadow' | null;
  regular: Record<string, number>;
  elite: Record<string, number>;
  units: number;
  reg: number;
  eli: number;
  leaders: number;
  nazgul: number;
  characters: string[];
  besieged: boolean;
  control: 'fp' | 'shadow' | null;
  fellowship: boolean;
}

function pos(id: string): { x: number; y: number } {
  const p = REGION_POS[id] ?? { x: 0.5, y: 0.5 };
  return { x: M + p.x * (W - 2 * M), y: M + p.y * (H - 2 * M) };
}

export class MapView {
  private app: Application | null = null;
  private readonly bg = new Container();
  private readonly edges = new Container();
  private readonly nodes = new Container();
  private readonly fxLayer = new Container();
  private destroyed = false;
  private latest: GameView | null = null;
  private selected: string | null = null;
  private onClick: (id: string) => void = () => {};
  private fog: Graphics[] = [];
  private ember = new Graphics();
  private t = 0;
  private corruption = 0;

  async init(parent: HTMLElement, onRegionClick: (id: string) => void): Promise<void> {
    this.onClick = onRegionClick;
    const app = new Application();
    await app.init({ width: W, height: H, backgroundAlpha: 0, antialias: true, resolution: Math.min(window.devicePixelRatio || 1, 2), autoDensity: false });
    if (this.destroyed) {
      app.destroy(true);
      return;
    }
    this.app = app;
    parent.appendChild(app.canvas);
    app.canvas.style.width = '100%';
    app.canvas.style.height = 'auto';
    app.canvas.style.display = 'block';
    app.stage.addChild(this.bg, this.edges, this.fxLayer, this.nodes);
    this.nodes.sortableChildren = true;
    this.drawBackground();
    this.drawEdges();
    app.ticker.maxFPS = 30;
    app.ticker.add((tk) => this.tick(tk.deltaMS));
    if (this.latest) this.update(this.latest);
  }

  destroy(): void {
    this.destroyed = true;
    if (this.app) {
      this.app.destroy(true, { children: true });
      this.app = null;
    }
  }

  setSelected(id: string | null): void {
    const changed = this.selected !== id;
    this.selected = id;
    if (changed && this.latest) this.update(this.latest);
  }

  private drawBackground(): void {
    // parchment field + a subtle perspective vignette
    const g = new Graphics();
    g.rect(0, 0, W, H).fill(0x241c12);
    g.rect(0, 0, W, H).fill({ color: 0x3a2e1c, alpha: 0.5 });
    // faint cartographic grid
    for (let x = 0; x <= W; x += 80) g.moveTo(x, 0).lineTo(x, H).stroke({ width: 1, color: 0x4a3a22, alpha: 0.18 });
    for (let y = 0; y <= H; y += 80) g.moveTo(0, y).lineTo(W, y).stroke({ width: 1, color: 0x4a3a22, alpha: 0.18 });
    this.bg.addChild(g);

    // drifting fog along the edges (living background)
    for (let i = 0; i < 5; i++) {
      const f = new Graphics();
      f.ellipse(0, 0, 220 + i * 40, 90 + i * 20).fill({ color: 0xb9c2cc, alpha: 0.05 });
      f.x = (i * 290) % W;
      f.y = 60 + ((i * 180) % (H - 120));
      this.fog.push(f);
      this.fxLayer.addChild(f);
    }
    // ember glow toward Mordor (bottom-right)
    this.ember.circle(0, 0, 260).fill({ color: 0xff5a1e, alpha: 1 });
    this.ember.x = W * 0.9;
    this.ember.y = H * 0.58;
    this.ember.alpha = 0.05;
    this.fxLayer.addChildAt(this.ember, 0);
  }

  private drawEdges(): void {
    const g = new Graphics();
    const seen = new Set<string>();
    for (const r of Object.values(REGIONS)) {
      const a = pos(r.id);
      for (const n of r.adjacency) {
        const key = [r.id, n].sort().join('|');
        if (seen.has(key)) continue;
        seen.add(key);
        const b = pos(n);
        g.moveTo(a.x, a.y).lineTo(b.x, b.y).stroke({ width: 1.5, color: 0x6b5532, alpha: 0.35 });
      }
    }
    this.edges.addChild(g);
  }

  private summary(view: GameView, id: string): RegionSummary {
    const s = view.regions[id];
    const r = REGIONS[id];
    const reg = s ? Object.values(s.regular).reduce((a, b) => a + (b ?? 0), 0) : 0;
    const eli = s ? Object.values(s.elite).reduce((a, b) => a + (b ?? 0), 0) : 0;
    return {
      id,
      name: r.name,
      side: s && reg + eli > 0 ? s.side : null,
      regular: (s?.regular ?? {}) as Record<string, number>,
      elite: (s?.elite ?? {}) as Record<string, number>,
      units: reg + eli,
      reg,
      eli,
      leaders: s?.leaders ?? 0,
      nazgul: s?.nazgul ?? 0,
      characters: s?.characters ?? [],
      besieged: s?.besieged ?? false,
      control: (view.control[id] as 'fp' | 'shadow') ?? null,
      fellowship: view.fellowship.lastDeclaredRegion === id,
    };
  }

  update(view: GameView): void {
    this.latest = view;
    this.corruption = view.fellowship.corruption ?? this.corruption;
    if (!this.app) return;
    this.nodes.removeChildren();
    for (const id of Object.keys(REGION_POS)) {
      const node = this.buildNode(this.summary(view, id));
      this.nodes.addChild(node);
    }
  }

  private text(str: string, style: Partial<TextStyleOptions>): Text {
    const t = new Text({ text: str, style: { fontFamily: 'Georgia, serif', fill: 0xffffff, fontSize: 12, ...style } });
    return t;
  }

  /** The RegionStack — the headline render component. */
  private buildNode(sum: RegionSummary): Container {
    const p = pos(sum.id);
    const c = new Container();
    c.x = p.x;
    c.y = p.y;
    c.zIndex = Math.round(p.y);
    c.eventMode = 'static';
    c.cursor = 'pointer';
    c.on('pointertap', () => this.onClick(sum.id));

    const r = REGIONS[sum.id];
    const isSel = this.selected === sum.id;
    const controlColor = sum.control === 'fp' ? FACTION.fp.primary : sum.control === 'shadow' ? FACTION.shadow.primary : 0x6b5532;

    // settlement disc
    const discR = r.settlement === 'stronghold' ? 16 : r.settlement === 'city' ? 13 : r.settlement === 'town' ? 11 : 8;
    const disc = new Graphics();
    disc.circle(0, 0, discR).fill({ color: 0x2a2118 }).stroke({ width: isSel ? 3 : 2, color: isSel ? 0xffd479 : controlColor });
    c.addChild(disc);
    if (r.settlement !== 'none') {
      const icon = this.text(SETTLEMENT_ICON[r.settlement], { fontSize: discR, fill: controlColor });
      icon.anchor.set(0.5);
      c.addChild(icon);
    }

    // region label
    const label = this.text(sum.name, { fontSize: 11, fill: 0xe8dcc0, stroke: { color: 0x000000, width: 3 } });
    label.anchor.set(0.5, 0);
    label.position.set(0, discR + 2);
    c.addChild(label);

    // ── the unit readout ─────────────────────────────────────────────────────────────────
    if (sum.units > 0 && sum.side) {
      const sideCol = sum.side === 'fp' ? FACTION.fp : FACTION.shadow;
      const standeeY = -discR - 6;
      if (sum.units <= 3) {
        // individual fanned standees
        const total = sum.units;
        let i = 0;
        const draw = (tint: number) => {
          const sx = (i - (total - 1) / 2) * 13;
          c.addChild(this.standee(sx, standeeY, tint, sideCol.ink));
          i++;
        };
        for (const [n, k] of Object.entries(sum.regular)) for (let j = 0; j < (k ?? 0); j++) draw(NATION_TINT[n] ?? sideCol.primary);
        for (const [n, k] of Object.entries(sum.elite)) for (let j = 0; j < (k ?? 0); j++) draw(NATION_TINT[n] ?? sideCol.light);
      } else {
        // representative cluster (depth-sorted) + composition/strength/leadership badge
        for (let k = 0; k < 3; k++) c.addChild(this.standee((k - 1) * 11, standeeY - k * 2, sideCol.primary, sideCol.ink));
        const lead = sum.leaders + sum.nazgul;
        const badge = this.text(`${sum.reg}×R ${sum.eli}×E · ⚔${sum.units}${lead ? ` · ☆${lead}` : ''}`, {
          fontSize: 11,
          fill: 0xffffff,
          fontFamily: 'Georgia, serif',
        });
        badge.anchor.set(0.5, 1);
        badge.position.set(0, standeeY - 18);
        const bb = new Graphics();
        const pad = 4;
        bb.roundRect(badge.x - badge.width / 2 - pad, badge.y - badge.height - pad, badge.width + 2 * pad, badge.height + 2 * pad, 4)
          .fill({ color: sideCol.ink, alpha: 0.92 })
          .stroke({ width: 1, color: sideCol.light });
        c.addChild(bb, badge);
      }
    }

    // leader / nazgul silhouettes (distinct)
    const lead = sum.leaders + sum.nazgul;
    if (lead > 0) {
      for (let k = 0; k < Math.min(lead, 4); k++) {
        const pip = new Graphics();
        pip.poly([0, -6, 5, 4, -5, 4]).fill(sum.nazgul > 0 ? 0x1a1a1a : 0xe8dcc0).stroke({ width: 1, color: 0x000000 });
        pip.position.set(-discR - 6 - k * 7, 2);
        c.addChild(pip);
      }
    }

    // named characters as portrait-marker dots
    if (sum.characters.length > 0) {
      const dot = new Graphics();
      dot.circle(0, 0, 6).fill(0xffd479).stroke({ width: 1.5, color: 0x000000 });
      dot.position.set(discR + 6, -2);
      c.addChild(dot);
      const n = this.text(String(sum.characters.length), { fontSize: 9, fill: 0x000000 });
      n.anchor.set(0.5);
      n.position.set(discR + 6, -2);
      c.addChild(n);
    }

    // besieged ring
    if (sum.besieged) {
      const ring = new Graphics();
      ring.circle(0, 0, discR + 5).stroke({ width: 2, color: 0xffaa33, alpha: 0.9 });
      c.addChild(ring);
    }

    // Fellowship marker (last-known)
    if (sum.fellowship) {
      const fm = new Container();
      const ringG = new Graphics();
      ringG.circle(0, 0, 9).fill(0xf3e6c0).stroke({ width: 2, color: 0xc9a23a });
      const eye = this.text('❂', { fontSize: 12, fill: 0x7a5b13 });
      eye.anchor.set(0.5);
      fm.addChild(ringG, eye);
      fm.position.set(0, -discR - 30);
      if (this.latest?.fellowship.revealed) ringG.stroke({ width: 3, color: 0xff5a1e });
      c.addChild(fm);
    }

    return c;
  }

  /** A small 2.5D standee: shadow ellipse + tinted body with a highlight. */
  private standee(x: number, y: number, tint: number, ink: number): Container {
    const s = new Container();
    s.position.set(x, y);
    const g = new Graphics();
    g.ellipse(0, 6, 6, 2).fill({ color: 0x000000, alpha: 0.4 });
    g.roundRect(-5, -12, 10, 18, 3).fill(tint).stroke({ width: 1.5, color: 0xffffff });
    g.roundRect(-5, -12, 10, 6, 3).fill({ color: 0xffffff, alpha: 0.18 });
    s.addChild(g);
    void ink;
    return s;
  }

  private tick(dtMs: number): void {
    this.t += dtMs;
    for (let i = 0; i < this.fog.length; i++) {
      const f = this.fog[i];
      f.x += (0.004 + i * 0.001) * dtMs;
      if (f.x > W + 240) f.x = -240;
    }
    // ember intensifies with corruption (0..12) and pulses
    const base = 0.04 + (this.corruption / 12) * 0.4;
    this.ember.alpha = base + Math.sin(this.t / 700) * 0.03;
  }
}
