import { useState } from "react";
import { useStore } from "../state/store";
import type { SeatType } from "../engine";
import { PLAYER_CLASS, PLAYER_GLYPH } from "./cardText";

const SEAT_OPTIONS: { value: SeatType; label: string }[] = [
  { value: "human", label: "Human" },
  { value: "easy", label: "AI · Easy" },
  { value: "medium", label: "AI · Med" },
  { value: "hard", label: "AI · Hard" },
];

type Preset = { label: string; seats: SeatType[] };
const PRESETS: Preset[] = [
  { label: "Solo vs 2 AI", seats: ["human", "medium", "hard"] },
  { label: "Watch 3 AI", seats: ["easy", "medium", "hard"] },
  { label: "Hot-seat ×2", seats: ["human", "human"] },
];

export function SetupScreen() {
  const newGame = useStore((s) => s.newGame);
  const goMenu = useStore((s) => s.goMenu);
  const [seats, setSeats] = useState<SeatType[]>(["human", "medium", "medium"]);
  const [seed, setSeed] = useState("");

  const setCount = (n: number) =>
    setSeats((prev) => Array.from({ length: n }, (_, i) => prev[i] ?? (i === 0 ? "human" : "medium")));
  const setSeat = (i: number, v: SeatType) => setSeats((prev) => prev.map((s, j) => (j === i ? v : s)));

  const humans = seats.filter((s) => s === "human").length;
  const start = () => {
    const s = seed.trim() === "" ? undefined : Number(seed.trim());
    newGame({ seats, seed: Number.isFinite(s) ? s : undefined });
  };

  return (
    <div className="screen setup">
      <div className="setup-card">
        <div className="setup-head">
          <h2>Game setup</h2>
          <button className="btn ghost" onClick={goMenu}>← Menu</button>
        </div>

        <div className="field">
          <label>Players</label>
          <div className="seg">
            {[2, 3, 4].map((n) => (
              <button key={n} className={seats.length === n ? "on" : ""} aria-pressed={seats.length === n} onClick={() => setCount(n)}>{n}</button>
            ))}
          </div>
        </div>

        <div className="field">
          <label>Quick presets</label>
          <div className="seg presets">
            {PRESETS.map((p) => (
              <button key={p.label} onClick={() => setSeats(p.seats)}>{p.label}</button>
            ))}
          </div>
        </div>

        <div className="seat-list">
          {seats.map((seat, i) => (
            <div key={i} className="seat-row">
              <span className={`seat-orb ${PLAYER_CLASS[i]}`}>{PLAYER_GLYPH[i]}</span>
              <span className="seat-name">Player {i + 1}</span>
              <div className="seg sm" role="group" aria-label={`Player ${i + 1} type`}>
                {SEAT_OPTIONS.map((o) => (
                  <button key={o.value} className={seat === o.value ? "on" : ""} aria-pressed={seat === o.value} onClick={() => setSeat(i, o.value)}>{o.label}</button>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="field">
          <label htmlFor="seed">Seed (optional)</label>
          <input id="seed" inputMode="numeric" placeholder="random" value={seed} onChange={(e) => setSeed(e.target.value)} />
        </div>

        <button className="btn primary big" data-testid="setup-start" onClick={start}>Start game</button>
        <p className="fineprint">
          {humans >= 2 ? "Hot-seat: pass the device between human players." : humans === 1 ? "You vs the AI — no device-passing." : "All-AI: sit back and watch."}
        </p>
      </div>
    </div>
  );
}
