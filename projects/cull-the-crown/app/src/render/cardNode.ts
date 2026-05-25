// A single card as a 2.5D pixel-art Pixi object. Spring-driven: deals in, fans into place, lifts +
// tilts toward the cursor, and can be dragged. Input is driven by the stage (explicit geometry hit
// testing) — the node just exposes hitTest/beginDrag and reflects hovered/selected/dragging flags.

import { Container, Graphics, Text } from "pixi.js";
import { Spring } from "../fx";
import { SIGIL_INFO } from "../engine/index";
import { Card, Suit } from "../engine/types";
import { PIXEL_FONT, SUIT_GLYPH, suitInkColor, THEME } from "./theme";

export const CARD_W = 44;
export const CARD_H = 62;
const RADIUS = 5;

/** A card's visual signature — when it changes (suit/value/kind/sigils via a tarot), the stage
 *  rebuilds the node so on-card modifications always show. */
export function cardSignature(c: Card): string {
  return `${c.suit}|${c.value}|${c.kind}|${(c.sigils ?? []).join(",")}|${c.extraSuit ?? ""}`;
}

export class CardNode {
  readonly view = new Container();
  private body = new Container();
  private shadow: Graphics;
  private glow: Graphics;
  private immuneBadge: Graphics;
  readonly card: Card;
  readonly sigStr: string;

  private sx = new Spring(0, { stiffness: 160, damping: 17 });
  private sy = new Spring(0, { stiffness: 160, damping: 17 });
  private srot = new Spring(0, { stiffness: 120, damping: 14 });
  private sscale = new Spring(1, { stiffness: 220, damping: 18 });
  private slift = new Spring(0, { stiffness: 180, damping: 16 });
  private sskewX = new Spring(0, { stiffness: 140, damping: 13 });
  private sskewY = new Spring(0, { stiffness: 140, damping: 13 });

  baseX = 0;
  baseY = 0;
  baseRot = 0;
  hovered = false;
  selected = false;
  dragging = false;
  defendMode = false; // grow + blink to say "use me to block"
  exiting = false;
  private age = 0;
  private idlePhase = Math.random() * Math.PI * 2; // desync each card's idle float

  private dragOffX = 0;
  private dragOffY = 0;
  private exitAge = 0;
  private static EXIT_TIME = 0.4;

  // Balatro-style "played to the centre": the card lifts into the play row, rests there at full size
  // while the resolution scores, then flies on to the discard pile.
  private staging = false;
  private stageAge = 0;
  private stageHold = 0;
  private stageRest = { x: 0, y: 0, rot: 0 };
  private stageFinal = { x: 0, y: 0 };

  constructor(card: Card) {
    this.card = card;
    this.sigStr = cardSignature(card);
    const w = CARD_W;
    const h = CARD_H;

    this.shadow = new Graphics();
    this.shadow.roundRect(-w / 2, -h / 2, w, h, RADIUS).fill({ color: 0x000000, alpha: 0.5 });
    this.shadow.alpha = 0.3;

    this.glow = new Graphics();
    this.glow.roundRect(-w / 2 - 4, -h / 2 - 4, w + 8, h + 8, RADIUS + 2).fill(THEME.gold);
    this.glow.visible = false;

    const outline = new Graphics();
    outline.roundRect(-w / 2 - 2, -h / 2 - 2, w + 4, h + 4, RADIUS + 1).fill(THEME.ink);
    const face = new Graphics();
    face.roundRect(-w / 2, -h / 2, w, h, RADIUS).fill(THEME.parchment);
    face.roundRect(-w / 2 + 2, -h / 2 + 2, w - 4, 4, 2).fill(THEME.parchmentLite);
    face.roundRect(-w / 2 + 3, -h / 2 + 3, w - 6, h - 6, RADIUS - 1).stroke({ width: 1, color: THEME.parchmentEdge });

    const suit = this.card.suit as Suit | null;
    const ink = suit ? suitInkColor(suit) : THEME.violet;
    const corner = this.card.kind === "companion" ? "A" : this.card.kind === "jester" ? "J" : String(this.card.value);
    const glyph = suit ? SUIT_GLYPH[suit] : "★";

    const cornerText = new Text({ text: corner, style: { fill: ink, fontSize: 12, fontFamily: PIXEL_FONT, fontWeight: "700" } });
    cornerText.position.set(-w / 2 + 4, -h / 2 + 4);
    const glyphText = new Text({ text: glyph, style: { fill: ink, fontSize: 22, fontFamily: PIXEL_FONT } });
    glyphText.anchor.set(0.5);
    glyphText.position.set(0, 3);

    this.body.addChild(this.glow, outline, face, cornerText, glyphText);

    // "⊘" badge: this card's suit power is nullified by the royal's immunity
    this.immuneBadge = new Graphics();
    this.immuneBadge.circle(0, 0, 7).fill({ color: THEME.ink, alpha: 0.85 }).stroke({ width: 2, color: THEME.blood });
    this.immuneBadge.moveTo(-4, -4).lineTo(4, 4).stroke({ width: 2, color: THEME.blood });
    this.immuneBadge.position.set(w / 2 - 8, -h / 2 + 8);
    this.immuneBadge.visible = false;
    this.body.addChild(this.immuneBadge);

    // On-card modification badges (Balatro-style): one coloured code per sigil down the right edge,
    // plus the extra-suit glyph bottom-left. The stage rebuilds the node when these change.
    let by = -h / 2 + 9;
    for (const sg of this.card.sigils ?? []) {
      if (sg === "companion") continue; // shown via the PET tag below
      const info = SIGIL_INFO[sg];
      const badge = new Text({ text: info.code, style: { fill: info.color, fontSize: 9, fontFamily: PIXEL_FONT, fontWeight: "700" } });
      badge.anchor.set(1, 0.5);
      badge.position.set(w / 2 - 3, by);
      this.body.addChild(badge);
      by += 10;
    }
    if (this.card.extraSuit) {
      const ex = new Text({ text: SUIT_GLYPH[this.card.extraSuit], style: { fill: suitInkColor(this.card.extraSuit), fontSize: 12, fontFamily: PIXEL_FONT } });
      ex.anchor.set(0, 1);
      ex.position.set(-w / 2 + 3, h / 2 - 3);
      this.body.addChild(ex);
    }
    if (this.card.sigils?.includes("wildcard")) {
      const wc = new Text({ text: "★", style: { fill: THEME.gold, fontSize: 10, fontFamily: PIXEL_FONT } });
      wc.anchor.set(0.5);
      wc.position.set(0, -h / 2 + 16);
      this.body.addChild(wc);
    }

    if (this.card.kind === "companion") {
      const tag = new Text({ text: "PET", style: { fill: THEME.parchmentEdge, fontSize: 7, fontFamily: PIXEL_FONT } });
      tag.anchor.set(0.5);
      tag.position.set(0, h / 2 - 8);
      this.body.addChild(tag);
    }
    this.view.addChild(this.shadow, this.body);
    this.view.eventMode = "none"; // input handled by the stage with explicit geometry
  }

  /** Is the stage-space point over this card? (cards live in an untransformed layer at the stage root) */
  hitTest(px: number, py: number): boolean {
    return Math.abs(px - this.view.x) <= CARD_W / 2 + 4 && Math.abs(py - this.view.y) <= CARD_H / 2 + 4;
  }

  beginDrag(px: number, py: number, converge?: { dx: number; dy: number }): void {
    this.dragging = true;
    // converge: the card snaps toward the cursor (+ a fan offset) — used when dragging a combo so
    // the whole group clusters at the pointer. Otherwise it follows from where it was grabbed.
    if (converge) {
      this.dragOffX = -converge.dx;
      this.dragOffY = -converge.dy;
    } else {
      this.dragOffX = px - this.view.x;
      this.dragOffY = py - this.view.y;
    }
    this.view.zIndex = 1000;
  }

  endDrag(): void {
    this.dragging = false;
    this.view.zIndex = 0;
  }

  setImmune(b: boolean): void {
    this.immuneBadge.visible = b;
  }

  setLayout(x: number, y: number, rot: number): void {
    this.baseX = x;
    this.baseY = y;
    this.baseRot = rot;
  }

  spawnAt(x: number, y: number): void {
    this.sx.snap(x);
    this.sy.snap(y);
    this.srot.snap(0);
    this.sscale.snap(0);
  }

  exit(towardX: number, towardY: number): void {
    this.exiting = true;
    this.dragging = false;
    this.baseX = towardX;
    this.baseY = towardY;
  }

  /** Lift into the centre play row, hold there `hold` seconds while the play scores, then fly to
   *  (finalX, finalY) and fade — the Balatro "played hand" beat. */
  playStage(restX: number, restY: number, restRot: number, hold: number, finalX: number, finalY: number): void {
    this.staging = true;
    this.stageAge = 0;
    this.stageHold = hold;
    this.stageRest = { x: restX, y: restY, rot: restRot };
    this.stageFinal = { x: finalX, y: finalY };
    this.dragging = false;
    this.exiting = false;
    this.view.zIndex = 500;
  }

  get dead(): boolean {
    return this.exiting && this.exitAge >= CardNode.EXIT_TIME;
  }

  update(dt: number, pointerX: number, pointerY: number): void {
    this.age += dt;
    if (this.staging) {
      this.stageAge += dt;
      if (this.stageAge < this.stageHold) {
        // rest in the centre play row at full size while the resolution scores
        this.sx.to(this.stageRest.x);
        this.sy.to(this.stageRest.y);
        this.srot.to(this.stageRest.rot);
        this.sscale.to(1.12);
        this.sskewX.to(0);
        this.sskewY.to(0);
        this.view.alpha = 1;
        this.view.position.set(this.sx.update(dt), this.sy.update(dt));
        this.view.rotation = this.srot.update(dt);
        this.view.scale.set(this.sscale.update(dt));
        this.body.skew.set(this.sskewX.update(dt), this.sskewY.update(dt));
        const lift = this.slift.update(dt);
        this.shadow.position.set(0, lift * 0.7 + 5);
        return;
      }
      // hold done → hand off to the normal fly-out toward the discard pile
      this.staging = false;
      this.exiting = true;
      this.exitAge = 0;
      this.baseX = this.stageFinal.x;
      this.baseY = this.stageFinal.y;
    }
    if (this.exiting) {
      this.exitAge += dt;
      this.sx.to(this.baseX);
      this.sy.to(this.baseY);
      this.sscale.to(0.2);
      this.srot.to(this.srot.value + 0.3);
      this.sskewX.to(0);
      this.sskewY.to(0);
      this.view.alpha = Math.max(0, 1 - this.exitAge / CardNode.EXIT_TIME);
    } else if (this.dragging) {
      this.sx.snap(pointerX - this.dragOffX);
      this.sy.snap(pointerY - this.dragOffY);
      this.srot.to(0);
      this.sscale.to(1.22);
      this.glow.visible = this.selected;
      this.body.skew.set(0, 0);
    } else {
      const lift = (this.hovered ? 14 : 0) + (this.selected ? 16 : 0);
      this.slift.to(lift);
      // gentle idle float + turn while the card just sits in the fan (not hovered/selected)
      const idle = this.hovered || this.selected ? 0 : 1;
      const bobY = idle * Math.sin(this.age * 1.6 + this.idlePhase) * 1.8;
      this.sx.to(this.baseX);
      this.sy.to(this.baseY - lift + bobY);
      this.srot.to(this.hovered || this.selected ? 0 : this.baseRot + Math.sin(this.age * 1.25 + this.idlePhase) * 0.025);
      this.sscale.to(this.hovered ? 1.18 : this.selected ? 1.1 : this.defendMode ? 1.12 : 1);
      this.glow.visible = this.selected;
      if (this.hovered) {
        const dx = Math.max(-1, Math.min(1, (pointerX - this.view.x) / (CARD_W * 0.9)));
        const dy = Math.max(-1, Math.min(1, (pointerY - this.view.y) / (CARD_H * 0.9)));
        this.sskewX.to(dy * 0.28);
        this.sskewY.to(-dx * 0.28);
      } else {
        this.sskewX.to(0);
        this.sskewY.to(0);
      }
    }

    this.view.position.set(this.sx.update(dt), this.sy.update(dt));
    this.view.rotation = this.srot.update(dt);
    this.view.scale.set(this.sscale.update(dt));
    this.body.skew.set(this.sskewX.update(dt), this.sskewY.update(dt));

    const lift = this.slift.update(dt);
    this.shadow.position.set(this.body.skew.y * 14, lift * 0.7 + 5);
    this.shadow.alpha = 0.26 + lift * 0.013;
    this.shadow.scale.set(1 + lift * 0.012);

    // forced-to-block: un-chosen cards blink for attention
    if (!this.exiting) {
      this.view.alpha = this.defendMode && !this.selected && !this.dragging ? 0.66 + 0.34 * Math.sin(this.age * 7) : 1;
    }
  }

  destroy(): void {
    this.view.destroy({ children: true });
  }
}
