import { useEffect, useRef, useState } from "react";
import { useStore, getCard } from "./store";
import { PlasmaBackground } from "../render/PlasmaBackground";
import { PLASMA } from "../render/theme";
import { MainMenu } from "./MainMenu";
import { DuelScreen } from "./DuelScreen";
import { Deckbuilder } from "./Deckbuilder";
import { Gallery } from "./Gallery";
import { Overlays } from "./overlays";
import { FlyLayer } from "./FlyLayer";
import { CardFace } from "./CardFace";
import { Overworld } from "./Overworld";
import { OverworldHUD, DialogueBox } from "./world-ui";

export function App() {
  const view = useStore((s) => s.view);
  const reduceMotion = useStore((s) => s.settings.reduceMotion);
  const palette = view === "duel" ? PLASMA.duel : view === "deckbuilder" || view === "gallery" ? PLASMA.build : PLASMA.menu;
  return (
    <>
      {view !== "world" && <PlasmaBackground palette={palette} reduceMotion={reduceMotion} />}
      <div className="app">
        {view === "menu" && <MainMenu />}
        {view === "duel" && <DuelScreen />}
        {view === "deckbuilder" && <Deckbuilder />}
        {view === "gallery" && <Gallery />}
        {view === "world" && (
          <div className="world-wrap">
            <Overworld />
            <OverworldHUD />
          </div>
        )}
      </div>
      <Overlays />
      <DialogueBox />
      <FlyLayer />
      <DeckPeek />
    </>
  );
}

/** A hover preview of any card at full (hand) size — the "deck peek" for small board/list cards. */
function DeckPeek() {
  const id = useStore((s) => s.peekCardId);
  const pos = useRef({ x: 0, y: 0 });
  const [, force] = useState(0);
  useEffect(() => {
    const onMove = (e: PointerEvent) => { pos.current = { x: e.clientX, y: e.clientY }; if (id) force((n) => n + 1); };
    window.addEventListener("pointermove", onMove);
    return () => window.removeEventListener("pointermove", onMove);
  }, [id]);
  if (!id) return null;
  const card = getCard(id);
  const x = Math.min(pos.current.x + 18, window.innerWidth - 160);
  const y = Math.min(pos.current.y + 8, window.innerHeight - 210);
  return (
    <div style={{ position: "fixed", left: x, top: y, zIndex: 80, pointerEvents: "none" }}>
      <CardFace card={card} size="hand" />
    </div>
  );
}
