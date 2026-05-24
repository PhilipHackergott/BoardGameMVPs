import { useGame } from '../state/store';

// Decision D4 — the blur "pass the device" overlay between turns when control changes side and the
// incoming player must not see the other's private panel.
export function HandoffOverlay() {
  const pending = useGame((s) => s.handoffPending);
  const viewer = useGame((s) => s.viewer);
  const fpName = useGame((s) => s.fpName);
  const shadowName = useGame((s) => s.shadowName);
  const ack = useGame((s) => s.ackHandoff);
  if (!pending) return null;
  const name = viewer === 'fp' ? fpName : shadowName;
  const col = viewer === 'fp' ? 'var(--fp-light)' : 'var(--shadow-light)';

  return (
    <div className="overlay" data-testid="handoff">
      <div className="backdrop" />
      <div className="modal handoff">
        <div style={{ fontSize: 34 }}>🤲</div>
        <h2 style={{ color: col }}>Pass the device</h2>
        <p>
          The screen is hidden so the Fellowship's secrets stay safe.
          <br />
          Hand to the <b style={{ color: col }}>{name}</b> player.
        </p>
        <button className="primary" data-testid="handoff-ack" onClick={ack}>
          I am {name} — reveal
        </button>
      </div>
    </div>
  );
}
