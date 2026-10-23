// Visual identity for Cull the Crown: an 8-bit arcade take on a medieval court — flat, limited
// palette, hard edges, pixel type, and a molten heraldic plasma backdrop. The fx/ kit is shared
// across the factory; THIS file is what makes the game look distinct, so the look lives here.

import { Rgb } from "../fx";
import { Suit } from "../engine/types";

// THEME is the single source of truth for the brand palette. The DOM mirrors it: `npm run gen:tokens`
// (also a prebuild step) regenerates the brand `:root` custom properties in styles.css from these ints,
// so Pixi and CSS never drift — change a colour HERE, not in the CSS. (DOM-only structural colours —
// --bg/--panel/--muted/--line/--ink — have no Pixi counterpart and stay hand-edited in styles.css.)
export const THEME = {
  // flat medieval palette (no gradients in the foreground)
  ink: 0x1a1020,
  stone: 0x3a3550,
  stoneLite: 0x5a5478,
  parchment: 0xe8d8a0,
  parchmentLite: 0xfff0c8,
  parchmentEdge: 0x8a6a3a,
  red: 0xc0273f,
  redDark: 0x7a1228,
  black: 0x241f2e,
  gold: 0xf2c14e,
  goldBright: 0xffe9a0,
  blood: 0xe04060,
  good: 0x7ad06f,
  blue: 0x5fb0e0,
  violet: 0xb070e0,
  frame: 0xf2c14e,
  frameDim: 0x8a6a2a,
};

// Pixel fonts (loaded via CSS @import; PixiBoard waits for them before building text).
export const PIXEL_FONT = "'Silkscreen', monospace";
export const TITLE_FONT = "'Press Start 2P', monospace";

export const SUIT_GLYPH: Record<Suit, string> = { H: "♥", D: "♦", C: "♣", S: "♠" };

export function suitInkColor(suit: Suit): number {
  return suit === "H" || suit === "D" ? THEME.red : THEME.black;
}

/** Distinct, legible-on-dark colour per suit — for the immunity indicator & emblems. */
export const SUIT_COLOR: Record<Suit, number> = {
  H: 0xe0506a, // rose
  D: 0xe89a3c, // amber
  C: 0x6fc0e0, // sky
  S: 0xb070e0, // violet
};

/** Per-suit royal palette + crown silhouette so each opponent set reads as its suit at a glance. */
export const SUIT_ROYAL: Record<Suit, { skin: number; skinDark: number; eye: number; crown: number; merlon: "round" | "notch" | "trefoil" | "spike" }> = {
  H: { skin: 0x7a3344, skinDark: 0x551f2e, eye: 0xffd0d8, crown: 0xf2c14e, merlon: "round" },
  D: { skin: 0x6f5626, skinDark: 0x4c3914, eye: 0xffe1a0, crown: 0xffe0a0, merlon: "notch" },
  C: { skin: 0x2e5a46, skinDark: 0x1c3a2c, eye: 0xceeede, crown: 0xbfe0c0, merlon: "trefoil" },
  S: { skin: 0x3a3052, skinDark: 0x241d38, eye: 0xe6d8ff, crown: 0xc9a0f0, merlon: "spike" },
};

export const SUIT_FX: Record<Suit, number[]> = {
  H: [0xff6b8a, 0xc0273f, 0xffd0d8],
  D: [0x6fb7e0, 0x3f86c0, 0xcfeaff],
  C: [0xf2c14e, 0x8a6a2a, 0xfff0c0],
  S: [0xb070e0, 0x7a5aa0, 0xe6d8ff],
};

export const KILL_FX = [0xf2c14e, 0xffe9a0, 0xc0273f, 0xffffff];

// Molten heraldic plasma: deep plum -> wine -> crimson -> gold -> parchment.
export const PLASMA_PALETTE: Rgb[] = [
  [18, 10, 24],
  [48, 16, 36],
  [120, 24, 44],
  [176, 60, 52],
  [210, 150, 70],
  [60, 26, 44],
];

// Pack-opening plasma: cooler purple — signals "you're in the pack take-over, not the shop".
// Matches Balatro's Arcana-pack screen palette.
export const PLASMA_PALETTE_PACK: Rgb[] = [
  [16, 10, 28],
  [42, 22, 64],
  [86, 46, 132],
  [134, 88, 196],
  [222, 196, 240],
  [50, 30, 92],
];
