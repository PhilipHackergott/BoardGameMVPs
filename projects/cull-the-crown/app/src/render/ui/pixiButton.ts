// The unified Pixi button visual: a tinted-accent fill + accent stroke + a brightened wiggle label,
// with hover/disabled states. Draws into a parent container; the HOST owns the hit-testing (it knows
// the button's bounds + onTap) — matching the stage-level geometry hit-test pattern used across the
// felt/sidebar (per-object Pixi hit-testing proved unreliable through the CSS-upscaled canvas).

import { Container, Graphics } from "pixi.js";
import { THEME } from "../theme";
import { shade } from "./tokens";
import { WiggleField } from "./wigglyText";

export interface ButtonOpts {
  accent?: number; // the button's identity colour (gold/good/blood/…)
  enabled?: boolean;
  hovered?: boolean;
  fontSize?: number;
}

/** Paint a button into `parent` at (x,y,w,h). Returns nothing — register the bounds + onTap in the host. */
export function drawButton(parent: Container, wig: WiggleField, label: string, x: number, y: number, w: number, h: number, o: ButtonOpts = {}): void {
  const accent = o.accent ?? THEME.gold;
  const enabled = o.enabled ?? true;
  const hovered = !!o.hovered && enabled;
  const fill = enabled ? (hovered ? shade(accent, -0.45) : shade(accent, -0.66)) : 0x161021;
  const g = new Graphics();
  g.roundRect(x, y, w, h, 8)
    .fill({ color: fill })
    .stroke({ width: 2, color: enabled ? accent : THEME.frameDim });
  parent.addChild(g);
  wig.build(parent, label, x + w / 2, y + h / 2, o.fontSize ?? 13, enabled ? shade(accent, 0.72) : THEME.frameDim, { anchor: 0.5, anchorY: 0.5, bold: true });
}
