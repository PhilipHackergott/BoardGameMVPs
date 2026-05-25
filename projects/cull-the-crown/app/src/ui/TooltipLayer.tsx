import { useEffect } from "react";
import { useTooltip } from "./tooltip";

// The DOM `data-tip` source for the shared tooltip surface (see tooltip.tsx). Reads `data-tip` off
// whatever the pointer/focus is on and pushes it into `useTooltip`; the single <Tooltip> renders it.
// Fixes the two failure modes of pure-CSS `::after` tooltips: edge-clipping, and being trapped inside
// `overflow:auto/hidden` ancestors. Headline = `data-tip-title`, or split off the body at the first
// " — "; the type/rarity pills come from `data-tip-type` / `data-tip-rarity`. Renders nothing itself.

const OWNER = Symbol("dom-data-tip");

export default function TooltipLayer() {
  useEffect(() => {
    const tt = useTooltip.getState();
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
      tt.show(OWNER, { title, text, type, rarity, anchor: { left: r.left, top: r.top, right: r.right, height: r.height } });
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
      useTooltip.getState().hide(OWNER);
    };
    const hide = () => {
      current = null;
      window.clearTimeout(timer);
      useTooltip.getState().hide(OWNER);
    };

    document.addEventListener("mouseover", enter);
    document.addEventListener("mouseout", leave);
    document.addEventListener("focusin", enter);
    document.addEventListener("focusout", leave);
    window.addEventListener("scroll", hide, true); // any scroll/resize invalidates the anchor — just hide
    window.addEventListener("resize", hide);
    return () => {
      document.removeEventListener("mouseover", enter);
      document.removeEventListener("mouseout", leave);
      document.removeEventListener("focusin", enter);
      document.removeEventListener("focusout", leave);
      window.removeEventListener("scroll", hide, true);
      window.removeEventListener("resize", hide);
      window.clearTimeout(timer);
      hide();
    };
  }, []);

  return null;
}
