import { createRoot } from "react-dom/client";
import { App } from "./ui/App";
import { AudioController } from "./ui/AudioController";
import { audio } from "./audio/audio";
import { DEFAULT_CONFIG, legalMoves } from "./engine";
import { useGame } from "./state/store";
import "./styles.css";

const root = document.getElementById("root");
if (!root) throw new Error("Missing #root element");
createRoot(root).render(
  <>
    <App />
    <AudioController />
  </>,
);

// Dev-only test seam for the Stage 5 visual playtest (lets Playwright read engine
// state and enumerate legal moves to drive canvas clicks). Absent in production.
if (import.meta.env.DEV) {
  (window as unknown as Record<string, unknown>).__nightweave = {
    getState: () => useGame.getState(),
    legalMoves,
    newGame: (seed?: string) => {
      useGame.setState({ screen: "game" });
      useGame.getState().newGame(seed);
    },
    center: DEFAULT_CONFIG.fieldR + 40,
    audio, // expose the audio engine so the playtest can probe the music graph
  };
}
