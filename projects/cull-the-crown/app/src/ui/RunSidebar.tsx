import { ReactNode } from "react";
import { useGame } from "./store";
import MuteButton from "./MuteButton";

// The left chrome column shared by combat and the shop. The variant-specific content (the royal panel
// + play preview in combat; the SHOP sign in the market) is passed as children; this shell owns the
// common tail: the Run Info button and the footer (Options + Mute).
export default function RunSidebar({ ariaLabel, children }: { ariaLabel: string; children: ReactNode }) {
  return (
    <aside className="combat-sidebar" aria-label={ariaLabel}>
      {children}
      <button type="button" className="cs-runinfo cs-panel" data-tip="Run info — fighting styles, opponents, edicts & stake (M)" onClick={() => useGame.getState().setMapOpen(true)}>
        ⌖ Run Info
      </button>
      <div className="cs-footer">
        <button type="button" className="cs-options cs-panel" data-tip="Pause — rules, settings, save &amp; quit" onClick={() => useGame.getState().setPaused(true)}>
          ⚙ Options
        </button>
        <MuteButton />
      </div>
    </aside>
  );
}
