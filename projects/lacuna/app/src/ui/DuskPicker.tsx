import { useGame, useTheme } from "../state/store";
import { PLAYER_COLOR_CSS, PLAYER_NAMES } from "./colors";
import { FlowerGlyph } from "./FlowerGlyph";

// Shown during a Dusk steal: pick a non-Dusk colour to take one of from its leading rival.
export function DuskPicker() {
  const game = useGame((s) => s.game);
  const duskSteal = useGame((s) => s.duskSteal);
  const theme = useTheme();
  if (!game || !game.duskPending) return null;

  const me = game.current;
  const options: { color: number; leader: number }[] = [];
  for (let c = 0; c < game.config.colors; c++) {
    if (c === 4) continue; // can't steal Dusk itself
    let leader = -1;
    let most = 0;
    for (let p = 0; p < game.config.players; p++) {
      if (p === me) continue;
      if (game.collected[p][c] > most) {
        most = game.collected[p][c];
        leader = p;
      }
    }
    if (leader >= 0) options.push({ color: c, leader });
  }

  return (
    <div className="dusk-picker">
      <span className="dusk-title">Dusk — steal one of:</span>
      <div className="dusk-swatches">
        {options.map(({ color, leader }) => (
          <button
            key={color}
            className="dusk-swatch"
            style={{ borderColor: theme.starCss[color] }}
            onClick={() => duskSteal(color)}
            title={`Steal from ${PLAYER_NAMES[leader]}`}
          >
            <FlowerGlyph color={color} size={20} />
            {theme.names[color]}
            <span className="dusk-from" style={{ color: PLAYER_COLOR_CSS[leader] }}>
              ◂ {game.config.players > 1 ? (useGame.getState().config.names[leader] ?? PLAYER_NAMES[leader]) : ""}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
