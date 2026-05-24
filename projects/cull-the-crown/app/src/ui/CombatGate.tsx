import { CSSProperties, useEffect, useState } from "react";
import { useGame } from "./store";
import { sfx } from "../audio/chiptune";
import { wonReward } from "../engine/index";

// The fight never auto-switches screens. When it ends, the battle screen keeps the final moment,
// then this blocking gate appears:
//  - won  -> shows the spoils; "Claim" flies the coins into your purse, then advances to the market
//  - lost -> "You fall"; "See the end" advances to game over
// Delayed so the kill cascade / enemy attack animation plays first.

export default function CombatGate() {
  const run = useGame((s) => s.run);
  const dispatch = useGame((s) => s.dispatch);
  const outcome = run.phase === "combat" ? run.combat?.outcome : null;
  const active = outcome === "won" || outcome === "lost";
  const lastRoyal = run.enemyIndex >= run.castle.length - 1;
  const won = outcome === "won";
  const reward = won ? wonReward(run) : null;
  const total = reward?.total ?? 0;

  const [shown, setShown] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [purse, setPurse] = useState(run.gold);

  useEffect(() => {
    if (!active) {
      setShown(false);
      setClaiming(false);
      return;
    }
    setPurse(run.gold);
    const t = window.setTimeout(() => setShown(true), outcome === "lost" ? 1500 : 1150);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, outcome]);

  function claim() {
    if (!won) {
      dispatch({ type: "advance" });
      return;
    }
    if (claiming) return;
    setClaiming(true);
    // a little stream of coins into the purse, synced with the flying-coin animation
    const coins = Math.min(6, Math.max(3, Math.round(total / 4)));
    for (let i = 0; i < coins; i++) window.setTimeout(() => sfx.coin(), i * 110);
    const start = run.gold;
    const end = run.gold + total;
    const t0 = performance.now();
    const dur = 650;
    const step = (now: number) => {
      const k = Math.min(1, (now - t0) / dur);
      setPurse(Math.round(start + (end - start) * k));
      if (k < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
    window.setTimeout(() => dispatch({ type: "advance" }), 820);
  }

  useEffect(() => {
    if (!shown) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") claim();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shown, claiming, won, total]);

  if (!active || !shown) return null;

  const coinCount = Math.min(16, Math.max(5, Math.round(total / 2) + 3));

  return (
    <div className="gate" role="dialog" aria-modal="true">
      <div className={`gate-card ${won ? "won" : "lost"}`}>
        <div className="gate-title">{won ? (lastRoyal ? "THE LAST ROYAL FALLS" : "ROYAL FELLED") : "YOU FALL"}</div>

        {won && reward ? (
          <>
            <div className="gate-rewards">
              {reward.exact && <div className="reward-exact">★ EXACT KILL ★</div>}
              <div className="reward-row">
                <span>{reward.exact ? `Bounty (exact ×${reward.exactMult})` : "Bounty"}</span>
                <span>+{reward.reward} ◆</span>
              </div>
              {reward.perFight > 0 && (
                <div className="reward-row">
                  <span>Guild tribute</span>
                  <span>+{reward.perFight} ◆</span>
                </div>
              )}
              {reward.interest > 0 && (
                <div className="reward-row">
                  <span>Interest</span>
                  <span>+{reward.interest} ◆</span>
                </div>
              )}
              <div className="reward-row total">
                <span>Spoils</span>
                <span>+{reward.total} gold</span>
              </div>
            </div>
            <div className="purse">
              Purse <span>{purse}</span> ◆
            </div>
            {claiming && (
              <div className="coins" aria-hidden="true">
                {Array.from({ length: coinCount }).map((_, i) => (
                  <span
                    key={i}
                    className="coin"
                    style={{ "--dx": `${((Math.random() * 130 - 65) | 0)}px`, animationDelay: `${(i * 0.035).toFixed(2)}s` } as CSSProperties}
                  >
                    ◆
                  </span>
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="gate-sub">{run.notice ?? "The gauntlet claims you."}</div>
        )}

        <button type="button" className="primary gate-continue" disabled={claiming} onClick={claim}>
          {won ? (claiming ? "Claiming…" : "Claim ▸") : "See the end ▸"}
        </button>
      </div>
    </div>
  );
}
