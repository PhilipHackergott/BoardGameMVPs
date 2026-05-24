import { useEffect, useRef, useState } from 'react';
import { GOLD_VALUES, SILVER_VALUES } from '../engine';
import { useGame } from '../state/store';
import { colors, display, heading, sideTheme } from './kit';

// A full-screen, non-blocking, auto-clearing flourish that fires on phase changes — a themed
// "RACE n" intro before each race and a "FINISH!" beat when a race ends. Pointer-events are off so
// it never blocks the board underneath; it clears itself. (Mirrors cull-the-crown's TransitionLayer.)

type Variant = 'intro' | 'finish';
interface T {
  id: number;
  variant: Variant;
  text: string;
  sub: string;
  accent: string;
}

export function TransitionLayer() {
  const match = useGame((s) => s.match);
  const phase = match?.phase ?? 'menu';
  const raceNo = match?.raceNo ?? -1;
  const prev = useRef({ phase, raceNo });
  const idRef = useRef(0);
  const [t, setT] = useState<T | null>(null);

  useEffect(() => {
    const p = prev.current;
    prev.current = { phase, raceNo };
    if (!match) return;

    let next: Omit<T, 'id'> | null = null;
    const side = match.config.schedule[match.raceNo];
    const theme = sideTheme[side];

    if (phase === 'race' && p.phase !== 'race') {
      next = {
        variant: 'intro',
        text: `RACE ${match.raceNo + 1}`,
        sub: `${theme.label}  ·  🥇 ${GOLD_VALUES[match.raceNo]}   🥈 ${SILVER_VALUES[match.raceNo]}`,
        accent: theme.accent,
      };
    } else if (phase === 'afterRace' && p.phase === 'race') {
      const r = match.race?.result;
      const sub = r && r.first !== null ? `Player ${r.first + 1} takes the gold` : 'Race complete';
      next = { variant: 'finish', text: '🏁 FINISH!', sub, accent: colors.accent };
    }

    if (!next) return;
    const id = ++idRef.current;
    setT({ ...next, id });
    const dur = next.variant === 'intro' ? 1500 : 1300;
    const handle = window.setTimeout(() => setT((cur) => (cur && cur.id === id ? null : cur)), dur);
    return () => window.clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, raceNo]);

  if (!t) return null;
  return (
    <div className={`ma-transition ${t.variant}`} key={t.id} aria-hidden="true" style={{ ['--accent' as string]: t.accent }}>
      <div className="ma-transition-card">
        <div className="ma-transition-text" style={{ fontFamily: display, color: t.accent, textShadow: `4px 4px 0 ${colors.hot}, 8px 8px 0 rgba(0,0,0,0.4)` }}>
          {t.text}
        </div>
        <div className="ma-transition-sub" style={{ fontFamily: heading, color: colors.text }}>
          {t.sub}
        </div>
      </div>
    </div>
  );
}
