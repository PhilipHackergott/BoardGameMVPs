import { useGame } from "../state/store";
import { PLAYER_COLOR_CSS, PLAYER_NAMES } from "./colors";

export function ActionBanner() {
  const game = useGame((s) => s.game);
  const selection = useGame((s) => s.selection);
  const message = useGame((s) => s.message);
  const reveal = useGame((s) => s.reveal);
  const config = useGame((s) => s.config);
  const flagged = useGame((s) => s.flagged);
  const pickupMode = useGame((s) => s.pickupMode);

  if (!game) return <div className="action-banner">Preparing the pond…</div>;

  const nameOf = (p: number) => config.names[p] ?? PLAYER_NAMES[p];

  if (game.phase === "ended") {
    const total = game.territory?.length ?? 0;
    if (reveal < total) {
      return (
        <div className="action-banner tone-ended">
          Nightfall — each leftover flower drifts to its nearest pawn… ({reveal}/{total})
        </div>
      );
    }
    const text =
      typeof game.result === "number"
        ? `${nameOf(game.result)} wins the pond!`
        : "A perfectly tied night — the pond keeps its secret.";
    return <div className="action-banner tone-ended">{text}</div>;
  }

  const accent = PLAYER_COLOR_CSS[game.current];
  const name = nameOf(game.current);

  if (game.phase === "setup") {
    return (
      <div className="action-banner" style={{ borderColor: accent }}>
        <strong style={{ color: accent }}>{name}:</strong> pick any flower as your starting bonus.
      </div>
    );
  }

  if (flagged[game.current]) {
    return (
      <div className="action-banner" style={{ borderColor: accent }}>
        <strong style={{ color: accent }}>{name}</strong> ran out of time — skipping their turn.
      </div>
    );
  }

  const picks = game.freePicks.length;
  const removing = picks > 0 && game.freePicks[0] === "remove";
  const body = game.duskPending
    ? "Dusk — choose a colour to steal from its leader."
    : game.abyssPending
      ? "Abyss — click a flower to banish from the game, or skip."
      : game.repelOrigin
        ? "Repeller — click a direction to shove nearby flowers away."
        : pickupMode
          ? "Nomad — click one of your pawns to reclaim it."
          : picks > 0
        ? removing
          ? `Assassin — click ${picks} flower${picks > 1 ? "s" : ""} to remove from the game.`
          : `Pick ${picks} free flower${picks > 1 ? "s" : ""} from the pond.`
        : (message ??
          (selection.aStarId === null
            ? "click a flower to reveal its connections."
            : "glide along a green line and click to drop your pawn."));

  return (
    <div className="action-banner" style={{ borderColor: accent }}>
      <strong style={{ color: accent }}>{name}:</strong> {body}
    </div>
  );
}

