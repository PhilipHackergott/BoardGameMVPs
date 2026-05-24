import { useGame } from "../state/store";

// In-match online UI: a ranked status strip, a disconnect banner, and the end-of-match
// result + Elo change. Only renders for online matches; local play is untouched.
export function OnlineOverlay() {
  const netMode = useGame((s) => s.netMode);
  const online = useGame((s) => s.online);
  const game = useGame((s) => s.game);
  const leaveOnline = useGame((s) => s.leaveOnline);
  const findMatch = useGame((s) => s.findMatch);
  const resignOnline = useGame((s) => s.resignOnline);

  if (netMode !== "online") return null;

  const myTurn = game && online.youAre != null && game.current === online.youAre && game.phase !== "ended";

  return (
    <>
      {online.status === "playing" && (
        <div className="online-strip" aria-live="polite">
          <span className="online-tag">{online.ranked ? "RANKED" : "CASUAL"}</span>
          <span className="online-vs">
            vs {online.opponent?.handle ?? "—"} <em>({online.opponent?.elo ?? "?"})</em>
          </span>
          <span className={`online-turn ${myTurn ? "you" : "them"}`}>
            {game?.phase === "ended" ? "Match complete" : myTurn ? "Your move" : "Their move"}
          </span>
          <button className="ghost-btn online-resign" onClick={resignOnline} title="Resign the match">
            Resign
          </button>
        </div>
      )}

      {online.status === "playing" && !online.opponentConnected && (
        <div className="online-disconnect">Opponent disconnected — waiting for them to reconnect…</div>
      )}

      {online.status === "ended" && online.result && (
        <div className="victory" role="dialog" aria-modal>
          <div className="victory-card online-result">
            <h2 className={`online-result-title ${online.result.youWon === true ? "win" : online.result.youWon === false ? "loss" : "draw"}`}>
              {online.result.youWon === true ? "Victory" : online.result.youWon === false ? "Defeat" : "Draw"}
            </h2>
            <p className="online-result-reason">{reasonText(online.result.reason, online.result.youWon)}</p>
            {online.ranked ? (
              <div className="online-elo">
                <span className={`online-elo-delta ${online.result.eloChange >= 0 ? "up" : "down"}`}>
                  {online.result.eloChange >= 0 ? "+" : ""}
                  {online.result.eloChange}
                </span>
                <span className="online-elo-new">{online.result.newElo}</span>
              </div>
            ) : (
              <p className="online-result-reason">Casual game — rating unchanged.</p>
            )}
            <div className="victory-actions">
              <button
                onClick={() => {
                  leaveOnline();
                  findMatch();
                }}
              >
                Find another
              </button>
              <button className="ghost-btn" onClick={leaveOnline}>
                Back to menu
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function reasonText(reason: string, youWon: boolean | null): string {
  if (reason === "resign") return youWon ? "Your opponent resigned." : "You resigned.";
  if (reason === "timeout") return youWon ? "Your opponent ran out of time." : "You ran out of time.";
  if (reason === "abandon") return youWon ? "Your opponent left the match." : "You left the match.";
  return youWon === null ? "The pond was split evenly." : "Game complete.";
}
