import { useState } from 'react';
import { useGame } from '../state/store';
import { Board } from './Board';
import { DinnertimeView } from './DinnertimeView';
import { PauseMenu, SettingsModal } from './Modals';
import { ObjectivesPanel } from './Campaign';
import { EMPLOYEES, ENTRY_IDS, MILESTONE_NAMES, type Company, type Product } from '../engine';
import { COMPANY_COLORS, COMPANY_CRESTS, PRODUCT_GLYPH } from '../render/theme';

const MARKET_PRODUCTS: Product[] = ['burger', 'pizza', 'beer'];

function OrgPanel({ c }: { c: Company }) {
  const atWork = c.cards.filter((x) => x.atWork);
  return (
    <div className="panel">
      <h3>Your Company <span className="chip money" style={{ fontSize: '0.6rem', float: 'right' }}>salary ${c.salaryDue}</span></h3>
      <div className="body">
        {atWork.map((card) => (
          <div className="orgnode" key={card.uid}>
            <div className="b">{EMPLOYEES[card.defId].name}</div>
            <div className="f">
              <span className="muted">{EMPLOYEES[card.defId].track}</span>
              <span>{EMPLOYEES[card.defId].salaried ? '$5' : 'free'}</span>
            </div>
          </div>
        ))}
        <div className="muted" style={{ fontSize: '0.7rem', marginTop: 6 }}>
          stock: {(['burger', 'pizza', 'soda', 'lemonade', 'beer'] as Product[]).filter((p) => c.stock[p] > 0).map((p) => `${PRODUCT_GLYPH[p]}${c.stock[p]}`).join(' ') || '—'}
        </div>
      </div>
    </div>
  );
}

export function GameShell() {
  const { state, humanSeat, intents, queueHire, queueMarket, endTurn, toMenu, showDinnertime, replayDinnertime, mode, scenario } = useGame();
  const [paused, setPaused] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  if (!state) return null;
  const human = state.companies[humanSeat];
  const startBank = 50 * state.companies.length;
  const maxBank = startBank + state.companies.reduce((s, c) => s + c.reserve, 0);
  const gaugePct = Math.max(0, Math.min(100, (state.bank / maxBank) * 100));
  const sorted = [...state.companies].sort((a, b) => b.cash - a.cash);

  return (
    <div className="shell">
      <div className="crown">
        <div><span className="lbl">TURN</span> <b className="display">{state.turn}</b></div>
        <div><span className="lbl">BANK CLOCK</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div className="gauge"><div className="fill" style={{ width: `${gaugePct}%` }} /></div>
            <span className="mono">${state.bank}</span>
            <span style={{ fontSize: '0.7rem', fontWeight: 800 }}>{'●'.repeat(state.bankBreaks)}{'○'.repeat(2 - state.bankBreaks)}</span>
          </div>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <button className="btn" title="Replay last Dinnertime" onClick={replayDinnertime}>🍽</button>
          <button className="btn" data-testid="pause" onClick={() => setPaused(true)}>⏸ Pause</button>
        </div>
      </div>

      <div className="body-grid">
        <div className="col">
          {mode === 'campaign' && scenario && <ObjectivesPanel scenario={scenario} state={state} seat={humanSeat} />}
          <div className="panel"><h3>Standings</h3><div className="body">
            {sorted.map((c) => (
              <div key={c.id} className={`standrow ${c.id === sorted[0].id ? 'lead' : ''}`}>
                <span className="crest" style={{ background: COMPANY_COLORS[c.id] }}>{COMPANY_CRESTS[c.id]}</span>
                <span className="nm">{c.name}{c.id === humanSeat ? ' (you)' : ''}</span>
                <span className="mono">${c.cash}</span>
              </div>
            ))}
          </div></div>
          <div className="panel" style={{ flex: 1 }}><h3>Milestones</h3><div className="body" style={{ fontSize: '0.7rem' }}>
            {Object.entries(state.milestones).filter(([, v]) => v.length).slice(0, 8).map(([id, v]) => (
              <div key={id}>★ {MILESTONE_NAMES[id as keyof typeof MILESTONE_NAMES]} — {v.map((cid) => state.companies[cid].name).join(', ')}</div>
            ))}
            {Object.keys(state.milestones).length === 0 && <span className="muted">none claimed yet</span>}
          </div></div>
        </div>

        <div className="col"><Board state={state} /></div>

        <div className="col">
          <OrgPanel c={human} />
          <div className="panel"><h3>Log</h3><div className="body log">
            {[...state.log].slice(-8).reverse().map((e, i) => <div className="e" key={i}>{e}</div>)}
            {state.log.length === 0 && <span className="muted">your campaigns create demand; produce to serve it, then End Turn.</span>}
          </div></div>
        </div>
      </div>

      <div className="actionbar">
        <span className="lbl">WORKING:</span>
        <select id="hire" defaultValue="">
          <option value="" disabled>Recruit…</option>
          {ENTRY_IDS.map((id) => <option key={id} value={id}>{EMPLOYEES[id].name}</option>)}
        </select>
        <button className="btn" onClick={() => {
          const el = document.getElementById('hire') as HTMLSelectElement;
          if (el.value) queueHire(el.value);
        }}>+ Recruit</button>
        {MARKET_PRODUCTS.map((p) => (
          <button key={p} className="btn" onClick={() => queueMarket(p)}>Market {PRODUCT_GLYPH[p]}</button>
        ))}
        <span className="chip">queued: {intents.hire.length} hire · {intents.market.length} ads</span>
        <button className="btn primary" data-testid="end-turn" style={{ marginLeft: 'auto' }} onClick={endTurn}>END TURN ▶</button>
      </div>

      {showDinnertime && <DinnertimeView />}
      {paused && (
        <PauseMenu
          onResume={() => setPaused(false)}
          onSettings={() => setShowSettings(true)}
          onQuit={() => { setPaused(false); toMenu(); }}
        />
      )}
      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
    </div>
  );
}
