import { useMemo } from "react";
import { useStore } from "../state/store";

// Cozy animated backdrop: soft drifting "dust motes" over a warm gradient (CSS-driven).
// Purely decorative; pointer-events: none so it never blocks interaction. Respects reduce-motion.
export function Backdrop() {
  const reduceMotion = useStore((s) => s.settings.reduceMotion);
  const motes = useMemo(
    () =>
      Array.from({ length: 26 }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        top: Math.random() * 100,
        size: 3 + Math.random() * 7,
        dur: 9 + Math.random() * 12,
        delay: -Math.random() * 16,
        hue: ["zuhause", "stadt", "natur"][i % 3],
      })),
    [],
  );
  if (reduceMotion) return <div className="backdrop backdrop-static" aria-hidden />;
  return (
    <div className="backdrop" aria-hidden>
      <div className="backdrop-blob b1" />
      <div className="backdrop-blob b2" />
      <div className="backdrop-blob b3" />
      <div className="motes">
        {motes.map((m) => (
          <span
            key={m.id}
            className={`mote mote-${m.hue}`}
            style={{
              left: `${m.left}%`,
              top: `${m.top}%`,
              width: `${m.size}px`,
              height: `${m.size}px`,
              animationDuration: `${m.dur}s`,
              animationDelay: `${m.delay}s`,
            }}
          />
        ))}
      </div>
    </div>
  );
}
