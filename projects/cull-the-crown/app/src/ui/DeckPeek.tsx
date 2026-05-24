import { useGame } from "./store";
import { Suit } from "../engine/types";

// A Balatro-style "remaining cards at a glance" table that appears in the middle of the battle screen
// only while the pointer is over the draw pile (store.deckHover, set by the Pixi board). Rows = suits,
// columns = ranks, cells = how many of that card are still in the draw pile. Pointer-transparent — a
// glance aid, not a control (click the pile to open the full deck view).

const SUITS: Suit[] = ["S", "H", "C", "D"];
const GLYPH: Record<Suit, string> = { H: "♥", D: "♦", C: "♣", S: "♠" };
const RANKS = [10, 9, 8, 7, 6, 5, 4, 3, 2, 1]; // 1 = Ace / Animal Companion

export default function DeckPeek() {
  const show = useGame((s) => s.deckHover && s.run.phase === "combat" && !!s.run.combat);
  const deck = useGame((s) => s.run.deck);
  if (!show) return null;

  const count = (suit: Suit, v: number) => deck.filter((c) => c.suit === suit && c.value === v).length;
  const rankTotal = (v: number) => deck.filter((c) => c.value === v).length;

  return (
    <div className="deck-peek" role="status" aria-label="Remaining cards in your deck">
      <div className="dp-title">Remaining · {deck.length}</div>
      <div className="dp-grid">
        <div className="dp-row dp-head">
          <span className="dp-rowlabel" />
          {RANKS.map((v) => (
            <span key={v} className="dp-rank">
              {v === 1 ? "A" : v}
            </span>
          ))}
        </div>
        <div className="dp-row dp-totals">
          <span className="dp-rowlabel">#</span>
          {RANKS.map((v) => (
            <b key={v} className={`dp-cell ${rankTotal(v) === 0 ? "zero" : ""}`}>
              {rankTotal(v)}
            </b>
          ))}
        </div>
        {SUITS.map((s) => (
          <div key={s} className={`dp-row ${s === "H" || s === "D" ? "red" : "black"}`}>
            <span className="dp-rowlabel">{GLYPH[s]}</span>
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
