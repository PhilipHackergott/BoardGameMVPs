import { useStore } from "../state/store";

const SPEEDS: { label: string; ms: number }[] = [
  { label: "Fast", ms: 300 },
  { label: "Normal", ms: 750 },
  { label: "Slow", ms: 1400 },
];

export function SettingsScreen() {
  const settings = useStore((s) => s.settings);
  const setSettings = useStore((s) => s.setSettings);
  const goMenu = useStore((s) => s.goMenu);

  return (
    <div className="screen setup">
      <div className="setup-card">
        <div className="setup-head">
          <h2>Settings</h2>
          <button className="btn ghost" onClick={goMenu}>← Menu</button>
        </div>

        <div className="field">
          <label>AI turn speed</label>
          <div className="seg">
            {SPEEDS.map((s) => (
              <button key={s.label} className={settings.aiSpeedMs === s.ms ? "on" : ""} aria-pressed={settings.aiSpeedMs === s.ms} onClick={() => setSettings({ aiSpeedMs: s.ms })}>{s.label}</button>
            ))}
          </div>
          <span className="field-hint">How long AI players pause between moves (so you can follow along).</span>
        </div>

        <div className="field">
          <label>Motion</label>
          <button className={`btn toggle ${settings.reduceMotion ? "on" : ""}`} aria-pressed={settings.reduceMotion} onClick={() => setSettings({ reduceMotion: !settings.reduceMotion })}>
            <span className="dot" /> Reduce motion {settings.reduceMotion ? "ON" : "OFF"}
          </button>
          <span className="field-hint">Turns off the animated backdrop and card-flight animations.</span>
        </div>
      </div>
    </div>
  );
}
