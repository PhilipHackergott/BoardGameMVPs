import { createRoot } from "react-dom/client";
import "./styles.css";
import "./styles-layout.css";
import "./styles-world.css";
import { App } from "./ui/App";
import { useStore } from "./ui/store";
import { expandDeck, getDeck } from "./engine/content/decks";

createRoot(document.getElementById("root")!).render(<App />);

// Dev / e2e seam: drive the harness headlessly (set decks, jump into a duel, dispatch).
(window as unknown as { __prism: unknown }).__prism = {
  store: useStore,
  startFreePlay: (playerDeckId = "emberrush", oppDeckId = "ironlaw", skill = 0.5) =>
    useStore.getState().startFreePlay(expandDeck(getDeck(playerDeckId)), getDeck(playerDeckId).name, oppDeckId, skill),
  startGauntlet: (deckId = "emberrush") => useStore.getState().startGauntlet(deckId),
  state: () => useStore.getState(),
};
