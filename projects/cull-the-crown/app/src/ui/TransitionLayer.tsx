import { useEffect, useRef, useState } from "react";
import { useGame } from "./store";

// A full-screen, outcome-aware transition that fires on phase / enemy changes: a royal felled
// (into the shop), the run won, the run lost, and a "next royal approaches" intro. Pointer-events
// are off so it never blocks input; it auto-clears.

type Variant = "victory" | "win" | "lose" | "intro";
interface T {
  id: number;
  variant: Variant;
  text: string;
  sub?: string;
}

export default function TransitionLayer() {
  const phase = useGame((s) => s.run.phase);
  const enemyIndex = useGame((s) => s.run.enemyIndex);
  const run = useGame((s) => s.run);
  const prev = useRef({ phase, enemyIndex });
  const idRef = useRef(0);
  const [t, setT] = useState<T | null>(null);

  useEffect(() => {
    const p = prev.current;
    const tier = run.castle[run.enemyIndex]?.tier?.toUpperCase() ?? "ROYAL";
    let next: Omit<T, "id"> | null = null;

    // Brief, non-blocking flourishes only. The felled -> shop step is a blocking Continue gate
    // (CombatGate), not an auto-transition.
    if (p.phase !== phase) {
      if (phase === "won") next = { variant: "win", text: "THE CROWN IS CULLED", sub: "All twelve royals overthrown." };
      else if (phase === "lost") next = { variant: "lose", text: "YOUR REIGN ENDS", sub: run.notice ?? "" };
      else if (phase === "combat")
        next = p.phase === "title" ? { variant: "intro", text: "DESCEND", sub: "Twelve royals await." } : { variant: "intro", text: `${tier} APPROACHES` };
    } else if (phase === "combat" && p.enemyIndex !== enemyIndex) {
      next = { variant: "intro", text: `${tier} APPROACHES` };
    }

    prev.current = { phase, enemyIndex };
    if (!next) return;
    const id = ++idRef.current;
    setT({ ...next, id });
    const dur = next.variant === "intro" ? 1000 : 1600;
    const handle = window.setTimeout(() => setT((cur) => (cur && cur.id === id ? null : cur)), dur);
    return () => window.clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, enemyIndex]);

  if (!t) return null;
  return (
    <div className={`transition ${t.variant}`} key={t.id} aria-hidden="true">
      <div className="transition-card">
        <div className="transition-text">{t.text}</div>
        {t.sub ? <div className="transition-sub">{t.sub}</div> : null}
      </div>
    </div>
  );
}
