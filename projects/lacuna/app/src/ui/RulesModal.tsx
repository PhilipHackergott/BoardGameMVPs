export function RulesModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h3>How to Play Lacuna</h3>
          <button className="modal-close" onClick={onClose} aria-label="Close rules">
            ✕
          </button>
        </div>

        <div className="modal-body">
          <section>
            <h4>The Setup</h4>
            <p>
              49 flowers in 7 colors are scattered across the pond — seven of each kind. Gold and
              Silver take turns claiming them.
            </p>
          </section>
          <section>
            <h4>Placing Pawns</h4>
            <p>On your turn:</p>
            <ul>
              <li>
                Click one flower. <strong>Green</strong> lines fan out to same-color flowers with a
                clear path; <strong>red</strong> lines mark blocked ones.
              </li>
              <li>Glide along a green line — your pawn snaps to it — and click to drop it anywhere on the line.</li>
              <li>You claim both flowers at the ends of that line.</li>
            </ul>
          </section>
          <section>
            <h4>Nightfall Harvest</h4>
            <p>
              Once all 12 pawns are down, every remaining flower is gathered by whichever pawn sits
              closest to it. Flowers tied between rival pawns drift away uncollected.
            </p>
          </section>
          <section>
            <h4>Scoring &amp; Victory</h4>
            <p>
              For each color, whoever holds the majority wins that flower. Win the most flowers to
              win the game.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
