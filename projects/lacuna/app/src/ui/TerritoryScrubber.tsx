import { useGame } from "../state/store";

// A timeline under the board, shown once the game has ended. Drag it to scrub through the
// nightfall harvest — each step assigns one more leftover flower to its nearest pawn — so you
// can browse exactly how the winner was decided. Replay re-runs the animation from the start.
export function TerritoryScrubber() {
  const game = useGame((s) => s.game);
  const reveal = useGame((s) => s.reveal);
  const setReveal = useGame((s) => s.setReveal);
  const replayHarvest = useGame((s) => s.replayHarvest);

  if (!game || game.phase !== "ended") return null;
  const total = game.territory?.length ?? 0;
  if (total === 0) return null; // no leftover flowers to assign

  return (
    <div className="harvest-scrubber">
      <button className="control-btn ghost" onClick={replayHarvest} title="Replay the harvest from the start">
        ↻ Replay
      </button>
      <input
        type="range"
        className="harvest-range"
        min={0}
        max={total}
        step={1}
        value={reveal}
        onChange={(e) => setReveal(Number(e.target.value))}
        aria-label="Nightfall harvest timeline"
      />
      <span className="harvest-count">
        {reveal} / {total}
      </span>
    </div>
  );
}
