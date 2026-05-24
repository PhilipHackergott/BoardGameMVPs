import { useState } from "react";
import { Suit } from "../engine/types";
import ItemArt from "./ItemArt";

// Bridges the generated pixel-art illustrations (served from /public/art/<cat>/<id>.svg) into the
// UI. Not every id has a bespoke illustration yet, so each renderer falls back gracefully: jokers
// fall back to the procedural ItemArt emblem; decks fall back to the plain card-back placeholder.

/** A starting-deck illustration (the ornate card-back), with the plain placeholder as fallback. */
export function DeckArt({ id, locked }: { id: string; locked?: boolean }) {
  const [ok, setOk] = useState(true);
  if (!ok) return <div className={`setup-cardback ${locked ? "locked" : ""}`} aria-hidden="true" />;
  return (
    <img
      className={`deck-art ${locked ? "locked" : ""}`}
      src={`/art/decks/${id}.svg`}
      alt=""
      aria-hidden="true"
      onError={() => setOk(false)}
    />
  );
}

/** A joker's full-card illustration if one exists, else the procedural ItemArt emblem. */
export function JokerArt({ id, art, size = 32, suit }: { id: string; art: string; size?: number; suit?: Suit }) {
  const [ok, setOk] = useState(true);
  if (!ok) return <ItemArt icon={art} size={size} suit={suit} />;
  return (
    <img
      className="joker-art"
      src={`/art/jokers/${id}.svg`}
      alt=""
      aria-hidden="true"
      style={{ height: size, width: "auto", maxWidth: size }}
      onError={() => setOk(false)}
    />
  );
}

/** A held consumable's illustration: tries the tarot arcana art, then the spectral art, then falls
 *  back to the ItemArt emblem (drills and other non-illustrated consumables). */
export function TarotArt({ id, art, size = 26 }: { id: string; art: string; size?: number }) {
  const [step, setStep] = useState(0); // 0 = tarots, 1 = spectrals, 2 = ItemArt fallback
  if (step >= 2) return <ItemArt icon={art} size={size} />;
  const dir = step === 0 ? "tarots" : "spectrals";
  return (
    <img
      className="joker-art"
      src={`/art/${dir}/${id}.svg`}
      alt=""
      aria-hidden="true"
      style={{ height: size, width: "auto", maxWidth: size }}
      onError={() => setStep((s) => s + 1)}
    />
  );
}
