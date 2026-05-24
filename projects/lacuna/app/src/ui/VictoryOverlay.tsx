import { useEffect, useMemo, useState } from "react";
import { useGame, useTheme } from "../state/store";
import { PLAYER_COLOR_CSS, PLAYER_NAMES } from "./colors";

interface Piece {
  left: number;
  delay: number;
  duration: number;
  color: string;
  size: number;
}

export function VictoryOverlay() {
  const game = useGame((s) => s.game);
  const reveal = useGame((s) => s.reveal);
  const config = useGame((s) => s.config);
  const startGame = useGame((s) => s.startGame);
  const returnToMenu = useGame((s) => s.returnToMenu);
  const theme = useTheme();
  const confettiColors = useMemo(() => [...theme.starCss, ...PLAYER_COLOR_CSS], [theme]);

  const ended = !!game && game.phase === "ended";
  const harvestDone = ended && reveal >= (game!.territory?.length ?? 0);

  // Dismissable: an X hides the overlay so you can study the final board.
  // Reset whenever a fresh game is in progress so the next winner still shows.
  const [dismissed, setDismissed] = useState(false);
  useEffect(() => {
    if (!ended) setDismissed(false);
  }, [ended]);

  const pieces = useMemo<Piece[]>(
    () =>
      Array.from({ length: 110 }, () => ({
        left: Math.random() * 100,
        delay: Math.random() * 2.5,
        duration: 2.6 + Math.random() * 2.4,
        color: confettiColors[Math.floor(Math.random() * confettiColors.length)],
        size: 7 + Math.random() * 8,
      })),
    [confettiColors],
  );

  if (!harvestDone || dismissed) return null;

  const draw = game!.result === "draw";
  const winner = typeof game!.result === "number" ? game!.result : null;
  const name = winner !== null ? (config.names[winner] ?? PLAYER_NAMES[winner]) : "";
  const accent = winner !== null ? PLAYER_COLOR_CSS[winner] : "#e2e8f0";

  return (
    <div className="victory">
      <div className="confetti" aria-hidden>
        {pieces.map((p, i) => (
          <span
            key={i}
            style={{
              left: `${p.left}%`,
              width: `${p.size}px`,
              height: `${p.size * 1.4}px`,
              background: p.color,
              animationDelay: `${p.delay}s`,
              animationDuration: `${p.duration}s`,
            }}
          />
        ))}
      </div>

      <div className="victory-card">
        <button className="victory-close" onClick={() => setDismissed(true)} aria-label="Dismiss" title="Dismiss">
          ✕
        </button>
        <h1 className="victory-text" style={{ color: accent }}>
          {draw ? "IT'S A DRAW!" : `${name.toUpperCase()} WINS!!`}
        </h1>
        <div className="victory-actions">
          <button onClick={() => startGame(config)}>Play again</button>
          <button className="ghost-btn" onClick={returnToMenu}>
            Menu
          </button>
        </div>
      </div>
    </div>
  );
}
