// A static Pixi card face (no springs/drag) — the shared card model for modals (deck view, pack
// reveals, style demos). Mirrors the in-combat CardNode face so cards look identical everywhere. Pure
// presentation: build a Container at a given width; height follows the standard 40×58 ratio.

import { Container, Graphics, Text } from "pixi.js";
import { SIGIL_INFO } from "../engine/index";
import { Card, Suit } from "../engine/types";
import { PIXEL_FONT, SUIT_GLYPH, suitInkColor, THEME } from "./theme";

const SEAL_COLOR: Record<NonNullable<Card["seal"]>, number> = {
  gold: 0xf2c14e,
  red: 0xe0405f,
  blue: 0x5fb0e0,
  purple: 0xb070e0,
};

/** Build a static card face. `w` sets the size (height = w × 58/40); everything scales off it. */
export function buildCardFace(card: Card, w = 40): Container {
  const h = Math.round((w * 58) / 40);
  const R = Math.max(3, Math.round(w * 0.12));
  const c = new Container();

  const outline = new Graphics();
  outline.roundRect(-w / 2 - 2, -h / 2 - 2, w + 4, h + 4, R + 1).fill(THEME.ink);
  const face = new Graphics();
  face.roundRect(-w / 2, -h / 2, w, h, R).fill(THEME.parchment);
  face.roundRect(-w / 2 + 2, -h / 2 + 2, w - 4, 4, 2).fill(THEME.parchmentLite);
  face.roundRect(-w / 2 + 3, -h / 2 + 3, w - 6, h - 6, R - 1).stroke({ width: 1, color: THEME.parchmentEdge });
  c.addChild(outline, face);

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
