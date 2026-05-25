import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { RARITY_CHIP, TYPE_CHIP } from "./packMeta";

// One global tooltip, mounted once. Reads `data-tip` off whatever the pointer/focus is on and renders
// a single `position: fixed` bubble clamped to the viewport. Fixes the two failure modes of pure-CSS
// `::after` tooltips: (1) they clip at screen edges, and (2) they're trapped/clipped inside
// `overflow:auto/hidden` ancestors (e.g. the scrollable deck view — the sigil-tooltip bug).
//
// Placement: the bubble spawns BESIDE the hovered thing — to its right, or to its left when there
// isn't room — vertically centred on it and clamped to the viewport, so it never sits on top of the
// card it describes (Balatro-style). Because the side+clamp depend on the bubble's own size, we render
// it once (hidden), measure it, then position it in a layout effect before the browser paints.
//
// Balatro-style structure: a headline (dark header band), an inset parchment box around the body text,
// and — when the hovered thing has a type — colour-coded pills beneath. The headline is taken from
// `data-tip-title`, or split off the body at the first " — " (so existing `Name — text` tooltips get a
// headline for free). The chip comes from `data-tip-type` (a slug → label + colour; see
// packMeta.TYPE_CHIP); a second, optional chip comes from `data-tip-rarity` (a Joker's rarity → see
// packMeta.RARITY_CHIP).

interface Anchor {
  left: number;
  top: number;
  right: number;
  height: number;
}
interface Tip {
  title?: string;
  text: string;
  type?: string;
  rarity?: string;
  anchor: Anchor;
}
interface Pos {
  left: number;
  top: number;
  side: "right" | "left";
}

const GAP = 12; // space between the hovered element and the tooltip
const EDGE = 8; // keep this far from the viewport edges

export default function TooltipLayer() {
  const [tip, setTip] = useState<Tip | null>(null);
  const [pos, setPos] = useState<Pos | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let current: Element | null = null;
    let timer: number | undefined;

    const place = (el: Element) => {
      const raw = el.getAttribute("data-tip");
      if (!raw) return;
      let title = el.getAttribute("data-tip-title") ?? undefined;
      let text = raw;
      if (!title) {
        const i = raw.indexOf(" — ");
        if (i > 0) {
          title = raw.slice(0, i);
          text = raw.slice(i + 3);
        }
      }
      const type = el.getAttribute("data-tip-type") ?? undefined;
      const rarity = el.getAttribute("data-tip-rarity") ?? undefined;
      const r = el.getBoundingClientRect();
      setPos(null); // hide until the new tip is measured & re-placed (see the layout effect)
      setTip({ title, text, type, rarity, anchor: { left: r.left, top: r.top, right: r.right, height: r.height } });
    };

    const enter = (e: Event) => {
      const el = (e.target as Element | null)?.closest?.("[data-tip]") ?? null;
      if (!el || el === current) return;
      current = el;
      window.clearTimeout(timer);
      timer = window.setTimeout(() => current === el && place(el), 110);
    };
    const leave = (e: Event) => {
      if (!current) return;
      const to = (e as MouseEvent).relatedTarget as Node | null;
      if (to && current.contains(to)) return; // moved within the same element — keep it
      current = null;
      window.clearTimeout(timer);
      setTip(null);
    };

    document.addEventListener("mouseover", enter);
    document.addEventListener("mouseout", leave);
    document.addEventListener("focusin", enter);
    document.addEventListener("focusout", leave);
    // any scroll/resize invalidates the anchored position — just hide
    const hide = () => {
      current = null;
      window.clearTimeout(timer);
      setTip(null);
    };
    window.addEventListener("scroll", hide, true);
    window.addEventListener("resize", hide);
    return () => {
      document.removeEventListener("mouseover", enter);
      document.removeEventListener("mouseout", leave);
      document.removeEventListener("focusin", enter);
      document.removeEventListener("focusout", leave);
      window.removeEventListener("scroll", hide, true);
      window.removeEventListener("resize", hide);
      window.clearTimeout(timer);
    };
  }, []);

  // Measure the rendered bubble and place it to the side of the anchor, clamped to the viewport.
  useLayoutEffect(() => {
    if (!tip || !ref.current) return;
    const b = ref.current.getBoundingClientRect();
    const a = tip.anchor;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    // prefer the right of the card; fall back to the left when the bubble wouldn't fit
    const fitsRight = a.right + GAP + b.width <= vw - EDGE;
    const side: "right" | "left" = fitsRight ? "right" : "left";
    let left = side === "right" ? a.right + GAP : a.left - GAP - b.width;
    left = Math.min(Math.max(left, EDGE), vw - b.width - EDGE);
    let top = a.top + a.height / 2 - b.height / 2; // vertically centred on the card
    top = Math.min(Math.max(top, EDGE), vh - b.height - EDGE);
    setPos({ left, top, side });
  }, [tip]);

  if (!tip) return null;
  const chip = tip.type ? TYPE_CHIP[tip.type] : undefined;
  const rarityChip = tip.rarity ? RARITY_CHIP[tip.rarity] : undefined;
  return (
    <div
      ref={ref}
      className={`tip-pop tip-${pos?.side ?? "right"}`}
      style={{ left: pos?.left ?? -9999, top: pos?.top ?? 0, visibility: pos ? "visible" : "hidden" }}
      role="tooltip"
    >
      {tip.title && <div className="tip-title">{tip.title}</div>}
      <div className="tip-body">{tip.text}</div>
      {(chip || rarityChip) && (
        <div className="tip-chips">
          {chip && <span className={`tip-type ${chip.cls}`}>{chip.label}</span>}
          {rarityChip && <span className={`tip-type ${rarityChip.cls}`}>{rarityChip.label}</span>}
        </div>
      )}
    </div>
  );
}
