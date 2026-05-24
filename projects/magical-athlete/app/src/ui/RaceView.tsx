import { useEffect, useState } from 'react';
import { GOLD_VALUES, SILVER_VALUES, currentRacerIndex, peekDie, pointsByPlayer } from '../engine';
import { useGame } from '../state/store';
import { racerArt } from '../assets/manifest';
import { powerInfo } from './racerInfo';
import { GameCanvas } from './GameCanvas';
import { Die3D } from './Die3D';
import { RacerCard, type CardStatus } from './RacerCard';
import { Button, Panel, Pill, Swatch, colors, heading, playerColor, sideTheme } from './kit';

export function RaceView() {
  const match = useGame((s) => s.match)!;
  const roll = useGame((s) => s.roll);
  const resolvePrompt = useGame((s) => s.resolvePrompt);
  const nextRace = useGame((s) => s.nextRace);
  const race = match.race!;
  const points = pointsByPlayer(match);
  const racer = (id: string) => match.racersById[id];
  const name = (id: string) => racer(id)?.name ?? id;
  const racing = match.phase === 'race';
  const current = race.racers[currentRacerIndex(race)] ?? race.racers[0];
  const lastRace = match.raceNo + 1 >= match.config.schedule.length;
  const theme = sideTheme[race.side];
  const leadPts = Math.max(...points);

  // collapsed player panels (points-only); expanded by default
  const [collapsed, setCollapsed] = useState<Set<number>>(new Set());
  const toggle = (p: number) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(p)) next.delete(p);
      else next.add(p);
      return next;
    });

  // Trigger modal: the engine reports powers that fired automatically this action; show them and
  // require a confirm before play continues (so reactive abilities are legible).
  const [ackLen, setAckLen] = useState(-1);
  const showTriggers = match.events.length > 0 && match.log.length !== ackLen;
  const dismissTriggers = () => setAckLen(match.log.length);

  // Two-step die: click the die → it tosses + lands on the (real, peeked) value → a "Take turn"
  // button commits the move. The board only advances on Take turn.
  const canRoll = racing && !race.pending && !showTriggers;
  type DieState = 'idle' | 'rolling' | 'rolled';
  const [dieState, setDieState] = useState<DieState>('idle');
  const [nonce, setNonce] = useState(0);
  const [face, setFace] = useState(1);

  // reset to idle whenever it becomes a new racer's roll (or a prompt takes over)
  const turnKey = `${match.raceNo}:${currentRacerIndex(race)}:${match.phase}:${race.pending ? 1 : 0}`;
  useEffect(() => {
    setDieState('idle');
  }, [turnKey]);

  const startRoll = () => {
    if (!canRoll || dieState !== 'idle') return;
    setFace(peekDie(match));
    setNonce((n) => n + 1);
    setDieState('rolling');
    window.setTimeout(() => setDieState('rolled'), 850);
  };
  const takeTurn = () => {
    if (dieState !== 'rolled') return;
    setDieState('idle');
    roll();
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (showTriggers) {
        if (e.key === 'Enter') dismissTriggers();
        return;
      }
      if (racing && race.pending) {
        const n = Number.parseInt(e.key, 10);
        if (n >= 1 && n <= race.pending.options.length) resolvePrompt(race.pending.options[n - 1].id);
      } else if (racing && e.key === 'Enter') {
        if (dieState === 'idle') startRoll();
        else if (dieState === 'rolled') takeTurn();
      } else if (match.phase === 'afterRace' && e.key === 'Enter') {
        nextRace();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [racing, race.pending, resolvePrompt, nextRace, match.phase, canRoll, dieState, match, showTriggers]);

  const statusOf = (player: number, id: string): { status: CardStatus; place?: number | null } => {
    const rip = race.racers.find((r) => r.owner === player && r.racerId === id);
    if (rip) return { status: rip.finished ? 'finished' : 'racing', place: rip.place };
    if ((match.used[player] ?? []).includes(id)) return { status: 'used' };
    return { status: 'idle' };
  };

  return (
    <div style={{ width: '100%', maxWidth: 1500, margin: '0 auto' }}>
      {/* header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <h2 style={{ margin: 0, fontSize: 22, fontFamily: heading, letterSpacing: 0.5, color: colors.accent }}>
            Race {match.raceNo + 1}
            <span style={{ color: colors.faint }}> / {match.config.schedule.length}</span>
          </h2>
          <Pill tint={theme.accent} filled>
            {theme.label}
          </Pill>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Pill tint={colors.accent}>🥇 {GOLD_VALUES[match.raceNo]} pts</Pill>
          <Pill tint="#c7cede">🥈 {SILVER_VALUES[match.raceNo]} pts</Pill>
        </div>
      </div>

      {/* full-width board */}
      <GameCanvas />

      {/* turn control */}
      <div style={{ marginTop: 12 }}>
        {racing ? (
          race.pending ? (
            <Panel glow={theme.accent} style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                <Swatch tint={racerArt(race.racers[race.pending.racer].racerId).tint} label={racerArt(race.racers[race.pending.racer].racerId).label} />
                <span>
                  <Pill tint={playerColor(race.pending.player)} filled>
                    Player {race.pending.player + 1}
                  </Pill>{' '}
                  <b style={{ color: theme.accent }}>
                    {race.pending.dicemonger ? 'Dicemonger' : powerInfo(racer(race.racers[race.pending.racer].racerId)).title}
                  </b>
                </span>
              </span>
              {race.pending.options.map((o) => (
                <Button key={o.id} primary tint={theme.accent} testId="prompt-option" onClick={() => resolvePrompt(o.id)}>
                  {o.label}
                </Button>
              ))}
            </Panel>
          ) : (
            <Panel glow={theme.accent} style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                <Swatch tint={racerArt(current.racerId).tint} label={racerArt(current.racerId).label} />
                <span>
                  <Pill tint={playerColor(current.owner)} filled>
                    Player {current.owner + 1}
                  </Pill>{' '}
                  <b>{name(current.racerId)}</b>
                  {current.tripped && <span style={{ color: colors.bad, fontSize: 13 }}> · tripped (recovers, no move)</span>}
                </span>
              </span>
              <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
                {dieState !== 'rolled' && (
                  <span key="hint" style={{ color: colors.dim, fontSize: 13 }}>
                    {dieState === 'rolling' ? 'Rolling…' : (
                      <>
                        Click the die to roll <span style={{ opacity: 0.6 }}>(or Enter)</span>
                      </>
                    )}
                  </span>
                )}
                <Die3D
                  key="die"
                  value={face}
                  rolling={dieState === 'rolling'}
                  nonce={nonce}
                  onRoll={startRoll}
                  disabled={dieState !== 'idle' || !canRoll}
                  testId={dieState === 'idle' ? 'die' : undefined}
                />
                {dieState === 'rolled' && (
                  <Button key="take" primary tint={theme.accent} testId="roll" onClick={takeTurn}>
                    Take turn →
                  </Button>
                )}
              </div>
            </Panel>
          )
        ) : (
          <Panel glow={colors.good} style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
            <b style={{ color: colors.good, fontSize: 16 }}>Race over!</b>
            <span style={{ display: 'flex', gap: 14, flexWrap: 'wrap', color: colors.dim }}>
              <span>🥇 {race.result.first !== null ? `Player ${race.result.first + 1} (+${GOLD_VALUES[match.raceNo]})` : '—'}</span>
              <span>🥈 {race.result.second !== null ? `Player ${race.result.second + 1} (+${SILVER_VALUES[match.raceNo]})` : '—'}</span>
            </span>
            <div style={{ marginLeft: 'auto' }}>
              <Button primary testId="next-race" onClick={nextRace}>
                {lastRace ? 'Final results →' : 'Next race →'}
              </Button>
            </div>
          </Panel>
        )}
      </div>

      {/* player panels beneath the board — collapsible (points-only when collapsed) */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 12 }}>
        {match.draft.hands.map((hand, p) => {
          const isActive = racing && current.owner === p;
          const pc = playerColor(p);
          const isCollapsed = collapsed.has(p);
          const isLeader = points[p] === leadPts && leadPts > 0;
          return (
            <Panel
              key={p}
              glow={isActive ? pc : undefined}
              style={{ flex: '1 1 250px', minWidth: 190, padding: 12, alignSelf: 'flex-start' }}
            >
              <button
                type="button"
                onClick={() => toggle(p)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  width: '100%',
                  padding: 0,
                  border: 'none',
                  background: 'transparent',
                  color: colors.text,
                  cursor: 'pointer',
                }}
              >
                <span style={{ color: colors.faint, fontSize: 12, width: 12 }}>{isCollapsed ? '▸' : '▾'}</span>
                <span style={{ width: 12, height: 12, borderRadius: 4, background: pc, flex: '0 0 auto' }} />
                <b style={{ fontFamily: heading, fontSize: 15 }}>Player {p + 1}</b>
                {isActive && <Pill tint={pc} filled>Turn</Pill>}
                <span style={{ marginLeft: 'auto', fontFamily: heading, fontSize: 16, color: isLeader ? colors.accent : colors.dim }}>
                  {isLeader ? '👑 ' : ''}
                  {points[p]} pts
                </span>
              </button>

              {!isCollapsed && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginTop: 10 }}>
                  {hand.map((id) => {
                    const { status, place } = statusOf(p, id);
                    return <RacerCard key={id} racerId={id} status={status} place={place} accent={pc} dense />;
                  })}
                </div>
              )}
            </Panel>
          );
        })}
      </div>

      {showTriggers && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 80, display: 'grid', placeItems: 'center', background: 'rgba(8,5,12,0.72)', padding: 16 }}>
          <Panel glow={colors.accent} style={{ maxWidth: 470, width: '100%' }}>
            <div style={{ fontFamily: heading, fontSize: 20, color: colors.accent, marginBottom: 12 }}>⚡ Abilities triggered</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 9, marginBottom: 16 }}>
              {match.events.map((e, i) => {
                const r = race.racers[e.racer];
                const owner = r?.owner ?? 0;
                const who = name(r?.racerId ?? '');
                const title = powerInfo(racer(r?.racerId ?? ''))?.title ?? '';
                const tgtName = name(race.racers[e.target]?.racerId ?? '');
                const self = e.target === e.racer;
                const amt = e.amount ?? 0;
                let effect = 'took a bonus chip';
                if (e.kind === 'move') effect = self ? (amt >= 0 ? `moved ${amt} forward` : `slid ${-amt} back`) : amt >= 0 ? `pushed ${tgtName} ${amt} forward` : `knocked ${tgtName} ${-amt} back`;
                else if (e.kind === 'trip') effect = self ? 'tripped' : `tripped ${tgtName}`;
                else if (e.kind === 'warp') effect = self ? 'warped to a new space' : `warped ${tgtName}`;
                else if (e.kind === 'eliminate') effect = `chomped ${tgtName}!`;
                return (
                  <div key={i} style={{ display: 'flex', gap: 9, alignItems: 'center', fontSize: 14 }}>
                    <span style={{ width: 11, height: 11, borderRadius: 3, background: playerColor(owner), flex: '0 0 auto' }} />
                    <span>
                      <b style={{ color: colors.accent }}>{title}</b> — <b>P{owner + 1}</b> {who} {effect}
                    </span>
                  </div>
                );
              })}
            </div>
            <div style={{ textAlign: 'right' }}>
              <Button primary testId="trigger-confirm" onClick={dismissTriggers}>
                Got it <span style={{ opacity: 0.6 }}>(Enter)</span>
              </Button>
            </div>
          </Panel>
        </div>
      )}
    </div>
  );
}
