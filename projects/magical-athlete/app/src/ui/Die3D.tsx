import { useEffect, useRef, useState } from 'react';

// A real-looking 6-sided die: a CSS 3D cube with pips. On roll it tosses up and tumbles, landing on
// `value` (the engine's actual rolled number). Controlled — the parent flips `rolling` and bumps
// `nonce` per throw, and updates `value` to the rolled face mid-toss.

const HALF_OFFSET = 0.5;

// cube rotation (deg) that brings each value's face to the front
const FACE_ROT: Record<number, [number, number]> = {
  1: [0, 0],
  2: [0, -90],
  3: [-90, 0],
  4: [90, 0],
  5: [0, 90],
  6: [0, 180],
};

// where each face sits on the cube
function faceTransform(v: number, half: number): string {
  switch (v) {
    case 1: return `rotateY(0deg) translateZ(${half}px)`;
    case 6: return `rotateY(180deg) translateZ(${half}px)`;
    case 2: return `rotateY(90deg) translateZ(${half}px)`;
    case 5: return `rotateY(-90deg) translateZ(${half}px)`;
    case 3: return `rotateX(90deg) translateZ(${half}px)`;
    default: return `rotateX(-90deg) translateZ(${half}px)`; // 4
  }
}

// Bold number colours, chosen so opposing faces (1-6, 2-5, 3-4) are complementary pairs.
const FACE_COLOR: Record<number, string> = {
  1: '#e8413c', // red      ↔
  6: '#34b35a', // green
  2: '#3a86ff', // blue     ↔
  5: '#ff8f3a', // orange
  3: '#f4c430', // yellow   ↔
  4: '#8a5cf6', // purple
};

function Face({ value, size }: { value: number; size: number }) {
  return (
    <div className="die-face" style={{ width: size, height: size, transform: faceTransform(value, size * HALF_OFFSET) }}>
      <span className="die-num" style={{ color: FACE_COLOR[value], fontSize: size * 0.6 }}>
        {value}
      </span>
    </div>
  );
}

export function Die3D({
  value,
  rolling,
  nonce,
  onRoll,
  disabled,
  size = 56,
  testId,
}: {
  value: number;
  rolling: boolean;
  nonce: number;
  onRoll: () => void;
  disabled?: boolean;
  size?: number;
  testId?: string;
}) {
  const v = Math.min(6, Math.max(1, Math.round(value) || 1));
  const spin = useRef(0);
  const rollingRef = useRef(rolling);
  rollingRef.current = rolling;
  const [rot, setRot] = useState(() => ({ rx: FACE_ROT[v][0], ry: FACE_ROT[v][1] }));
  const tossRef = useRef<HTMLDivElement>(null);

  // tumble to the target face; add full spins while a throw is in motion
  useEffect(() => {
    const [bx, by] = FACE_ROT[v] ?? [0, 0];
    if (rollingRef.current) spin.current += 3 + Math.floor(Math.random() * 3);
    const turns = spin.current;
    setRot({ rx: bx + 360 * turns, ry: by + 360 * turns });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [v, nonce]);

  // (re)start the toss arc on each throw
  useEffect(() => {
    const el = tossRef.current;
    if (!el || !rolling) return;
    el.classList.remove('die-toss');
    void el.offsetWidth; // force reflow so the animation replays
    el.classList.add('die-toss');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nonce]);

  return (
    <button
      type="button"
      className={`die-scene${!disabled && !rolling ? ' die-pulse' : ''}`}
      data-testid={testId}
      disabled={disabled}
      onClick={() => !disabled && onRoll()}
      aria-label="Roll the die"
      style={{ width: size, height: size }}
    >
      <div ref={tossRef} style={{ width: size, height: size }}>
        <div
          className={`die-cube${rolling ? '' : ' resting'}`}
          style={{ width: size, height: size, transform: `translateZ(-${size * HALF_OFFSET}px) rotateX(${rot.rx}deg) rotateY(${rot.ry}deg)` }}
        >
          {[1, 2, 3, 4, 5, 6].map((f) => (
            <Face key={f} value={f} size={size} />
          ))}
        </div>
      </div>
    </button>
  );
}
