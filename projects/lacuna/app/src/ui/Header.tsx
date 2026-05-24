import { beaconsLeft } from "../engine";
import { useGame } from "../state/store";

export function Header({
  onRules,
  onLog,
  onReset,
  onMenu,
}: {
  onRules: () => void;
  onLog: () => void;
  onReset: () => void;
  onMenu: () => void;
}) {
  const game = useGame((s) => s.game);

  let phase = "Setup Phase";
  if (game) {
    if (game.phase === "ended") phase = "Game Ended";
    else if (game.phase === "setup") phase = "Setup · starting pick";
    else {
      let left = 0;
      for (let p = 0; p < game.config.players; p++) left += beaconsLeft(game, p);
      phase = `Placement Phase · ${left} pawns left`;
    }
  }

  return (
    <header className="site-header">
      <div className="brand">
        <span className="brand-mark" aria-hidden>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.5"
              d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
            />
          </svg>
        </span>
        <div>
          <h1 className="brand-title">LACUNA</h1>
          <p className="brand-sub">Cozy night pond sandbox</p>
        </div>
      </div>

      <div className="header-actions">
        <span className="phase-badge">{phase}</span>
        <button className="ghost-btn" onClick={onMenu}>
          Menu
        </button>
        <button className="ghost-btn" onClick={onRules}>
          Rules
        </button>
        <button className="ghost-btn" onClick={onLog}>
          Log
        </button>
        <button className="reset-btn" onClick={onReset}>
          Reset Pond
        </button>
      </div>
    </header>
  );
}
