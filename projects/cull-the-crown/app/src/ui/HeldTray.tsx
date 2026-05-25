import { useGame } from "./store";
import { TarotArt } from "./CardArt";
import { heldMax, tarotById } from "../engine/index";
import { sfx } from "../audio/chiptune";

// Held tarots (the consumable pouch) — usable in the shop OR mid-combat. A targeting tarot routes
// through pendingPick (shop: pick from the deck modal; combat: tap a hand card); others apply at once.
export default function HeldTray({ context }: { context: "shop" | "combat" }) {
  const run = useGame((s) => s.run);
  const held = run.held;
  const use = (instanceId: string, tarotId: string) => {
    const t = tarotById(tarotId);
    if (!t) return;
    const g = useGame.getState();
    if (t.target) {
      g.setPendingPick((cardId) => g.dispatch({ type: "useHeld", instanceId, targetCardId: cardId }), `Use ${t.name} on a card`);
      if (context === "shop") g.setPileModal("all");
    } else {
      sfx.buy();
      g.dispatch({ type: "useHeld", instanceId });
    }
  };
  return (
    <div className={`held-tray ${context}`} aria-label="Consumable pouch">
      <span className="held-label" data-tip="Held tarots — use them in the shop or mid-fight">⚗ {held.length}/{heldMax(run)}</span>
      {held.length === 0 && <span className="hint">empty pouch</span>}
      {held.map((h) => {
        const t = tarotById(h.tarotId);
        if (!t) return null;
        return (
          <button key={h.id} type="button" className="held-item" data-tip={`${t.name} — ${t.text}`} data-tip-type="tarot" onClick={() => use(h.id, h.tarotId)}>
            <TarotArt id={h.tarotId} art={t.art} size={context === "combat" ? 92 : 26} />
            <span className="held-name">{t.name}</span>
          </button>
        );
      })}
    </div>
  );
}
