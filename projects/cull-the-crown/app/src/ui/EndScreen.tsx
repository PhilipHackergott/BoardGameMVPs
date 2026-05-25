import { useGame } from "./store";
import { jokerById, runSummary } from "../engine/index";

export default function EndScreen() {
  const { run, newRun, saveAndQuit } = useGame();
  const s = runSummary(run);
  const won = run.phase === "won";
  return (
    <div className="screen end">
      <h1 className={won ? "win" : "lose"}>{won ? "The Crown is Culled" : "Your Run Ends"}</h1>
      {run.notice && <p className="notice">{run.notice}</p>}
      <ul className="summary">
        <li>Seed: {s.seed}</li>
        <li>Royals defeated: {s.royalsDefeated} / {s.totalRoyals}</li>
        <li>Exact kills: {s.exactKills}</li>
        <li>Gold earned: {s.goldEarned}</li>
        <li>Guild: {s.jokers.length ? s.jokers.map((id) => jokerById(id)?.name).join(", ") : "none"}</li>
      </ul>
      <div className="actions" style={{ justifyContent: "center" }}>
        <button type="button" className="primary" onClick={() => newRun("")}>
          New run
        </button>
        <button type="button" onClick={() => saveAndQuit()}>
          Main menu
        </button>
      </div>
    </div>
  );
}
