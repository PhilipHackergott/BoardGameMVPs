import { useEffect, useRef } from "react";
import { DEFAULT_CONFIG } from "../engine";
import { useGame } from "../state/store";
import type { Flight } from "../state/store";
import { FlowerGlyph } from "./FlowerGlyph";

const CENTER = DEFAULT_CONFIG.fieldR + 40;
const SIZE = CENTER * 2;
const DURATION = 620;

// Animate one flower from its spot on the board to the matching pile row, then a
// soft pulse on the pile to register the catch.
function FlyingFlower({ flight, onDone }: { flight: Flight; onDone: (id: number) => void }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    const canvas = document.querySelector(".board-host canvas") as HTMLCanvasElement | null;
    if (!el || !canvas) {
      onDone(flight.id);
      return;
    }

    const r = canvas.getBoundingClientRect();
    let sx = r.left + ((CENTER + flight.fromX) / SIZE) * r.width;
    let sy = r.top + ((CENTER + flight.fromY) / SIZE) * r.height;

    // Inter-player transfer: start from the source player's pile, not the board.
    if (flight.fromPlayer != null) {
      const src = document.querySelector(
        `[data-pile="${flight.fromPlayer}-${flight.color}"]`,
      ) as HTMLElement | null;
      if (src) {
        const sr = src.getBoundingClientRect();
        sx = sr.left + sr.width / 2;
        sy = sr.top + sr.height / 2;
      }
    }

    const target = document.querySelector(
      `[data-pile="${flight.owner}-${flight.color}"]`,
    ) as HTMLElement | null;
    let ex = sx;
    let ey = sy - 40;
    if (target) {
      const tr = target.getBoundingClientRect();
      ex = tr.left + tr.width / 2;
      ey = tr.top + tr.height / 2;
    }

    el.style.left = `${sx}px`;
    el.style.top = `${sy}px`;

    const anim = el.animate(
      [
        { transform: "translate(-50%, -50%) scale(1)", opacity: 0.95 },
        { offset: 0.7, opacity: 0.9 },
        {
          transform: `translate(calc(-50% + ${ex - sx}px), calc(-50% + ${ey - sy}px)) scale(0.35)`,
          opacity: 0,
        },
      ],
      { duration: DURATION, easing: "cubic-bezier(0.45, 0, 0.25, 1)", fill: "forwards" },
    );

    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      target?.animate(
        [{ transform: "scale(1)" }, { transform: "scale(1.07)" }, { transform: "scale(1)" }],
        { duration: 300, easing: "ease-out" },
      );
      onDone(flight.id);
    };
    anim.addEventListener("finish", finish);
    const fallback = window.setTimeout(finish, DURATION + 250);

    return () => {
      window.clearTimeout(fallback);
      anim.cancel();
    };
  }, [flight, onDone]);

  return (
    <div ref={ref} className="fly-flower">
      <FlowerGlyph color={flight.color} size={22} />
    </div>
  );
}

export function FlyLayer() {
  const flights = useGame((s) => s.flights);
  const removeFlight = useGame((s) => s.removeFlight);
  return (
    <div className="fly-layer" aria-hidden>
      {flights.map((f) => (
        <FlyingFlower key={f.id} flight={f} onDone={removeFlight} />
      ))}
    </div>
  );
}
