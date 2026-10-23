// Light-curve readout for the deckbuilder — a histogram of card costs (the curve feedback the spec
// requires). Costs 6+ bucket together.

import { getCard } from "../engine/content/registry";

export function CurveBar({ deck }: { deck: string[] }) {
  const buckets = [0, 0, 0, 0, 0, 0, 0]; // 0,1,2,3,4,5,6+
  for (const id of deck) {
    const c = getCard(id);
    buckets[Math.min(6, c.cost)] += 1;
  }
  const max = Math.max(1, ...buckets);
  const labels = ["0", "1", "2", "3", "4", "5", "6+"];
  return (
    <div className="curve" aria-label="Light curve">
      {buckets.map((n, i) => (
        <div className="col" key={i}>
          <span className="cnt">{n || ""}</span>
          <div className="bar" style={{ height: `${(n / max) * 100}%` }} />
          <span className="lbl">{labels[i]}</span>
        </div>
      ))}
    </div>
  );
}
