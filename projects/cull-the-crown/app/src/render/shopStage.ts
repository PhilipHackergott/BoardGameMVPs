// The "Black Market" rendered as a TRAY that slides partway up over the unchanged battle felt
// (Balatro's shop). The felt (living plasma + gilded frame + the draw pile) stays exactly as it is in
// combat; a physical wooden/iron tray rises from the bottom holding the offerings in three labelled
// sections — CARDS (single wares), EDICTS (illustrated decrees) and BOOSTER PACKS (classic crimped,
// shiny foil wrappers). A left control column holds Next Fight / Reroll and a flippable Remove coin.
// Pure presentation: consumes a ShopVM, emits intents via callbacks; the engine/store own all state.

import { Application, Assets, Container, Graphics, Sprite, Text, Texture } from "pixi.js";
import { PlasmaBackground } from "../fx";
import { PIXEL_FONT, PLASMA_PALETTE, SUIT_GLYPH, suitInkColor, THEME, TITLE_FONT } from "./theme";
import { Suit } from "../engine/types";

export const SHOP_W = 480;
export const SHOP_H = 360;

const CARD_W = 44;
const CARD_H = 62;
const PACK_W = 50;
const PACK_H = 70;

// the tray (centred, leaving the draw pile visible at bottom-right and the joker/pouch band up top)
const TRAY_X = 14;
const TRAY_W = 396;
const TRAY_TOP = 114;
const TRAY_BOT = 352;
const DECK_X = SHOP_W - 30;
const DECK_Y = SHOP_H - 60;

// internal zones
const CTRL_X = TRAY_X + 44; // left control column centre
const CONTENT_X0 = TRAY_X + 88; // content area (right of the control column)
const CONTENT_X1 = TRAY_X + TRAY_W - 8;
const CONTENT_CX = (CONTENT_X0 + CONTENT_X1) / 2;
const SPLIT_X = CONTENT_X0 + 104; // divider between the EDICT zone (left) and the PACKS zone (right)
const EDICT_CX = (CONTENT_X0 + SPLIT_X) / 2;
const PACKS_CX = (SPLIT_X + CONTENT_X1) / 2 + 4;
const ROW_CARDS_Y = TRAY_TOP + 60;
const ROW_BOTTOM_Y = TRAY_TOP + 158;
const DIVIDER_Y = TRAY_TOP + 102;

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
  packSize?: string; // S / M / L / XL — shown as a corner badge on the wrapper
  shimmer?: boolean; // shiny surface (packs, edicts)
  tipType?: string;
  rarity?: string; // joker rarity (common/uncommon/rare) — drives the tooltip rarity chip
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

// lighten/darken an 0xRRGGBB colour toward white/black (amt -1..1)
function shade(color: number, amt: number): number {
  const r = (color >> 16) & 0xff, g = (color >> 8) & 0xff, b = color & 0xff;
  const f = (c: number) => Math.max(0, Math.min(255, amt >= 0 ? c + (255 - c) * amt : c * (1 + amt)));
  return (f(r) << 16) | (f(g) << 8) | f(b);
}

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
  readonly w: number; // card/pack width in stage units (used to report the hover rect)
  readonly h: number;

  constructor(vm: ShopItemVM, onTextureNeeded: (n: ShopNode, url: string) => void) {
    this.vm = vm;
    this.w = vm.group === "pack" ? PACK_W : CARD_W;
    this.h = vm.group === "pack" ? PACK_H : CARD_H;
    this.shadow.ellipse(0, this.h / 2 + 8, this.w * 0.5, 6).fill({ color: 0x000000, alpha: 0.4 });
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
    plaque.roundRect(-21, this.h / 2 + 1, 42, 15, 5).fill({ color: 0x0d0712, alpha: 0.92 }).stroke({ width: 1.5, color: vm.affordable ? THEME.gold : THEME.frameDim });
    const price = new Text({ text: `◆${vm.price}`, style: { fill: vm.affordable ? THEME.goldBright : THEME.frameDim, fontSize: 9, fontFamily: PIXEL_FONT } });
    price.anchor.set(0.5);
    price.position.set(0, this.h / 2 + 8);
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
    sheen.rect(-10, -this.h, 14, this.h * 2).fill({ color: 0xffffff, alpha: 0.5 });
    sheen.rotation = -0.5;
    const mask = new Graphics();
    mask.roundRect(-this.w / 2, -this.h / 2, this.w, this.h, 5).fill(0xffffff);
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

  // A classic foil booster: crimped (serrated) heat-seals top & bottom, a holographic body and a
  // bright, glowing illustration medallion — reads as a real wrapper, not a flat ticket.
  private drawPack(): void {
    const tint = PACK_TINT[this.vm.kind] ?? 0x7a4bb0;
    const w = PACK_W, h = PACK_H;
    const bodyTop = -h / 2 + 9;
    const bodyBot = h / 2 - 9;
    const g = new Graphics();

    // drop shadow / dark backing
    g.roundRect(-w / 2 - 2, -h / 2 - 2, w + 4, h + 4, 4).fill(THEME.ink);

    // foil body
    g.rect(-w / 2, bodyTop, w, bodyBot - bodyTop).fill(tint);
    // holographic banding — diagonal light/dark sweeps fake the foil sheen
    g.poly([-w / 2, bodyTop, -w / 6, bodyTop, -w / 2, bodyBot]).fill({ color: shade(tint, 0.45), alpha: 0.5 });
    g.poly([w / 2, bodyTop, w / 2, bodyTop + (bodyBot - bodyTop) * 0.5, w / 6, bodyBot, w / 2, bodyBot]).fill({ color: shade(tint, -0.4), alpha: 0.45 });
    g.rect(-w / 2, bodyTop, w, 3).fill({ color: 0xffffff, alpha: 0.22 }); // top gloss line
    g.rect(-w / 2, bodyTop, w, bodyBot - bodyTop).stroke({ width: 1.5, color: shade(tint, 0.25) });

    // crimped heat-seals: a serrated band at top and bottom, in a lighter foil shade
    const seal = shade(tint, 0.3);
    const teeth = 11;
    const tw = w / teeth;
    const crimp = (edgeY: number, bandY: number) => {
      // zig-zag outer edge (edgeY) sealing back to the band (bandY)
      const pts: number[] = [-w / 2, bandY];
      for (let i = 0; i <= teeth; i++) {
        pts.push(-w / 2 + i * tw, edgeY + (i % 2 === 0 ? 0 : (bandY - edgeY) * 0.55));
      }
      pts.push(w / 2, bandY);
      g.poly(pts).fill(seal);
    };
    crimp(-h / 2, bodyTop + 1); // top seal
    crimp(h / 2, bodyBot - 1); // bottom seal
    g.rect(-w / 2, bodyTop, w, 1).fill({ color: 0x000000, alpha: 0.3 }); // seal/body seam
    g.rect(-w / 2, bodyBot - 1, w, 1).fill({ color: 0x000000, alpha: 0.3 });

    // glowing illustration medallion
    g.circle(0, -2, 15).fill({ color: 0xffffff, alpha: 0.16 });
    g.circle(0, -2, 12).fill(shade(tint, -0.55)).stroke({ width: 1.5, color: THEME.goldBright });
    g.circle(-4, -6, 3).fill({ color: 0xffffff, alpha: 0.5 }); // specular highlight
    this.body.addChild(g);

    const sym = new Text({ text: this.packGlyph(), style: { fill: THEME.goldBright, fontSize: 15, fontFamily: PIXEL_FONT } });
    sym.anchor.set(0.5);
    sym.position.set(0, -2);
    this.body.addChild(sym);

    const label = new Text({ text: (this.vm.packLabel ?? "PACK").toUpperCase().replace(" PACK", ""), style: { fill: 0xffffff, fontSize: 7, fontFamily: PIXEL_FONT, align: "center", wordWrap: true, wordWrapWidth: w - 6 } });
    label.anchor.set(0.5, 1);
    label.position.set(0, bodyBot - 3);
    this.body.addChild(label);

    // size badge — a gold pill in the top-right corner of the wrapper (S / M / L / XL)
    if (this.vm.packSize) {
      const bw = this.vm.packSize.length > 1 ? 17 : 12;
      const bx = w / 2 - bw / 2 - 2;
      const by = bodyTop + 9;
      const badge = new Graphics();
      badge.roundRect(bx - bw / 2, by - 7, bw, 14, 4).fill(THEME.gold).stroke({ width: 1.5, color: shade(THEME.gold, -0.45) });
      this.body.addChild(badge);
      const st = new Text({ text: this.vm.packSize, style: { fill: 0x1a1020, fontSize: 8, fontFamily: PIXEL_FONT, fontWeight: "700" } });
      st.anchor.set(0.5);
      st.position.set(bx, by);
      this.body.addChild(st);
    }
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
      const p = ((t * 0.42 + this.phase) % 1.6) / 1.6; // 0..1 with a pause
      this.sheen.x = -this.w / 2 - 8 + p * (this.w + 16);
      this.sheen.alpha = p < 1 ? 1 : 0;
    }
  }

  destroy(): void {
    this.view.parent?.removeChild(this.view);
    this.view.destroy({ children: true });
  }
}

// A flat tray control button (reroll / next-fight).
class ShopButton {
  readonly view = new Container();
  private g = new Graphics();
  private hovered = false;
  constructor(
    label: string,
    private w: number,
    private h: number,
    private accent: number,
    public enabled: boolean,
    private onTap: () => void,
  ) {
    this.view.addChild(this.g);
    const t = new Text({ text: label, style: { fill: enabled ? 0xffffff : THEME.frameDim, fontSize: 8.5, fontFamily: PIXEL_FONT, align: "center", lineHeight: 11 } });
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
    this.g.clear();
    this.g
      .roundRect(-this.w / 2, -this.h / 2, this.w, this.h, 6)
      .fill({ color: this.enabled ? (this.hovered ? shade(this.accent, -0.6) : 0x1a1220) : 0x14101a })
      .stroke({ width: 2, color: this.enabled ? this.accent : THEME.frameDim });
  }
  destroy(): void {
    this.view.parent?.removeChild(this.view);
    this.view.destroy({ children: true });
  }
}

// The Remove control: a round gilded coin (✂ over a crest) that does a full flip when tapped, then
// fires the remove intent. Reads as "spend a coin to cull a card".
class CoinButton {
  readonly view = new Container();
  private face = new Container();
  private g = new Graphics();
  private flip = 0; // >0 while a flip animates (0..1)
  private hovered = false;
  enabled: boolean;
  constructor(price: number, enabled: boolean, private onTap: () => void) {
    this.enabled = enabled;
    this.face.addChild(this.g);
    const glyph = new Text({ text: "✂", style: { fill: enabled ? 0x1a1020 : THEME.frameDim, fontSize: 16, fontFamily: PIXEL_FONT } });
    glyph.anchor.set(0.5);
    glyph.position.set(0, -2);
    this.face.addChild(glyph);
    this.view.addChild(this.face);
    const cap = new Text({ text: `REMOVE ◆${price}`, style: { fill: enabled ? THEME.goldBright : THEME.frameDim, fontSize: 7.5, fontFamily: PIXEL_FONT } });
    cap.anchor.set(0.5);
    cap.position.set(0, 28);
    this.view.addChild(cap);
    this.draw();
    this.view.eventMode = "static";
    this.view.cursor = enabled ? "pointer" : "default";
    this.view.on("pointertap", () => {
      if (!this.enabled || this.flip > 0) return;
      this.flip = 0.0001; // start the flip; the intent fires at its midpoint
    });
    this.view.on("pointerover", () => { this.hovered = true; this.draw(); });
    this.view.on("pointerout", () => { this.hovered = false; this.draw(); });
  }
  private draw(): void {
    const r = 21;
    this.g.clear();
    const base = this.enabled ? (this.hovered ? THEME.goldBright : THEME.gold) : THEME.frameDim;
    this.g.circle(0, 2, r).fill({ color: 0x000000, alpha: 0.4 }); // shadow
    this.g.circle(0, 0, r).fill(base).stroke({ width: 2, color: shade(base, -0.4) });
    this.g.circle(0, 0, r - 4).stroke({ width: 1, color: shade(base, 0.4) }); // milled rim
  }
  update(dt: number): void {
    if (this.flip <= 0) return;
    const prev = this.flip;
    this.flip = Math.min(1, this.flip + dt * 2.4);
    this.face.scale.x = Math.abs(Math.cos(this.flip * Math.PI)); // 1 → 0 → 1 (a coin flip)
    if (prev < 0.5 && this.flip >= 0.5) this.onTap(); // fire at the edge-on midpoint
    if (this.flip >= 1) {
      this.flip = 0;
      this.face.scale.x = 1;
    }
  }
  destroy(): void {
    this.view.parent?.removeChild(this.view);
    this.view.destroy({ children: true });
  }
}

export class ShopStage {
  readonly app: Application;
  onBuy?: (vm: ShopItemVM) => void;
  onReroll?: () => void;
  onRemove?: () => void;
  onNextFight?: () => void;
  onHover?: (vm: ShopItemVM | null, rect: { left: number; right: number; top: number; height: number } | null) => void;

  private world = new Container();
  private plasma?: PlasmaBackground; // own felt — standalone mode only (embedded shares the host felt)
  private deckPile = new Graphics(); // empty-state / pre-texture fallback only
  private deckStack = new Container();
  private deckSprites: Sprite[] = [];
  private deckBackId?: string;
  private deckReady = false;
  private tray = new Container();
  private trayPanel = new Graphics();
  private labelLayer = new Container();
  private nodeLayer = new Container();
  private btnLayer = new Container();
  private nodes: ShopNode[] = [];
  private buttons: ShopButton[] = [];
  private coin?: CoinButton;
  private time = 0;
  private slide = 0;
  private destroyed = false;
  private embedded: boolean;
  private tick = (t: { deltaMS: number }) => this.update(Math.min(t.deltaMS / 1000, 1 / 20));

  // Standalone: `new ShopStage(app)` builds its own felt (plasma + frame + deck) and runs its own
  // ticker. Embedded: `new ShopStage(app, hostLayer)` renders ONLY the tray into hostLayer — the felt
  // (plasma/frame/deck) and the update tick are owned by the host CombatStage (the single-canvas shop).
  constructor(app: Application, root?: Container) {
    this.app = app;
    this.embedded = !!root;
    this.tray.addChild(this.trayPanel, this.labelLayer, this.nodeLayer, this.btnLayer);
    if (this.embedded) {
      root!.addChild(this.world);
      this.world.addChild(this.tray);
    } else {
      this.plasma = new PlasmaBackground({ displayWidth: SHOP_W, displayHeight: SHOP_H, palette: PLASMA_PALETTE, bufferWidth: 96, bufferHeight: 54, speed: 0.4, warp: 0.5 });
      app.stage.addChild(this.world);
      for (let i = 0; i < 6; i++) {
        const s = new Sprite();
        s.anchor.set(0.5);
        s.visible = false;
        s.roundPixels = true;
        this.deckSprites.push(s);
        this.deckStack.addChild(s);
      }
      this.world.addChild(this.plasma.view, this.buildFrame(), this.deckPile, this.deckStack, this.tray);
      app.ticker.add(this.tick);
    }
  }

  /** Replay the slide-up (call when the shop re-opens in embedded mode). */
  reset(): void {
    this.slide = 0;
  }

  /** Host-driven tick (embedded mode); standalone mode uses its own ticker. */
  tickEmbedded(dt: number): void {
    this.update(dt);
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
        for (const s of this.deckSprites) s.texture = tex;
        this.deckReady = true;
        this.drawDeck(this.lastDeckCount); // swap the fallback for the real backs immediately
      })
      .catch(() => {});
  }

  // The draw pile = a real stack of the deck's card-back models (no gold frame), fanned up-left.
  private lastDeckCount = 0;
  private drawDeck(count: number): void {
    this.lastDeckCount = count;
    const g = this.deckPile;
    g.clear();
    const w = 28, h = 40, dx = -1.2, dy = -1.8;
    const layers = count <= 0 ? 0 : Math.max(2, Math.min(this.deckSprites.length, Math.ceil(count / 5)));
    const useBack = this.deckReady && layers > 0;
    this.deckSprites.forEach((s, i) => {
      const on = useBack && i < layers;
      s.visible = on;
      if (on) {
        s.position.set(DECK_X + i * dx, DECK_Y + i * dy);
        s.width = w;
        s.height = h;
      }
    });
    // fallback while the back texture loads: dark stacked card edges (still no gold)
    if (!useBack && count > 0) {
      for (let i = 0; i < layers; i++) {
        const ox = DECK_X + i * dx - w / 2;
        const oy = DECK_Y + i * dy - h / 2;
        g.roundRect(ox, oy, w, h, 4).fill(THEME.redDark).stroke({ width: 1, color: 0x3a0a16 });
      }
    }
  }

  setShop(vm: ShopVM): void {
    for (const n of this.nodes) (this.nodeLayer.removeChild(n.view), n.destroy());
    for (const b of this.buttons) (this.btnLayer.removeChild(b.view), b.destroy());
    if (this.coin) { this.btnLayer.removeChild(this.coin.view); this.coin.destroy(); this.coin = undefined; }
    this.nodes = [];
    this.buttons = [];
    // NOTE: don't reset `slide` here — the tray slides up once when the shop opens; re-stocking it
    // after a purchase/reroll must NOT replay the slide (the stage is rebuilt fresh per shop visit).

    if (!this.embedded) {
      // standalone mode owns the felt's draw pile; embedded mode shares the host CombatStage's deck
      this.setDeckBack(vm.deckId);
      this.drawDeck(vm.deckCount);
    }
    this.drawTray(vm);

    const need: { node: ShopNode; url: string }[] = [];
    const make = (item: ShopItemVM) => {
      const n = new ShopNode(item, (node, url) => need.push({ node, url }));
      n.view.on("pointertap", () => this.onBuy?.(item));
      n.view.on("pointerover", () => {
        n.setHover(true);
        this.reportHover(n, item);
      });
      n.view.on("pointerout", () => {
        n.setHover(false);
        this.onHover?.(null, null);
      });
      this.nodeLayer.addChild(n.view);
      this.nodes.push(n);
      return n;
    };
    const layoutRow = (items: ShopItemVM[], cx: number, y: number, gap: number) => {
      const span = (items.length - 1) * gap;
      items.forEach((item, i) => {
        const n = make(item);
        n.baseX = cx - span / 2 + i * gap;
        n.baseY = y;
        n.view.position.set(n.baseX, n.baseY);
      });
    };

    // three labelled sections: CARDS (top), then EDICTS (bottom-left) + BOOSTER PACKS (bottom-right)
    layoutRow(vm.wares, CONTENT_CX, ROW_CARDS_Y, 56);
    layoutRow(vm.edicts, EDICT_CX, ROW_BOTTOM_Y, 52);
    layoutRow(vm.packs, PACKS_CX, ROW_BOTTOM_Y, 58);

    // left control column: Next Fight (top), Reroll (below), and the Remove coin beneath them
    const addBtn = (label: string, x: number, y: number, w: number, h: number, accent: number, enabled: boolean, fn: () => void) => {
      const b = new ShopButton(label, w, h, accent, enabled, fn);
      b.view.position.set(x, y);
      this.btnLayer.addChild(b.view);
      this.buttons.push(b);
    };
    addBtn("NEXT\nFIGHT →", CTRL_X, TRAY_TOP + 42, 78, 32, 0xc0273f, true, () => this.onNextFight?.());
    addBtn(`⟳ REROLL\n◆${vm.rerollCost}`, CTRL_X, TRAY_TOP + 86, 78, 28, 0x4fae7f, vm.gold >= vm.rerollCost, () => this.onReroll?.());
    this.coin = new CoinButton(vm.removeCost, vm.gold >= vm.removeCost, () => this.onRemove?.());
    this.coin.view.position.set(CTRL_X, TRAY_TOP + 148);
    this.btnLayer.addChild(this.coin.view);

    for (const { node, url } of need) {
      void Assets.load(url)
        .then((tex: Texture) => {
          if (!this.destroyed) node.setTexture(tex);
        })
        .catch(() => {});
    }
  }

  // Report the hovered ware's on-screen rectangle (centre + card size), so the tooltip can spawn beside
  // it rather than on top of it. The node's origin is its centre; w/h are stage units.
  private reportHover(node: ShopNode, item: ShopItemVM): void {
    const g = node.view.getGlobalPosition();
    const rect = this.app.canvas.getBoundingClientRect();
    const cx = rect.left + (g.x / SHOP_W) * rect.width;
    const cy = rect.top + (g.y / SHOP_H) * rect.height;
    const hw = (node.w / 2 / SHOP_W) * rect.width;
    const hh = (node.h / 2 / SHOP_H) * rect.height;
    this.onHover?.(item, { left: cx - hw, right: cx + hw, top: cy - hh, height: hh * 2 });
  }

  // the tray panel plus the section frames, labels and the control-column divider
  private drawTray(vm: ShopVM): void {
    const g = this.trayPanel;
    g.clear();
    // heavy iron-and-wood tray with a gilded lip
    g.roundRect(TRAY_X, TRAY_TOP, TRAY_W, TRAY_BOT - TRAY_TOP + 8, 12).fill({ color: 0x140d1c, alpha: 0.96 }).stroke({ width: 3, color: THEME.frame });
    g.roundRect(TRAY_X + 4, TRAY_TOP + 4, TRAY_W - 8, TRAY_BOT - TRAY_TOP, 10).stroke({ width: 1, color: THEME.frameDim });
    // control-column divider
    g.moveTo(CONTENT_X0 - 6, TRAY_TOP + 16).lineTo(CONTENT_X0 - 6, TRAY_BOT - 4).stroke({ width: 1, color: THEME.frameDim, alpha: 0.6 });
    // section panels (subtle insets)
    const panel = (x0: number, x1: number, y0: number, y1: number) =>
      g.roundRect(x0, y0, x1 - x0, y1 - y0, 7).fill({ color: 0x0e0814, alpha: 0.55 }).stroke({ width: 1, color: THEME.frameDim, alpha: 0.5 });
    panel(CONTENT_X0, CONTENT_X1, TRAY_TOP + 6, DIVIDER_Y - 4); // CARDS (label sits in the top blank space)
    panel(CONTENT_X0, SPLIT_X - 6, DIVIDER_Y + 4, TRAY_BOT - 2); // EDICTS
    panel(SPLIT_X + 2, CONTENT_X1, DIVIDER_Y + 4, TRAY_BOT - 2); // PACKS

    // labels
    this.labelLayer.removeChildren();
    const label = (text: string, x: number, y: number, anchor = 0.5) => {
      const t = new Text({ text, style: { fill: THEME.gold, fontSize: 7.5, fontFamily: PIXEL_FONT, letterSpacing: 1 } });
      t.anchor.set(anchor, 0.5);
      t.position.set(x, y);
      this.labelLayer.addChild(t);
    };
    label("CARDS FOR SALE", CONTENT_CX, TRAY_TOP + 17);
    label("EDICT", EDICT_CX, DIVIDER_Y + 12);
    label("BOOSTER PACKS", PACKS_CX, DIVIDER_Y + 12);
    if (vm.wares.length === 0) this.faint("— sold out —", CONTENT_CX, ROW_CARDS_Y);
    if (vm.edicts.length === 0) this.faint("none", EDICT_CX, ROW_BOTTOM_Y);
  }

  private faint(text: string, x: number, y: number): void {
    const t = new Text({ text, style: { fill: THEME.frameDim, fontSize: 8, fontFamily: PIXEL_FONT } });
    t.anchor.set(0.5);
    t.position.set(x, y);
    this.labelLayer.addChild(t);
  }

  private update(dt: number): void {
    this.time += dt;
    this.plasma?.update(dt);
    this.slide = Math.min(1, this.slide + dt * 2.6);
    const ease = 1 - Math.pow(1 - this.slide, 3);
    // the tray rises from below the felt
    this.tray.y = (1 - ease) * (TRAY_BOT - TRAY_TOP + 30);
    this.tray.alpha = Math.min(1, ease * 1.4);
    for (const n of this.nodes) n.update(dt, this.time);
    this.coin?.update(dt);
  }

  destroy(): void {
    this.destroyed = true;
    if (!this.embedded) this.app.ticker.remove(this.tick);
    for (const n of this.nodes) n.destroy();
    for (const b of this.buttons) b.destroy();
    this.coin?.destroy();
    this.plasma?.destroy();
    this.world.destroy({ children: true });
  }
}
