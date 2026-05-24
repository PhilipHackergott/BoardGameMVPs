import { useState } from "react";
import { audio, music, sfx } from "../audio/chiptune";
import { useGame } from "./store";

// Settings: per-channel volume sliders (music + sound effects), a master mute, and a Debug section.
// Volumes persist via the audio engine; debug mode persists in the store. Opened from the main menu
// and the pause menu.

export default function SettingsMenu({ onClose }: { onClose: () => void }) {
  const [musicVol, setMusicVol] = useState(Math.round(audio.musicVolume * 100));
  const [sfxVol, setSfxVol] = useState(Math.round(audio.sfxVolume * 100));
  const [muted, setMuted] = useState(audio.muted);
  const debug = useGame((s) => s.debug);
  const setDebug = useGame((s) => s.setDebug);
  const inCombat = useGame((s) => s.run.phase === "combat" && !s.run.combat?.outcome);

  return (
    <div className="help-backdrop" role="dialog" aria-modal="true" aria-label="Settings" onClick={onClose}>
      <div className="menu-panel" onClick={(e) => e.stopPropagation()}>
        <div className="help-head">
          <h2>Settings</h2>
          <button type="button" className="primary" onClick={onClose}>
            Done
          </button>
        </div>
        <div className="settings-body">
          <label className="setting-row">
            <span className="setting-name">♪ Music</span>
            <input
              type="range"
              min={0}
              max={100}
              value={musicVol}
              aria-label="Music volume"
              onChange={(e) => {
                const v = Number(e.target.value);
                setMusicVol(v);
                audio.setMusicVolume(v / 100);
                music.start(); // ensure the loop is running so the slider has something to affect
              }}
            />
            <span className="setting-val">{musicVol}</span>
          </label>

          <label className="setting-row">
            <span className="setting-name">♫ Sound FX</span>
            <input
              type="range"
              min={0}
              max={100}
              value={sfxVol}
              aria-label="Sound effects volume"
              onChange={(e) => {
                const v = Number(e.target.value);
                setSfxVol(v);
                audio.setSfxVolume(v / 100);
              }}
              onPointerUp={() => sfx.select()}
              onKeyUp={() => sfx.select()}
            />
            <span className="setting-val">{sfxVol}</span>
          </label>

          <button
            type="button"
            className={`setting-mute ${muted ? "is-muted" : ""}`}
            aria-pressed={muted}
            onClick={() => {
              const next = !muted;
              audio.setMuted(next);
              music.start(); // start/resume the loop on this gesture (esp. when unmuting)
              setMuted(next);
            }}
          >
            {muted ? "🔇 All sound muted — click to unmute" : "🔊 Mute all sound"}
          </button>

          <div className="settings-debug">
            <div className="settings-debug-head">⚙ Debug</div>
            <button
              type="button"
              className={`setting-toggle ${debug ? "on" : ""}`}
              aria-pressed={debug}
              data-tip="Cheat: keep your gold topped up to spend freely"
              onClick={() => setDebug(!debug)}
            >
              {debug ? "✓ Infinite gold ON" : "Infinite gold OFF"}
            </button>
            {debug && (
              <button
                type="button"
                className="setting-defeat"
                disabled={!inCombat}
                data-tip={inCombat ? "Instantly fell the current royal" : "Only during a fight"}
                onClick={() => {
                  useGame.getState().dispatch({ type: "debugDefeat" });
                  onClose();
                }}
              >
                ⚔ Defeat current royal
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
