import { useEffect } from "react";
import { useStore } from "./store";
import { Button } from "./atoms";
import { sound } from "../audio/sound";
import { AFFINITY } from "../render/theme";

export function MainMenu() {
  const open = useStore((s) => s.openOverlay);
  const setView = useStore((s) => s.setView);
  const newDeck = useStore((s) => s.newDeck);
  const history = useStore((s) => s.history);
  const continueStory = useStore((s) => s.continueStory);
  const career = useStore((s) => s.career);
  useEffect(() => { sound.music("menu"); }, []);

  return (
    <div className="menu-wrap">
      <div className="menu-hero">
        <div className="menu-affstrip">
          {(["ember", "tide", "verdant", "gloom", "order"] as const).map((a) => (
            <span key={a} style={{ color: AFFINITY[a].core, textShadow: `0 0 10px ${AFFINITY[a].glow}` }}>{AFFINITY[a].glyph}</span>
          ))}
        </div>
        <h1 className="menu-title">PRISM</h1>
        <p className="menu-sub">The Trading Card Game · TCG Circuit</p>
      </div>

      <div className="menu-buttons">
        {career && <Button variant="primary" size="lg" onClick={continueStory}>↩ Continue Story</Button>}
        <Button variant={career ? "default" : "primary"} size="lg" onClick={() => open("contextSelect")}>★ {career ? "New Story (restart)" : "Story — Act I"}</Button>
        <Button size="lg" onClick={() => open("modeSelect")}>▶ Quick Play</Button>
        <Button size="lg" onClick={() => setView("gallery")}>📖 Card Gallery</Button>
        <Button size="lg" onClick={newDeck}>🛠 Deck Builder</Button>
        <Button size="lg" onClick={() => open("rules")}>❔ How to Play</Button>
        <Button size="lg" onClick={() => open("settings")}>⚙ Settings</Button>
      </div>

      <div className="menu-foot">
        <span className="muted">
          {history.length
            ? `Record: ${history.filter((h) => h.outcome === "win").length}W / ${history.filter((h) => h.outcome === "loss").length}L`
            : "An original card game — build a deck, climb the Gauntlet."}
        </span>
      </div>
    </div>
  );
}
