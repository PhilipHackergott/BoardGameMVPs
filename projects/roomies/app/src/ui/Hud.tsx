import { scorePlayer, type GameState } from "../engine";
import { useStore } from "../state/store";
import { PLAYER_CLASS, PLAYER_GLYPH } from "./cardText";

const SEAT_TAG: Record<string, string> = { easy: "AI·E", medium: "AI·M", hard: "AI·H" };

export function Hud({ game }: { game: GameState }) {
  const quitToMenu = useStore((s) => s.quitToMenu);
  const live = game.players.map((p) => scorePlayer(p, game.cards, game.jokered));
  const phaseLabel = game.phase === "draft" ? "Draft" : game.phase === "place" ? "Placement" : "Final";

  return (
    <header className="hud">
      <div className="hud-left">
        <span className="brand-dot">🏠</span>
        <span className="brand">Roomies</span>
        <span className="pill">Round {game.round}/{game.config.rounds}</span>
        <span className={`pill phase phase-${game.phase}`}>{phaseLabel}</span>
        {game.phase === "draft" && <span className="pill">Pick {game.pick + 1}/{game.config.handSize}</span>}
      </div>
      <div className="hud-scores">
        {live.map((s) => {
          const seat = game.config.seats[s.playerId];
          return (
            <span key={s.playerId} className={`chip ${PLAYER_CLASS[s.playerId]} ${s.playerId === game.current ? "active" : ""}`}>
              <span className="chip-glyph">{PLAYER_GLYPH[s.playerId]}</span> P{s.playerId + 1}
              {seat !== "human" && <span className="chip-ai">{SEAT_TAG[seat]}</span>}
              <strong>{s.total}</strong>
            </span>
          );
        })}
      </div>
      <button className="ghost" onClick={quitToMenu}>Quit</button>
    </header>
  );
}
