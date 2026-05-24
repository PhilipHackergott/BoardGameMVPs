import { useState } from 'react';
import { useGame } from '../state/store';

export function TitleScreen() {
  const newGame = useGame((s) => s.newGame);
  const [seed, setSeed] = useState('');
  const [fp, setFp] = useState('Free Peoples');
  const [shadow, setShadow] = useState('Shadow');

  const start = () => {
    const s = seed.trim() === '' ? Math.floor(Math.random() * 0x7fffffff) : Number(seed) >>> 0;
    newGame(s, fp.trim() || 'Free Peoples', shadow.trim() || 'Shadow');
  };

  return (
    <div className="title-screen">
      <div className="ring">❂</div>
      <h1>War of the Ring</h1>
      <div className="sub">
        The full two-player struggle for Middle-earth on one screen — Action dice, armies &amp; sieges,
        the Political track, the Fellowship &amp; the Hunt, and all 96 event cards. Hot-seat, the
        machine as your honest referee.
      </div>
      <div className="row" style={{ gap: 10 }}>
        <input data-testid="fp-name" value={fp} onChange={(e) => setFp(e.target.value)} placeholder="Free Peoples player" />
        <input data-testid="shadow-name" value={shadow} onChange={(e) => setShadow(e.target.value)} placeholder="Shadow player" />
        <input data-testid="seed" value={seed} onChange={(e) => setSeed(e.target.value)} placeholder="seed (optional)" style={{ width: 130 }} />
      </div>
      <button className="primary" data-testid="new-game" style={{ fontSize: 16, padding: '10px 22px' }} onClick={start}>
        Begin the War
      </button>
      <div className="muted" style={{ maxWidth: 480 }}>
        Non-distributed personal prototype. Real Middle-earth names used directly per the recorded IP decision.
      </div>
    </div>
  );
}
