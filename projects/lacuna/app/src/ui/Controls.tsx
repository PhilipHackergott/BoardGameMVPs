import { currentHasLegalMove, lensLockedOut, useGame } from "../state/store";

export function Controls() {
  const game = useGame((s) => s.game);
  const selection = useGame((s) => s.selection);
  const lens = useGame((s) => s.lens);
  const pickupMode = useGame((s) => s.pickupMode);
  const toggleLens = useGame((s) => s.toggleLens);
  const deselect = useGame((s) => s.deselect);
  const passTurn = useGame((s) => s.passTurn);
  const flexPass = useGame((s) => s.flexPass);
  const flexExtra = useGame((s) => s.flexExtra);
  const enterRedeploy = useGame((s) => s.enterRedeploy);
  const abyssSkip = useGame((s) => s.abyssSkip);
  const config = useGame((s) => s.config);
  const paused = useGame((s) => s.paused);
  const togglePause = useGame((s) => s.togglePause);
  if (!game) return null;

  // All-AI match: every seat is an AI, so there's no human to advance play —
  // offer a Play/Pause toggle to step through and analyse the game.
  const allAI =
    game.phase !== "ended" &&
    Array.from({ length: config.players }, (_, i) => config.ai[i]).every((x) => x != null);

  const p = game.current;
  const actionable = game.phase === "play" && game.freePicks.length === 0 && !game.repelOrigin && !pickupMode;
  const stuck = actionable && !currentHasLegalMove(game);
  const hasSelection = selection.aStarId !== null;
  const hasFlexible = (game.powers[p] ?? []).includes("flexible");
  const canFlexPass = actionable && hasFlexible && !game.flexPassUsed[p];
  const canFlexExtra = actionable && hasFlexible && !game.flexExtraUsed[p];
  const canRedeploy =
    actionable &&
    (game.powers[p] ?? []).includes("nomad") &&
    !game.nomadUsed[p] &&
    game.beacons.some((b) => b.owner === p && !b.phantom);
  const lensLocked = lensLockedOut(game);

  return (
    <div className="controls-row">
      {allAI && (
        <button
          className={`control-btn toggle${paused ? "" : " on"}`}
          onClick={togglePause}
          aria-pressed={!paused}
          title={paused ? "Resume the AI match" : "Pause to analyse the board"}
        >
          {paused ? "▶ Play" : "⏸ Pause"}
        </button>
      )}
      <button
        className={`control-btn toggle${lens && !lensLocked ? " on" : ""}`}
        onClick={toggleLens}
        aria-pressed={lens && !lensLocked}
        disabled={lensLocked}
        title={lensLocked ? "Controlling: only that player may use the lens" : "Toggle the influence lens (Space)"}
      >
        <span className="lens-dot" aria-hidden />
        Influence Lens: <strong>{lensLocked ? "LOCKED" : lens ? "ON" : "OFF"}</strong>
        <span className="key-hint">Space</span>
      </button>

      {canFlexPass && (
        <button className="control-btn ghost" onClick={flexPass} title="Skip now, keep this pawn for later">
          Flex pass
        </button>
      )}
      {canFlexExtra && (
        <button className="control-btn ghost" onClick={flexExtra} title="Take an extra turn now">
          Extra turn
        </button>
      )}
      {canRedeploy && (
        <button className="control-btn ghost" onClick={enterRedeploy} title="Reclaim one of your pawns to redeploy it">
          Redeploy
        </button>
      )}

      {(hasSelection || pickupMode) && (
        <button className="control-btn ghost" onClick={deselect}>
          Cancel
        </button>
      )}
      {stuck && (
        <button className="control-btn warn" onClick={passTurn}>
          No moves — Pass
        </button>
      )}
      {game.abyssPending && (
        <button className="control-btn ghost" onClick={abyssSkip}>
          Skip banish
        </button>
      )}
    </div>
  );
}
