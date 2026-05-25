import { useEffect, useState } from "react";
import { Card, Suit, SUIT_NAME } from "../engine/types";
import { SIGIL_INFO } from "../engine/index";
import { cardImageURL, onCardImageReady } from "../render/cardImage";

// A single card rendered with the Pixi card model (via the shared offscreen renderer) but presented as
// an <img> so it slots into DOM layouts. Drop-in for the old DOM CardFace: same `card small <suit>`
// box (so existing layout CSS applies) — `.pixi-card` just strips the parchment fill so only the
// Pixi-rendered face shows. `w` should match the displayed width for a crisp render.

const SEAL_NAME: Record<NonNullable<Card["seal"]>, string> = { gold: "Gold", red: "Red", blue: "Blue", purple: "Purple" };

function suitClass(c: Card): string {
  if (c.kind === "jester") return "jester";
  return c.suit === "H" || c.suit === "D" ? "red" : "black";
}
function aria(c: Card): string {
  const base = c.kind === "jester" ? "Jester" : c.suit ? `${c.value} of ${SUIT_NAME[c.suit as Suit]}` : "card";
  const marks = (c.sigils ?? []).map((s) => SIGIL_INFO[s].name);
  if (c.seal) marks.push(`${SEAL_NAME[c.seal]} Seal`);
  return marks.length ? `${base}, ${marks.join(", ")}` : base;
}

export default function PixiCard({ card, w = 44, className = "", onClick }: { card: Card; w?: number; className?: string; onClick?: () => void }) {
  const [url, setUrl] = useState(() => cardImageURL(card, w));
  useEffect(() => {
    const u = cardImageURL(card, w);
    if (u) {
      setUrl(u);
      return;
    }
    return onCardImageReady(() => setUrl(cardImageURL(card, w)));
  }, [card, w]);

  const cls = `card small pixi-card ${suitClass(card)}${className ? ` ${className}` : ""}`;
  const img = <img src={url} alt="" draggable={false} />;
  return onClick ? (
    <button type="button" className={cls} aria-label={aria(card)} onClick={onClick}>
      {img}
    </button>
  ) : (
    <div className={cls} aria-label={aria(card)}>
      {img}
    </div>
  );
}
