import { Card, Suit, SUIT_NAME } from "../engine/types";
import { SIGIL_INFO } from "../engine/index";
import WaxSeal from "./WaxSeal";

// The single DOM card-face used everywhere a card is shown outside the Pixi board: the deck overview,
// the card-upgrade picker, and the card-pack reveal. (The in-combat hand is canvas-rendered by Pixi
// and can't be embedded in a DOM modal — this is the shared face for every DOM context.)

const GLYPH: Record<Suit, string> = { H: "♥", D: "♦", C: "♣", S: "♠" };

// Seal (a single per-card stamp from Spectral cards) — colour + a one-line tooltip.
const SEAL_INFO: Record<NonNullable<Card["seal"]>, { name: string; color: string; tip: string }> = {
  gold: { name: "Gold", color: "#f2c14e", tip: "Gold Seal — +3 gold when played" },
  red: { name: "Red", color: "#e0405f", tip: "Red Seal — its value counts twice" },
  blue: { name: "Blue", color: "#5fb0e0", tip: "Blue Seal — a Drill if held when the royal falls" },
  purple: { name: "Purple", color: "#b070e0", tip: "Purple Seal — a Tarot when discarded" },
};

export function cardLabel(c: Card): string {
  if (c.kind === "jester") return "Jester";
  if (c.kind === "companion") return `${GLYPH[c.suit as Suit]}A`;
  return `${c.value}${GLYPH[c.suit as Suit]}`;
}

export function cardSuitClass(c: Card): string {
  if (c.kind === "jester") return "jester";
  return c.suit === "H" || c.suit === "D" ? "red" : "black";
}

function defaultAria(c: Card): string {
  const base = c.suit ? `${c.value} of ${SUIT_NAME[c.suit]}` : "Jester";
  const marks = (c.sigils ?? []).map((s) => SIGIL_INFO[s].name);
  if (c.seal) marks.push(`${SEAL_INFO[c.seal].name} Seal`);
  return marks.length ? `${base}, ${marks.join(", ")}` : base;
}

/** Modification badges (sigils as wax-seal stamps + a twin-suit corner mark), each with a tooltip. */
export function cardMods(c: Card) {
  return (
    <>
      {(c.sigils ?? []).map((sg, i) => (
        <span
          key={sg + i}
          className={`card-sigil sg-${sg}`}
          style={{ top: 3 + i * 27 }}
          data-tip={`${SIGIL_INFO[sg].name} — ${SIGIL_INFO[sg].text}`}
        >
          <WaxSeal sigil={sg} glyph={SIGIL_INFO[sg].glyph} />
        </span>
      ))}
      {c.extraSuit && (
        <span className="card-extra" data-tip={`Twin-Suit — also counts as ${SUIT_NAME[c.extraSuit]}`}>
          {GLYPH[c.extraSuit]}
        </span>
      )}
      {c.seal && (
        <span
          className="card-seal"
          style={{ background: SEAL_INFO[c.seal].color }}
          data-tip={SEAL_INFO[c.seal].tip}
          aria-hidden="true"
        />
      )}
    </>
  );
}

export default function CardFace({
  card,
  className = "",
  onClick,
  ariaLabel,
}: {
  card: Card;
  className?: string;
  onClick?: () => void;
  ariaLabel?: string;
}) {
  const c = card;
  const cls = `card small ${cardSuitClass(c)}${className ? ` ${className}` : ""}`;
  const aria = ariaLabel ?? defaultAria(c);
  // Match the in-combat (Pixi) card model: a rank index in the top-left corner + a big centred suit
  // glyph on parchment. Companions read "A", Jesters "J".
  const corner = c.kind === "companion" ? "A" : c.kind === "jester" ? "J" : String(c.value);
  const inner = (
    <>
      {cardMods(c)}
      <span className="card-corner">{corner}</span>
      <span className="card-glyph">{c.kind === "jester" ? "★" : GLYPH[c.suit as Suit]}</span>
    </>
  );
  return onClick ? (
    <button type="button" className={cls} aria-label={aria} onClick={onClick}>
      {inner}
    </button>
  ) : (
    <div className={cls} aria-label={aria}>
      {inner}
    </div>
  );
}
