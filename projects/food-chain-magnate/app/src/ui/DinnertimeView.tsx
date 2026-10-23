import { useEffect, useState } from 'react';
import { useGame } from '../state/store';
import { PRODUCTS, type GameState } from '../engine';
import { COMPANY_COLORS, COMPANY_CRESTS, PRODUCT_GLYPH } from '../render/theme';

// The marquee digital-only feature: step through Dinnertime household-by-household with the full
// reasoning visible — who was eligible, why one chain won (price + distance, tie-break), what each
// item earned. Controls: prev / next / skip-to-end / replay.

function name(state: GameState, id: number) {
  return state.companies[id]?.name ?? `Co ${id}`;
}
function Crest({ id }: { id: number }) {
  return <span className="crest" style={{ background: COMPANY_COLORS[id] }}>{COMPANY_CRESTS[id]}</span>;
}

export function DinnertimeView() {
  const { state, closeDinnertime } = useGame();
  const report = state?.lastDinnertime;
  const houses = report?.houses ?? [];
  const [step, setStep] = useState(0); // 0..houses.length (last = summary)
  useEffect(() => setStep(0), [report]);
  if (!state || !report) return null;

  const isSummary = step >= houses.length;
  const h = houses[Math.min(step, houses.length - 1)];

  return (
    <div className="backdrop">
      <div className="modal">
        <div className="head">
          <h2>🍽 Dinnertime — Turn {state.turn - 1}</h2>
          <span className="mono">{isSummary ? 'Summary' : `House ${step + 1} / ${houses.length}`}</span>
        </div>
        <div className="body">
          {!isSummary && h && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, fontWeight: 700 }}>
                <span>House #{h.houseId}{h.garden ? ' 🌿(garden ×2)' : ''} wants:</span>
                {PRODUCTS.flatMap((p) => Array(h.demand[p]).fill(p)).map((p, i) => (
                  <span key={i} title={p}>{PRODUCT_GLYPH[p]}</span>
                ))}
              </div>
              <div className="muted" style={{ fontSize: '0.78rem', marginBottom: 8 }}>
                Eligible chains = road-connected AND can serve the full order. Lowest (unit price + distance) wins.
              </div>
              {h.candidates.map((cand, i) => (
                <div key={cand.companyId} className={`cand ${i === 0 ? 'win' : ''}`}>
                  <Crest id={cand.companyId} />
                  <div>
                    <b>{name(state, cand.companyId)}</b>{' '}
                    <span className="calc">price ${cand.unitPrice} + distance {cand.distance} = {cand.score}</span>
                  </div>
                  <span className="mono">{i === 0 ? '✓ WINS' : ''}</span>
                </div>
              ))}
              {h.candidates.length === 0 && <div className="muted">No chain could serve this house — its inhabitants stay home.</div>}
              {h.tieBreak && (
                <div style={{ color: 'var(--cherry)', fontSize: '0.82rem', margin: '6px 0' }}>
                  ⚖ Tie on score → broken by {h.tieBreak === 'waitresses' ? 'most waitresses' : 'earliest turn order'}.
                </div>
              )}
              {h.disqualified.map((d) => (
                <div key={d.companyId} className="cand dq">
                  <Crest id={d.companyId} />
                  <div className="muted">{name(state, d.companyId)} — {d.reason === 'unreachable' ? 'no road connection' : "can't serve the full order"}</div>
                  <span />
                </div>
              ))}
              {h.winner !== null && (
                <div className="payout">
                  <div className="row"><span>{h.itemsSold} item(s) × unit ${h.unitPrice}{h.garden ? ' ×2 garden' : ''}</span><span>paid to {name(state, h.winner)}</span></div>
                  <div className="row" style={{ fontWeight: 700, fontSize: '1.05rem', marginTop: 4 }}><span>Sale</span><span>＋${h.salePayout}</span></div>
                </div>
              )}
            </>
          )}
          {isSummary && (
            <>
              <h3 className="display" style={{ marginTop: 0 }}>After the houses</h3>
              {state.companies.map((c) => (
                <div key={c.id} className="cand">
                  <Crest id={c.id} />
                  <div className="calc">
                    waitresses ＋${report.waitressIncome[c.id] ?? 0} · CFO ＋${report.cfoBonus[c.id] ?? 0}
                  </div>
                  <span className="mono" style={{ fontWeight: 700 }}>＋${report.earned[c.id] ?? 0}</span>
                </div>
              ))}
              <div className="muted" style={{ fontSize: '0.78rem', marginTop: 8 }}>
                Total earned this Dinnertime, paid from the bank. {report.breaksAfter > 0 ? `Bank breaks so far: ${report.breaksAfter}.` : ''}
              </div>
            </>
          )}
        </div>
        <div className="foot">
          <button className="btn" disabled={step === 0} onClick={() => setStep((s) => Math.max(0, s - 1))}>◀ Prev</button>
          <button className="btn" data-testid="dinnertime-skip" onClick={() => setStep(houses.length)}>Skip to end ⏩</button>
          <button className="btn" onClick={() => setStep(0)}>↻ Replay</button>
          {!isSummary ? (
            <button className="btn primary" style={{ marginLeft: 'auto' }} onClick={() => setStep((s) => s + 1)}>Next ▶</button>
          ) : (
            <button className="btn primary" data-testid="close-dinnertime" style={{ marginLeft: 'auto' }} onClick={closeDinnertime}>Continue ▶</button>
          )}
        </div>
      </div>
    </div>
  );
}
