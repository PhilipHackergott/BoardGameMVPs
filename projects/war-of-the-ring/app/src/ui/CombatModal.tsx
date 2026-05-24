import { useGame, useLegal } from '../state/store';
import { REGIONS } from '../engine';
import { actionLabel } from './actionLabel';

// The combat resolver modal: shows the assembled dice, leadership re-rolls, the step log, and the
// attacker/defender choices (round / retreat / cease / press-siege). "Beats not cuts" — the result
// is shown before control returns to the board.
export function CombatModal() {
  const game = useGame((s) => s.game);
  const dispatch = useGame((s) => s.dispatch);
  const legal = useLegal();
  if (!game?.pendingCombat) return null;
  const c = game.pendingCombat;
  const lr = c.lastRoll;
  const rn = (id: string) => REGIONS[id]?.name ?? id;

  return (
    <div className="overlay" data-testid="combat-modal">
      <div className="backdrop" />
      <div className="modal" style={{ minWidth: 460 }}>
        <h2 style={{ color: 'var(--gold)' }}>
          {c.siege ? 'Siege' : 'Battle'} — {rn(c.attackerRegion)} ⚔ {rn(c.defenderRegion)}
        </h2>
        <div className="muted">Round {c.round}{c.siege ? ' · siege (attacker hits on 6, defender on 5–6)' : ' · field (hit on 5–6)'}</div>

        {lr && (
          <div className="row" style={{ marginTop: 10, gap: 24 }}>
            <div>
              <div style={{ color: 'var(--shadow-light)' }}>Attacker hits: <b>{lr.attackerHits}</b></div>
              <div className="muted">dice {lr.attackerDice.join(', ') || '—'}{lr.attackerRerolls.length ? ` · rerolls ${lr.attackerRerolls.join(', ')}` : ''}</div>
            </div>
            <div>
              <div style={{ color: 'var(--fp-light)' }}>Defender hits: <b>{lr.defenderHits}</b></div>
              <div className="muted">dice {lr.defenderDice.join(', ') || '—'}{lr.defenderRerolls.length ? ` · rerolls ${lr.defenderRerolls.join(', ')}` : ''}</div>
            </div>
          </div>
        )}

        <div className="log" style={{ marginTop: 10 }}>
          {c.log.map((l, i) => (
            <div className="e" key={i}>{l}</div>
          ))}
        </div>

        <div className="row" style={{ marginTop: 14 }}>
          {legal
            .filter((a) => a.type.startsWith('combat'))
            .map((a, i) => (
              <button key={i} className={a.type === 'combatRound' ? 'primary' : ''} onClick={() => dispatch(a)}>
                {actionLabel(a)}
              </button>
            ))}
        </div>
      </div>
    </div>
  );
}
