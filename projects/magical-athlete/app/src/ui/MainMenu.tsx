import { useState } from 'react';
import { DEFAULT_SCHEDULE } from '../engine';
import { useGame } from '../state/store';
import { Button, Panel, center, colors, display, heading, sideTheme } from './kit';

export function MainMenu() {
  const newMatch = useGame((s) => s.newMatch);
  const [players, setPlayers] = useState(3);
  const [seed, setSeed] = useState(() => Math.floor(Math.random() * 1e9));

  return (
    <div style={{ ...center, maxWidth: 760 }}>
      <div style={{ textAlign: 'center', padding: '40px 0 22px' }}>
        <div style={{ fontFamily: heading, fontSize: 13, letterSpacing: 5, textTransform: 'uppercase', color: colors.accent }}>
          A racing game of pure chaos
        </div>
        <h1
          style={{
            fontFamily: display,
            fontSize: 62,
            margin: '12px 0 0',
            lineHeight: 1.05,
            color: colors.accent,
            textShadow: `4px 4px 0 ${colors.hot}, 8px 8px 0 rgba(0,0,0,0.35)`,
          }}
        >
          MAGICAL
          <br />
          ATHLETE
        </h1>
        <p style={{ color: colors.dim, marginTop: 16 }}>
          Draft a stable of bizarre racers. Four races, 36 powers, one champion. Local hot-seat.
        </p>
      </div>

      <Panel style={{ maxWidth: 460, margin: '0 auto' }} glow={colors.accent}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div>
            <div style={{ color: colors.dim, fontSize: 13, marginBottom: 8, fontWeight: 600 }}>Players</div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              {[2, 3, 4].map((n) => (
                <Button key={n} primary={players === n} onClick={() => setPlayers(n)} style={{ minWidth: 52 }}>
                  {n}
                </Button>
              ))}
              {players === 2 && (
                <span style={{ color: colors.dim, fontSize: 12.5 }}>double-racer variant — two racers each</span>
              )}
            </div>
          </div>

          <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, color: colors.dim, fontWeight: 600 }}>
            Seed
            <input
              type="number"
              value={seed}
              onChange={(e) => setSeed(Number(e.target.value) || 0)}
              style={{
                padding: '10px 12px',
                fontSize: 15,
                borderRadius: 10,
                border: `1px solid ${colors.trayEdge}`,
                background: 'rgba(255,255,255,0.04)',
                color: colors.text,
                maxWidth: 220,
              }}
            />
          </label>

          <div style={{ display: 'flex', gap: 8, fontSize: 12, color: colors.faint }}>
            <span>🟩 {sideTheme.mild.label}</span>
            <span>·</span>
            <span>🟪 {sideTheme.wild.label}</span>
            <span>· track flips each race</span>
          </div>

          <Button
            primary
            testId="start"
            onClick={() => newMatch({ players, schedule: DEFAULT_SCHEDULE, doubleRacer: players === 2, seed })}
            style={{ fontSize: 16, padding: '13px 18px' }}
          >
            Start match — 4 races →
          </Button>
        </div>
      </Panel>
    </div>
  );
}
