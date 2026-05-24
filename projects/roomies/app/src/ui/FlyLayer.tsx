import { useEffect, useRef } from "react";
import { useStore, type Flight } from "../state/store";

const DURATION = 480;

// Animate a card glyph from where it was clicked to its destination (pool or room),
// then a soft pulse on the destination to register the landing.
function FlyingCard({ flight, onDone }: { flight: Flight; onDone: (id: number) => void }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return onDone(flight.id);

    const target = document.querySelector(flight.toSel) as HTMLElement | null;
    let ex = flight.from.x;
    let ey = flight.from.y - 60;
    if (target) {
      const r = target.getBoundingClientRect();
      ex = r.left + r.width / 2;
      ey = r.top + r.height / 2;
    }
    el.style.left = `${flight.from.x}px`;
    el.style.top = `${flight.from.y}px`;

    const anim = el.animate(
      [
        { transform: "translate(-50%,-50%) scale(1) rotate(0deg)", opacity: 1 },
        { offset: 0.6, opacity: 1 },
        {
          transform: `translate(calc(-50% + ${ex - flight.from.x}px), calc(-50% + ${ey - flight.from.y}px)) scale(0.45) rotate(12deg)`,
          opacity: 0.2,
        },
      ],
      { duration: DURATION, easing: "cubic-bezier(0.45,0,0.25,1)", fill: "forwards" },
    );

    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      target?.animate([{ transform: "scale(1)" }, { transform: "scale(1.06)" }, { transform: "scale(1)" }], {
        duration: 280,
        easing: "ease-out",
      });
      onDone(flight.id);
    };
    anim.addEventListener("finish", finish);
    const fallback = window.setTimeout(finish, DURATION + 220);
    return () => {
      window.clearTimeout(fallback);
      anim.cancel();
    };
  }, [flight, onDone]);

  return (
    <div ref={ref} className="fly-card" aria-hidden>
      {flight.glyph}
    </div>
  );
}

export function FlyLayer() {
  const flights = useStore((s) => s.flights);
  const removeFlight = useStore((s) => s.removeFlight);
  return (
    <div className="fly-layer" aria-hidden>
      {flights.map((f) => (
        <FlyingCard key={f.id} flight={f} onDone={removeFlight} />
      ))}
    </div>
  );
}
