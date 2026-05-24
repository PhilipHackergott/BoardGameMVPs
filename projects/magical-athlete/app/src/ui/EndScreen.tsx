import { pointsByPlayer } from '../engine';
import { useGame } from '../state/store';
import { Button, Panel, center, colors, display, heading, playerColor } from './kit';

const MEDALS = ['🥇', '🥈', '🥉', '4️⃣'];

export function EndScreen() {
  const match = useGame((s) => s.match)!;
  const quit = useGame((s) => s.quit);
  const points = pointsByPlayer(match);
  const winners = match.winners ?? [];
  const order = points.map((pts, p) => ({ p, pts })).sort((a, b) => b.pts - a.pts);

  return (
    <div style={{ ...center, maxWidth: 560 }} data-testid="end-screen">
      <div style={{ textAlign: 'center', padding: '30px 0 18px' }}>
        <div style={{ fontFamily: heading, fontSize: 13, letterSpacing: 5, textTransform: 'uppercase', color: colors.accent }}>
          Final results
        </div>
        <h1 style={{ fontFamily: display, fontSize: 46, margin: '10px 0 0', color: colors.accent, textShadow: `3px 3px 0 ${colors.hot}` }}>
          {winners.length > 1 ? 'IT’S A TIE!' : `PLAYER ${winners[0] + 1} WINS!`}
        </h1>
        <p style={{ color: colors.dim, marginTop: 8 }}>Four races of pure chaos, settled.</p>
      </div>

      <Panel glow={colors.accent}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {order.map(({ p, pts }, rank) => {
            const won = winners.includes(p);
            return (
              <div
                key={p}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '12px 14px',
                  borderRadius: 12,
                  background: won ? `${colors.accent}1a` : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${won ? colors.accent : colors.trayEdge}`,
                }}
              >
                <span style={{ fontSize: 22, width: 28, textAlign: 'center' }}>{MEDALS[rank] ?? ''}</span>
                <span style={{ width: 12, height: 12, borderRadius: 4, background: playerColor(p), flex: '0 0 auto' }} />
                <b style={{ fontSize: 16, color: won ? colors.accent : colors.text }}>Player {p + 1}</b>
                <span style={{ marginLeft: 'auto', fontSize: 18, fontWeight: 800 }}>{pts} pts</span>
              </div>
            );
          })}
        </div>
      </Panel>

      <div style={{ marginTop: 18, textAlign: 'center' }}>
        <Button primary onClick={quit} style={{ fontSize: 16, padding: '13px 22px' }}>
          New match
        </Button>
      </div>
    </div>
  );
}
