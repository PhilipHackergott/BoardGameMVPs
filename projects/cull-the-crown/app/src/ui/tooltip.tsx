import { useLayoutEffect, useRef, useState } from "react";
import { create } from "zustand";
import { RARITY_CHIP, TYPE_CHIP } from "./packMeta";
import { placeBeside, Placed, AnchorRect } from "./tipPlace";

// The ONE tooltip surface for the whole app. Every source pushes a `Tip` into this store — the DOM
// `data-tip` bridge (TooltipLayer), the Pixi felt's shop/guild hovers (PixiBoard), and the Pixi modals
// (ModalStage.onHover) — and a single <Tooltip> renders it, placed BESIDE its anchor via tipPlace. This
// is finding #6 realised: not "two tooltips that share placement", but one bubble fed by all three.

export interface Tip {
  title?: string;
  text: string;
  type?: string; // packMeta.TYPE_CHIP slug → coloured type pill
  rarity?: string; // packMeta.RARITY_CHIP slug → rarity pill
  anchor: AnchorRect; // the hovered element's screen rect; the bubble sits beside it
}

interface TipStore {
  tip: Tip | null;
  /** Token of the current owner, so a stale `hide()` from one source can't clear another's tip. */
  owner: symbol | null;
  show: (owner: symbol, tip: Tip) => void;
  hide: (owner: symbol) => void;
}

export const useTooltip = create<TipStore>((set) => ({
  tip: null,
  owner: null,
  show: (owner, tip) => set({ owner, tip }),
  hide: (owner) => set((s) => (s.owner === owner ? { owner: null, tip: null } : {})),
}));

/** Mount once (App). Reads the store, measures itself, and places beside the anchor (clamped to the
 *  viewport) before paint — so it never covers the thing it describes and never flashes. */
export function Tooltip() {
  const tip = useTooltip((s) => s.tip);
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<Placed | null>(null);

  useLayoutEffect(() => {
    if (!tip || !ref.current) {
      setPos(null);
      return;
    }
    const b = ref.current.getBoundingClientRect();
    setPos(placeBeside(tip.anchor, b.width, b.height, window.innerWidth, window.innerHeight));
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
