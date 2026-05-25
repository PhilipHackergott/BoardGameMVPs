import { useGame } from "./store";
import { Suit } from "../engine/types";

// A Balatro-style "remaining cards at a glance" matrix that appears in the middle of the battle screen
// only while the pointer is over the draw pile (store.deckHover, set by the Pixi board). Rows = suits
// (each a colour-coded band with its running total), columns = ranks (with a per-rank total), cells =
// how many of that card are still in the draw pile. Pointer-transparent — a glance aid, not a control.

const SUITS: Suit[] = ["S", "H", "C", "D"];
const GLYPH: Record<Suit, string> = { H: "♥", D: "♦", C: "♣", S: "♠" };
const RANKS = [1, 10, 9, 8, 7, 6, 5, 4, 3, 2]; // 1 = Ace / Animal Companion (shown first)

export default function DeckPeek() {
  const show = useGame((s) => s.deckHover && s.run.phase === "combat" && !!s.run.combat);
  const deck = useGame((s) => s.run.deck);
  if (!show) return null;

  const count = (suit: Suit, v: number) => deck.filter((c) => c.suit === suit && c.value === v).length;
  const rankTotal = (v: number) => deck.filter((c) => c.value === v).length;
  const suitTotal = (s: Suit) => deck.filter((c) => c.suit === s).length;

  return (
    <div className="deck-peek" role="status" aria-label="Remaining cards in your deck">
      <div className="dp-grid">
        <div className="dp-row dp-head">
          <span className="dp-rowlabel" />
          {RANKS.map((v) => (
            <span key={v} className="dp-rank">
              <span className="dp-rank-name">{v === 1 ? "A" : v}</span>
              <b className={`dp-rank-total ${rankTotal(v) === 0 ? "zero" : ""}`}>{rankTotal(v)}</b>
            </span>
          ))}
        </div>
        {SUITS.map((s) => (
          <div key={s} className={`dp-row dp-suit-${s}`}>
            <span className="dp-rowlabel">
              <span className="dp-suit-glyph">{GLYPH[s]}</span>
              <b className="dp-suit-total">{suitTotal(s)}</b>
            </span>
            {RANKS.map((v) => {
              const n = count(s, v);
              return (
                <span key={v} className={`dp-cell ${n === 0 ? "zero" : ""}`}>
                  {n}
                </span>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
