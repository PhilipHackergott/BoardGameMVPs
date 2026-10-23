import { useGame } from '../state/store';
import { PROFILES } from '../ai/profiles';
import { COMPANY_COLORS, COMPANY_CRESTS } from '../render/theme';

const PROFILE_IDS = Object.keys(PROFILES);

export function NewGameSetup() {
  const { seats, setSeats, newGame, toMenu } = useGame();

  const setCount = (n: number) => {
    const next = Array.from({ length: n }, (_, i) =>
      seats[i] ?? { kind: 'ai' as const, profile: PROFILE_IDS[i % PROFILE_IDS.length], tier: 'med' as const },
    );
    next[0] = { ...next[0], kind: 'human' };
    setSeats(next);
  };

  return (
    <div style={{ maxWidth: 640, margin: '40px auto', padding: 16 }}>
      <h1 className="display">New Game — Skirmish</h1>
      <p className="muted">2–4 seats; seat 1 is you. AI rivals have personalities &amp; a difficulty.</p>

      <div style={{ display: 'flex', gap: 8, margin: '12px 0' }}>
        <span className="lbl" style={{ alignSelf: 'center' }}>SEATS:</span>
        {[2, 3, 4].map((n) => (
          <button key={n} className={`btn ${seats.length === n ? 'primary' : ''}`} onClick={() => setCount(n)}>
            {n}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {seats.map((seat, i) => (
          <div key={i} className="panel">
            <div className="body" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span className="crest" style={{ background: COMPANY_COLORS[i] }}>{COMPANY_CRESTS[i]}</span>
              <b>Company {i + 1}</b>
              <span className="chip">{i === 0 ? 'YOU (Human)' : 'AI'}</span>
              {i > 0 && (
                <>
                  <select
                    value={seat.profile}
                    onChange={(e) => setSeats(seats.map((s, j) => (j === i ? { ...s, profile: e.target.value } : s)))}
                  >
                    {PROFILE_IDS.map((p) => (
                      <option key={p} value={p}>{PROFILES[p].name}</option>
                    ))}
                  </select>
                  <select
                    value={seat.tier}
                    onChange={(e) => setSeats(seats.map((s, j) => (j === i ? { ...s, tier: e.target.value as 'low' | 'med' | 'hard' } : s)))}
                  >
                    <option value="low">Easy</option>
                    <option value="med">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </>
              )}
              {i > 0 && <span className="muted" style={{ fontSize: '0.72rem' }}>{PROFILES[seat.profile].tell}</span>}
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
        <button className="btn" onClick={toMenu}>← Menu</button>
        <button className="btn primary" data-testid="start-game" onClick={() => newGame()}>START ▶</button>
      </div>
    </div>
  );
}
