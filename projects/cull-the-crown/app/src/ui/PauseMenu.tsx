import { useState } from "react";
import { useGame } from "./store";
import Collection from "./Collection";
import SettingsMenu from "./SettingsMenu";
import Modal from "./Modal";

// The pause screen, opened from the in-combat gear button. It actually pauses the run (the board
// freezes — see PixiBoard) and blocks input. From here you can open the compendium (rules + every
// card), adjust settings, save and return to the main menu, or surrender (yield) the run.

export default function PauseMenu() {
  const setPaused = useGame((s) => s.setPaused);
  const saveAndQuit = useGame((s) => s.saveAndQuit);
  const surrender = useGame((s) => s.surrender);
  const [view, setView] = useState<"menu" | "compendium" | "settings">("menu");
  const [confirmSurrender, setConfirmSurrender] = useState(false);

  if (view === "compendium") return <Collection onClose={() => setView("menu")} />;
  if (view === "settings") return <SettingsMenu onClose={() => setView("menu")} />;

  return (
    <Modal title="Paused" closeLabel="Resume" onClose={() => setPaused(false)}>
      <div className="menu-list">
          <button type="button" onClick={() => setView("compendium")}>
            📖 Compendium &amp; rules
          </button>
          <button type="button" onClick={() => setView("settings")}>
            ⚙ Settings
          </button>
          <button type="button" onClick={() => saveAndQuit()}>
            💾 Save &amp; quit to main menu
          </button>
          {!confirmSurrender ? (
            <button type="button" className="danger" onClick={() => setConfirmSurrender(true)}>
              🏳 Surrender run
            </button>
          ) : (
            <div className="confirm-row">
              <span>Surrender this run? It will end as a loss.</span>
              <div className="confirm-actions">
                <button type="button" className="danger" onClick={() => surrender()}>
                  Yes, surrender
                </button>
                <button type="button" onClick={() => setConfirmSurrender(false)}>
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
    </Modal>
  );
}
