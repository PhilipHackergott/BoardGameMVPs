// World UI: the overworld HUD (location / day / slot / money / objective + interaction prompt) and
// the global dialogue box. The duel-from-world flow lives in the store (worldInteract / finishDuel).

import { useEffect } from "react";
import { useStore, currentObjective, WORLD } from "./store";
import { SLOTS } from "../engine/career/types";
import { examDue } from "../engine/content/lifesim";
import { Button } from "./atoms";

export function OverworldHUD() {
  const career = useStore((s) => s.career);
  const near = useStore((s) => s.nearEntity);
  const A = useStore();
  if (!career) return null;
  const loc = WORLD[career.location];
  return (
    <>
      <div className="ow-top">
        <div className="ow-loc">{loc.name}</div>
        <div className="ow-stats">
          <span>📅 Day {career.day}</span>
          <span>🕑 {SLOTS[career.slotIndex] ?? "Night"}</span>
          <span style={{ color: "var(--gold)" }}>◆ {career.money}</span>
        </div>
        <Button size="sm" variant="ghost" onClick={() => A.openOverlay("status")}>✪ Status</Button>
        <Button size="sm" variant="ghost" onClick={() => A.openOverlay("pause")}>☰ Menu</Button>
      </div>
      <div className="ow-objective">◎ {currentObjective(career)}</div>
      {examDue(career.day, career.context, career.flags) && <div className="ow-objective" style={{ top: 78, borderColor: "var(--bad)", color: "var(--bad)" }}>✎ Exam today — visit the school Library or take a Reputation hit.</div>}
      {near ? <div className="ow-prompt">[E] {near.label}</div> : <div className="ow-help">WASD / arrows to move · E or Space to interact</div>}
    </>
  );
}

export function DialogueBox() {
  const d = useStore((s) => s.dialogue);
  const advance = useStore((s) => s.advanceDialogue);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (d && (k === " " || k === "enter" || k === "e")) { e.preventDefault(); advance(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [d, advance]);
  if (!d) return null;
  const line = d.lines[d.idx];
  const last = d.idx + 1 >= d.lines.length;
  return (
    <div className="dialogue-wrap" onClick={() => advance()}>
      <div className="dialogue-box">
        {line.speaker && <div className="dialogue-spk">{line.speaker}</div>}
        <div className="dialogue-text">{line.text}</div>
        <div className="dialogue-next">{last ? "▸ ok" : "▸ next"}</div>
      </div>
    </div>
  );
}
