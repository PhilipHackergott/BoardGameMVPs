import { useEffect, useMemo } from "react";
import { useStore } from "../state/store";
import { ENV_BY_ID, winners, type GameState } from "../engine";
import { ANIMAL_GLYPH, ENV_GLYPH, PLAYER_CLASS, PLAYER_GLYPH } from "./cardText";

const CONFETTI_COLORS = ["#f4a259", "#6db5c9", "#c98bdb", "#84c97a", "#f6d365"];

export function EndScreen({ game }: { game: GameState }) {
  const quitToTitle = useStore((s) => s.quitToMenu);
  const reduceMotion = useStore((s) => s.settings.reduceMotion);
  const scores = game.scores ?? [];
  const won = useMemo(() => winners(scores), [scores]);
  const ranked = useMemo(
    () => [...scores].sort((a, b) => b.total - a.total || b.biomeSets - a.biomeSets || b.animalsPlaced - a.animalsPlaced),
    [scores],
  );
  const confetti = useMemo(
    () => Array.from({ length: 80 }, (_, i) => ({
      id: i, left: Math.random() * 100, delay: Math.random() * 3, dur: 2.6 + Math.random() * 2.4,
      color: CONFETTI_COLORS[i % CONFETTI_COLORS.length], size: 6 + Math.random() * 7,
    })),
    [],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key.toLowerCase() === "n") quitToTitle(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [quitToTitle]);

  return (
    <div className="screen end">
      <div className="confetti" aria-hidden>
        {!reduceMotion && confetti.map((c) => (
          <span key={c.id} style={{ left: `${c.left}%`, animationDelay: `${c.delay}s`, animationDuration: `${c.dur}s`, background: c.color, width: c.size, height: c.size }} />
        ))}
      </div>

      <h2 className="end-title">
        {won.length === 1 ? (
          <span className={PLAYER_CLASS[won[0]]}>{PLAYER_GLYPH[won[0]]} Player {won[0] + 1} wins!</span>
        ) : (
          <>It's a tie: {won.map((p) => `Player ${p + 1}`).join(" & ")}</>
        )}
      </h2>

      <div className="end-grid">
        {ranked.map((s) => (
          <div key={s.playerId} className={`room end-card ${PLAYER_CLASS[s.playerId]} ${won.includes(s.playerId) ? "winner" : ""}`}>
            <div className="end-head">
              <strong>{PLAYER_GLYPH[s.playerId]} Player {s.playerId + 1}</strong>
              <span className="end-total">{s.total}</span>
            </div>
            <ul className="end-envs">
              {s.environments.map((e) => (
                <li key={e.cardId}>
                  <span className="end-env-name">{ENV_GLYPH[e.defId]} {ENV_BY_ID[e.defId].name}</span>
                  <span className="muted">{e.animals.map((a) => ANIMAL_GLYPH[a.defId]).join("") || "—"}</span>
                  <span className="end-envtotal">{e.subtotal}×{e.multiplier}={e.total}</span>
                </li>
              ))}
              {s.environments.length === 0 && <li className="muted">no rooms</li>}
            </ul>
            <div className="end-bonus">Biome sets {s.biomeSets} → +{s.biomeBonus} · {s.animalsPlaced} animals</div>
          </div>
        ))}
      </div>

      <button className="btn primary big" data-testid="newgame" onClick={quitToTitle}>New game (N)</button>
      <p className="fineprint">Seed {game.seed} · {game.config.players} players · {game.config.rounds} rounds</p>
    </div>
  );
}
