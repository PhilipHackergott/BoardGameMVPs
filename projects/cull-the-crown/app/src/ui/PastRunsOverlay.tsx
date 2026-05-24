import { pastRuns } from "./store";

// A log of completed/abandoned runs (most recent first), read from localStorage. Opened from the
// main menu.

export default function PastRunsOverlay({ onClose }: { onClose: () => void }) {
  const runs = pastRuns();
  const resultLabel = (r: string) => (r === "won" ? "★ Crown Culled" : r === "surrendered" ? "Surrendered" : "Fell");

  return (
    <div className="help-backdrop" role="dialog" aria-modal="true" aria-label="Past runs" onClick={onClose}>
      <div className="menu-panel" onClick={(e) => e.stopPropagation()}>
        <div className="help-head">
          <h2>Past Runs</h2>
          <button type="button" className="primary" onClick={onClose}>
            Close
          </button>
        </div>
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
      </div>
    </div>
  );
}
