import { useGame } from '../state/store';

function Slider({ label, value, on }: { label: string; value: number; on: (v: number) => void }) {
  return (
    <div className="slider-row">
      <label>{label}</label>
      <input type="range" min={0} max={1} step={0.05} value={value} onChange={(e) => on(Number(e.target.value))} style={{ flex: 1 }} />
      <span className="mono" style={{ width: 36, textAlign: 'right' }}>{Math.round(value * 100)}</span>
    </div>
  );
}

export function SettingsModal({ onClose }: { onClose: () => void }) {
  const { settings, setSetting } = useGame();
  return (
    <div className="backdrop">
      <div className="modal">
        <div className="head"><h2>⚙ Settings</h2><button className="btn" onClick={onClose}>✕</button></div>
        <div className="body">
          <label style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 10, fontWeight: 700 }}>
            <input type="checkbox" checked={settings.muted} onChange={(e) => setSetting({ muted: e.target.checked })} /> Mute all sound
          </label>
          <Slider label="Music volume" value={settings.musicVol} on={(v) => setSetting({ musicVol: v })} />
          <Slider label="SFX volume" value={settings.sfxVol} on={(v) => setSetting({ sfxVol: v })} />
          <Slider label="AI pacing" value={settings.aiSpeed} on={(v) => setSetting({ aiSpeed: v })} />
          <hr style={{ border: 'none', borderTop: '1.5px dashed var(--chrome-dark)', margin: '12px 0' }} />
          <label style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
            <input type="checkbox" checked={settings.reduceMotion} onChange={(e) => setSetting({ reduceMotion: e.target.checked })} /> Reduce motion
          </label>
          <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input type="checkbox" checked={settings.highContrast} onChange={(e) => setSetting({ highContrast: e.target.checked })} /> High contrast
          </label>
        </div>
        <div className="foot"><button className="btn primary" data-testid="settings-done" style={{ marginLeft: 'auto' }} onClick={onClose}>Done</button></div>
      </div>
    </div>
  );
}

export function PauseMenu({ onResume, onSettings, onQuit }: { onResume: () => void; onSettings: () => void; onQuit: () => void }) {
  return (
    <div className="backdrop">
      <div className="modal" style={{ width: 'min(380px, 92vw)' }}>
        <div className="head"><h2>⏸ Paused</h2></div>
        <div className="body" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button className="btn primary" data-testid="resume" onClick={onResume}>▶ Resume</button>
          <button className="btn" onClick={onSettings}>⚙ Settings</button>
          <button className="btn" onClick={onQuit}>⌂ Quit to menu (progress is saved)</button>
        </div>
      </div>
    </div>
  );
}

export function HistoryModal({ onClose }: { onClose: () => void }) {
  const entries = useGame((s) => s.history)();
  return (
    <div className="backdrop">
      <div className="modal">
        <div className="head"><h2>📜 Past Games</h2><button className="btn" onClick={onClose}>✕</button></div>
        <div className="body">
          {entries.length === 0 && <p className="muted">No completed games yet.</p>}
          {entries.map((e, i) => (
            <div key={i} className="histrow">
              <span className="muted mono" style={{ width: 110 }}>{e.date}</span>
              <span style={{ flex: 1 }}>🏆 <b>{e.winner}</b> · {e.turns} turns</span>
              <span className="mono">{e.standings.map((s) => `$${s.cash}`).join(' · ')}</span>
            </div>
          ))}
        </div>
        <div className="foot"><button className="btn primary" style={{ marginLeft: 'auto' }} onClick={onClose}>Close</button></div>
      </div>
    </div>
  );
}
