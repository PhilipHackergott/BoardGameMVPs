// A static Pixi card face (no springs/drag) — the shared card model for modals (deck view, pack
// reveals, style demos). Mirrors the in-combat CardNode face so cards look identical everywhere. Pure
// presentation: build a Container at a given width; height follows the standard 40×58 ratio.

import { Container, Graphics, Text } from "pixi.js";
import { SIGIL_INFO } from "../engine/index";
import { Card, SigilId, Suit } from "../engine/types";
import { PIXEL_FONT, SUIT_GLYPH, suitInkColor, THEME } from "./theme";

const SEAL_COLOR: Record<NonNullable<Card["seal"]>, number> = {
  gold: 0xf2c14e,
  red: 0xe0405f,
  blue: 0x5fb0e0,
  purple: 0xb070e0,
};

/** Whole-card visual treatment per sigil (Balatro-style: Mult cards are visibly red, Steel cards
 *  visibly metallic, etc.). Each handler draws into a graphics clipped to the card rect so a glanced
 *  card *reads* as enhanced — not just by a corner letter, but by the look of the face itself.
 *  Exported so the in-combat CardNode can use the same treatment. */
export function drawSigilOverlay(g: Graphics, sg: SigilId, w: number, h: number, R: number): void {
  switch (sg) {
    case "honed": {
      // green diagonal streaks (a "leveled up" feel) — Balatro Bonus analog
      const col = 0x7ad06f;
      for (let i = -h; i < w; i += 6) {
        g.rect(-w / 2 + i, -h / 2, 2.5, h).fill({ color: col, alpha: 0.18 });
      }
      g.roundRect(-w / 2, -h / 2, w, h, R).stroke({ width: 2, color: col, alpha: 0.55 });
      return;
    }
    case "keen": {
      // crimson banded sheen — Balatro Mult analog (red streaks across the card)
      const col = 0xe0405f;
      for (let i = 0; i < 5; i++) {
        const yy = -h / 2 + (i + 1) * (h / 6);
        g.rect(-w / 2, yy - 1.5, w, 3).fill({ color: col, alpha: 0.38 });
      }
      g.roundRect(-w / 2, -h / 2, w, h, R).stroke({ width: 2, color: col, alpha: 0.7 });
      return;
    }
    case "warded": {
      // violet shield sheen (vertical bands)
      const col = 0xb070e0;
      for (let i = -1; i <= 1; i++) {
        g.rect(i * (w / 3) - 2, -h / 2, 4, h).fill({ color: col, alpha: 0.22 });
      }
      g.roundRect(-w / 2, -h / 2, w, h, R).stroke({ width: 2, color: col, alpha: 0.6 });
      return;
    }
    case "gilded": {
      // gold dust dots — minted look without going full solid
      const col = 0xffe9a0;
      for (let i = 0; i < 18; i++) {
        const px = -w / 2 + ((i * 37) % w);
        const py = -h / 2 + ((i * 23) % h);
        g.circle(px, py, 1.2).fill({ color: col, alpha: 0.65 });
      }
      g.roundRect(-w / 2, -h / 2, w, h, R).stroke({ width: 2, color: col, alpha: 0.65 });
      return;
    }
    case "runed": {
      // blue runic glyphs along the edges
      const col = 0x5fb0e0;
      for (let i = 0; i < 6; i++) {
        const yy = -h / 2 + 6 + i * ((h - 12) / 5);
        g.rect(-w / 2 + 1, yy, 2, 2).fill({ color: col, alpha: 0.7 });
        g.rect(w / 2 - 3, yy, 2, 2).fill({ color: col, alpha: 0.7 });
      }
      g.roundRect(-w / 2, -h / 2, w, h, R).stroke({ width: 2, color: col, alpha: 0.55 });
      return;
    }
    case "wildcard": {
      // rainbow tint — half-card cool / half-card warm bands
      const cols = [0xe0405f, 0xffe9a0, 0x7ad06f, 0x5fb0e0, 0xb070e0];
      const bandH = h / cols.length;
      cols.forEach((c, i) => g.rect(-w / 2, -h / 2 + i * bandH, w, bandH).fill({ color: c, alpha: 0.16 }));
      g.roundRect(-w / 2, -h / 2, w, h, R).stroke({ width: 2, color: 0xffe9a0, alpha: 0.85 });
      return;
    }
    case "steel": {
      // silvery brushed-metal sheen + bolt border
      const col = 0xaab2ba;
      g.rect(-w / 2, -h / 2, w, h).fill({ color: col, alpha: 0.18 });
      for (let i = 0; i < 4; i++) {
        const yy = -h / 2 + (i + 1) * (h / 5);
        g.rect(-w / 2, yy - 0.5, w, 1).fill({ color: 0xffffff, alpha: 0.18 });
      }
      g.roundRect(-w / 2, -h / 2, w, h, R).stroke({ width: 2.5, color: col, alpha: 0.9 });
      return;
    }
    case "glass": {
      // glassy diagonal light streak
      const col = 0xbdeaff;
      g.rect(-w / 2, -h / 2, w, h).fill({ color: col, alpha: 0.15 });
      g.poly([-w / 2 + 2, -h / 2 + h * 0.25, -w / 2 + w * 0.45, -h / 2 + 2, -w / 2 + w * 0.65, -h / 2 + 2, -w / 2 + 2, -h / 2 + h * 0.55]).fill({ color: 0xffffff, alpha: 0.28 });
      g.roundRect(-w / 2, -h / 2, w, h, R).stroke({ width: 2, color: col, alpha: 0.75 });
      return;
    }
    case "minted": {
      const col = 0xffe9a0;
      g.rect(-w / 2, -h / 2, w, h).fill({ color: col, alpha: 0.18 });
      // a couple of coin discs subtly drifting
      g.circle(-w / 2 + 6, h / 2 - 12, 3).fill({ color: col, alpha: 0.65 });
      g.circle(w / 2 - 8, -h / 2 + 14, 3).fill({ color: col, alpha: 0.65 });
      g.roundRect(-w / 2, -h / 2, w, h, R).stroke({ width: 2, color: col, alpha: 0.8 });
      return;
    }
    case "charmed": {
      const col = 0x7ad06f;
      g.rect(-w / 2, -h / 2, w, h).fill({ color: col, alpha: 0.15 });
      for (let i = 0; i < 8; i++) {
        const px = -w / 2 + ((i * 19 + 7) % (w - 8)) + 4;
        const py = -h / 2 + ((i * 31 + 11) % (h - 8)) + 4;
        g.circle(px, py, 1.6).fill({ color: col, alpha: 0.85 });
      }
      g.roundRect(-w / 2, -h / 2, w, h, R).stroke({ width: 2, color: col, alpha: 0.7 });
      return;
    }
    case "stoneskin": {
      const col = 0x8a8f97;
      g.rect(-w / 2, -h / 2, w, h).fill({ color: col, alpha: 0.22 });
      // stone-crack lines
      g.poly([-w / 2 + 4, -h / 2 + h * 0.4, -w / 2 + w * 0.3, -h / 2 + h * 0.55, -w / 2 + w * 0.55, -h / 2 + h * 0.45, w / 2 - 3, -h / 2 + h * 0.7]).stroke({ width: 1, color: 0x4a4f55 });
      g.roundRect(-w / 2, -h / 2, w, h, R).stroke({ width: 2.5, color: col, alpha: 0.85 });
      return;
    }
    case "companion":
    case "extra":
      // structural sigils (handled by .kind / .extraSuit on the face) — no surface tint
      return;
  }
}

/** Whole-card halo per seal (Balatro analog). Seals colour the card's edge so a sealed card reads
 *  as enhanced at a glance, not only via the corner dot. Exported for CardNode. */
export function drawSealOverlay(g: Graphics, seal: NonNullable<Card["seal"]>, w: number, h: number, R: number): void {
  const col = SEAL_COLOR[seal];
  g.roundRect(-w / 2 + 2, -h / 2 + 2, w - 4, h - 4, R - 1).stroke({ width: 2, color: col, alpha: 0.85 });
  g.roundRect(-w / 2 - 1, -h / 2 - 1, w + 2, h + 2, R + 1).stroke({ width: 1, color: col, alpha: 0.5 });
}

/** Build a static card face. `w` sets the size; height follows the in-combat CardNode aspect
 *  (62/44) so a pack-revealed card matches a felt card exactly. */
export function buildCardFace(card: Card, w = 44): Container {
  const h = Math.round((w * 62) / 44);
  const R = Math.max(3, Math.round(w * 0.12));
  const c = new Container();

  const outline = new Graphics();
  outline.roundRect(-w / 2 - 2, -h / 2 - 2, w + 4, h + 4, R + 1).fill(THEME.ink);
  const face = new Graphics();
  face.roundRect(-w / 2, -h / 2, w, h, R).fill(THEME.parchment);
  face.roundRect(-w / 2 + 2, -h / 2 + 2, w - 4, 4, 2).fill(THEME.parchmentLite);
  face.roundRect(-w / 2 + 3, -h / 2 + 3, w - 6, h - 6, R - 1).stroke({ width: 1, color: THEME.parchmentEdge });
  c.addChild(outline, face);

  // Whole-card enhancement overlay — drawn BEFORE the rank/suit so the tint sits behind the inked
  // glyphs (Balatro's Mult/Bonus/Steel cards work this way: the face still reads, but the card is
  // visibly enhanced). Each sigil contributes its own treatment; multiple sigils stack.
  if ((card.sigils && card.sigils.length) || card.seal) {
    const overlay = new Graphics();
    for (const sg of card.sigils ?? []) {
      if (sg === "companion" || sg === "extra") continue;
      drawSigilOverlay(overlay, sg, w, h, R);
    }
    if (card.seal) drawSealOverlay(overlay, card.seal, w, h, R);
    c.addChild(overlay);
  }

  const suit = card.suit as Suit | null;
  const ink = suit ? suitInkColor(suit) : THEME.violet;
  const corner = card.kind === "companion" ? "A" : card.kind === "jester" ? "J" : String(card.value);
  const cornerText = new Text({ text: corner, style: { fill: ink, fontSize: Math.round(w * 0.3), fontFamily: PIXEL_FONT, fontWeight: "700" } });
  cornerText.position.set(-w / 2 + 4, -h / 2 + 4);
  const glyph = new Text({ text: suit ? SUIT_GLYPH[suit] : "★", style: { fill: ink, fontSize: Math.round(w * 0.55), fontFamily: PIXEL_FONT } });
  glyph.anchor.set(0.5);
  glyph.position.set(0, Math.round(h * 0.05));
  c.addChild(cornerText, glyph);

  // on-card modifications: a coloured code per sigil down the right edge
  let by = -h / 2 + 9;
  for (const sg of card.sigils ?? []) {
    if (sg === "companion") continue;
    const info = SIGIL_INFO[sg];
    const badge = new Text({ text: info.code, style: { fill: info.color, fontSize: Math.round(w * 0.22), fontFamily: PIXEL_FONT, fontWeight: "700" } });
    badge.anchor.set(1, 0.5);
    badge.position.set(w / 2 - 3, by);
    c.addChild(badge);
    by += Math.round(h * 0.17);
  }
  if (card.extraSuit) {
    const ex = new Text({ text: SUIT_GLYPH[card.extraSuit], style: { fill: suitInkColor(card.extraSuit), fontSize: Math.round(w * 0.3), fontFamily: PIXEL_FONT } });
    ex.anchor.set(0, 1);
    ex.position.set(-w / 2 + 3, h / 2 - 3);
    c.addChild(ex);
  }
  if (card.seal) {
    const dot = new Graphics();
    dot.circle(w / 2 - 7, h / 2 - 7, Math.max(3, Math.round(w * 0.09))).fill(SEAL_COLOR[card.seal]).stroke({ width: 1, color: 0x000000 });
    c.addChild(dot);
  }
  if (card.kind === "companion") {
    const tag = new Text({ text: "PET", style: { fill: THEME.parchmentEdge, fontSize: Math.round(w * 0.17), fontFamily: PIXEL_FONT } });
    tag.anchor.set(0.5);
    tag.position.set(0, h / 2 - 8);
    c.addChild(tag);
  }
  return c;
}
