import { useState } from "react";
import { hasSavedRun } from "./store";
import RunSetup from "./RunSetup";
import SettingsMenu from "./SettingsMenu";
import PastRunsOverlay from "./PastRunsOverlay";
import Collection from "./Collection";

export default function TitleScreen() {
  const [overlay, setOverlay] = useState<null | "setup" | "settings" | "past" | "collection">(null);
  const canContinue = hasSavedRun();

  return (
    <div className="screen title">
      <h1>Cull the Crown</h1>

      <div className="menu-panel main-menu">
        <div className="menu-list">
          <button type="button" className="primary" onClick={() => setOverlay("setup")}>
            {canContinue ? "▸ Play" : "⚔ New Run"}
          </button>
          <button type="button" onClick={() => setOverlay("collection")}>
            📖 Compendium
          </button>
          <button type="button" onClick={() => setOverlay("past")}>
            📜 Past runs
          </button>
          <button type="button" onClick={() => setOverlay("settings")}>
            ⚙ Settings
          </button>
        </div>
      </div>
      <p className="fineprint">
        An original mechanics-only mashup (working title). Combat adapts Regicide by Paul Abrahams,
        Luke Badger &amp; Andy Richdale (Badgers from Mars, CC&nbsp;BY). Roguelike structure inspired
        by Balatro. No publisher art or branding.
      </p>
      {overlay === "setup" && <RunSetup onClose={() => setOverlay(null)} />}
      {overlay === "settings" && <SettingsMenu onClose={() => setOverlay(null)} />}
      {overlay === "past" && <PastRunsOverlay onClose={() => setOverlay(null)} />}
      {overlay === "collection" && <Collection onClose={() => setOverlay(null)} />}
    </div>
  );
}
