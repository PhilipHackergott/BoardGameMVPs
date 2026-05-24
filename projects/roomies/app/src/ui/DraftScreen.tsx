import { useEffect } from "react";
import { useStore } from "../state/store";
import { type GameState } from "../engine";
import { Hud } from "./Hud";
import { CardFace } from "./CardFace";
import { PLAYER_CLASS, PLAYER_GLYPH } from "./cardText";

const centerOf = (el: Element) => {
  const r = el.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
};

export function DraftScreen({ game }: { game: GameState }) {
  const { draftPick, resolveMarty } = useStore();
  const player = game.players[game.current];
  const hand = game.hands[game.current];
  const aiControlled = game.config.seats[game.current] !== "human";

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (game.pending || aiControlled) return;
      const n = Number(e.key);
      if (Number.isInteger(n) && n >= 1 && n <= hand.length) {
        const el = document.querySelectorAll(".draft-hand .hand-card")[n - 1];
        draftPick(hand[n - 1], el ? centerOf(el) : undefined);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [game.pending, aiControlled, hand, draftPick]);

  return (
    <div className="screen draft-screen">
      <Hud game={game} />

      <div className="stage">
        <div className="turn-line">
          <span className={`turn-orb ${PLAYER_CLASS[game.current]}`}>{PLAYER_GLYPH[game.current]}</span>
          {aiControlled ? (
            <span><strong>Player {game.current + 1}</strong> <span className="ai-think">AI is drafting<span className="dots">…</span></span></span>
          ) : (
            <span><strong>Player {game.current + 1}</strong> — draft one card, the rest pass on.</span>
          )}
        </div>

        <section className="pool" data-pool={game.current} aria-label="cards drafted this round">
          <span className="pool-label">Drafted this round</span>
          <div className="pool-cards">
            {player.pool.length === 0 && <span className="muted">nothing yet — pick from your hand below</span>}
            {player.pool.map((cid) => (
              <div key={cid} className="mini-card">
                <CardFace card={game.cards[cid]} jokered={game.jokered.includes(cid)} />
              </div>
            ))}
          </div>
        </section>

        <div className="pass-hint">↻ hands pass {game.passDir === 1 ? "left" : "right"} after everyone picks</div>
      </div>

      <footer className={`draft-hand ${aiControlled ? "ai-controlled" : ""}`} aria-label="your hand">
        {hand.map((cid, i) => (
          <button
            key={cid}
            data-cardid={cid}
            className={`card hand-card ${game.cards[cid].kind}`}
            disabled={aiControlled}
            onClick={aiControlled ? undefined : (e) => draftPick(cid, centerOf(e.currentTarget))}
          >
            <span className="hand-key">{i + 1}</span>
            <CardFace card={game.cards[cid]} jokered={game.jokered.includes(cid)} />
          </button>
        ))}
      </footer>

      {game.pending?.type === "martySwap" && (
        <div className="overlay" role="dialog" aria-label="Marty: swap a hand">
          <div className="modal">
            <h3>🦓 Marty — swap a hand?</h3>
            <p>Swap your passing hand with another player's (resolves when hands pass), or skip.</p>
            <div className="row">
              {game.pending.options.map((pid) => (
                <button key={pid} className={`btn primary ${PLAYER_CLASS[pid]}`} onClick={() => resolveMarty(pid)}>
                  {PLAYER_GLYPH[pid]} Player {pid + 1}
                </button>
              ))}
              <button className="btn ghost" onClick={() => resolveMarty(null)}>Skip</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
