// Shared placement for the side-spawning tooltips — used by the global DOM TooltipLayer and the Pixi
// shop/HUD popups (SideTip). Given the hovered element's screen rect and the bubble's measured size,
// returns the bubble's top-left corner plus which side it landed on: to the RIGHT of the element, or to
// the LEFT when it wouldn't fit, vertically centred on the element and clamped to the viewport — so the
// tooltip never sits on top of the card it describes.

export interface AnchorRect {
  left: number;
  right: number;
  top: number;
  height: number;
}
export interface Placed {
  left: number;
  top: number;
  side: "right" | "left";
}

const GAP = 12; // space between the hovered element and the tooltip
const EDGE = 8; // keep this far from the viewport edges

export function placeBeside(a: AnchorRect, bubbleW: number, bubbleH: number, vw: number, vh: number): Placed {
  const fitsRight = a.right + GAP + bubbleW <= vw - EDGE;
  const side: "right" | "left" = fitsRight ? "right" : "left";
  let left = side === "right" ? a.right + GAP : a.left - GAP - bubbleW;
  left = Math.min(Math.max(left, EDGE), vw - bubbleW - EDGE);
  let top = a.top + a.height / 2 - bubbleH / 2;
  top = Math.min(Math.max(top, EDGE), vh - bubbleH - EDGE);
  return { left, top, side };
}
