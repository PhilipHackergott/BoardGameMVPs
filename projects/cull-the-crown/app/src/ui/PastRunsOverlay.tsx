import { pastRuns } from "./store";
import Modal from "./Modal";

// A log of completed/abandoned runs (most recent first), read from localStorage. Opened from the
// main menu.

export default function PastRunsOverlay({ onClose }: { onClose: () => void }) {
  const runs = pastRuns();
  const resultLabel = (r: string) => (r === "won" ? "★ Crown Culled" : r === "surrendered" ? "Surrendered" : "Fell");

  return (
    <Modal title="Past Runs" onClose={onClose}>
      <div className="past-runs">
        {runs.length === 0 && <p className="hint">No runs yet — begin your first descent.</p>}
        {runs.map((r, i) => (
          <div key={i} className={`past-run ${r.result}`}>
            <span className={`run-result ${r.result}`}>{resultLabel(r.result)}</span>
            <span>
              Royals {r.royals}/{r.totalRoyals}
            </span>
            <span className="gold">◆ {r.gold}</span>
            <span className="run-seed">seed {r.seed || "—"}</span>
            <span className="run-date">{new Date(r.date).toLocaleString()}</span>
          </div>
        ))}
      </div>
    </Modal>
  );
}
