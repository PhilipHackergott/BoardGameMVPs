import { useGame } from '../state/store';

export function EndScreen() {
  const game = useGame((s) => s.game);
  const fpName = useGame((s) => s.fpName);
  const shadowName = useGame((s) => s.shadowName);
  const seed = useGame((s) => s.seed);
  const reset = () => useGame.setState({ screen: 'title', game: null });
  if (!game || !game.winner) return null;
  const won = game.winner.side === 'fp' ? fpName : shadowName;
  const col = game.winner.side === 'fp' ? 'var(--fp-light)' : 'var(--shadow-light)';

  return (
    <div className="overlay">
      <div className="backdrop" />
      <div className="modal" style={{ textAlign: 'center' }}>
        <div className="ring" style={{ fontSize: 48 }}>❂</div>
        <h1 style={{ color: col, fontSize: 40, margin: '8px 0' }}>{won} prevail</h1>
        <p style={{ fontSize: 16 }}>{game.winner.path}.</p>
        <div className="muted">
          Turn {game.turn} · seed {seed} · final VP — FP {game.vp.fp}, Shadow {game.vp.shadow} ·
          Corruption {game.fellowship.corruption}/12 · Mordor {game.fellowship.mordorStep}/5
        </div>
        <button className="primary" style={{ marginTop: 16 }} data-testid="new-game-end" onClick={reset}>
          New Game
        </button>
      </div>
    </div>
  );
}
