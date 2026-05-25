import { useEffect, useState } from "react";
import { useGame } from "./store";
import { Card, Suit } from "../engine/types";
import { deckById } from "../engine/index";
import { sfx } from "../audio/chiptune";
import PixiDeckRows from "./PixiDeckRows";

// The deck overview / card-upgrade screen. A Balatro-style layout: one row per suit (cards by rank,
// descending) + a stats panel (per-rank & per-suit counts) + Remaining / Full-Deck tabs. Opened to
// inspect a pile (board), or as the card PICKER when an upgrade / removal / tarot is pending — then
// clicking a card runs the pending callback and flashes the chosen card.

const GLYPH: Record<Suit, string> = { H: "♥", D: "♦", C: "♣", S: "♠" };
const SUIT_ROWS: Suit[] = ["S", "H", "C", "D"]; // top → bottom
const RANKS = [10, 9, 8, 7, 6, 5, 4, 3, 2, 1]; // 1 = Ace / Animal Companion (shown last)

export default function DeckModal() {
  const which = useGame((s) => s.pileModal);
  const run = useGame((s) => s.run);
  const pendingPick = useGame((s) => s.pendingPick);
  const pickLabel = useGame((s) => s.pickLabel);
  const [tab, setTab] = useState<"remaining" | "full">("full");
  const [flashId, setFlashId] = useState<string | null>(null);
  const inCombat = run.phase === "combat"; // the "Remaining" (draw-pile) tab only exists mid-fight

  // Default the tab to how the modal was opened (board draw-pile → Remaining, else Full); clear the
  // upgrade flash when it closes.
  useEffect(() => {
    if (which) setTab(which === "deck" && inCombat ? "remaining" : "full");
    else setFlashId(null);
  }, [which, inCombat]);

  if (!which) return null;

  const used = which === "discard";
  const picking = !!pendingPick; // a sigil/removal/tarot is waiting for a target → pick mode
  const showTabs = !used && !picking;
  const effTab = inCombat ? tab : "full"; // Full Deck always shows; Remaining is fight-only

  const close = () => {
    const g = useGame.getState();
    g.setPileModal(null);
    g.setPendingPick(null);
  };

  const all = [...run.deck, ...run.hand, ...run.discard, ...run.table];
  const cards = used ? [...run.discard, ...run.table] : picking || effTab === "full" ? all : run.deck;

  const pick = (c: Card) => {
    const g = useGame.getState();
    if (!g.pendingPick) return;
    sfx.reward();
    setFlashId(c.id); // sparkle the chosen card
    g.pendingPick(c.id); // dispatch (applies the upgrade) + clears pendingPick + wildSuits
    g.setPendingPick(null);
    window.setTimeout(() => g.setPileModal(null), 760); // let the upgrade flash land before closing
  };

  const total = cards.length;
  const suitCount = (s: Suit) => cards.filter((c) => c.suit === s).length;
  const rankCount = (v: number) => cards.filter((c) => c.value === v).length;
  const companions = cards.filter((c) => c.kind === "companion").length;
  const numbers = cards.filter((c) => c.kind === "number").length;
  const jesters = cards.filter((c) => c.kind === "jester").length;
  const title = used ? "Used Pile" : picking ? "Choose a Card" : "Your Deck";
  const variant = deckById(run.deckId);

  return (
    <div className="help-backdrop" role="dialog" aria-modal="true" aria-label={title} onClick={close}>
      <div className={`deck-view ${picking ? "picking" : ""}`} onClick={(e) => e.stopPropagation()}>
        <div className="deck-view-head">
          {showTabs ? (
            <div className="deck-tabs">
              {inCombat && (
                <button type="button" className={effTab === "remaining" ? "on" : ""} onClick={() => setTab("remaining")}>
                  Remaining
                </button>
              )}
              <button type="button" className={effTab === "full" ? "on" : ""} onClick={() => setTab("full")}>
                Full Deck
              </button>
            </div>
          ) : (
            <h2 className="deck-pick-title">{picking ? pickLabel ?? "Pick a card" : "Used Pile"}</h2>
          )}
          <button type="button" className="primary" onClick={close}>
            {picking ? "Cancel" : "Close"}
          </button>
        </div>

        <div className="deck-view-body">
          <aside className="deck-stats">
            <div className="ds-title">{title}</div>
            {variant && <div className="ds-desc">{variant.name}</div>}
            <div className="ds-section">Base Cards</div>
            <div className="ds-basecards">
              <div className="ds-bc">
                <span className="ds-bc-ico">❀</span>
                <b>{companions}</b>
                <i>Pets</i>
              </div>
              <div className="ds-bc">
                <span className="ds-bc-ico">#</span>
                <b>{numbers}</b>
                <i>Cards</i>
              </div>
              <div className="ds-bc">
                <span className="ds-bc-ico">∑</span>
                <b>{total}</b>
                <i>Total</i>
              </div>
            </div>
            <div className="ds-suits">
              {SUIT_ROWS.map((s) => (
                <div key={s} className={`ds-suit-badge ${s === "H" || s === "D" ? "red" : "black"}`}>
                  <span className="ds-suit-ico">{GLYPH[s]}</span>
                  <b>{suitCount(s)}</b>
                </div>
              ))}
            </div>
            {jesters > 0 && <div className="ds-extra">★ {jesters} Jester{jesters > 1 ? "s" : ""}</div>}
          </aside>

          <div className="deck-rankcol" aria-hidden="true">
            {RANKS.map((v) => (
              <div key={v} className={`rank-pill ${rankCount(v) === 0 ? "empty" : ""}`}>
                <span>{v === 1 ? "A" : v}</span>
                <b>{rankCount(v)}</b>
              </div>
            ))}
          </div>

          <PixiDeckRows
            cards={cards}
            picking={picking}
            flashId={flashId}
            onPick={(id) => {
              const c = cards.find((x) => x.id === id);
              if (c) pick(c);
            }}
          />
        </div>
      </div>
    </div>
  );
}
