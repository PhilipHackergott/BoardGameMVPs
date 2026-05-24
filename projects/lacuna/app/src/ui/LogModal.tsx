import { useMemo } from "react";
import type { ReactNode } from "react";
import { applyAction, createGame } from "../engine";
import type { Action, GameState, PlayerId } from "../engine";
import { useGame, useTheme } from "../state/store";
import { PLAYER_COLOR_CSS, PLAYER_NAMES } from "./colors";
import { FlowerGlyph } from "./FlowerGlyph";

interface Entry {
  by: PlayerId;
  text: ReactNode;
}

// A collectible icon (with its name as a hover title) for inline use in a log line.
function glyph(color: number, names: string[]): ReactNode {
  return (
    <span className="log-glyph" title={names[color]}>
      <FlowerGlyph color={color} size={16} />
    </span>
  );
}

// One human-readable line per action, using the pre-action state for context
// (a banished/collected flower is still on the board before its action applies).
function describe(a: Action, pre: GameState, names: string[]): ReactNode {
  const fg = (id: number): ReactNode => {
    const st = pre.stars.find((s) => s.id === id);
    return st ? glyph(st.color, names) : "one";
  };
  switch (a.type) {
    case "claim":
      return <>took {fg(a.starId)} as a starting bonus</>;
    case "place":
      return <>placed a pawn on a {fg(a.aStarId)} line</>;
    case "freePick":
      return (
        <>
          {pre.freePicks[0] === "remove" ? "removed" : "collected"} {fg(a.starId)} (free pick)
        </>
      );
    case "repel":
      return "aimed a Magnet pull";
    case "nomadPickup":
      return "reclaimed a pawn to redeploy (Nomad)";
    case "duskSteal":
      return <>stole a {glyph(a.colorId, names)} (Dusk)</>;
    case "abyssVoid":
      return <>banished {fg(a.starId)} from the board (Abyss)</>;
    case "abyssSkip":
      return "declined to banish (Abyss)";
    case "flexPass":
      return "flex-passed, keeping a pawn (Flexible)";
    case "flexExtra":
      return "took an extra turn (Flexible)";
    case "pass":
      return "passed";
  }
}

// Replay the recorded action log from a freshly reconstructed initial state so we
// can attribute each action to whoever was the current player at the time. The
// engine is pure and deterministic, so this exactly reproduces the real sequence.
function buildLog(game: GameState, names: string[]): Entry[] {
  const entries: Entry[] = [];
  let s = createGame(game.seed, game.config, true, game.powers, game.affinity);
  for (const act of game.log) {
    try {
      entries.push({ by: s.current, text: describe(act, s, names) });
      s = applyAction(s, act);
    } catch {
      break; // defensive: stop if a log entry can't be replayed
    }
  }
  return entries;
}

export function LogModal({ onClose }: { onClose: () => void }) {
  const game = useGame((s) => s.game);
  const config = useGame((s) => s.config);
  const theme = useTheme();
  const entries = useMemo(() => (game ? buildLog(game, theme.names) : []), [game, theme]);

  const nameOf = (p: PlayerId) => config.names[p] ?? PLAYER_NAMES[p];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h3>Game Log</h3>
          <button className="modal-close" onClick={onClose} aria-label="Close log">
            ✕
          </button>
        </div>

        <div className="modal-body">
          {entries.length === 0 ? (
            <p className="log-empty">No actions yet — the pond is quiet.</p>
          ) : (
            <ol className="log-list">
              {entries.map((e, i) => (
                <li className="log-row" key={i}>
                  <span className="log-num">{i + 1}</span>
                  <span className="log-dot" style={{ background: PLAYER_COLOR_CSS[e.by] }} aria-hidden />
                  <span className="log-name" style={{ color: PLAYER_COLOR_CSS[e.by] }}>
                    {nameOf(e.by)}
                  </span>
                  <span className="log-text">{e.text}</span>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>
    </div>
  );
}
