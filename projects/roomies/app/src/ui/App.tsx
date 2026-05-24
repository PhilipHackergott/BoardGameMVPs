import { useEffect, useState } from "react";
import { useStore } from "../state/store";
import { aiDraftPick, aiMartySwap, aiPlaceAction } from "../ai/ai";
import { Backdrop } from "./Backdrop";
import { FlyLayer } from "./FlyLayer";
import { MainMenu } from "./MainMenu";
import { SetupScreen } from "./SetupScreen";
import { SettingsScreen } from "./SettingsScreen";
import { PassDeviceScreen } from "./PassDeviceScreen";
import { DraftScreen } from "./DraftScreen";
import { PlaceScreen } from "./PlaceScreen";
import { EndScreen } from "./EndScreen";

function PhaseBanner() {
  const announce = useStore((s) => s.announce);
  const handHidden = useStore((s) => s.handHidden);
  const [shown, setShown] = useState<string | null>(null);
  useEffect(() => {
    if (!announce || handHidden) return;
    setShown(announce);
    const t = window.setTimeout(() => setShown(null), 1700);
    return () => window.clearTimeout(t);
  }, [announce, handHidden]);
  if (!shown) return null;
  return <div className="phase-banner" key={shown}><span>{shown}</span></div>;
}

// Drives AI seats: when it's an AI's turn (and not waiting on a human pass screen), play one
// action after a paced delay, then the state change re-runs this effect for the next action.
function useAiDriver() {
  const game = useStore((s) => s.game);
  const handHidden = useStore((s) => s.handHidden);
  const settings = useStore((s) => s.settings);

  useEffect(() => {
    if (!game || game.phase === "ended" || handHidden) return;
    const seat = game.config.seats[game.current];
    if (seat === "human") return;

    const delay = settings.reduceMotion ? 140 : settings.aiSpeedMs;
    const t = window.setTimeout(() => {
      const s = useStore.getState();
      const g = s.game;
      if (!g || g.phase === "ended") return;
      const d = g.config.seats[g.current];
      if (d === "human") return;
      if (g.pending?.type === "martySwap") return s.resolveMarty(aiMartySwap(g, d));
      if (g.phase === "draft") return s.draftPick(aiDraftPick(g, d));
      const a = aiPlaceAction(g, d);
      if (a.type === "place") s.place(a.cardId, { env: a.targetEnvCardId, animal: a.targetAnimalCardId });
      else if (a.type === "discardFromPool") s.discardFromPool(a.cardId);
      else s.endPlacement();
    }, delay);
    return () => window.clearTimeout(t);
  }, [game, handHidden, settings]);
}

export function App() {
  const screen = useStore((s) => s.screen);
  const game = useStore((s) => s.game);
  const handHidden = useStore((s) => s.handHidden);
  useAiDriver();

  let body;
  if (screen === "menu") body = <MainMenu />;
  else if (screen === "setup") body = <SetupScreen />;
  else if (screen === "settings") body = <SettingsScreen />;
  else if (!game) body = <MainMenu />;
  else if (game.phase === "ended") body = <EndScreen game={game} />;
  else if (handHidden) body = <PassDeviceScreen player={game.current} phase={game.phase} />;
  else if (game.phase === "draft") body = <DraftScreen game={game} />;
  else body = <PlaceScreen game={game} />;

  return (
    <>
      <Backdrop />
      <div className="app">{body}</div>
      <PhaseBanner />
      <FlyLayer />
    </>
  );
}
