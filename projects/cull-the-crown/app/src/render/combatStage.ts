// The Pixi combat board for Cull the Crown — an 8-bit arcade medieval scene with 2.5D feel and a
// responsive, juicy combat loop: a living plasma backdrop, a gilded frame, a pixel-art royal that
// floats on a lit dais and reacts to hits (flash + recoil) and strikes back (lunge + red flash),
// real deck/discard piles that cards deal from and fly into, and a resolution cascade. Renders at a
// low logical resolution upscaled nearest-neighbour. Consumes a plain view-model + typed FX events.

import { Application, Assets, Container, Graphics, Sprite, Text, Texture } from "pixi.js";
import { Particles, PlasmaBackground, Pops, Shake, Spring } from "../fx";
import { clamp01 } from "../fx/easing";
import { Card, ResolutionResult, Suit, SUIT_NAME } from "../engine/types";
import { sfx } from "../audio/chiptune";
import { CardNode, cardSignature } from "./cardNode";
import { KILL_FX, PIXEL_FONT, PLASMA_PALETTE, SUIT_COLOR, SUIT_GLYPH, SUIT_ROYAL, suitInkColor, THEME, TITLE_FONT } from "./theme";

export interface EnemyVM {
  tier: string;
  maxHealth: number;
  damageTaken: number;
  attack: number;
  shield: number;
  immuneSuit: Suit;
}
export interface CombatVM {
  hand: Card[];
  selectedIds: string[];
  subphase: "play" | "defend";
  enemy: EnemyVM;
  incoming: number;
  deckCount: number;
  discardCount: number;
  deckId: string; // the chosen starting deck — selects the card-back art for the draw pile
  lastDiscard?: { suit: Suit | null; value: number; kind: string } | null;
}

export type ExitMode = "toEnemy" | "toDiscard";

export const STAGE_W = 480;
export const STAGE_H = 360; // taller 4:3 felt (Balatro-style) — fills the play-field column far better than 16:9
const ENEMY_X = STAGE_W / 2;
const ENEMY_Y = 86;
const HAND_Y = STAGE_H - 52;
const HP_W = 156;
const DECK_X = STAGE_W - 34; // deck pile, bottom-right
const DISCARD_X = STAGE_W - 34; // used pile shares the deck's column, stacked above it
const PILE_Y = HAND_Y + 2; // deck pile y
const DISCARD_Y = PILE_Y - 58; // discard pile sits above the deck (Balatro)
const PLAY_ZONE_Y = 236; // release a dragged card above this (toward the enemy) to play it
const PLAY_REST_Y = 178; // played cards lift to this centre row and rest there while the play scores
const PLAY_FX_X = STAGE_W / 2; // resolution numbers pop off the played cards in the centre
const PLAY_FX_Y = PLAY_REST_Y - 46;

export class CombatStage {
  readonly app: Application;
  onCardTap?: (id: string) => void;
  onCardPlay?: (id: string) => void;
  onCardBlock?: (id: string) => void;
  onDeckClick?: () => void;
  onDiscardClick?: () => void;
  onDeckHover?: (over: boolean) => void;
  onHover?: (id: string | null) => void;
  private deckHovered = false;

  private world = new Container();
  private plasma: PlasmaBackground;
  private enemyLayer = new Container();
  private handLayer = new Container();
  private pileLayer = new Container();
  private particles = new Particles();
  private pops = new Pops();
  private shake = new Shake({ maxOffset: 14, maxRotation: 0.035 });

  private cards = new Map<string, CardNode>();
  private exiting: CardNode[] = [];
  private exitMode: ExitMode = "toDiscard";
  private pointer = { x: STAGE_W / 2, y: STAGE_H };
  private dragCard: CardNode | null = null;
  private dragGroup: CardNode[] = []; // when dragging a selected card, the whole combo moves with it
  private hoverId: string | null = null;
  private dragStartX = 0;
  private dragStartY = 0;
  private dragMoved = false;
  private subphase: "play" | "defend" = "play";
  private prevHandCount = 0; // for the deal-in riffle on a fresh hand
  private slash = new Graphics();
  private slashAlpha = 0;
  private time = 0;
  private clock = 0;
  private timers: { at: number; fn: () => void }[] = [];

  private hpFrac = new Spring(1, { stiffness: 90, damping: 16 });
  private hpFill = new Graphics();
  private shieldBadge = new Container(); // "block" indicator on the enemy (DEF), pulses/flashes
  private shieldG = new Graphics();
  private shieldText!: Text;
  private shieldPulse = 0; // gain animation
  private shieldFlash = 0; // absorb animation
  private curShield = 0;
  private tierText!: Text;
  private statsText!: Text;
  private immunityText!: Text;
  private immunityPill = new Graphics();
  private crownGlyph!: Text;
  private crestGlyph!: Text; // large heraldic suit emblem behind the royal
  private incomingText!: Text;
  private enemyBody = new Container();
  private auraG = new Graphics(); // suit-coloured glow behind the royal
  private royal = new Container();
  private headG = new Graphics();
  private crownG = new Graphics();
  private royalSuit: Suit | null = null;
  private royalFlash!: Graphics;
  private hitX = new Spring(0, { stiffness: 120, damping: 9 });
  private hitY = new Spring(0, { stiffness: 120, damping: 9 });
  private flashAlpha = 0;
  private redAlpha = 0;
  private royalAlpha = 1;
  private royalDying = false;
  private redFlash = new Graphics();

  private deckPile = new Graphics();
  private discardPile = new Graphics();
  private deckSprite = new Sprite(); // the chosen deck's real card-back art, drawn as the top of the draw pile
  private deckBackId?: string; // which deck's back is currently loaded
  private deckSpriteReady = false;
  private destroyed = false;
  private deckText!: Text;
  private discardText!: Text;
  private discardGlyph!: Text; // the face-up last-discarded card's suit
  private discardVal!: Text; // …and its rank, in the corner

  private tick = (t: { deltaMS: number }) => this.update(Math.min(t.deltaMS / 1000, 1 / 20));

  constructor(app: Application) {
    this.app = app;
    this.plasma = new PlasmaBackground({
      displayWidth: STAGE_W,
      displayHeight: STAGE_H,
      palette: PLASMA_PALETTE,
      bufferWidth: 96,
      bufferHeight: 54,
      speed: 0.5,
      warp: 0.55,
    });
    app.stage.addChild(this.world);
    this.redFlash.rect(0, 0, STAGE_W, STAGE_H).fill(0xc0273f);
    this.redFlash.alpha = 0;
    this.world.addChild(
      this.plasma.view,
      this.buildOverlay(),
      this.enemyLayer,
      this.pileLayer,
      this.particles.layer,
      this.handLayer,
      this.pops.layer,
      this.slash,
      this.redFlash,
    );
    this.buildEnemy();
    this.buildPiles();
    this.handLayer.sortableChildren = true; // let a dragged card rise above the rest

    // Input is handled here at the stage level with explicit geometry (Pixi per-card hit-testing
    // proved unreliable through the nested layers + CSS-upscaled canvas). The stage is the pointer
    // target everywhere; we find the topmost card under the pointer ourselves.
    app.stage.eventMode = "static";
    app.stage.on("globalpointermove", (e) => {
      this.pointer.x = e.global.x;
      this.pointer.y = e.global.y;
      if (this.dragCard) {
        if (Math.hypot(e.global.x - this.dragStartX, e.global.y - this.dragStartY) > 6) this.dragMoved = true;
      } else {
        const top = this.topCardAt(e.global.x, e.global.y);
        for (const n of this.cards.values()) n.hovered = n === top;
        const hid = top ? top.card.id : null;
        if (hid !== this.hoverId) {
          this.hoverId = hid;
          this.onHover?.(hid);
        }
        // hovering the draw pile shows the "remaining cards" peek table
        const overDeck = Math.abs(e.global.x - DECK_X) < 18 && Math.abs(e.global.y - PILE_Y) < 30;
        if (overDeck !== this.deckHovered) {
          this.deckHovered = overDeck;
          this.onDeckHover?.(overDeck);
        }
      }
    });
    app.stage.on("pointerdown", (e) => {
      const px = e.global.x;
      const py = e.global.y;
      // pile clicks (inspect composition) take priority — they don't overlap the hand
      if (Math.abs(px - DECK_X) < 18 && Math.abs(py - PILE_Y) < 30) {
        this.onDeckClick?.();
        return;
      }
      if (Math.abs(px - DISCARD_X) < 18 && Math.abs(py - DISCARD_Y) < 28) {
        this.onDiscardClick?.();
        return;
      }
      const top = this.topCardAt(e.global.x, e.global.y);
      if (!top) return;
      sfx.hold(); // picked up a card
      // grabbing a selected card grabs the whole selection (combo) — they all move together
      const selected = [...this.cards.values()].filter((n) => n.selected && !n.exiting);
      this.dragGroup = top.selected && selected.length > 1 ? selected : [top];
      this.dragCard = top;
      this.dragStartX = e.global.x;
      this.dragStartY = e.global.y;
      this.dragMoved = false;
      const n = this.dragGroup.length;
      this.dragGroup.forEach((node, i) => {
        // single card: follow at grab offset. combo: converge + fan tightly around the cursor.
        const converge = n > 1 ? { dx: (i - (n - 1) / 2) * 15, dy: -Math.abs(i - (n - 1) / 2) * 4 } : undefined;
        node.beginDrag(e.global.x, e.global.y, converge);
      });
    });
    const endDrag = (e: { global: { x: number; y: number } }) => {
      const c = this.dragCard;
      if (!c) return;
      const group = this.dragGroup;
      this.dragCard = null;
      this.dragGroup = [];
      group.forEach((n) => n.endDrag());
      if (!this.dragMoved) {
        this.onCardTap?.(c.card.id);
        return;
      }
      if (e.global.y < PLAY_ZONE_Y) {
        // drag up = "use it": attack in play, throw it onto the block in defend
        if (this.subphase === "defend") this.onCardBlock?.(c.card.id);
        else this.onCardPlay?.(c.card.id);
      }
    };
    app.stage.on("pointerup", endDrag);
    app.stage.on("pointerupoutside", endDrag);
    app.ticker.add(this.tick);
  }

  private after(delay: number, fn: () => void): void {
    this.timers.push({ at: this.clock + delay, fn });
  }

  /** Set a Text's content only when it changed — avoids re-rasterising the glyph texture every sync. */
  private setText(t: Text, v: string): void {
    if (t.text !== v) t.text = v;
  }

  private buildOverlay(): Container {
    const c = new Container();
    const o = new Graphics();
    o.rect(0, 0, STAGE_W, STAGE_H).fill({ color: THEME.ink, alpha: 0.32 });
    o.roundRect(8, HAND_Y - 32, STAGE_W - 16, STAGE_H - (HAND_Y - 32) - 8, 8).fill({ color: THEME.ink, alpha: 0.42 });
    o.roundRect(3, 3, STAGE_W - 6, STAGE_H - 6, 8).stroke({ width: 2, color: THEME.frameDim });
    o.roundRect(6, 6, STAGE_W - 12, STAGE_H - 12, 6).stroke({ width: 1, color: THEME.frame });
    c.addChild(o);
    return c;
  }

  private buildEnemy(): void {
    const v = this.enemyBody;
    v.position.set(ENEMY_X, ENEMY_Y);
    // The royal (portrait + HP + stats) now lives in the DOM sidebar (Balatro's "blind"). The felt
    // keeps (ENEMY_X, ENEMY_Y) only as the anchor where played cards resolve and damage/FX pop, so
    // the character itself is hidden here.
    v.visible = false;
    this.enemyLayer.addChild(v);

    const dais = new Graphics();
    dais.ellipse(0, 40, 52, 12).fill({ color: 0x000000, alpha: 0.4 });
    dais.ellipse(0, 34, 46, 11).fill(THEME.stone).stroke({ width: 2, color: THEME.ink });
    dais.ellipse(0, 31, 46, 11).fill(THEME.stoneLite);
    v.addChild(this.auraG, dais); // aura sits behind everything

    // large heraldic suit emblem behind the royal — set per suit in drawRoyal()
    this.crestGlyph = new Text({ text: "", style: { fontSize: 80, fontFamily: PIXEL_FONT } });
    this.crestGlyph.anchor.set(0.5);
    this.crestGlyph.position.set(0, 2);
    v.addChild(this.crestGlyph);

    const royal = this.royal;
    // headG/crownG are redrawn per suit in drawRoyal() so each opponent set reads as its suit.
    this.crownGlyph = new Text({ text: "", style: { fontSize: 12, fontFamily: PIXEL_FONT, fontWeight: "700" } });
    this.crownGlyph.anchor.set(0.5);
    this.crownGlyph.position.set(0, -33);
    this.royalFlash = new Graphics();
    this.royalFlash.roundRect(-24, -32, 48, 58, 4).fill(0xffffff);
    this.royalFlash.alpha = 0;
    royal.addChild(this.headG, this.crownG, this.crownGlyph, this.royalFlash);
    v.addChild(royal);

    this.tierText = new Text({ text: "", style: { fill: THEME.gold, fontSize: 16, fontFamily: TITLE_FONT, letterSpacing: 1 } });
    this.tierText.anchor.set(0.5);
    this.tierText.position.set(0, 56);

    const hpBg = new Graphics();
    hpBg.roundRect(-HP_W / 2, 70, HP_W, 12, 3).fill(0x2a141c).stroke({ width: 1, color: THEME.frameDim });
    this.hpFill.position.set(-HP_W / 2, 70);

    this.statsText = new Text({ text: "", style: { fill: THEME.parchmentLite, fontSize: 9, fontFamily: PIXEL_FONT } });
    this.statsText.anchor.set(0.5);
    this.statsText.position.set(0, 92);

    this.immunityText = new Text({ text: "", style: { fill: THEME.blood, fontSize: 9, fontFamily: PIXEL_FONT, fontWeight: "700" } });
    this.immunityText.anchor.set(0.5);
    this.immunityText.position.set(0, 108);
    this.immunityPill.position.set(0, 108);

    this.incomingText = new Text({
      text: "",
      style: { fill: THEME.blood, fontSize: 14, fontFamily: TITLE_FONT, stroke: { color: 0x000000, width: 3 } },
    });
    this.incomingText.anchor.set(0.5);
    this.incomingText.position.set(0, -52);

    // "block" badge (DEF) — a shield that appears, pulses on gain, flashes when it absorbs a blow
    this.shieldText = new Text({ text: "", style: { fill: 0xe6d8ff, fontSize: 11, fontFamily: PIXEL_FONT, fontWeight: "700" } });
    this.shieldText.anchor.set(0, 0.5);
    this.shieldText.position.set(10, 0);
    this.shieldBadge.addChild(this.shieldG, this.shieldText);
    this.shieldBadge.position.set(HP_W / 2 + 18, 76);
    this.shieldBadge.visible = false;

    v.addChild(this.tierText, hpBg, this.hpFill, this.shieldBadge, this.statsText, this.immunityPill, this.immunityText, this.incomingText);
  }

  /** Re-skin the royal for its suit: a big heraldic emblem behind it, a tinted head, suit-coloured
   *  eyes, and a suit-specific crown — so each opponent reads as its suit at a glance. */
  private drawRoyal(suit: Suit): void {
    const r = SUIT_ROYAL[suit];
    const sc = SUIT_COLOR[suit];
    // suit-coloured aura bathing the royal — the strongest at-a-glance "who am I fighting" signal
    this.auraG.clear();
    this.auraG.circle(0, 4, 66).fill({ color: sc, alpha: 0.16 });
    this.auraG.circle(0, 4, 44).fill({ color: sc, alpha: 0.16 });
    this.crestGlyph.text = SUIT_GLYPH[suit];
    this.crestGlyph.style.fill = sc;
    this.crestGlyph.alpha = 0.6;
    const h = this.headG;
    h.clear();
    h.roundRect(-22, -18, 44, 42, 4).fill(r.skin).stroke({ width: 2, color: THEME.ink });
    h.roundRect(-22, 14, 44, 10, 4).fill({ color: r.skinDark, alpha: 0.7 }); // jaw shading
    h.rect(-13, -4, 8, 8).fill(r.eye); // eyes
    h.rect(5, -4, 8, 8).fill(r.eye);
    h.rect(-10, 12, 20, 3).fill(THEME.ink); // mouth

    const c = this.crownG;
    c.clear();
    const cs = { width: 2, color: THEME.frameDim };
    c.rect(-24, -30, 48, 10).fill(r.crown).stroke(cs); // band
    if (r.merlon === "round") {
      for (const cx of [-17, 0, 17]) c.circle(cx, -32, 6).fill(r.crown).stroke(cs);
    } else if (r.merlon === "notch") {
      for (const cx of [-21, -5, 11]) c.poly([cx, -30, cx + 7, -41, cx + 14, -30]).fill(r.crown).stroke(cs);
    } else if (r.merlon === "trefoil") {
      for (const cx of [-17, 0, 17]) {
        c.circle(cx, -34, 4).fill(r.crown).stroke(cs);
        c.circle(cx - 5, -30, 3.5).fill(r.crown).stroke(cs);
        c.circle(cx + 5, -30, 3.5).fill(r.crown).stroke(cs);
      }
    } else {
      for (const cx of [-22, -6, 10]) c.poly([cx, -30, cx + 6, -47, cx + 12, -30]).fill(r.crown).stroke(cs);
    }
  }

  private buildPiles(): void {
    const mk = (label: string, x: number): Text => {
      const t = new Text({ text: label, style: { fill: THEME.parchmentEdge, fontSize: 7, fontFamily: PIXEL_FONT } });
      t.anchor.set(0.5);
      t.position.set(x, PILE_Y + 30);
      return t;
    };
    this.deckText = mk("DECK 0", DECK_X);
    this.deckText.position.set(DECK_X, PILE_Y + 26);
    this.discardText = mk("USED 0", DISCARD_X);
    this.discardText.position.set(DISCARD_X, DISCARD_Y - 28);
    // the face-up last-discarded card on top of the used pile
    this.discardGlyph = new Text({ text: "", style: { fontSize: 20, fontFamily: PIXEL_FONT } });
    this.discardGlyph.anchor.set(0.5);
    this.discardVal = new Text({ text: "", style: { fontSize: 10, fontFamily: PIXEL_FONT, fontWeight: "700" } });
    this.discardVal.anchor.set(0, 0);
    // the real deck-back sprite sits on top of the draw-pile stack (loaded lazily per deck)
    this.deckSprite.anchor.set(0.5);
    this.deckSprite.visible = false;
    this.deckSprite.roundPixels = true;
    // deckPile (under-card edges) → deckSprite (top back) → discard stack/glyphs → counts
    this.pileLayer.addChild(this.deckPile, this.deckSprite, this.discardPile, this.discardGlyph, this.discardVal, this.deckText, this.discardText);
  }

  /** Load the chosen deck's card-back art once, then show it as the top of the draw pile. */
  private setDeckBack(id: string): void {
    if (id === this.deckBackId) return;
    this.deckBackId = id;
    this.deckSpriteReady = false;
    void Assets.load(`/art/decks/${id}.svg`)
      .then((tex: Texture) => {
        if (this.destroyed || this.deckBackId !== id) return; // stage gone or deck changed mid-load
        // render crisp pixel-art (nearest-neighbour) so the back reads as part of the Pixi scene,
        // not a smoothed image sprite
        if (tex.source) tex.source.scaleMode = "nearest";
        this.deckSprite.texture = tex;
        this.deckSpriteReady = true;
      })
      .catch(() => {
        /* keep the procedural card-back if the art can't be loaded */
      });
  }

  // Draw a stack that reads as a real pile of cards — several card edges fanned up-left, topped by a
  // full card. `top` picks the top-card face: the deck's procedural card-back, a plain base (covered
  // by the real deck-back sprite), or the parchment face of the discard. Returns the top card's centre
  // so callers can place the deck-back sprite / discard glyphs on it.
  private drawStack(g: Graphics, x: number, y: number, count: number, top: "deckBack" | "plain" | "discard"): { cx: number; cy: number } {
    g.clear();
    const w = 30;
    const h = 44;
    if (count <= 0) {
      g.roundRect(x - w / 2, y - h / 2, w, h, 5).stroke({ width: 1, color: THEME.frameDim });
      return { cx: x, cy: y };
    }
    const parch = top === "discard";
    const edgeFill = parch ? THEME.parchmentEdge : 0x5a0e1e;
    const edgeLine = parch ? THEME.ink : THEME.gold;
    const layers = Math.max(2, Math.min(7, Math.ceil(count / 4))); // more cards → visibly taller pile
    const dx = -1.3; // fan up and slightly left for a 2.5D lean
    const dy = -2;
    let cx = x;
    let cy = y;
    for (let i = 0; i < layers; i++) {
      cx = x + i * dx;
      cy = y + i * dy;
      const ox = cx - w / 2;
      const oy = cy - h / 2;
      if (i < layers - 1) {
        // an under-card: just its body + outline, so the fanned edges show as a stack
        g.roundRect(ox, oy, w, h, 5).fill(edgeFill).stroke({ width: 1, color: edgeLine });
        continue;
      }
      // the top card
      if (top === "discard") {
        g.roundRect(ox, oy, w, h, 5).fill(THEME.parchment).stroke({ width: 1.5, color: THEME.ink });
      } else if (top === "plain") {
        g.roundRect(ox, oy, w, h, 5).fill(THEME.redDark).stroke({ width: 1.5, color: THEME.gold });
      } else {
        // procedural card-back fallback: inset frame + a gold heraldic diamond
        g.roundRect(ox, oy, w, h, 5).fill(THEME.redDark).stroke({ width: 1.5, color: THEME.gold });
        g.roundRect(ox + 3, oy + 3, w - 6, h - 6, 3).stroke({ width: 1, color: THEME.frame });
        g.poly([cx, oy + 12, cx + 7, oy + h / 2, cx, oy + h - 12, cx - 7, oy + h / 2]).fill(THEME.gold);
      }
    }
    return { cx, cy };
  }

  setExitMode(mode: ExitMode): void {
    this.exitMode = mode;
  }

  sync(vm: CombatVM): void {
    this.subphase = vm.subphase;
    const e = vm.enemy;
    this.setText(this.tierText, e.tier.toUpperCase());
    const hp = Math.max(0, e.maxHealth - e.damageTaken);
    this.hpFrac.to(clamp01(hp / e.maxHealth));
    this.setText(this.statsText, `${hp}/${e.maxHealth} HP   ATK ${e.attack}`);
    this.setText(this.incomingText, vm.subphase === "defend" ? `STRIKES ${vm.incoming}` : "");

    // block (DEF) badge — appears when shielded, pulses when gained
    if (e.shield > this.curShield) this.shieldPulse = 1;
    this.curShield = e.shield;
    this.shieldBadge.visible = e.shield > 0;
    if (e.shield > 0) {
      this.setText(this.shieldText, `${e.shield}`);
      this.shieldG.clear();
      this.shieldG.poly([0, -9, 9, -5, 9, 4, 0, 10, -9, 4, -9, -5]).fill(0x4a3a6a).stroke({ width: 2, color: 0xb070e0 });
    }

    // re-skin the royal for its suit (head/crown) only when it changes
    if (this.royalSuit !== e.immuneSuit) {
      this.drawRoyal(e.immuneSuit);
      this.royalSuit = e.immuneSuit;
    }

    // make the royal's immune suit unmistakable: crown jewel + a colour-coded pill
    const sc = SUIT_COLOR[e.immuneSuit];
    this.setText(this.crownGlyph, SUIT_GLYPH[e.immuneSuit]);
    this.crownGlyph.style.fill = sc;
    this.setText(this.immunityText, `DISABLES  ${SUIT_GLYPH[e.immuneSuit]} ${SUIT_NAME[e.immuneSuit].toUpperCase()}`);
    this.immunityText.style.fill = sc;
    const pw = this.immunityText.width + 20;
    this.immunityPill.clear();
    this.immunityPill.roundRect(-pw / 2, -9, pw, 18, 5).fill({ color: 0x140a12, alpha: 0.85 }).stroke({ width: 2, color: sc });
    if (e.damageTaken === 0) {
      this.royalAlpha = 1;
      this.royalDying = false;
    }

    // draw pile — the chosen deck's real card-back tops a fanned stack
    this.setDeckBack(vm.deckId);
    const useBack = this.deckSpriteReady && vm.deckCount > 0;
    const deckTop = this.drawStack(this.deckPile, DECK_X, PILE_Y, vm.deckCount, useBack ? "plain" : "deckBack");
    this.deckSprite.visible = useBack;
    if (useBack) {
      this.deckSprite.position.set(deckTop.cx, deckTop.cy);
      this.deckSprite.width = 30;
      this.deckSprite.height = 44;
    }
    // discard pile — a parchment stack showing the actual last-discarded card face-up on top
    const discTop = this.drawStack(this.discardPile, DISCARD_X, DISCARD_Y, vm.discardCount, "discard");
    this.setText(this.deckText, `DECK ${vm.deckCount}`);
    this.setText(this.discardText, `USED ${vm.discardCount}`);
    const last = vm.lastDiscard;
    this.discardGlyph.visible = !!last;
    this.discardVal.visible = !!last;
    if (last) {
      const ink = last.suit ? suitInkColor(last.suit) : THEME.violet;
      const glyph = last.kind === "jester" ? "★" : last.suit ? SUIT_GLYPH[last.suit] : "★";
      this.setText(this.discardGlyph, glyph);
      this.discardGlyph.style.fill = ink;
      this.discardGlyph.position.set(discTop.cx, discTop.cy);
      const rank = last.kind === "companion" ? "A" : last.kind === "jester" ? "J" : String(last.value);
      this.setText(this.discardVal, rank);
      this.discardVal.style.fill = ink;
      this.discardVal.position.set(discTop.cx - 13, discTop.cy - 21);
    }

    const handIds = new Set(vm.hand.map((c) => c.id));
    const leaving: CardNode[] = [];
    for (const [id, node] of this.cards) {
      if (!handIds.has(id)) {
        leaving.push(node);
        this.exiting.push(node);
        this.cards.delete(id);
      }
    }
    if (this.exitMode === "toEnemy") {
      // a play: the cards lift into the centre play row and rest there while the resolution scores,
      // then fly on to the used pile (Balatro's played hand).
      leaving.forEach((node, i) => {
        const lay = this.playRowLayout(i, leaving.length);
        node.playStage(lay.x, lay.y, lay.rot, 0.62, DISCARD_X, DISCARD_Y);
      });
    } else {
      // a discard / yield: thrown straight to the used pile
      for (const node of leaving) node.exit(DISCARD_X, DISCARD_Y);
    }
    vm.hand.forEach((card, i) => {
      let node = this.cards.get(card.id);
      if (node && node.sigStr !== cardSignature(card)) {
        // a tarot changed the card (suit / rank / sigil) — rebuild so the on-card mods show
        this.handLayer.removeChild(node.view);
        node.destroy();
        this.cards.delete(card.id);
        node = undefined;
      }
      if (!node) {
        node = new CardNode(card);
        node.spawnAt(DECK_X, PILE_Y); // deal in from the deck pile
        this.cards.set(card.id, node);
        this.handLayer.addChild(node.view);
      }
      node.selected = vm.selectedIds.includes(card.id);
      node.setImmune(card.suit === e.immuneSuit || card.extraSuit === e.immuneSuit);
      node.defendMode = vm.subphase === "defend";
      const layout = this.handLayout(i, vm.hand.length);
      node.setLayout(layout.x, layout.y, layout.rot);
    });

    // riffle as a fresh hand is dealt in (fight start) — the stage remounts per fight, so this
    // empty→full transition fires once at the deal, not on every draw (those sound via the cascade).
    if (this.prevHandCount === 0 && vm.hand.length > 0) sfx.draw(Math.min(5, vm.hand.length));
    this.prevHandCount = vm.hand.length;
  }

  /** Topmost (last-drawn) active card under a stage-space point. */
  private topCardAt(px: number, py: number): CardNode | null {
    let best: CardNode | null = null;
    let bestIdx = -1;
    for (const node of this.cards.values()) {
      if (node.exiting || !node.hitTest(px, py)) continue;
      const idx = this.handLayer.getChildIndex(node.view);
      if (idx > bestIdx) {
        bestIdx = idx;
        best = node;
      }
    }
    return best;
  }

  private handLayout(i: number, n: number): { x: number; y: number; rot: number } {
    const spacing = Math.min(42, 300 / Math.max(1, n));
    const totalW = spacing * (n - 1);
    const x = STAGE_W / 2 - totalW / 2 + i * spacing;
    const t = n > 1 ? i / (n - 1) - 0.5 : 0;
    const rot = t * 0.14;
    const y = HAND_Y + t * t * 16;
    return { x, y, rot };
  }

  // A small fan centred on the felt where played cards rest while they score (Balatro's play row).
  private playRowLayout(i: number, n: number): { x: number; y: number; rot: number } {
    const spacing = Math.min(48, 200 / Math.max(1, n));
    const totalW = spacing * (n - 1);
    const x = STAGE_W / 2 - totalW / 2 + i * spacing;
    const t = n > 1 ? i / (n - 1) - 0.5 : 0;
    const rot = t * 0.1;
    const y = PLAY_REST_Y + t * t * 10;
    return { x, y, rot };
  }

  // --- combat reactions ---

  private enemyHit(power: number): void {
    this.flashAlpha = 0.85;
    this.hitX.kick((Math.random() * 2 - 1) * 26);
    this.hitY.kick(-Math.min(40, 10 + power * 2.2));
    this.shake.add(Math.min(0.85, 0.18 + power / 45));
    this.particles.burst(ENEMY_X, ENEMY_Y, { count: Math.min(34, 8 + power), colors: KILL_FX, speed: 150, life: 0.7, size: 3 });
    sfx.damage(power);
  }

  // Block gained (Spades): a violet guard-up — shards sweep upward at the player + the shield pulses.
  private blockFx(amount: number): void {
    const x = STAGE_W / 2;
    const y = STAGE_H - 86; // the player's block box, bottom-centre
    this.shieldFlash = 1;
    this.particles.burst(x, y, {
      count: Math.min(26, 10 + amount),
      colors: [0xb070e0, 0xd8b8f5, 0xffffff],
      speed: 120,
      angle: -Math.PI / 2, // sweep upward like a raised guard
      spread: Math.PI * 0.7,
      gravity: -120,
      life: 0.6,
      size: 3,
    });
    sfx.block();
  }

  // Cards drawn (Diamonds): a blue sparkle stream off the deck pile toward the hand.
  private drawFx(amount: number): void {
    this.particles.burst(DECK_X, PILE_Y, {
      count: Math.min(22, 6 + amount * 3),
      colors: [0x5fb0e0, 0xade2f7, 0xffffff],
      speed: 150,
      angle: Math.PI * 0.85, // up and toward the hand (leftward)
      spread: Math.PI * 0.5,
      life: 0.55,
      size: 2,
    });
    sfx.draw(amount);
  }

  // Healing (Hearts): green motes rise from the used pile (cards returning under the deck).
  private healFx(amount: number): void {
    this.particles.burst(DISCARD_X - 30, HAND_Y - 24, {
      count: Math.min(26, 10 + amount * 2),
      colors: [0x7ad06f, 0xb6e8ac, 0xffffff],
      speed: 80,
      angle: -Math.PI / 2, // float upward, restorative
      spread: Math.PI * 0.6,
      gravity: -90,
      life: 0.85,
      size: 3,
    });
    sfx.heal();
  }

  private enemyStrike(amount: number): void {
    // wind-up: the royal rears back and pulses
    this.hitY.kick(-16);
    this.flashAlpha = 0.4;
    this.after(0.2, () => {
      // impact: lunge down at the player
      this.hitY.kick(Math.min(62, 22 + amount * 2.4));
      this.redAlpha = Math.min(0.55, 0.26 + amount / 32);
      this.flashAlpha = 0.75;
      this.shake.add(Math.min(1, 0.5 + amount / 26));
      this.spawnSlash();
      sfx.strike(amount);
      // block absorbs part of the blow — flash the shield badge + call it out
      if (this.curShield > 0) {
        this.shieldFlash = 1;
        this.pops.spawn(ENEMY_X, ENEMY_Y + 42, `🛡 BLOCK ${this.curShield}`, { color: 0xb070e0, fontSize: 14, rise: 22 });
        this.after(0.08, () => sfx.block());
      }
      this.particles.burst(ENEMY_X, ENEMY_Y + 24, {
        count: Math.min(44, 14 + amount),
        colors: [THEME.blood, THEME.red, 0xffffff],
        speed: 230,
        angle: Math.PI / 2, // downward, toward the player
        spread: Math.PI * 0.8,
        gravity: 500,
        life: 0.6,
        size: 3,
      });
      this.pops.spawn(ENEMY_X, HAND_Y - 44, `BLOW ${amount}`, { color: THEME.blood, fontSize: 18, rise: 26 });
    });
  }

  private spawnSlash(): void {
    const a = Math.PI * 0.26 + (Math.random() * 0.5 - 0.25);
    const len = 230;
    const cx = ENEMY_X;
    const cy = (ENEMY_Y + HAND_Y) / 2;
    this.slash.clear();
    this.slash
      .moveTo(cx - Math.cos(a) * len, cy - Math.sin(a) * len)
      .lineTo(cx + Math.cos(a) * len, cy + Math.sin(a) * len)
      .stroke({ width: 6, color: 0xffffff, alpha: 0.95 });
    this.slashAlpha = 1;
  }

  private cascadePops(res: ResolutionResult, killed: boolean): void {
    let delay = 0.04;
    if (res.damage > 0) {
      // the play's damage scores off the centre play row (the rested cards), then lands on the royal
      this.pops.spawn(PLAY_FX_X, PLAY_FX_Y, `-${res.damage}`, { color: THEME.goldBright, fontSize: 22, delay, rise: 34 });
      delay += 0.12;
    }
    if (res.shield > 0) {
      const d = delay;
      this.pops.spawn(STAGE_W / 2, STAGE_H - 116, `🛡 +${res.shield}`, { color: THEME.violet, delay: d, fontSize: 14, rise: 22 });
      this.after(d, () => this.blockFx(res.shield));
      delay += 0.12;
    }
    if (res.heal > 0) {
      const d = delay;
      this.pops.spawn(DISCARD_X - 30, HAND_Y - 26, `♥ +${res.heal}`, { color: THEME.good, delay: d, fontSize: 13, rise: 20 });
      this.after(d, () => this.healFx(res.heal));
      delay += 0.12;
    }
    if (res.draw > 0) {
      const d = delay;
      this.pops.spawn(DECK_X + 24, HAND_Y - 26, `♦ +${res.draw}`, { color: THEME.blue, delay: d, fontSize: 13, rise: 20 });
      this.after(d, () => this.drawFx(res.draw));
      delay += 0.12;
    }
    if (killed) {
      this.pops.spawn(ENEMY_X, ENEMY_Y - 4, "OVERTHROWN", { color: THEME.gold, fontSize: 22, delay: delay + 0.05, rise: 18, life: 1.4 });
    }
  }

  /** Drive animations from a typed FX event after sync has applied the new state. */
  handleEvent(kind: string, res?: ResolutionResult, killed?: boolean, strike?: number): void {
    if (kind === "play" && res) {
      if (res.damage > 0) this.enemyHit(res.damage);
      this.cascadePops(res, !!killed);
      if (killed) {
        this.royalDying = true;
        this.shake.add(1);
        this.particles.burst(ENEMY_X, ENEMY_Y, { count: 56, colors: KILL_FX, speed: 220, life: 1.1, size: 4 });
        this.after(0.16, () => sfx.kill());
      } else if (strike && strike > 0) {
        // enemy counter-attacks (whether you can block it or it is lethal)
        this.after(0.42, () => this.enemyStrike(strike));
      }
    } else if (kind === "yield") {
      if (strike && strike > 0) this.after(0.1, () => this.enemyStrike(strike));
    } else if (kind === "discard") {
      this.shake.add(0.22);
      sfx.block(); // cards thrown to soak the blow
    } else if (kind === "jester") {
      this.pops.spawn(STAGE_W / 2, HAND_Y - 30, "JESTER!", { color: THEME.violet, fontSize: 16, rise: 24 });
      sfx.draw(4); // discard hand & redraw
    }
  }

  private update(dt: number): void {
    this.time += dt;
    this.clock += dt;
    for (let i = this.timers.length - 1; i >= 0; i--) {
      if (this.clock >= this.timers[i].at) {
        const fn = this.timers[i].fn;
        this.timers.splice(i, 1);
        fn();
      }
    }
    this.plasma.update(dt);

    // royal float + hit recoil + death
    const floatY = Math.sin(this.time * 1.6) * 2.5;
    this.royal.position.set(this.hitX.update(dt), floatY + this.hitY.update(dt));
    if (this.royalDying) this.royalAlpha = Math.max(0, this.royalAlpha - dt * 1.6);
    this.royal.alpha = this.royalAlpha;
    this.flashAlpha = Math.max(0, this.flashAlpha - dt * 4);
    this.royalFlash.alpha = this.flashAlpha;
    this.redAlpha = Math.max(0, this.redAlpha - dt * 1.6);
    this.redFlash.alpha = this.redAlpha;
    this.slashAlpha = Math.max(0, this.slashAlpha - dt * 3.5);
    this.slash.alpha = this.slashAlpha;
    this.shieldPulse = Math.max(0, this.shieldPulse - dt * 3);
    this.shieldFlash = Math.max(0, this.shieldFlash - dt * 2.5);
    this.shieldBadge.scale.set(1 + this.shieldPulse * 0.6 + this.shieldFlash * 0.5);

    for (const node of this.cards.values()) node.update(dt, this.pointer.x, this.pointer.y);
    for (let i = this.exiting.length - 1; i >= 0; i--) {
      const n = this.exiting[i];
      n.update(dt, this.pointer.x, this.pointer.y);
      if (n.dead) {
        n.destroy();
        this.exiting.splice(i, 1);
      }
    }
    this.particles.update(dt);
    this.pops.update(dt);

    const frac = this.hpFrac.update(dt);
    this.hpFill.clear();
    const color = frac > 0.5 ? THEME.red : frac > 0.25 ? 0xd06030 : THEME.gold;
    if (frac > 0.001) this.hpFill.roundRect(0, 0, HP_W * frac, 12, 3).fill(color);

    this.shake.update(dt, this.world, 0, 0);
  }

  destroy(): void {
    this.destroyed = true;
    this.app.ticker.remove(this.tick);
    for (const n of this.cards.values()) n.destroy();
    for (const n of this.exiting) n.destroy();
    this.cards.clear();
    this.exiting = [];
    this.particles.clear();
    this.pops.clear();
    this.plasma.destroy();
    this.world.destroy({ children: true });
  }
}
