// Shared visual tokens for the Pixi UI kit. Re-exports the game palette (THEME) and adds a type scale
// + the colour-shade helper that the kit's buttons/panels use, so every Pixi surface reads identically.

import { THEME } from "../theme";

export { THEME };

/** Type scale (px) for the Pixi UI kit — pick a step rather than a magic number. */
export const TYPE = {
  micro: 9,
  small: 11,
  body: 12,
  label: 13,
  h3: 15,
  h2: 19,
  title: 26,
} as const;

/** Lighten/darken an 0xRRGGBB colour toward white/black (amt -1..1). */
export function shade(color: number, amt: number): number {
  const r = (color >> 16) & 0xff;
  const g = (color >> 8) & 0xff;
  const b = color & 0xff;
  const f = (c: number) => Math.max(0, Math.min(255, amt >= 0 ? c + (255 - c) * amt : c * (1 + amt)));
  return (f(r) << 16) | (f(g) << 8) | f(b);
}
