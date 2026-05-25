// The combat action controls, rendered ON the felt canvas — the final "game chrome → Pixi" piece. It
// replaces the floating DOM overlays (the sort bar, the defend prompt, the wildcard suit-picker, the
// pending-pick banner, and the block pill) with Pixi widgets drawn in the felt's own logical space, so
// the whole combat surface is one canvas. Like HudLayer it attaches its OWN pointer listeners to the
// shared app.stage rather than editing CombatStage's drag handlers: every widget sits in a card-free
// zone (a strip below the hand, a row above it, banners in the dead centre), so a tap there finds no
// card to drag and the two handler sets never conflict. Pure presentation: consumes a FeltControlsVM,
// emits intents via callbacks.

import { Application, Container, Graphics, Text } from "pixi.js";
import { Suit } from "../engine/types";
import { PIXEL_FONT, SUIT_COLOR, SUIT_GLYPH, THEME } from "./theme";

export interface FeltWildVM {
  id: string;
  label: string; // "Wild 7" / "Wild A"
  suit: Suit; // currently chosen suit
}

export interface FeltControlsVM {
  show: boolean; // false while a win/lose gate is up (controls hidden)
  defend: boolean; // the defend sub-phase (block the incoming strike)
  incoming: number; // strike to block
  thrown: number; // sum of selected card values (defend) — what's on the block so far
  blockEnough: boolean; // thrown >= incoming
  block: number; // the player's accumulated block (combat.enemy.shield) — soaks the next strike
  hasSelection: boolean;
  hasHover: boolean; // a hand card is hovered (suppresses the idle hint)
  pendingLabel: string | null; // a "pick a card" flow is armed (remove / tarot target)
  wildcards: FeltWildVM[]; // selected Wildcard cards awaiting a suit choice (play only)
}

const SUITS: Suit[] = ["H", "D", "C", "S"];

// lighten/darken an 0xRRGGBB colour toward white/black (amt -1..1) — mirrors sidebarStage.
function shade(color: number, amt: number): number {
  const r = (color >> 16) & 0xff,
    g = (color >> 8) & 0xff,
    b = color & 0xff;
  const f = (c: number) => Math.max(0, Math.min(255, amt >= 0 ? c + (255 - c) * amt : c * (1 + amt)));
  return (f(r) << 16) | (f(g) << 8) | f(b);
}

interface Hit {
  x: number;
  y: number;
  w: number;
  h: number;
  fn: () => void;
}

interface TextOpts {
  anchor?: number;
  anchorY?: number;
  bold?: boolean;
}

export class FeltControls {
  readonly view = new Container();
  onSort?: (k: "rank" | "suit") => void;
  onAuto?: () => void;
  onBlock?: () => void;
  onSetWild?: (cardId: string, suit: Suit) => void;
  onCancelPick?: () => void;

  private app: Application;
  private stageW: number;
  private stageH: number;
  private hits: Hit[] = [];
  private hoverIdx = -1;
  private sig = "";
  private vm: FeltControlsVM = { show: false, defend: false, incoming: 0, thrown: 0, blockEnough: false, block: 0, hasSelection: false, hasHover: false, pendingLabel: null, wildcards: [] };

  constructor(app: Application, stageW: number, stageH: number) {
    this.app = app;
    this.stageW = stageW;
    this.stageH = stageH;
    app.stage.on("pointerdown", this.onDown);
    app.stage.on("globalpointermove", this.onMove);
  }

  private onDown = (e: { global: { x: number; y: number } }) => {
    if (!this.view.visible) return;
    const h = this.hitAt(e.global.x, e.global.y);
    if (h) h.fn();
  };
  private onMove = (e: { global: { x: number; y: number } }) => {
    if (!this.view.visible) return;
    const i = this.hits.findIndex((h) => this.inside(h, e.global.x, e.global.y));
    if (i === this.hoverIdx) return;
    this.hoverIdx = i;
    this.app.stage.cursor = i >= 0 ? "pointer" : "default";
    this.draw();
  };

  private inside(h: Hit, x: number, y: number): boolean {
    return x >= h.x && x <= h.x + h.w && y >= h.y && y <= h.y + h.h;
  }
  private hitAt(x: number, y: number): Hit | undefined {
    return this.hits.find((h) => this.inside(h, x, y));
  }

  sync(vm: FeltControlsVM): void {
    const sig = JSON.stringify([vm.show, vm.defend, vm.incoming, vm.thrown, vm.blockEnough, vm.block, vm.hasSelection, vm.hasHover, vm.pendingLabel, vm.wildcards]);
    this.vm = vm;
    if (sig === this.sig) return; // nothing the controls show changed — skip the rebuild
    this.sig = sig;
    this.hoverIdx = -1;
    this.draw();
  }

  // --- small widget helpers (immediate-mode: rebuilt into the view each draw) ---
  private text(s: string, x: number, y: number, size: number, color: number, opts: TextOpts = {}): void {
    const t = new Text({ text: s, style: { fill: color, fontSize: size, fontFamily: PIXEL_FONT, fontWeight: opts.bold ? "700" : "400", letterSpacing: 0.5 } });
    t.anchor.set(opts.anchor ?? 0, opts.anchorY ?? 0);
    t.position.set(x, y);
    t.roundPixels = true;
    this.view.addChild(t);
  }

  private button(label: string, x: number, y: number, w: number, h: number, accent: number, enabled: boolean, fn: () => void): void {
    const idx = this.hits.length;
    const hovered = this.hoverIdx === idx && enabled;
    const fill = enabled ? (hovered ? shade(accent, -0.4) : shade(accent, -0.62)) : 0x161021;
    const g = new Graphics();
    g.roundRect(x, y, w, h, 5)
      .fill({ color: fill })
      .stroke({ width: 1.5, color: enabled ? accent : THEME.frameDim });
    this.view.addChild(g);
    this.text(label, x + w / 2, y + h / 2, 10, enabled ? shade(accent, 0.7) : THEME.frameDim, { anchor: 0.5, anchorY: 0.5, bold: true });
    // push for both states so the hover index stays aligned with the draw order
    this.hits.push({ x, y, w, h, fn: enabled ? fn : () => {} });
  }

  private draw(): void {
    this.view.removeChildren();
    this.hits = [];
    const vm = this.vm;
    if (!vm.show) return;

    // 1. Block pill — the player's accumulated block (soaks the royal's next strike). Top-left of the
    //    play area, clear of the HUD band (which hugs y≈2–78).
    if (vm.block > 0) {
      const w = 84,
        h = 20,
        x = 12,
        y = 88;
      const g = new Graphics();
      g.roundRect(x, y, w, h, 6).fill({ color: 0x1a1230, alpha: 0.92 }).stroke({ width: 1.5, color: THEME.violet });
      this.view.addChild(g);
      this.text(`🛡 Block ${vm.block}`, x + w / 2, y + h / 2, 10, 0xe6d8ff, { anchor: 0.5, anchorY: 0.5, bold: true });
    }

    // 2. Pending-pick banner (remove a card / aim a tarot) — dead-centre, below the HUD band.
    if (vm.pendingLabel) {
      const w = 320,
        h = 30,
        x = (this.stageW - w) / 2,
        y = 104;
      const g = new Graphics();
      g.roundRect(x, y, w, h, 7).fill({ color: 0x1c1430, alpha: 0.96 }).stroke({ width: 2, color: THEME.gold });
      this.view.addChild(g);
      this.text(vm.pendingLabel, x + 12, y + h / 2, 10, THEME.goldBright, { anchorY: 0.5 });
      this.button("Cancel", x + w - 66, y + 5, 60, 20, THEME.blood, true, () => this.onCancelPick?.());
    }

    // 3. Wildcard suit-picker rows (play only), stacked just above the hand.
    if (!vm.defend && vm.wildcards.length) {
      const rowH = 26,
        gap = 4;
      const baseY = this.stageH - 128; // bottom row sits clear of the hand's top edge
      vm.wildcards.forEach((wc, i) => this.wildRow(wc, baseY - i * (rowH + gap), rowH));
    }

    // 4. Bottom strip — Sort + idle hint in play, the block prompt in defend.
    const stripY = this.stageH - 24;
    if (vm.defend) {
      const autoW = 52,
        blockW = 96,
        gap = 6,
        labelW = 150;
      const totalW = labelW + autoW + blockW + gap * 2;
      const x0 = (this.stageW - totalW) / 2;
      this.text(`⚔ Block ${vm.incoming} · thrown ${vm.thrown}`, x0, stripY + 9, 10, vm.blockEnough ? THEME.good : 0xffffff, { anchorY: 0.5, bold: true });
      this.button("Auto", x0 + labelW, stripY, autoW, 18, THEME.gold, true, () => this.onAuto?.());
      this.button(`Block ${vm.thrown}/${vm.incoming}`, x0 + labelW + autoW + gap, stripY, blockW, 18, THEME.good, vm.blockEnough, () => this.onBlock?.());
    } else {
      const sortLabelW = 36,
        btnW = 58,
        gap = 5;
      let x = 14;
      this.text("SORT", x, stripY + 9, 9, THEME.parchmentEdge, { anchorY: 0.5 });
      x += sortLabelW;
      this.button("↕ Rank", x, stripY, btnW, 18, THEME.gold, true, () => this.onSort?.("rank"));
      x += btnW + gap;
      this.button("↕ Suit", x, stripY, btnW, 18, THEME.gold, true, () => this.onSort?.("suit"));
      x += btnW + gap;
      if (!vm.hasSelection && !vm.hasHover) {
        this.text("drag up to play · tap to build a combo · hover to inspect", x + 14, stripY + 9, 8, THEME.frameDim, { anchorY: 0.5 });
      }
    }
  }

  // One wildcard's "★ Wild N → ♥ ♦ ♣ ♠" row, centred. The chosen suit is filled; the rest are framed.
  private wildRow(wc: FeltWildVM, y: number, h: number): void {
    const glyphW = 26,
      gap = 4,
      labelW = 92;
    const totalW = labelW + SUITS.length * (glyphW + gap) - gap;
    const x0 = (this.stageW - totalW) / 2;
    const bg = new Graphics();
    bg.roundRect(x0 - 8, y, totalW + 16, h, 6).fill({ color: 0x130d20, alpha: 0.94 }).stroke({ width: 1.5, color: THEME.gold });
    this.view.addChild(bg);
    this.text(`★ ${wc.label}`, x0, y + h / 2, 9, THEME.goldBright, { anchorY: 0.5, bold: true });
    SUITS.forEach((s, j) => {
      const bx = x0 + labelW + j * (glyphW + gap);
      const on = wc.suit === s;
      const col = SUIT_COLOR[s];
      const idx = this.hits.length;
      const hovered = this.hoverIdx === idx;
      const g = new Graphics();
      g.roundRect(bx, y + 3, glyphW, h - 6, 4)
        .fill({ color: on ? shade(col, -0.15) : hovered ? shade(col, -0.5) : 0x1a1024 })
        .stroke({ width: 1.5, color: on ? col : THEME.frameDim });
      this.view.addChild(g);
      this.text(SUIT_GLYPH[s], bx + glyphW / 2, y + h / 2, 13, on ? 0xffffff : col, { anchor: 0.5, anchorY: 0.5, bold: true });
      this.hits.push({ x: bx, y: y + 3, w: glyphW, h: h - 6, fn: () => this.onSetWild?.(wc.id, s) });
    });
  }

  destroy(): void {
    this.app.stage.off("pointerdown", this.onDown);
    this.app.stage.off("globalpointermove", this.onMove);
    this.view.destroy({ children: true });
  }
}
