// The "Black Market" rendered as a TRAY that slides partway up over the unchanged battle felt
// (Balatro's shop). The felt (living plasma + gilded frame + the draw pile) stays exactly as it is in
// combat; a physical wooden/iron tray rises from the bottom holding the offerings — booster packs
// (classic crimped, shiny wrappers), wares (joker/tarot/card 2.5D card models) and edicts (illustrated
// decrees) — plus the reroll / remove / next-fight controls. Shiny surfaces (packs, edicts) shimmer.
// Pure presentation: consumes a ShopVM, emits intents via callbacks; the engine/store own all state.

import { Application, Assets, Container, Graphics, Sprite, Text, Texture } from "pixi.js";
import { PlasmaBackground } from "../fx";
import { PIXEL_FONT, PLASMA_PALETTE, SUIT_GLYPH, suitInkColor, THEME, TITLE_FONT } from "./theme";
import { Suit } from "../engine/types";

export const SHOP_W = 480;
export const SHOP_H = 360;

const CARD_W = 44;
const CARD_H = 62;

// the tray (centred, leaving the draw pile visible at bottom-right and the joker/pouch band up top)
const TRAY_X = 16;
const TRAY_W = 392;
const TRAY_TOP = 120;
const TRAY_BOT = 352;
const DECK_X = SHOP_W - 30;
const DECK_Y = SHOP_H - 60;

export interface ShopItemVM {
  id: string;
  group: "ware" | "pack" | "edict";
  kind: string; // PackKind for wares/packs; "edict" for edicts
  contentId: string;
  name: string;
  text: string;
  art: string;
  price: number;
  affordable: boolean;
  card?: { suit: Suit | null; value: number; companion: boolean } | null;
  packLabel?: string;
  shimmer?: boolean; // shiny surface (packs, edicts)
  tipType?: string;
}
export interface ShopVM {
  packs: ShopItemVM[];
  wares: ShopItemVM[];
  edicts: ShopItemVM[];
  deckId: string;
  deckCount: number;
  gold: number;
  rerollCost: number;
  removeCost: number;
}

const KIND_TINT: Record<string, number> = {
  relic: 0xc0273f,
  tarot: 0x8a5ad0,
  spectral: 0x4f8fd0,
  style: 0x4fae7f,
  card: 0xb07a3a,
  edict: 0xc9a227,
};
const PACK_TINT: Record<string, number> = {
  relic: 0xc0273f,
  card: 0xb07a3a,
  tarot: 0x8a5ad0,
  style: 0x4fae7f,
  spectral: 0x3f6fb0,
};

// One offering: a floating, hoverable card with a price plaque, optional shimmer.
class ShopNode {
  readonly view = new Container();
  private body = new Container();
  private shadow = new Graphics();
  private sheen?: Graphics;
  private phase = Math.random() * Math.PI * 2;
  private hovered = false;
  private lift = 0;
  baseX = 0;
  baseY = 0;
  readonly vm: ShopItemVM;

  constructor(vm: ShopItemVM, onTextureNeeded: (n: ShopNode, url: string) => void) {
    this.vm = vm;
    this.shadow.ellipse(0, CARD_H / 2 + 8, CARD_W * 0.5, 6).fill({ color: 0x000000, alpha: 0.4 });
    this.view.addChild(this.shadow, this.body);

    if (vm.group === "pack") this.drawPack();
    else if (vm.group === "edict") this.drawEdict();
    else if (vm.card) this.drawCardFace(vm.card);
    else {
      this.drawArtFrame();
      const url = this.artUrl();
      if (url) onTextureNeeded(this, url);
    }
    if (vm.shimmer) this.addSheen();
    if (!vm.affordable) this.body.alpha = 0.55;

    const plaque = new Graphics();
    plaque.roundRect(-21, CARD_H / 2 + 1, 42, 15, 5).fill({ color: 0x0d0712, alpha: 0.92 }).stroke({ width: 1.5, color: vm.affordable ? THEME.gold : THEME.frameDim });
    const price = new Text({ text: `◆${vm.price}`, style: { fill: vm.affordable ? THEME.goldBright : THEME.frameDim, fontSize: 9, fontFamily: PIXEL_FONT } });
    price.anchor.set(0.5);
    price.position.set(0, CARD_H / 2 + 8);
    this.view.addChild(plaque, price);

    this.view.eventMode = "static";
    this.view.cursor = "pointer";
  }

  private artUrl(): string | null {
    const id = this.vm.contentId;
    if (this.vm.kind === "relic") return `/art/jokers/${id}.svg`;
    if (this.vm.kind === "tarot" || this.vm.kind === "style") return `/art/tarots/${id}.svg`;
    if (this.vm.kind === "spectral") return `/art/spectrals/${id}.svg`;
    return null;
  }

  setTexture(tex: Texture): void {
    if (tex.source) tex.source.scaleMode = "nearest";
    const s = new Sprite(tex);
    s.anchor.set(0.5);
    s.width = CARD_W;
    s.height = CARD_H;
    s.roundPixels = true;
    this.body.addChildAt(s, this.body.children.length); // above the frame
  }

  // a diagonal highlight that sweeps across the card, clipped to its shape (shimmer on shiny surfaces)
  private addSheen(): void {
    const sheen = new Graphics();
    sheen.rect(-10, -CARD_H, 14, CARD_H * 2).fill({ color: 0xffffff, alpha: 0.5 });
    sheen.rotation = -0.5;
    const mask = new Graphics();
    mask.roundRect(-CARD_W / 2, -CARD_H / 2, CARD_W, CARD_H, 5).fill(0xffffff);
    this.body.addChild(mask, sheen);
    sheen.mask = mask;
    this.sheen = sheen;
  }

  private drawArtFrame(): void {
    const tint = KIND_TINT[this.vm.kind] ?? THEME.frameDim;
    const g = new Graphics();
    g.roundRect(-CARD_W / 2 - 2, -CARD_H / 2 - 2, CARD_W + 4, CARD_H + 4, 6).fill(THEME.ink);
    g.roundRect(-CARD_W / 2, -CARD_H / 2, CARD_W, CARD_H, 5).fill(0x1a1024).stroke({ width: 1.5, color: tint });
    this.body.addChild(g);
    const initial = new Text({ text: (this.vm.name[0] ?? "?").toUpperCase(), style: { fill: tint, fontSize: 22, fontFamily: TITLE_FONT } });
    initial.anchor.set(0.5);
    this.body.addChild(initial);
  }

  private drawCardFace(card: { suit: Suit | null; value: number; companion: boolean }): void {
    const g = new Graphics();
    g.roundRect(-CARD_W / 2 - 2, -CARD_H / 2 - 2, CARD_W + 4, CARD_H + 4, 6).fill(THEME.ink);
    g.roundRect(-CARD_W / 2, -CARD_H / 2, CARD_W, CARD_H, 5).fill(THEME.parchment);
    g.roundRect(-CARD_W / 2 + 3, -CARD_H / 2 + 3, CARD_W - 6, CARD_H - 6, 3).stroke({ width: 1, color: THEME.parchmentEdge });
    this.body.addChild(g);
    const suit = card.suit as Suit | null;
    const ink = suit ? suitInkColor(suit) : THEME.violet;
    const corner = card.companion ? "A" : String(card.value);
    const cornerText = new Text({ text: corner, style: { fill: ink, fontSize: 12, fontFamily: PIXEL_FONT, fontWeight: "700" } });
    cornerText.position.set(-CARD_W / 2 + 5, -CARD_H / 2 + 5);
    const glyph = new Text({ text: suit ? SUIT_GLYPH[suit] : "★", style: { fill: ink, fontSize: 24, fontFamily: PIXEL_FONT } });
    glyph.anchor.set(0.5);
    this.body.addChild(cornerText, glyph);
  }

  // an illustrated "decree" — a gilded scroll card with a wax seal (the edict's own colour accent)
  private drawEdict(): void {
    const g = new Graphics();
    g.roundRect(-CARD_W / 2 - 2, -CARD_H / 2 - 2, CARD_W + 4, CARD_H + 4, 6).fill(THEME.ink);
    g.roundRect(-CARD_W / 2, -CARD_H / 2, CARD_W, CARD_H, 5).fill(0x2a1d3a).stroke({ width: 1.5, color: THEME.gold });
    // a furled scroll
    g.roundRect(-CARD_W / 2 + 6, -CARD_H / 2 + 9, CARD_W - 12, CARD_H - 26, 3).fill(THEME.parchment).stroke({ width: 1, color: THEME.parchmentEdge });
    g.rect(-CARD_W / 2 + 6, -CARD_H / 2 + 12, CARD_W - 12, 2).fill(THEME.parchmentEdge);
    g.rect(-CARD_W / 2 + 6, -CARD_H / 2 + 17, CARD_W - 12, 2).fill(THEME.parchmentEdge);
    g.rect(-CARD_W / 2 + 6, -CARD_H / 2 + 22, CARD_W - 18, 2).fill(THEME.parchmentEdge);
    this.body.addChild(g);
    // wax seal
    const seal = new Graphics();
    seal.circle(0, CARD_H / 2 - 14, 8).fill(0xc0273f).stroke({ width: 1.5, color: 0x7a1626 });
    this.body.addChild(seal);
    const crest = new Text({ text: "⚜", style: { fill: THEME.gold, fontSize: 11, fontFamily: PIXEL_FONT } });
    crest.anchor.set(0.5);
    crest.position.set(0, CARD_H / 2 - 14);
    this.body.addChild(crest);
  }

  // a classic booster: crimped (zig-zag) edges top & bottom, a shiny wrapper, a bright illustration disc
  private drawPack(): void {
    const tint = PACK_TINT[this.vm.kind] ?? 0x7a4bb0;
    const w = CARD_W;
    const h = CARD_H;
    const g = new Graphics();
    g.roundRect(-w / 2 - 2, -h / 2 - 2, w + 4, h + 4, 5).fill(THEME.ink);
    // crimped top & bottom edges
    const crimp = (yBase: number, dir: number) => {
      const pts: number[] = [];
      const step = 6;
      for (let x = -w / 2; x <= w / 2; x += step) {
        pts.push(x, yBase);
        pts.push(x + step / 2, yBase + dir * 4);
      }
      pts.push(w / 2, yBase);
      pts.push(w / 2, yBase - dir * 8);
      pts.push(-w / 2, yBase - dir * 8);
      g.poly(pts).fill(tint);
    };
    // body
    g.rect(-w / 2, -h / 2 + 7, w, h - 14).fill(tint).stroke({ width: 1.5, color: THEME.gold });
    crimp(-h / 2 + 7, -1);
    crimp(h / 2 - 7, 1);
    // shiny illustration disc
    g.circle(0, 0, 13).fill({ color: 0xffffff, alpha: 0.18 });
    g.circle(0, 0, 10).fill(0x14101e).stroke({ width: 1.5, color: THEME.gold });
    this.body.addChild(g);
    const sym = new Text({ text: this.packGlyph(), style: { fill: THEME.gold, fontSize: 13, fontFamily: PIXEL_FONT } });
    sym.anchor.set(0.5);
    this.body.addChild(sym);
    const label = new Text({ text: (this.vm.packLabel ?? "PACK").toUpperCase().replace(" PACK", ""), style: { fill: 0xffffff, fontSize: 7, fontFamily: PIXEL_FONT, align: "center", wordWrap: true, wordWrapWidth: w - 4 } });
    label.anchor.set(0.5, 1);
    label.position.set(0, h / 2 - 9);
    this.body.addChild(label);
  }

  private packGlyph(): string {
    switch (this.vm.kind) {
      case "relic": return "♛";
      case "tarot": return "☼";
      case "spectral": return "☾";
      case "style": return "⚒";
      default: return "♠";
    }
  }

  setHover(h: boolean): void {
    this.hovered = h;
  }

  update(dt: number, t: number): void {
    const targetLift = this.hovered ? 11 : 0;
    this.lift += (targetLift - this.lift) * Math.min(1, dt * 14);
    const bob = this.hovered ? 0 : Math.sin(t * 1.6 + this.phase) * 2;
    this.view.position.set(this.baseX, this.baseY - this.lift + bob);
    this.body.rotation = this.hovered ? 0 : Math.sin(t * 1.2 + this.phase) * 0.03;
    this.body.scale.set(this.hovered ? 1.16 : 1);
    this.shadow.scale.set(1 + this.lift * 0.02);
    if (this.sheen) {
      // sweep the highlight across every ~2.4s
      const p = ((t * 0.42 + this.phase) % 1.6) / 1.6; // 0..1 with a pause
      this.sheen.x = -CARD_W / 2 - 8 + p * (CARD_W + 16);
      this.sheen.alpha = p < 1 ? 1 : 0;
    }
  }

  destroy(): void {
    this.view.destroy({ children: true });
  }
}

// A flat tray control button (reroll / remove / next-fight).
class ShopButton {
  readonly view = new Container();
  private g = new Graphics();
  private hovered = false;
  constructor(
    label: string,
    private w: number,
    private accent: number,
    public enabled: boolean,
    private onTap: () => void,
  ) {
    this.view.addChild(this.g);
    const t = new Text({ text: label, style: { fill: enabled ? 0xffffff : THEME.frameDim, fontSize: 8, fontFamily: PIXEL_FONT, align: "center" } });
    t.anchor.set(0.5);
    this.view.addChild(t);
    this.draw();
    this.view.eventMode = "static";
    this.view.cursor = enabled ? "pointer" : "default";
    this.view.on("pointertap", () => this.enabled && this.onTap());
    this.view.on("pointerover", () => { this.hovered = true; this.draw(); });
    this.view.on("pointerout", () => { this.hovered = false; this.draw(); });
  }
  private draw(): void {
    const h = 22;
    this.g.clear();
    this.g
      .roundRect(-this.w / 2, -h / 2, this.w, h, 6)
      .fill({ color: this.enabled ? (this.hovered ? 0x2a1d12 : 0x1a1220) : 0x14101a })
      .stroke({ width: 2, color: this.enabled ? this.accent : THEME.frameDim });
  }
  destroy(): void {
    this.view.destroy({ children: true });
  }
}

export class ShopStage {
  readonly app: Application;
  onBuy?: (vm: ShopItemVM) => void;
  onReroll?: () => void;
  onRemove?: () => void;
  onNextFight?: () => void;
  onHover?: (vm: ShopItemVM | null, screen: { x: number; y: number } | null) => void;

  private world = new Container();
  private plasma: PlasmaBackground;
  private deckPile = new Graphics();
  private deckSprite = new Sprite();
  private deckBackId?: string;
  private deckReady = false;
  private tray = new Container();
  private trayPanel = new Graphics();
  private nodeLayer = new Container();
  private btnLayer = new Container();
  private nodes: ShopNode[] = [];
  private buttons: ShopButton[] = [];
  private time = 0;
  private slide = 0;
  private destroyed = false;
  private tick = (t: { deltaMS: number }) => this.update(Math.min(t.deltaMS / 1000, 1 / 20));

  constructor(app: Application) {
    this.app = app;
    this.plasma = new PlasmaBackground({ displayWidth: SHOP_W, displayHeight: SHOP_H, palette: PLASMA_PALETTE, bufferWidth: 96, bufferHeight: 54, speed: 0.4, warp: 0.5 });
    app.stage.addChild(this.world);
    this.deckSprite.anchor.set(0.5);
    this.deckSprite.visible = false;
    this.deckSprite.roundPixels = true;
    this.tray.addChild(this.trayPanel, this.nodeLayer, this.btnLayer);
    this.world.addChild(this.plasma.view, this.buildFrame(), this.deckPile, this.deckSprite, this.tray);
    app.ticker.add(this.tick);
  }

  private buildFrame(): Container {
    const c = new Container();
    const o = new Graphics();
    o.roundRect(3, 3, SHOP_W - 6, SHOP_H - 6, 8).stroke({ width: 2, color: THEME.frameDim });
    c.addChild(o);
    return c;
  }

  private setDeckBack(id: string): void {
    if (id === this.deckBackId) return;
    this.deckBackId = id;
    this.deckReady = false;
    void Assets.load(`/art/decks/${id}.svg`)
      .then((tex: Texture) => {
        if (this.destroyed || this.deckBackId !== id) return;
        if (tex.source) tex.source.scaleMode = "nearest";
        this.deckSprite.texture = tex;
        this.deckReady = true;
      })
      .catch(() => {});
  }

  private drawDeck(count: number): void {
    const g = this.deckPile;
    g.clear();
    const w = 28;
    const h = 40;
    const layers = Math.max(2, Math.min(6, Math.ceil(count / 5)));
    let cx = DECK_X;
    let cy = DECK_Y;
    for (let i = 0; i < layers; i++) {
      cx = DECK_X - i * 1.2;
      cy = DECK_Y - i * 1.8;
      const ox = cx - w / 2;
      const oy = cy - h / 2;
      if (i < layers - 1) g.roundRect(ox, oy, w, h, 4).fill(0x5a0e1e).stroke({ width: 1, color: THEME.gold });
      else if (!this.deckReady) {
        g.roundRect(ox, oy, w, h, 4).fill(THEME.redDark).stroke({ width: 1.5, color: THEME.gold });
        g.poly([cx, oy + 10, cx + 6, oy + h / 2, cx, oy + h - 10, cx - 6, oy + h / 2]).fill(THEME.gold);
      } else g.roundRect(ox, oy, w, h, 4).fill(THEME.redDark).stroke({ width: 1.5, color: THEME.gold });
    }
    this.deckSprite.visible = this.deckReady && count > 0;
    if (this.deckSprite.visible) {
      this.deckSprite.position.set(cx, cy);
      this.deckSprite.width = w;
      this.deckSprite.height = h;
    }
  }

  setShop(vm: ShopVM): void {
    for (const n of this.nodes) (this.nodeLayer.removeChild(n.view), n.destroy());
    for (const b of this.buttons) (this.btnLayer.removeChild(b.view), b.destroy());
    this.nodes = [];
    this.buttons = [];
    this.slide = 0;

    this.setDeckBack(vm.deckId);
    this.drawDeck(vm.deckCount);
    this.drawTray();

    const need: { node: ShopNode; url: string }[] = [];
    const make = (item: ShopItemVM) => {
      const n = new ShopNode(item, (node, url) => need.push({ node, url }));
      n.view.on("pointertap", () => this.onBuy?.(item));
      n.view.on("pointerover", () => {
        n.setHover(true);
        this.reportHover(n.view, item);
      });
      n.view.on("pointerout", () => {
        n.setHover(false);
        this.onHover?.(null, null);
      });
      this.nodeLayer.addChild(n.view);
      this.nodes.push(n);
      return n;
    };

    const row = (items: ShopItemVM[], y: number, gap: number) => {
      const span = (items.length - 1) * gap;
      items.forEach((item, i) => {
        const n = make(item);
        n.baseX = TRAY_X + TRAY_W / 2 - span / 2 + i * gap;
        n.baseY = y;
        n.view.position.set(n.baseX, n.baseY);
      });
    };
    // packs across the top of the tray; wares + edicts share the next row
    row(vm.packs, TRAY_TOP + 48, 64);
    row([...vm.wares, ...vm.edicts], TRAY_TOP + 124, 60);

    // control buttons along the tray's bottom
    const by = TRAY_BOT - 16;
    const addBtn = (label: string, x: number, w: number, accent: number, enabled: boolean, fn: () => void) => {
      const b = new ShopButton(label, w, accent, enabled, fn);
      b.view.position.set(x, by);
      this.btnLayer.addChild(b.view);
      this.buttons.push(b);
    };
    addBtn(`⟳ REROLL ◆${vm.rerollCost}`, TRAY_X + 64, 116, THEME.gold, vm.gold >= vm.rerollCost, () => this.onReroll?.());
    addBtn(`✂ REMOVE ◆${vm.removeCost}`, TRAY_X + 190, 116, 0x6fc0e0, vm.gold >= vm.removeCost, () => this.onRemove?.());
    addBtn("NEXT FIGHT →", TRAY_X + TRAY_W - 70, 120, 0xc0273f, true, () => this.onNextFight?.());

    for (const { node, url } of need) {
      void Assets.load(url)
        .then((tex: Texture) => {
          if (!this.destroyed) node.setTexture(tex);
        })
        .catch(() => {});
    }
  }

  private reportHover(view: Container, item: ShopItemVM): void {
    const g = view.getGlobalPosition();
    const rect = this.app.canvas.getBoundingClientRect();
    const sx = rect.left + (g.x / SHOP_W) * rect.width;
    const sy = rect.top + (g.y / SHOP_H) * rect.height;
    this.onHover?.(item, { x: sx, y: sy });
  }

  private drawTray(): void {
    const g = this.trayPanel;
    g.clear();
    // a heavy iron-and-wood tray with a gilded lip
    g.roundRect(TRAY_X, TRAY_TOP, TRAY_W, TRAY_BOT - TRAY_TOP + 8, 12).fill({ color: 0x140d1c, alpha: 0.96 }).stroke({ width: 3, color: THEME.frame });
    g.roundRect(TRAY_X + 4, TRAY_TOP + 4, TRAY_W - 8, TRAY_BOT - TRAY_TOP, 10).stroke({ width: 1, color: THEME.frameDim });
    // a lip highlight at the top edge
    g.roundRect(TRAY_X + 8, TRAY_TOP + 6, TRAY_W - 16, 4, 2).fill({ color: 0xffffff, alpha: 0.08 });
  }

  private update(dt: number): void {
    this.time += dt;
    this.plasma.update(dt);
    this.slide = Math.min(1, this.slide + dt * 2.6);
    const ease = 1 - Math.pow(1 - this.slide, 3);
    // the tray rises from below the felt
    this.tray.y = (1 - ease) * (TRAY_BOT - TRAY_TOP + 30);
    this.tray.alpha = Math.min(1, ease * 1.4);
    for (const n of this.nodes) n.update(dt, this.time);
  }

  destroy(): void {
    this.destroyed = true;
    this.app.ticker.remove(this.tick);
    for (const n of this.nodes) n.destroy();
    for (const b of this.buttons) b.destroy();
    this.plasma.destroy();
    this.world.destroy({ children: true });
  }
}
