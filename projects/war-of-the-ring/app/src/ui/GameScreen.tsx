import { useMemo, useState } from 'react';
import { useGame, useLegal, useView } from '../state/store';
import { GameCanvas } from './GameCanvas';
import { CombatModal } from './CombatModal';
import {
  CARD_BY_ID,
  CHAR_BY_ID,
  REGIONS,
  type Action,
  type CardId,
  type GameView,
  type Nation,
  type Side,
} from '../engine';
import { actionLabel } from './actionLabel';

const PHASES: { id: string; label: string }[] = [
  { id: 'recoverAndDraw', label: '1 Recover & Draw' },
  { id: 'fellowship', label: '2 Fellowship' },
  { id: 'huntAllocation', label: '3 Hunt' },
  { id: 'actionRoll', label: '4 Roll' },
  { id: 'actionResolution', label: '5 Actions' },
  { id: 'victoryCheck', label: '6 Victory' },
];

const DIE_GLYPH: Record<string, string> = {
  character: 'Char',
  army: 'Army',
  muster: 'Mstr',
  armyMuster: 'A/M',
  event: 'Event',
  will: 'Will★',
  eye: 'Eye◉',
};

export function GameScreen() {
  const view = useView();
  const viewer = useGame((s) => s.viewer);
  const fpName = useGame((s) => s.fpName);
  const shadowName = useGame((s) => s.shadowName);
  if (!view) return null;
  const sideName = (s: Side) => (s === 'fp' ? fpName : shadowName);

  return (
    <div className="app">
      <PhaseBar view={view} sideName={sideName} />
      <div className="game">
        <div className="col">
          <ActionPanel view={view} viewer={viewer} sideName={sideName} />
        </div>
        <div className="center">
          <GameCanvas />
          <RegionInspector view={view} />
        </div>
        <div className="col right">
          <TracksPanel view={view} />
          <FellowshipPanel view={view} viewer={viewer} />
          <HandPanel view={view} viewer={viewer} />
          <LogPanel view={view} />
        </div>
      </div>
      <CombatModal />
    </div>
  );
}

function PhaseBar({ view, sideName }: { view: GameView; sideName: (s: Side) => string }) {
  return (
    <div className="phasebar">
      {PHASES.map((p) => (
        <div key={p.id} className={`phase-pill${view.phase === p.id ? ' active' : ''}`}>
          {p.label}
        </div>
      ))}
      <div className="turn-badge">
        Turn {view.turn} · {view.phase === 'actionResolution' ? `${sideName(view.current)} to act` : `viewing as ${sideName(view.asSide)}`}
      </div>
    </div>
  );
}

function ActionPanel({ view, viewer, sideName }: { view: GameView; viewer: Side; sideName: (s: Side) => string }) {
  const dispatch = useGame((s) => s.dispatch);
  const legal = useLegal();
  const selected = useGame((s) => s.selected);
  const [die, setDie] = useState<number | null>(null);

  if (view.outcome) {
    return (
      <div className="panel">
        <h3>Outcome</h3>
        <div className="outcome-banner">
          <div className="ot">{view.outcome.title}</div>
          <div>{view.outcome.detail}</div>
        </div>
        <button className="primary" data-testid="continue" onClick={() => dispatch({ type: 'clearOutcome' })}>
          Continue ▶
        </button>
      </div>
    );
  }

  const simple = (types: string[]) => legal.filter((a) => types.includes(a.type));

  if (view.phase === 'actionResolution') {
    const cur = view.current;
    const dice = view.dice[cur];
    const dieActions = die === null ? [] : legal.filter((a) => 'dieIndex' in a && (a as { dieIndex: number }).dieIndex === die);
    const filtered = selected
      ? dieActions.filter((a) => involvesRegion(a, selected))
      : dieActions;
    const shown = (filtered.length ? filtered : dieActions).slice(0, 40);

    return (
      <div className="panel">
        <h3>Action Resolution — {sideName(cur)}</h3>
        <div className="muted" style={{ marginBottom: 6 }}>Pick a die, then an action{selected ? ` · filtered to ${REGIONS[selected].name}` : ''}.</div>
        <div className="dice-tray" data-testid="dice-tray">
          {dice.map((d, i) => (
            <div
              key={i}
              className={`die ${cur} ${d.used ? 'used' : ''} ${die === i ? 'sel' : ''}`}
              onClick={() => !d.used && setDie(i)}
              title={d.face}
            >
              {DIE_GLYPH[d.face]}
            </div>
          ))}
        </div>
        <div className="action-list" style={{ marginTop: 10 }}>
          {die !== null &&
            shown.map((a, i) => (
              <button key={i} className={a.type === 'attack' ? 'shadow' : ''} onClick={() => { dispatch(a); setDie(null); }}>
                {actionLabel(a)}
              </button>
            ))}
          {die === null && <div className="muted">Select an unused die above.</div>}
        </div>
        <div className="row" style={{ marginTop: 10 }}>
          <button onClick={() => dispatch({ type: 'forfeitRemaining', side: cur })}>Forfeit remaining dice</button>
        </div>
      </div>
    );
  }

  // non-resolution phases: present the phase-appropriate buttons directly
  let title = 'Phase';
  let actions: Action[] = [];
  if (view.phase === 'recoverAndDraw') {
    title = 'Begin Turn';
    actions = simple(['recoverAndDraw']);
  } else if (view.phase === 'fellowship') {
    title = `Fellowship Phase — ${sideName('fp')}`;
    actions = simple(['declareFellowship', 'changeGuide', 'endPhase']);
  } else if (view.phase === 'huntAllocation') {
    title = `Hunt Allocation — ${sideName('shadow')}`;
    actions = simple(['huntAllocate', 'endPhase']);
  } else if (view.phase === 'actionRoll') {
    title = 'Action Roll';
    actions = simple(['rollDice']);
  } else if (view.phase === 'victoryCheck') {
    title = 'Victory Check';
    actions = simple(['endPhase']);
  }

  return (
    <div className="panel">
      <h3>{title}</h3>
      <div className="muted" style={{ marginBottom: 8 }}>Viewing as {sideName(viewer)}.</div>
      <div className="action-list">
        {actions.map((a, i) => (
          <button key={i} className={i === 0 ? 'primary' : ''} data-testid={`act-${a.type}`} onClick={() => dispatch(a)}>
            {actionLabel(a)}
          </button>
        ))}
      </div>
    </div>
  );
}

function involvesRegion(a: Action, region: string): boolean {
  return (
    ('from' in a && a.from === region) ||
    ('to' in a && a.to === region) ||
    ('regionId' in a && a.regionId === region)
  );
}

function bar(value: number, max: number, color: string) {
  return (
    <div className="track">
      <span style={{ width: `${Math.min(100, (value / max) * 100)}%`, background: color }} />
    </div>
  );
}

function TracksPanel({ view }: { view: GameView }) {
  return (
    <div className="panel">
      <h3>Tracks</h3>
      <div className="kv"><span>Shadow VP (need 10)</span><b>{view.vp.shadow}</b></div>
      {bar(view.vp.shadow, 10, 'var(--shadow)')}
      <div className="kv"><span>Free Peoples VP (need 4)</span><b>{view.vp.fp}</b></div>
      {bar(view.vp.fp, 4, 'var(--fp)')}
      <div className="kv" style={{ marginTop: 8 }}><span>Hunt Box</span><b>{view.huntBox.shadowAllocated + view.huntBox.eye} (eye {view.huntBox.eye})</b></div>
      <h3 style={{ marginTop: 12 }}>Politics</h3>
      {(Object.keys(view.politics) as Nation[]).map((n) => {
        const p = view.politics[n];
        return (
          <div className="kv" key={n}>
            <span style={{ textTransform: 'capitalize' }}>{n}</span>
            <span className="badge" style={{ borderColor: p.atWar ? 'var(--gold)' : 'var(--edge)' }}>
              {p.active ? 'active' : 'passive'} · step {p.step}{p.atWar ? ' · AT WAR' : ''}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function FellowshipPanel({ view, viewer }: { view: GameView; viewer: Side }) {
  const f = view.fellowship;
  const hidden = viewer !== 'fp';
  return (
    <div className="panel">
      <h3>The Fellowship {hidden ? '(hidden)' : '(your secret)'}</h3>
      <div className="kv"><span>Last declared</span><b>{REGIONS[f.lastDeclaredRegion]?.name ?? '—'}</b></div>
      <div className="kv"><span>Status</span><b>{f.revealed ? 'REVEALED' : 'hidden'}</b></div>
      {hidden ? (
        <div className="muted">Progress, Guide, Companions and Corruption are concealed from the Shadow.</div>
      ) : (
        <>
          <div className="kv"><span>Progress</span><b>{f.progress}</b></div>
          <div className="kv"><span>Corruption</span><b>{f.corruption}/12</b></div>
          {bar(f.corruption ?? 0, 12, 'var(--shadow-light)')}
          <div className="kv"><span>Guide</span><b>{f.guideId ? CHAR_BY_ID[f.guideId]?.name : '—'}</b></div>
          <div className="muted" style={{ marginTop: 4 }}>
            Companions: {(f.companions ?? []).map((c) => CHAR_BY_ID[c]?.name).join(', ') || '—'}
          </div>
        </>
      )}
      <div className="kv" style={{ marginTop: 6 }}><span>Mordor</span><b>{f.onMordorTrack ? `step ${f.mordorStep}/5` : 'not yet'}</b></div>
    </div>
  );
}

function HandPanel({ view, viewer }: { view: GameView; viewer: Side }) {
  const hand = view.hands[viewer];
  const cards = Array.isArray(hand) ? (hand as CardId[]) : [];
  const oppCount = typeof view.hands[viewer === 'fp' ? 'shadow' : 'fp'] === 'number' ? (view.hands[viewer === 'fp' ? 'shadow' : 'fp'] as number) : 0;
  return (
    <div className="panel">
      <h3>Your hand ({cards.length}) · opponent holds {oppCount}</h3>
      {cards.length === 0 && <div className="muted">No cards.</div>}
      {cards.map((id) => {
        const c = CARD_BY_ID[id];
        return (
          <div className={`card${c.scripted ? ' scripted' : ''}`} key={id}>
            <div className="ct">{c.title} <span className="badge">{c.dieToPlay}</span>{c.scripted ? <span className="badge"> auto</span> : null}</div>
            <div>{c.event}</div>
            {c.combat && <div className="battle">⚔ {c.combatTitle}: {c.combat}</div>}
          </div>
        );
      })}
    </div>
  );
}

function LogPanel({ view }: { view: GameView }) {
  const entries = useMemo(() => view.log.slice(-40).reverse(), [view.log]);
  return (
    <div className="panel">
      <h3>Chronicle</h3>
      <div className="log" data-testid="log">
        {entries.map((e, i) => (
          <div className={`e ${e.side}`} key={i}>
            <span className="muted">T{e.turn}</span> {e.text}
          </div>
        ))}
      </div>
    </div>
  );
}

function RegionInspector({ view }: { view: GameView }) {
  const selected = useGame((s) => s.selected);
  const select = useGame((s) => s.select);
  if (!selected) return null;
  const r = REGIONS[selected];
  const s = view.regions[selected];
  const reg = s ? Object.entries(s.regular).map(([n, k]) => `${k}×${n} reg`) : [];
  const eli = s ? Object.entries(s.elite).map(([n, k]) => `${k}×${n} eli`) : [];
  return (
    <div className="panel" style={{ position: 'absolute', left: 12, bottom: 12, maxWidth: 320, margin: 0 }} data-testid="region-inspector">
      <h3>{r.name} <button style={{ float: 'right', padding: '2px 6px' }} onClick={() => select(null)}>×</button></h3>
      <div className="muted">{r.terrain}{r.nation ? ` · ${r.nation}` : ''}{r.settlement !== 'none' ? ` · ${r.settlement} (${r.vp} VP)` : ''}</div>
      <div className="kv"><span>Control</span><b>{view.control[selected] ?? 'none'}</b></div>
      {s && (s.leaders + s.nazgul > 0 || reg.length || eli.length) ? (
        <div style={{ marginTop: 6, fontSize: 12 }}>
          <div>{[...reg, ...eli].join(', ') || 'no units'}</div>
          {s.leaders > 0 && <div>{s.leaders} leader(s)</div>}
          {s.nazgul > 0 && <div>{s.nazgul} Nazgul</div>}
          {s.characters.length > 0 && <div>Characters: {s.characters.map((c) => CHAR_BY_ID[c]?.name).join(', ')}</div>}
          {s.besieged && <div style={{ color: 'var(--gold)' }}>Under siege</div>}
        </div>
      ) : (
        <div className="muted" style={{ marginTop: 6 }}>No forces here.</div>
      )}
    </div>
  );
}
