import { useEffect } from "react";
import { useStore } from "../state/store";
import { PLAYER_CLASS, PLAYER_GLYPH } from "./cardText";

// Hides the previous player's hand/pool until the next player confirms they hold the device.
export function PassDeviceScreen({ player, phase }: { player: number; phase: "draft" | "place" }) {
  const reveal = useStore((s) => s.revealHand);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        reveal();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [reveal]);

  return (
    <div className="screen pass">
      <div className="pass-card">
        <div className={`pass-orb ${PLAYER_CLASS[player]}`}>{PLAYER_GLYPH[player]}</div>
        <h2>Pass to Player {player + 1}</h2>
        <p>{phase === "draft" ? "Time to draft." : "Time to place your cards."} Everyone else, look away — this hand is hidden.</p>
        <button className="btn primary big" data-testid="reveal" onClick={reveal}>I'm Player {player + 1} — go</button>
        <p className="fineprint">(or press Enter)</p>
      </div>
    </div>
  );
}
