import { useGame } from "./store";
import PixiBoard from "./PixiBoard";
import PixiSidebar from "./PixiSidebar";
import DeckPeek from "./DeckPeek";
import PixiPackModal from "./PixiPackModal";

// The felt screen — ONE persistent stage for both the fight and the market (Balatro's single canvas).
// <PixiBoard/> stays mounted across combat↔shop (same tree position), so the felt never resets; the
// shop is just a tray layer that rides up on it. EVERYTHING on the felt is now Pixi: the run sidebar
// (PixiSidebar), the joker/pouch HUD band (HudLayer) and the combat action controls — Sort, the defend
// block prompt, the wildcard suit-picker, the pending-pick banner and the block pill (FeltControls).
// No DOM islands float over the felt anymore; the canvas owns all combat chrome and input.

export default function FeltScreen() {
  const shop = useGame((s) => s.run.phase === "shop");
  return (
    <div className={`screen combat${shop ? " shop-overlay" : ""}`}>
      <PixiSidebar />
      <div className="combat-field">
        <PixiBoard />
        <DeckPeek />
        {/* Pack opening lives inside the combat-field so it covers the felt fully but leaves the sidebar
            untouched. Mounts only while a pack is being opened (returns null otherwise). */}
        <PixiPackModal />
      </div>
    </div>
  );
}
