import { useState } from "react";
import { AFFINITIES, beaconsLeft, POWER_BY_ID } from "../engine";
import type { PlayerId } from "../engine";
import { useGame, useTheme } from "../state/store";
import { PAWN_BASE, PAWN_SHINE, PLAYER_COLOR_CSS, PLAYER_NAMES } from "./colors";
import { FlowerGlyph } from "./FlowerGlyph";
import { PowerIcon } from "./PowerIcon";

const toHex = (n: number) => "#" + n.toString(16).padStart(6, "0");

function fmtClock(ms: number): string {
  const t = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(t / 60);
  const s = t % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

// A small gem (diamond) glyph in the player's colour — matches the board pawns.
function PawnIcon({ player, spent }: { player: PlayerId; spent: boolean }) {
  return (
    <svg className={`pawn-icon${spent ? " spent" : ""}`} viewBox="0 0 24 24" width="16" height="16" aria-hidden>
      <polygon points="12,2 22,12 12,22 2,12" fill={toHex(PAWN_BASE[player])} stroke="#0a0e1f" strokeWidth="1.6" />
      <polygon points="12,7 17,12 12,17 7,12" fill={toHex(PAWN_SHINE[player])} />
    </svg>
  );
}

export function PlayerColumn({ player }: { player: PlayerId }) {
  const game = useGame((s) => s.game);
  const reveal = useGame((s) => s.reveal);
  const config = useGame((s) => s.config);
  const clocks = useGame((s) => s.clocks);
  const flagged = useGame((s) => s.flagged);
  const theme = useTheme();
  const accent = PLAYER_COLOR_CSS[player];
  const name = config.names[player] ?? PLAYER_NAMES[player];
  const [flowersOpen, setFlowersOpen] = useState(true);

  if (!game) return <aside className="player-col" aria-label={name} />;

  const per = game.config.perColor;
  const majority = Math.floor(per / 2) + 1; // 4 of 7 secures a colour
  const totalTerr = game.territory?.length ?? 0;
  const revealing = game.phase === "ended" && reveal < totalTerr;
  const finished = game.phase === "ended" && reveal >= totalTerr;

  // Counts tick up live as leftover flowers are assigned during the end animation.
  let counts: number[];
  if (game.phase === "ended" && game.territory) {
    counts = game.collected[player].slice();
    for (let i = 0; i < Math.min(reveal, totalTerr); i++) {
      const t = game.territory[i];
      if (t.owner === player) counts[t.color]++;
    }
  } else {
    counts = game.collected[player];
  }

  let colorsWon = 0;
  const rows = theme.names.map((_, c) => {
    const count = counts[c];
    const lead = finished ? game.colorWinners![c] === player : count >= majority;
    if (lead) colorsWon++;
    return { c, count, lead };
  });
  const totalFlowers = counts.reduce((s, n) => s + n, 0);
  const shownRows = rows.filter((r) => r.count > 0); // hide flowers the player has none of

  const left = beaconsLeft(game, player);
  const myPowers = game.powers[player] ?? [];
  const firstSlot = game.order.indexOf(player);
  const procrastinating =
    game.phase === "play" && myPowers.includes("procrastinator") && firstSlot > game.turnIndex;
  const isCurrent = game.phase === "play" && game.current === player;
  const overallWinner = finished && game.result === player;
  const clockOn = config.clockSeconds > 0;
  const isFlagged = flagged[player];
  const remainingMs = clocks[player] ?? 0;
  const lowTime = clockOn && !isFlagged && remainingMs > 0 && remainingMs <= 15000;

  return (
    <aside
      className={`player-col${isCurrent ? " active" : ""}`}
      style={{ ["--accent" as string]: accent }}
      aria-label={name}
    >
      <div className="pc-head">
        <span className="pc-dot" style={{ background: accent }} aria-hidden />
        <h2 style={{ color: accent }}>{name}</h2>
        {isCurrent && (
          <span className="pc-turn" aria-label="current turn">
            ◀ turn
          </span>
        )}
        {overallWinner && (
          <span className="pc-crown" aria-label="winner">
            👑
          </span>
        )}
      </div>

      {game.affinity[player] !== null && (
        <div className="pc-affinity" style={{ borderColor: theme.starCss[game.affinity[player]!] }}>
          <span className="pc-affinity-head">
            <span className="pc-affinity-name" style={{ color: theme.starCss[game.affinity[player]!] }}>
              {AFFINITIES[game.affinity[player]!].name}
            </span>{" "}
            affinity · {theme.names[game.affinity[player]!]}
          </span>
          <span className="pc-affinity-desc">{AFFINITIES[game.affinity[player]!].blurb}</span>
        </div>
      )}

      {myPowers.length > 0 && (
        <div className="pc-powers">
          {myPowers.map((id) => (
            <div className="pc-power" key={id}>
              <span className="pc-power-name">
                <PowerIcon id={id} size={16} />
                {POWER_BY_ID[id].name}
              </span>
              <span className="pc-power-desc">{POWER_BY_ID[id].blurb}</span>
            </div>
          ))}
        </div>
      )}

      {procrastinating && <div className="pc-procrastinating">procrastinating…</div>}

      <div className="pc-sub">
        <div className="pc-pawns" aria-label={`${left} pawns remaining`}>
          {Array.from({ length: game.config.beaconsPerPlayer }, (_, i) => (
            <PawnIcon key={i} player={player} spent={i >= left} />
          ))}
          <span className="pc-pawns-label">{left ? `${left} left` : "all placed"}</span>
        </div>
        {clockOn && (
          <span
            className={`pc-clock${isCurrent ? " ticking" : ""}${lowTime ? " low" : ""}${isFlagged ? " flagged" : ""}`}
          >
            {isFlagged ? "flag" : fmtClock(remainingMs)}
          </span>
        )}
      </div>

      <button
        className="pc-flowers-toggle"
        onClick={() => setFlowersOpen((v) => !v)}
        aria-expanded={flowersOpen}
        title={flowersOpen ? "Collapse the flower breakdown" : "Expand the flower breakdown"}
      >
        <span>Flowers</span>
        <span className="pc-flowers-chevron">{flowersOpen ? "▾" : "▸"}</span>
      </button>

      {flowersOpen && (
        <div className="pc-rows">
          {shownRows.length === 0 && <div className="pc-empty">no flowers yet</div>}
          {shownRows.map((r) => (
            <div className={`pc-row${r.lead ? " lead" : ""}`} data-pile={`${player}-${r.c}`} key={r.c}>
              <span className="pc-flower">
                <FlowerGlyph color={r.c} size={20} />
                {theme.names[r.c]}
              </span>
              <span className="pc-count">
                {r.count} / {per}
                {r.lead && <span className="pc-lead-crown"> 👑</span>}
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="pc-total">
        <div className="pc-stat">
          <span className="pc-stat-label">Flowers</span>
          <span className="pc-stat-num">{totalFlowers}</span>
        </div>
        <div className="pc-stat">
          <span className="pc-stat-label">{revealing ? "Harvesting…" : "Colors Won"}</span>
          <span className="pc-stat-num" style={{ color: accent }}>
            {colorsWon}
          </span>
        </div>
      </div>
    </aside>
  );
}
