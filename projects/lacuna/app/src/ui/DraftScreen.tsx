import { AFFINITIES, POWER_BY_ID } from "../engine";
import { useGame, useTheme } from "../state/store";
import { PLAYER_COLOR_CSS, PLAYER_NAMES } from "./colors";
import { PowerIcon } from "./PowerIcon";
import { FlowerGlyph } from "./FlowerGlyph";

export function DraftScreen() {
  const draft = useGame((s) => s.draft);
  const config = useGame((s) => s.config);
  const draftPower = useGame((s) => s.draftPower);
  const draftAffinity = useGame((s) => s.draftAffinity);
  const returnToMenu = useGame((s) => s.returnToMenu);
  const theme = useTheme();
  if (!draft) return null;

  const player = draft.order[draft.turn];
  const name = config.names[player] ?? PLAYER_NAMES[player];
  const accent = PLAYER_COLOR_CSS[player];

  // Only show the zones that were enabled in setup (powers drafted / affinities on).
  const showPowers = config.draftPicks > 0;
  const showAffinities = config.affinitiesOn;

  // Which powers were revealed (still on offer + already taken), and who owns each.
  const revealedPowers = Array.from(new Set([...draft.pool, ...draft.picks.flat()]));
  const powerOwner = (id: string) => draft.picks.findIndex((arr) => arr.includes(id as never));
  const affinityOwner = (c: number) => draft.affinity.findIndex((a) => a === c);

  return (
    <div className="draft">
      <div className="draft-head">
        <div>
          <h1 className="brand-title">DRAFT</h1>
          <p className="brand-sub">
            Pick {draft.turn + 1} of {draft.order.length} — {draft.mode === "powers" ? "a power" : "an affinity"}
          </p>
        </div>
        <button className="ghost-btn" onClick={returnToMenu}>
          Back to menu
        </button>
      </div>

      <div className="draft-turn">
        <span className="name-dot" style={{ background: accent }} aria-hidden />
        <strong style={{ color: accent }}>{name}</strong>, choose {draft.mode === "powers" ? "a power" : "your affinity"}
      </div>

      <div className={`draft-columns${showPowers && showAffinities ? "" : " single"}`}>
        {showPowers && (
        <section className={`draft-zone${draft.mode === "powers" ? " active" : ""}`}>
          <h2>Powers</h2>
          <div className="draft-pool">
            {revealedPowers.map((id) => {
              const p = POWER_BY_ID[id];
              const owner = powerOwner(id);
              const taken = owner >= 0;
              const can = draft.mode === "powers" && !taken;
              return (
                <button
                  key={id}
                  className={`power-card${taken ? " taken" : ""}`}
                  style={taken ? { borderColor: PLAYER_COLOR_CSS[owner] } : undefined}
                  disabled={!can}
                  onClick={() => can && draftPower(id)}
                >
                  {taken && (
                    <span className="card-owner" style={{ background: PLAYER_COLOR_CSS[owner] }} aria-hidden />
                  )}
                  <h3>
                    <PowerIcon id={id} size={22} />
                    {p.name}
                  </h3>
                  <p>{p.blurb}</p>
                </button>
              );
            })}
          </div>
        </section>
        )}

        {showAffinities && (
        <section className={`draft-zone${draft.mode === "affinities" ? " active" : ""}`}>
          <h2>Affinities</h2>
          <div className="draft-pool">
            {AFFINITIES.map((aff) => {
              const owner = affinityOwner(aff.color);
              const taken = owner >= 0;
              const can = draft.mode === "affinities" && !taken;
              const border = taken ? PLAYER_COLOR_CSS[owner] : theme.starCss[aff.color];
              return (
                <button
                  key={aff.color}
                  className={`power-card affinity-card${taken ? " taken" : ""}`}
                  style={{ borderColor: border }}
                  disabled={!can}
                  onClick={() => can && draftAffinity(aff.color)}
                >
                  {taken && (
                    <span className="card-owner" style={{ background: PLAYER_COLOR_CSS[owner] }} aria-hidden />
                  )}
                  <h3 style={{ color: theme.starCss[aff.color] }}>
                    <FlowerGlyph color={aff.color} size={22} />
                    {aff.name}
                  </h3>
                  <p className="affinity-flower">on {theme.names[aff.color]}</p>
                  <p>{aff.blurb}</p>
                </button>
              );
            })}
          </div>
        </section>
        )}
      </div>

      <div className="draft-rosters">
        {Array.from({ length: config.players }, (_, i) => (
          <div className="roster" key={i}>
            <span className="roster-name" style={{ color: PLAYER_COLOR_CSS[i] }}>
              {config.names[i] ?? PLAYER_NAMES[i]}
            </span>
            <div className="roster-powers">
              {draft.picks[i].length === 0 && draft.affinity[i] === null ? (
                <span className="roster-empty">—</span>
              ) : (
                <>
                  {draft.picks[i].map((id) => (
                    <span className="roster-power" key={id}>
                      {POWER_BY_ID[id].name}
                    </span>
                  ))}
                  {draft.affinity[i] !== null && (
                    <span className="roster-power" style={{ color: theme.starCss[draft.affinity[i]!] }}>
                      {AFFINITIES[draft.affinity[i]!].name}
                    </span>
                  )}
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
