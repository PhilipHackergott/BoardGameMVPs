// Floating outcome pops (damage / heal / +Light) — the "number-go-up" beat, anchored to the nexus
// and Light readouts. Crisp DOM text; positions computed in the store at emit time.

import { useStore } from "./store";

export function FlyLayer() {
  const pops = useStore((s) => s.pops);
  return (
    <div className="fly-layer">
      {pops.map((p) => (
        <span key={p.id} className={`pop ${p.kind}`} style={{ left: p.x, top: p.y }}>
          {p.text}
        </span>
      ))}
    </div>
  );
}
