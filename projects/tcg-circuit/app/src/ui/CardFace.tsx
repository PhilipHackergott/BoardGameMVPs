// The ONE <CardFace> model, reused EVERYWHERE (hand, board, deckbuilder, gallery, result). One place
// to restyle. Three sizes off one model. The affinity ramp + rarity colour are injected as CSS vars,
// so styles.css owns the look. Placeholder procedural art (affinity-tinted window + type motif) slots
// out for real pixel art via the asset-manifest seam without touching this component.

import React from "react";
import { CardDef, KeywordName, UnitInstance } from "../engine/prism/types";
import { AFFINITY, RARITY } from "../render/theme";

const KW_LABEL: Record<KeywordName, string> = {
  haste: "Haste", guard: "Guard", drain: "Drain", pierce: "Pierce",
  shield: "Shield", volatile: "Volatile", lifegain: "Lifegain", refractplus: "Refract+",
  rally: "Rally", vengeance: "Vengeance", momentum: "Momentum",
};

function motif(card: CardDef): string {
  if (card.type === "spell") return "✺";
  if (card.type === "gear") return "⚒";
  return AFFINITY[card.affinity].glyph;
}

export function CardFace({
  card,
  size = "hand",
  unit,
  selectable,
  targetable,
  illegal,
  dragging,
  count,
  onClick,
  onPointerDown,
  onPointerEnter,
  onPointerLeave,
}: {
  card: CardDef;
  size?: "hand" | "board" | "list";
  unit?: UnitInstance;
  selectable?: boolean;
  targetable?: boolean;
  illegal?: boolean;
  dragging?: boolean;
  count?: number;
  onClick?: (e: React.PointerEvent) => void;
  onPointerDown?: (e: React.PointerEvent) => void;
  onPointerEnter?: (e: React.PointerEvent) => void;
  onPointerLeave?: (e: React.PointerEvent) => void;
}) {
  const ramp = AFFINITY[card.affinity];
  const power = unit ? unit.power : card.power;
  const damaged = unit && unit.dmgTaken > 0;
  const kws = unit ? unit.keywords : card.keywords ?? [];
  const isMythic = card.rarity === "mythic";
  const style = {
    ["--c-dark" as string]: ramp.dark,
    ["--c-mid" as string]: ramp.mid,
    ["--c-light" as string]: ramp.light,
    ["--c-core" as string]: ramp.core,
    ["--c-glow" as string]: ramp.glow,
    ["--c-rarity" as string]: RARITY[card.rarity].color,
  } as React.CSSProperties;

  return (
    <div
      className={[
        "card", size,
        selectable ? "selectable" : "",
        targetable ? "targetable" : "",
        illegal ? "illegal" : "",
        dragging ? "dragging" : "",
        isMythic ? "prismatic-rim" : "",
      ].join(" ")}
      style={style}
      onClick={onClick as never}
      onPointerDown={onPointerDown}
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
      data-card={card.id}
    >
      <div className="c-top">
        <div className="c-cost">{card.cost}</div>
        <div className="c-aff" title={ramp.label}>{ramp.glyph}</div>
      </div>
      <div className="c-name">{card.name}</div>
      <div className="c-art">
        <span className="c-motif">{motif(card)}</span>
        {unit && (
          <div className="kw-badges">
            {kws.map((k, i) => (
              <span className="kw-badge" key={i}>{KW_LABEL[k.kw]}{k.n ? ` ${k.n}` : ""}</span>
            ))}
          </div>
        )}
        {unit && unit.shield > 0 && <span className="shield-pip">⛨{unit.shield}</span>}
      </div>
      <div className="c-type">
        {card.type}
        {!unit && kws.length > 0 && size !== "list" ? " · " + kws.map((k) => KW_LABEL[k.kw] + (k.n ? " " + k.n : "")).join(", ") : ""}
      </div>
      {size === "hand" && <div className="c-text">{card.text}</div>}
      <div className="c-bottom">
        <span className="c-rarity">{count != null ? `×${count}` : RARITY[card.rarity].label}</span>
        {power != null && (
          <span className={"c-power" + (damaged ? " c-dmg" : "")}>{power}</span>
        )}
      </div>
    </div>
  );
}
