// The run sidebar rendered in Pixi (the "game chrome" half of the all-Pixi move). A standalone canvas
// that sits in the sidebar column — it does NOT touch the felt stage. Combat: the royal "blind" (HP +
// immunity + intent + decrees), the turn banner, the Fighting-Style read-out (sprite banner + effect
// multiplier + the four suit-effect boxes + Play/Clear), the stat grid, Sort, Run Info, and the footer
// (Options + Mute). Shop: the SHOP sign + gold/round. Pure presentation: consumes a SidebarVM, emits
// intents via callbacks. All headline/label/number text is split into per-character glyphs that bob on
// a phase offset (Balatro-style "living text").

import { Application, Assets, Container, Graphics, Sprite, Texture } from "pixi.js";
import { FightingStyleId, Suit } from "../engine/types";
import { SUIT_COLOR, SUIT_GLYPH, THEME, TITLE_FONT } from "./theme";
import { TextOpts, WiggleField } from "./ui/wigglyText";

export const SIDEBAR_W = 320;
export const SIDEBAR_H = 640;

const PAD = 14;
const INNER = SIDEBAR_W - PAD * 2;
const STAT_BOX_H = 50; // Gold/Round boxes — tall enough for the suit-effect-box layout (label + big value)

// FightingStyleId (camelCase) → the kebab-case art file in /public/art/styles/.
export const STYLE_ART_SLUG: Record<FightingStyleId, string> = {
  twoHanded: "two-handed",
  swordShield: "sword-and-shield",
  spear: "spear",
  dualWield: "dual-wielding",
  mage: "mage",
  mounted: "mounted",
};

/** Per-suit-effect highlight: buffed (by the fighting-style modifier) = green, suppressed by the
 *  royal's immunity = red, otherwise plain. */
export type FxCol = "buff" | "debuff" | "none";

// lighten/darken an 0xRRGGBB colour toward white/black (amt -1..1)
function shade(color: number, amt: number): number {
  const r = (color >> 16) & 0xff, g = (color >> 8) & 0xff, b = color & 0xff;
  const f = (c: number) => Math.max(0, Math.min(255, amt >= 0 ? c + (255 - c) * amt : c * (1 + amt)));
  return (f(r) << 16) | (f(g) << 8) | f(b);
}

export interface SidebarVM {
  mode: "combat" | "shop";
  gold: number;
  round: string; // "2/12"
  // combat-only
  royalTier?: string;
  royalSuit?: Suit;
  hp?: number;
  maxHp?: number;
  intent?: { incoming: number; enraged: boolean; ignoresShield: boolean } | null;
  decrees?: { name: string; note?: string }[];
  outcome?: boolean;
  turn?: "play" | "defend";
  incoming?: number;
  styleName?: string; // "" when no preview
  styleSub?: string;
  styleId?: FightingStyleId;
  styleMounted?: boolean; // play includes an Ace → Mounted overlay
  styleWarn?: boolean; // illegal hand
  styleMult?: number; // effect multiplier from the fighting-style level (1 = none)
  effects?: { damage: number; shield: number; draw: number; heal: number };
  fx?: { damage: FxCol; shield: FxCol; draw: FxCol; heal: FxCol }; // per-effect buff/debuff highlight
  stage?: string;
  hand?: string; // "5/8"
  trained?: string;
  canPlay?: boolean;
  hasSelection?: boolean;
  edicts?: { id: string; name: string }[]; // bought edicts — shown as a row of pips/labels at the bottom
}

const SUIT_NAME_FULL: Record<Suit, string> = { H: "Hearts", D: "Diamonds", C: "Clubs", S: "Spades" };

interface Hit {
  x: number;
  y: number;
  w: number;
  h: number;
  fn: () => void;
}

export class SidebarStage {
  readonly app: Application;
  onPlay?: () => void;
  onClear?: () => void;
  onSort?: (k: "rank" | "suit") => void;
  onRunInfo?: () => void;
  onOptions?: () => void;
  onMute?: () => void;

  private root = new Container();
  private hits: Hit[] = [];
  private hoverIdx = -1;
  private muted = false;
  private vm: SidebarVM = { mode: "combat", gold: 0, round: "" };
  private styleTex = new Map<string, Texture | null>(); // fighting-style banner art (null = load failed)
  private destroyed = false;
  // the shared "living text" typeface — per-character wiggle (see render/ui/wigglyText)
  private wig = new WiggleField();
  private wigTick = (tk: { deltaMS: number }) => this.wig.update(tk.deltaMS / 1000);

  constructor(app: Application) {
    this.app = app;
    app.ticker.add(this.wigTick);
    app.stage.addChild(this.root);
    app.stage.eventMode = "static";
    app.stage.hitArea = { contains: () => true } as { contains: () => boolean };
    app.stage.on("pointertap", (e) => {
      const h = this.hitAt(e.global.x, e.global.y);
      if (h) h.fn();
    });
    app.stage.on("globalpointermove", (e) => {
      const i = this.hits.findIndex((h) => this.inside(h, e.global.x, e.global.y));
      if (i !== this.hoverIdx) {
        this.hoverIdx = i;
        app.stage.cursor = i >= 0 ? "pointer" : "default";
        this.draw();
      }
    });
  }

  setMuted(m: boolean): void {
    this.muted = m;
    this.draw();
  }

  sync(vm: SidebarVM): void {
    this.vm = vm;
    this.draw();
  }

  private inside(h: Hit, x: number, y: number): boolean {
    return x >= h.x && x <= h.x + h.w && y >= h.y && y <= h.y + h.h;
  }
  private hitAt(x: number, y: number): Hit | undefined {
    return this.hits.find((h) => this.inside(h, x, y));
  }

  // --- small widget helpers (build into the root each redraw) ---
  private panel(x: number, y: number, w: number, h: number, accent = THEME.frameDim): Graphics {
    const g = new Graphics();
    g.roundRect(x, y, w, h, 8).fill({ color: 0x1c1430, alpha: 0.96 }).stroke({ width: 2, color: accent });
    this.root.addChild(g);
    return g;
  }

  // A line of text via the shared living-text typeface (per-character wiggle).
  private text(s: string, x: number, y: number, size: number, color: number, opts: TextOpts = {}): Container {
    return this.wig.build(this.root, s, x, y, size, color, opts);
  }

  private button(label: string, x: number, y: number, w: number, h: number, accent: number, enabled: boolean, fn: () => void): void {
    const idx = this.hits.length;
    const hovered = this.hoverIdx === idx && enabled;
    const fill = enabled ? (hovered ? shade(accent, -0.45) : shade(accent, -0.66)) : 0x161021;
    const g = new Graphics();
    g.roundRect(x, y, w, h, 7)
      .fill({ color: fill })
      .stroke({ width: 2, color: enabled ? accent : THEME.frameDim });
    this.root.addChild(g);
    this.text(label, x + w / 2, y + h / 2, 13, enabled ? shade(accent, 0.72) : THEME.frameDim, { anchor: 0.5, anchorY: 0.5, bold: true });
    if (enabled) this.hits.push({ x, y, w, h, fn });
    else this.hits.push({ x, y, w, h, fn: () => {} }); // keep index alignment for hover
  }

  private draw(): void {
    this.root.removeChildren();
    this.hits = [];
    this.wig.reset();
    if (this.vm.mode === "shop") this.drawShop();
    else this.drawCombat();
  }

  private drawShop(): void {
    const vm = this.vm;
    this.panel(PAD, PAD, INNER, 76, THEME.gold);
    this.text("SHOP", PAD + INNER / 2, PAD + 18, 30, THEME.goldBright, { font: TITLE_FONT, anchor: 0.5 });
    this.text("◆ OPEN ◆", PAD + INNER / 2, PAD + 54, 9, 0xffffff, { anchor: 0.5 });
    this.statRow(PAD + 92, [["Gold", `◆ ${vm.gold}`, THEME.goldBright], ["Round", vm.round, 0xffffff]]);
    this.button("⌖ Run Info", PAD, PAD + 152, INNER, 36, THEME.gold, true, () => this.onRunInfo?.());
    this.footer(PAD + 200);
    // Bought edicts pinned to the bottom-left (overflowing upward over the chrome above if many).
    this.drawEdictsRow(SIDEBAR_H - 8, vm);
  }

  private drawCombat(): void {
    const vm = this.vm;
    const suit = vm.royalSuit ?? "S";
    const accent = SUIT_COLOR[suit];
    const royalH = 116 + (vm.decrees?.length ?? 0) * 18;
    const styleH = 250; // taller effect boxes (see fxBox) need more panel height before Play/Clear

    // Lay the sections out top→bottom, distributing the leftover height as even gaps so the
    // chrome fills the whole sidebar instead of clustering at the top.
    const sections: { h: number; draw: (y: number) => void }[] = [];
    sections.push({ h: royalH, draw: (y) => this.drawRoyalPanel(y, royalH, vm, suit, accent) });
    if (!vm.outcome) sections.push({ h: 30, draw: (y) => this.drawTurnBanner(y, vm) });
    sections.push({ h: styleH, draw: (y) => this.drawStylePanel(y, styleH, vm) });
    sections.push({ h: STAT_BOX_H, draw: (y) => this.statRow(y, [["Gold", `◆ ${vm.gold}`, THEME.goldBright], ["Round", vm.round, 0xffffff]]) });
    if (vm.trained) sections.push({ h: 28, draw: (y) => this.drawTrainedRow(y, vm) });
    sections.push({ h: 36, draw: (y) => this.button("⌖ Run Info", PAD, y, INNER, 36, THEME.gold, true, () => this.onRunInfo?.()) });
    sections.push({ h: 38, draw: (y) => this.footer(y) });

    const sumH = sections.reduce((a, s) => a + s.h, 0);
    const gap = Math.max(8, Math.min(28, (SIDEBAR_H - PAD * 2 - sumH) / (sections.length - 1)));
    let y = PAD;
    for (const s of sections) {
      s.draw(y);
      y += s.h + gap;
    }
    // Bought edicts overlay at the bottom-left — drawn LAST so they sit on top of the footer if many.
    this.drawEdictsRow(SIDEBAR_H - 8, vm);
  }

  private drawRoyalPanel(y: number, royalH: number, vm: SidebarVM, suit: Suit, accent: number): void {
    this.panel(PAD, y, INNER, royalH, accent);
    // big suit emblem (the royal is the boss you're taking down — make it present)
    const badge = new Graphics();
    badge.roundRect(PAD + 12, y + 12, 56, 56, 8).fill(accent).stroke({ width: 2, color: THEME.ink });
    this.root.addChild(badge);
    this.text("♛", PAD + 40, y + 18, 26, THEME.ink, { anchor: 0.5 });
    this.text(SUIT_GLYPH[suit], PAD + 40, y + 46, 18, THEME.ink, { anchor: 0.5 });
    // tier name + immunity + next strike, to the right of the emblem
    const rx = PAD + 80;
    this.text((vm.royalTier ?? "").toUpperCase(), rx, y + 14, 19, THEME.goldBright, { bold: true });
    this.text(`⊘ ${SUIT_GLYPH[suit]} ${SUIT_NAME_FULL[suit]}`, rx, y + 40, 12, accent);
    if (vm.intent) {
      this.text(`${vm.intent.enraged ? "🔥 " : ""}⚔ Strikes ${vm.intent.incoming}${vm.intent.ignoresShield ? " ⊘shld" : ""}`, rx, y + 56, 12, THEME.blood);
    }
    // THE central element: a big, full-width HP bar — the thing you're culling to zero
    const hpY = y + 78;
    const hpW = INNER - 24;
    const hpFrac = vm.maxHp ? Math.max(0, (vm.hp ?? 0) / vm.maxHp) : 0;
    const bar = new Graphics();
    bar.roundRect(PAD + 12, hpY, hpW, 28, 6).fill(0x2a141c).stroke({ width: 2, color: THEME.ink });
    if (hpFrac > 0.001) {
      const hpCol = hpFrac > 0.5 ? THEME.red : hpFrac > 0.25 ? 0xd06030 : THEME.gold;
      bar.roundRect(PAD + 12, hpY, hpW * hpFrac, 28, 6).fill(hpCol);
    }
    this.root.addChild(bar);
    this.text(`♥ ${vm.hp ?? 0} / ${vm.maxHp ?? 0}`, PAD + 12 + hpW / 2, hpY + 7, 16, 0xffffff, { anchor: 0.5, bold: true });
    let ry = hpY + 36;
    for (const d of vm.decrees ?? []) {
      this.text(`⚜ ${d.name}${d.note ? ` · ${d.note}` : ""}`, PAD + 14, ry, 10, THEME.goldBright, { wrap: INNER - 28 });
      ry += 18;
    }
  }

  private drawTurnBanner(y: number, vm: SidebarVM): void {
    const defend = vm.turn === "defend";
    this.panel(PAD, y, INNER, 28, defend ? THEME.blood : THEME.gold);
    this.text(defend ? `⚔ DEFEND — block ${vm.incoming}` : "★ YOUR MOVE", PAD + INNER / 2, y + 14, 13, defend ? THEME.blood : THEME.goldBright, { anchor: 0.5, anchorY: 0.5, bold: true });
  }

  private drawStylePanel(y: number, h: number, vm: SidebarVM): void {
    this.panel(PAD, y, INNER, h);
    // --- sprite banner (the fighting-style illustration) ---
    const styleId = vm.styleId ?? "twoHanded";
    const tex = this.styleArt(styleId);
    const empty = !vm.styleName;
    const spriteX = PAD + 10;
    const spriteY = y + 12;
    const spriteW = 42;
    const spriteH = 58;
    const frame = new Graphics();
    frame.roundRect(spriteX, spriteY, spriteW, spriteH, 4).fill(0x0d0818).stroke({ width: 1.5, color: vm.styleWarn ? THEME.blood : THEME.frameDim });
    this.root.addChild(frame);
    if (tex) {
      const s = new Sprite(tex);
      s.anchor.set(0.5);
      const sc = Math.min((spriteW - 4) / tex.width, (spriteH - 4) / tex.height);
      s.scale.set(sc);
      s.position.set(spriteX + spriteW / 2, spriteY + spriteH / 2);
      s.alpha = empty ? 0.4 : 1;
      s.roundPixels = true;
      this.root.addChild(s);
    } else {
      this.text("✦", spriteX + spriteW / 2, spriteY + spriteH / 2 - 10, 20, THEME.frameDim, { anchor: 0.5 });
    }
    // --- header text: name (+ Mounted tag) / modifier / sub ---
    const tx = spriteX + spriteW + 12;
    const wrapW = INNER - (tx - PAD) - 10;
    const name = empty ? "Fighting Style" : vm.styleName ?? "";
    this.text(name, tx, y + 13, 14, vm.styleWarn ? THEME.blood : THEME.goldBright, { bold: true, wrap: wrapW });
    if (vm.styleMounted) this.text("🐎 MOUNTED", PAD + INNER - 10, y + 14, 9, THEME.gold, { anchor: 1 });
    const mult = vm.styleMult ?? 1;
    const mc = mult > 1.001 ? THEME.good : THEME.frameDim;
    this.text(`×${mult.toFixed(2)}`, tx, y + 33, 19, mc, { bold: true });
    this.text("effect mult", tx + 78, y + 40, 9, THEME.parchmentEdge);
    this.text(empty ? "hover or select cards" : vm.styleSub ?? "", tx, y + 58, 11, THEME.parchmentEdge, { wrap: wrapW });

    // --- effect boxes (2×2 vertical: title above number, colour-coded) ---
    const fx = vm.effects ?? { damage: 0, shield: 0, draw: 0, heal: 0 };
    const st = vm.fx ?? { damage: "none" as FxCol, shield: "none" as FxCol, draw: "none" as FxCol, heal: "none" as FxCol };
    const boxW = (INNER - 18) / 2;
    const boxH = 54; // taller so the big number isn't crammed against the bottom border
    const by0 = y + 92;
    const fxData: [string, number, number, FxCol][] = [
      ["♣ DAMAGE", fx.damage, SUIT_COLOR.C, st.damage],
      ["♠ BLOCK", fx.shield, SUIT_COLOR.S, st.shield],
      ["♦ DRAW", fx.draw, SUIT_COLOR.D, st.draw],
      ["♥ HEAL", fx.heal, SUIT_COLOR.H, st.heal],
    ];
    fxData.forEach(([lbl, val, col, state], i) => {
      const bx = PAD + 6 + (i % 2) * (boxW + 6);
      const byy = by0 + Math.floor(i / 2) * (boxH + 6);
      this.fxBox(bx, byy, boxW, boxH, lbl, col, val, state);
    });

    // --- Play / Clear (hidden in defend; the block UI lives on the felt) ---
    if (vm.turn !== "defend") {
      const by = y + h - 38;
      this.button("Play ▸", PAD + 6, by, INNER * 0.6 - 8, 30, THEME.good, !!vm.canPlay, () => this.onPlay?.());
      this.button("Clear", PAD + INNER * 0.6 + 2, by, INNER * 0.4 - 4, 30, THEME.blood, !!vm.hasSelection, () => this.onClear?.());
    }
  }

  // A vertical suit-effect cell: label on top, big number below; green when buffed, red when the
  // royal's immunity suppresses that suit.
  private fxBox(x: number, y: number, w: number, h: number, label: string, suitCol: number, val: number, state: FxCol): void {
    const zero = val <= 0 && state === "none";
    const numCol = state === "buff" ? THEME.good : state === "debuff" ? THEME.blood : zero ? THEME.frameDim : 0xffffff;
    const border = state === "buff" ? THEME.good : state === "debuff" ? THEME.blood : zero ? THEME.frameDim : suitCol;
    const g = new Graphics();
    g.roundRect(x, y, w, h, 5).fill({ color: 0x130d20, alpha: zero ? 0.5 : 0.95 }).stroke({ width: 1.5, color: border });
    this.root.addChild(g);
    // label hugs the top; the big number is vertically centred in the space below it with clear
    // padding to the bottom border (anchorY 0.5 → it never crowds the edge as digits grow)
    this.text(label, x + w / 2, y + 9, 11, zero ? THEME.frameDim : suitCol, { anchor: 0.5 });
    this.text(`${val}`, x + w / 2, y + 36, 22, numCol, { anchor: 0.5, anchorY: 0.5, bold: true });
  }

  private drawTrainedRow(y: number, vm: SidebarVM): void {
    this.panel(PAD, y, INNER, 26);
    this.text("Trained", PAD + 12, y + 8, 11, THEME.parchmentEdge);
    this.text(vm.trained ?? "", PAD + INNER - 12, y + 7, 13, THEME.good, { anchor: 1 });
  }

  // Bought edicts — a vertical stack of pill labels at the BOTTOM of the sidebar. New ones push up
  // from the bottom; if the list grows past the available height, older pills overlap the chrome
  // above (the user's "slightly overlay them if the sidebar overflows" rule).
  private drawEdictsRow(bottomY: number, vm: SidebarVM): void {
    const list = vm.edicts ?? [];
    if (list.length === 0) return;
    const rowH = 18;
    const gap = 3;
    const pad = 8;
    list.forEach((e, i) => {
      // i=0 is the FIRST acquired and ends up at the top of the stack; the latest sits at the bottom.
      const idxFromBottom = list.length - 1 - i;
      const yy = bottomY - rowH - idxFromBottom * (rowH + gap);
      const g = new Graphics();
      g.roundRect(PAD, yy, INNER, rowH, 5).fill({ color: 0x231a36, alpha: 0.95 }).stroke({ width: 1, color: THEME.gold });
      this.root.addChild(g);
      this.text("⚜", PAD + pad, yy + 4, 10, THEME.gold);
      this.text(e.name, PAD + pad + 14, yy + 4, 10, THEME.goldBright, { wrap: INNER - pad * 2 - 14 });
    });
  }

  // Gold / Round read-outs, laid out like the suit-effect boxes (fxBox): a headline-gold label hugging
  // the top, a big value centred below. The label uses the Fighting-Style headline style (goldBright,
  // bold) at a larger size.
  private statRow(y: number, cells: [string, string, number][], h = STAT_BOX_H): void {
    const w = (INNER - 8) / cells.length;
    cells.forEach(([lbl, val, col], i) => {
      const x = PAD + i * (w + 8 / cells.length);
      this.panel(x, y, w, h);
      this.text(lbl.toUpperCase(), x + w / 2, y + 10, 13, THEME.goldBright, { anchor: 0.5, bold: true });
      this.text(val, x + w / 2, y + h - 17, 19, col, { anchor: 0.5, anchorY: 0.5, bold: true });
    });
  }

  private footer(y: number): void {
    this.button("⚙ Options", PAD, y, INNER * 0.66 - 6, 34, THEME.gold, true, () => this.onOptions?.());
    this.button(this.muted ? "🔇" : "♪", PAD + INNER * 0.66 + 2, y, INNER * 0.34 - 2, 34, THEME.gold, true, () => this.onMute?.());
  }

  // The fighting-style banner texture (cached). Kicks off an async load + redraw the first time.
  private styleArt(styleId: FightingStyleId): Texture | null {
    const url = `/art/styles/${STYLE_ART_SLUG[styleId]}.svg`;
    if (this.styleTex.has(url)) return this.styleTex.get(url) ?? null;
    this.styleTex.set(url, null); // mark in-flight (also doubles as the failed sentinel)
    void Assets.load(url)
      .then((tex: Texture) => {
        if (this.destroyed) return;
        if (tex.source) tex.source.scaleMode = "nearest";
        this.styleTex.set(url, tex);
        this.draw();
      })
      .catch(() => {});
    return null;
  }

  destroy(): void {
    this.destroyed = true;
    this.app.ticker.remove(this.wigTick);
    this.root.destroy({ children: true });
  }
}
