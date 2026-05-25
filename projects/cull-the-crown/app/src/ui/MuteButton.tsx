import { useState } from "react";
import { audio, music, sfx } from "../audio/chiptune";

// Toggles all synthesised audio (score + SFX). Clicking also satisfies the autoplay gesture. Lives in
// the run sidebar footer (combat/shop) and in the screen corner elsewhere.
export default function MuteButton() {
  const [muted, setMuted] = useState(audio.muted);
  return (
    <button
      type="button"
      className="mute-btn"
      data-tip={muted ? "Sound off — click to enable" : "Mute sound"}
      aria-label={muted ? "Unmute sound" : "Mute sound"}
      aria-pressed={muted}
      onClick={() => {
        const next = !muted;
        audio.setMuted(next);
        music.start(); // ensure the audio clock is running (and resumed) on this gesture
        if (!next) sfx.select(); // a confirming blip when turning sound on
        setMuted(next);
      }}
    >
      {muted ? "🔇" : "♪"}
    </button>
  );
}
