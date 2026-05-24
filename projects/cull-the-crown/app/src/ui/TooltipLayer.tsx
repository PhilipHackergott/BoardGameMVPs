import { useEffect, useState } from "react";

// One global tooltip, mounted once. Reads `data-tip` off whatever the pointer/focus is on and renders
// a single `position: fixed` bubble clamped to the viewport. Fixes the two failure modes of pure-CSS
// `::after` tooltips: (1) they clip at screen edges, and (2) they're trapped/clipped inside
// `overflow:auto/hidden` ancestors (e.g. the scrollable deck view — the sigil-tooltip bug).
//
// Balatro-style structure: a headline, a body textbox, and — when the hovered thing has a type — a
// colour-coded type chip beneath. The headline is taken from `data-tip-title`, or split off the body
// at the first " — " (so the existing `Name — text` tooltips get a headline for free). The chip comes
// from `data-tip-type` (a slug → label + colour, below).

const TYPE_CHIP: Record<string, { label: string; cls: string }> = {
  joker: { label: "Joker", cls: "tt-joker" },
  tarot: { label: "Tarot", cls: "tt-tarot" },
  spectral: { label: "Spectral", cls: "tt-spectral" },
  drill: { label: "Training", cls: "tt-drill" },
  card: { label: "Playing Card", cls: "tt-card" },
  edict: { label: "Edict", cls: "tt-edict" },
  booster: { label: "Booster", cls: "tt-booster" },
  sigil: { label: "Sigil", cls: "tt-sigil" },
  seal: { label: "Seal", cls: "tt-seal" },
  royal: { label: "Royal", cls: "tt-royal" },
};

interface Tip {
  title?: string;
  text: string;
  type?: string;
  left: number;
  top: number;
  place: "top" | "bottom";
}

export default function TooltipLayer() {
  const [tip, setTip] = useState<Tip | null>(null);

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
      const r = el.getBoundingClientRect();
      const above = r.top > 96; // enough headroom to open upward, else open below
      setTip({ title, text, type, left: r.left + r.width / 2, top: above ? r.top - 8 : r.bottom + 8, place: above ? "top" : "bottom" });
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

  if (!tip) return null;
  const half = 132; // ~half the max width, for horizontal clamping
  const left = Math.min(Math.max(tip.left, half + 6), window.innerWidth - half - 6);
  const chip = tip.type ? TYPE_CHIP[tip.type] : undefined;
  return (
    <div className={`tip-pop tip-${tip.place}`} style={{ left, top: tip.top }} role="tooltip">
      {tip.title && <div className="tip-title">{tip.title}</div>}
      <div className="tip-body">{tip.text}</div>
      {chip && <div className={`tip-type ${chip.cls}`}>{chip.label}</div>}
    </div>
  );
}
