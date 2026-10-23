import { useState } from 'react';
import { useGame, scenarioUnlocked } from '../state/store';
import {
  CAMPAIGN_ARC,
  ERAS,
  evaluateObjective,
  medalFor,
  type Fail,
  type GameState,
  type Objective,
  type ScenarioDef,
} from '../engine';
import { PROFILES } from '../ai/profiles';
import { COMPANY_COLORS, COMPANY_CRESTS } from '../render/theme';

const MEDAL_GLYPH: Record<string, string> = { gold: '🥇', silver: '🥈', bronze: '🥉' };

export function describeObjective(o: Objective): string {
  switch (o.kind) {
    case 'richestAtEnd': return 'Be the richest when the bank empties';
    case 'cashBy': return `Reach $${o.amount} by turn ${o.turn}`;
    case 'employeesFirstTo': return `Be first to ${o.n} employees`;
    case 'bankruptRivals': return `Bankrupt ${o.count ?? 'all'} rival${(o.count ?? 2) > 1 ? 's' : ''}`;
    case 'outlastAll': return 'Outlast every rival';
  }
}
export function describeFail(f: Fail): string {
  return f.kind === 'turnLimit' ? `Don't run past turn ${f.turn}` : "Don't go bankrupt";
}

/** Live objectives panel shown inside the in-game shell during a campaign scenario. */
export function ObjectivesPanel({ scenario, state, seat }: { scenario: ScenarioDef; state: GameState; seat: number }) {
  return (
    <div className="panel">
      <h3>🎯 {scenario.title}</h3>
      <div className="body" style={{ fontSize: '0.8rem' }}>
        {scenario.modifier && <div className="chip" style={{ background: '#fdebea', borderColor: 'var(--cherry)', marginBottom: 8 }}>⚠ {scenario.modifier}</div>}
        {scenario.objectives.map((o, i) => {
          const r = evaluateObjective(state, seat, o);
          return (
            <div key={i} style={{ display: 'flex', gap: 6, marginBottom: 4 }}>
              <span>{r.met ? '✅' : '⬜'}</span>
              <span>{describeObjective(o)}</span>
            </div>
          );
        })}
        {scenario.fails.map((f, i) => (
          <div key={`f${i}`} className="muted" style={{ display: 'flex', gap: 6, marginTop: 2 }}>
            <span>✗</span><span>Fail if you {describeFail(f).replace("Don't ", '').replace('run past', 'run past')}</span>
          </div>
        ))}
        <div className="muted" style={{ marginTop: 8 }}>Turn {state.turn}</div>
      </div>
    </div>
  );
}

function Briefing({ def, onStart, onBack }: { def: ScenarioDef; onStart: () => void; onBack: () => void }) {
  return (
    <div className="backdrop">
      <div className="modal">
        <div className="head"><h2>{def.title}</h2><span className="muted">{def.era}</span></div>
        <div className="body">
          <p>{def.briefing}</p>
          {def.modifier && <div className="chip" style={{ background: '#fdebea', borderColor: 'var(--cherry)' }}>⚠ {def.modifier}</div>}
          <h3 className="display" style={{ fontSize: '0.95rem', margin: '12px 0 4px' }}>Rivals</h3>
          {def.rivals.map((r, i) => (
            <div key={i} className="histrow">
              <b>{PROFILES[r.profile]?.name ?? r.profile}</b>
              <span className="chip">{r.tier}</span>
              <span className="muted" style={{ fontSize: '0.74rem' }}>{PROFILES[r.profile]?.tell}</span>
            </div>
          ))}
          <h3 className="display" style={{ fontSize: '0.95rem', margin: '12px 0 4px' }}>Objectives</h3>
          {def.objectives.map((o, i) => <div key={i}>🎯 {describeObjective(o)}</div>)}
          {def.fails.map((f, i) => <div key={i} className="muted">✗ {describeFail(f)}</div>)}
          <h3 className="display" style={{ fontSize: '0.95rem', margin: '12px 0 4px' }}>Medals (turns to win)</h3>
          <div>🥇 ≤{def.medals.gold} · 🥈 ≤{def.medals.silver} · 🥉 ≤{def.medals.bronze}</div>
        </div>
        <div className="foot">
          <button className="btn" onClick={onBack}>← Back</button>
          <button className="btn primary" data-testid="start-scenario" style={{ marginLeft: 'auto' }} onClick={onStart}>Start ▶</button>
        </div>
      </div>
    </div>
  );
}

export function CampaignHub() {
  const { career, toMenu, startScenario, setCompany } = useGame();
  const [selected, setSelected] = useState<ScenarioDef | null>(null);

  return (
    <div style={{ maxWidth: 820, margin: '24px auto', padding: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button className="btn" onClick={toMenu}>← Menu</button>
        <h1 className="display" style={{ margin: 0 }}>Rise of a Fast-Food Empire</h1>
      </div>

      {/* Dossier */}
      <div className="panel" style={{ margin: '12px 0' }}>
        <h3>Career Dossier</h3>
        <div className="body" style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
          <span className="crest" style={{ width: 28, height: 28, background: COMPANY_COLORS[career.company.color] }}>{COMPANY_CRESTS[career.company.crest]}</span>
          <input value={career.company.name} onChange={(e) => setCompany({ name: e.target.value })} style={{ width: 140 }} aria-label="company name" />
          <span>Color:</span>
          {COMPANY_COLORS.map((c, i) => (
            <button key={i} aria-label={`color ${i}`} onClick={() => setCompany({ color: i })} style={{ width: 22, height: 22, background: c, border: career.company.color === i ? '3px solid #2B2118' : '1.5px solid #888', borderRadius: 4 }} />
          ))}
          <span>Crest:</span>
          {COMPANY_CRESTS.map((g, i) => (
            <button key={i} className="btn" onClick={() => setCompany({ crest: i })} style={{ padding: '2px 8px', background: career.company.crest === i ? 'var(--mustard)' : undefined }}>{g}</button>
          ))}
          <span className="muted mono" style={{ marginLeft: 'auto', fontSize: '0.78rem' }}>
            cleared {career.dossier.scenariosCleared}/{CAMPAIGN_ARC.length} · wins {career.dossier.gamesWon} · unlocks {career.unlocks.length}
          </span>
        </div>
      </div>

      {/* Arc by era */}
      {ERAS.map((era) => (
        <div key={era} style={{ marginBottom: 14 }}>
          <h3 className="display" style={{ color: 'var(--navy)', borderBottom: '2px solid var(--chrome-dark)', paddingBottom: 4 }}>{era}</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 10, marginTop: 8 }}>
            {CAMPAIGN_ARC.filter((s) => s.era === era).map((s) => {
              const unlocked = scenarioUnlocked(career, s.id);
              const medal = career.medals[s.id];
              const cleared = career.cleared.includes(s.id);
              return (
                <button
                  key={s.id}
                  className="panel"
                  data-testid={`scenario-${s.id}`}
                  disabled={!unlocked}
                  onClick={() => unlocked && setSelected(s)}
                  style={{ textAlign: 'left', cursor: unlocked ? 'pointer' : 'not-allowed', opacity: unlocked ? 1 : 0.5, padding: 0 }}
                >
                  <div className="body">
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <b>{s.title}</b>
                      <span>{!unlocked ? '🔒' : cleared ? (medal ? MEDAL_GLYPH[medal] : '✔') : ''}</span>
                    </div>
                    <div className="muted" style={{ fontSize: '0.74rem', marginTop: 4 }}>{s.players} seats · {s.rivals.length} rival{s.rivals.length > 1 ? 's' : ''}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      ))}

      {selected && <Briefing def={selected} onBack={() => setSelected(null)} onStart={() => startScenario(selected)} />}
    </div>
  );
}

export function ScenarioDebrief() {
  const { debrief, backToHub, startScenario, toMenu } = useGame();
  if (!debrief) return null;
  const { scenario, outcome, medal, turns, newUnlocks } = debrief;
  const won = outcome === 'win';
  return (
    <div className="endscreen">
      <div style={{ maxWidth: 460 }}>
        <span className="est" style={{ background: won ? 'var(--mustard)' : 'var(--chrome)', padding: '3px 12px', borderRadius: 999, border: '2px solid #2B2118', fontFamily: 'Anton' }}>
          {scenario.title} · {scenario.era}
        </span>
        <h1 className="display" data-testid="debrief-result" style={{ fontSize: '2.4rem', margin: '12px 0' }}>
          {won ? 'Scenario cleared!' : 'Scenario failed'}
        </h1>
        {won && medal && <div style={{ fontSize: '3rem' }} data-testid="debrief-medal">{MEDAL_GLYPH[medal]} {medal} medal</div>}
        {won && !medal && <p className="muted">Cleared — beat it faster for a medal ({medalFor(scenario, scenario.medals.bronze)} ≤{scenario.medals.bronze} turns). You took {turns}.</p>}
        {!won && <p className="muted">The objectives weren't met. Try again.</p>}
        {newUnlocks.length > 0 && (
          <div className="panel" style={{ margin: '14px auto', maxWidth: 360 }}>
            <h3>Unlocked</h3>
            <div className="body">{newUnlocks.map((u) => <div key={u}>🔓 {u}</div>)}</div>
          </div>
        )}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 12 }}>
          <button className="btn primary" data-testid="debrief-hub" onClick={backToHub}>Campaign hub</button>
          <button className="btn" onClick={() => startScenario(scenario)}>Replay</button>
          <button className="btn" onClick={toMenu}>Menu</button>
        </div>
      </div>
    </div>
  );
}
