import { useGame } from "./store";
import PixiBoard from "./PixiBoard";
import PixiSidebar from "./PixiSidebar";
import { Suit } from "../engine/types";
import { GLYPH } from "./suits";

// The felt screen — ONE persistent stage for both the fight and the market (Balatro's single canvas).
// <PixiBoard/> stays mounted across combat↔shop (same tree position), so the felt never resets; the
// shop is just a tray layer that rides up on it. The run sidebar AND the joker/pouch HUD band are now
// rendered in Pixi too (PixiSidebar + HudLayer on the felt); only the combat action overlays
// (block badge, pendingPick, defend prompt, wildcard picker, hints) remain DOM, floating over the felt.

export default function FeltScreen() {
  const shop = useGame((s) => s.run.phase === "shop");
  return (
    <div className={`screen combat${shop ? " shop-overlay" : ""}`}>
      <PixiSidebar />
      <div className="combat-field">
        <PixiBoard />
        <div className="combat-ui">
          {!shop && <CombatActions />}
          {!shop && <FeltSort />}
        </div>
      </div>
    </div>
  );
}

// ---- Sort controls, sitting just below the hand on the felt (moved off the sidebar). ----
function FeltSort() {
  const sort = (k: "rank" | "suit") => useGame.getState().sortHand(k);
  return (
    <div className="felt-sort">
      <span className="felt-sort-label">SORT</span>
      <button type="button" onClick={() => sort("rank")}>↕ Rank</button>
      <button type="button" onClick={() => sort("suit")}>↕ Suit</button>
    </div>
  );
}

// ---- The combat overlays that float over the felt (block badge, pendingPick, defend, hints). ----
function CombatActions() {
  const { run, selected, hoverId, discardSelected, wildSuits, setWildSuit, pendingPick, pickLabel, clearSelect } = useGame();
  const combat = run.combat!;
  const defend = combat.subphase === "defend";
  const total = run.hand.filter((c) => selected.includes(c.id)).reduce((a, c) => a + c.value, 0);
  const enough = total >= combat.incoming;
  const autoSelect = () => {
    const cards = run.hand;
    const target = combat.incoming;
    const n = cards.length;
    let bestMask = (1 << n) - 1;
    let bestSum = Infinity;
    let bestCount = n + 1;
    for (let mask = 1; mask < 1 << n; mask++) {
      let sum = 0;
      let count = 0;
      for (let i = 0; i < n; i++) {
        if (mask & (1 << i)) {
          sum += cards[i].value;
          count++;
        }
      }
      if (sum >= target && (sum < bestSum || (sum === bestSum && count < bestCount))) {
        bestSum = sum;
        bestCount = count;
        bestMask = mask;
      }
    }
    const pick = cards.filter((_, i) => (bestMask & (1 << i)) !== 0).map((c) => c.id);
    clearSelect();
    pick.forEach((id) => useGame.getState().toggleSelect(id));
  };
  const inHand = (id: string | null): id is string => !!id && run.hand.some((c) => c.id === id);
  const hovering = inHand(hoverId);
  const previewIds = selected.length > 0 ? selected : hovering ? [hoverId] : [];
  const showActions = !defend && selected.length > 0;
  const wildcards = run.hand.filter((c) => selected.includes(c.id) && (c.sigils ?? []).includes("wildcard"));

  if (combat.outcome) return null;
  return (
    <>
      {combat.enemy.shield > 0 && (
        <div className="player-block" data-tip="Your block — soaks the royal's next strike (stacks)">
          <svg className="player-block-icon" viewBox="0 0 40 46" aria-hidden="true">
            <path d="M20 2 L37 8 V23 C37 34 29 41 20 44 C11 41 3 34 3 23 V8 Z" />
          </svg>
          <span>Block <b>{combat.enemy.shield}</b></span>
        </div>
      )}

      {pendingPick && (
        <div className="ov-pick" role="status">
          <span>{pickLabel ?? "Tap a card"}</span>
          <button type="button" onClick={() => useGame.getState().setPendingPick(null)}>Cancel</button>
        </div>
      )}

      {defend ? (
        <div className="ov-prompt defend">
          <div className="prompt-title">
            ⚔ Block {combat.incoming} <span className="dim">— thrown {total}</span>
          </div>
          <div className="actions">
            <button type="button" onClick={autoSelect}>Auto</button>
            <button type="button" className="primary" disabled={!enough} onClick={() => discardSelected()}>
              Block ({total}/{combat.incoming})
            </button>
          </div>
        </div>
      ) : (
        <div className="ov-bottom">
          {showActions && wildcards.length > 0 && (
            <div className="wild-pick">
              {wildcards.map((c) => (
                <div key={c.id} className="wild-row">
                  <span className="wild-label">★ Wildcard {c.value > 1 ? c.value : "A"} — play as:</span>
                  {(["H", "D", "C", "S"] as Suit[]).map((s) => (
                    <button
                      key={s}
                      type="button"
                      className={`wild-suit ${(wildSuits[c.id] ?? c.suit) === s ? "on" : ""} ${s === "H" || s === "D" ? "red" : "dark"}`}
                      onClick={() => setWildSuit(c.id, s)}
                    >
                      {GLYPH[s]}
                    </button>
                  ))}
                </div>
              ))}
            </div>
          )}
          {previewIds.length === 0 && (
            <span className="ov-hint">Drag a card up to play · tap to build a combo · hover to inspect</span>
          )}
        </div>
      )}
    </>
  );
}
