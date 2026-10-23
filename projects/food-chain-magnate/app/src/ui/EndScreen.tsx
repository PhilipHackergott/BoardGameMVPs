import { useGame } from '../state/store';
import { COMPANY_COLORS, COMPANY_CRESTS } from '../render/theme';

export function EndScreen() {
  const { state, humanSeat, toMenu, toSetup } = useGame();
  if (!state) return null;
  const sorted = [...state.companies].sort((a, b) => b.cash - a.cash);
  const winner = state.winner ?? sorted[0].id;
  const youWon = winner === humanSeat;

  return (
    <div className="endscreen">
      <div>
        <span className="est" style={{ background: 'var(--mustard)', padding: '3px 12px', borderRadius: 999, border: '2px solid #2B2118', fontFamily: 'Anton' }}>
          GAME OVER · TURN {state.turn}
        </span>
        <h1 className="display" data-testid="winner" style={{ fontSize: '2.6rem', margin: '12px 0' }}>
          {youWon ? 'You win!' : `${state.companies[winner].name} wins`}
        </h1>
        <p className="muted">The bank ran dry twice. The richest fast-food magnate takes it all.</p>
        <div className="panel" style={{ maxWidth: 360, margin: '16px auto' }}>
          <h3>Final standings</h3>
          <div className="body">
            {sorted.map((c, i) => (
              <div key={c.id} className="standrow" style={i === 0 ? { borderColor: 'var(--mustard-d)', background: '#fff6e0' } : undefined}>
                <span className="crest" style={{ background: COMPANY_COLORS[c.id] }}>{COMPANY_CRESTS[c.id]}</span>
                <span className="nm">{c.name}{c.id === humanSeat ? ' (you)' : ''}</span>
                <span className="mono">${c.cash}</span>
              </div>
            ))}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
          <button className="btn primary" onClick={toSetup}>New Game</button>
          <button className="btn" onClick={toMenu}>Menu</button>
        </div>
      </div>
    </div>
  );
}
