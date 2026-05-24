import { useMemo, useState } from "react";
import { useGame } from "../state/store";
import type { MenuConfig } from "../state/store";
import type { Difficulty } from "../ai/ai";
import { PLAYER_COLOR_CSS, PLAYER_NAMES } from "./colors";
import { PlasmaBackdrop } from "./PlasmaBackdrop";
import { getTheme, THEMES } from "./theme";
import type { ThemeId } from "./theme";

type View = "home" | "new" | "settings" | "runs";

const AI_OPTS: { label: string; value: Difficulty | null }[] = [
  { label: "Human", value: null },
  { label: "Low", value: "low" },
  { label: "Med", value: "medium" },
  { label: "Hard", value: "hard" },
];

function fmtMMSS(s: number): string {
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

function fmtDate(ts: number): string {
  return new Date(ts).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function BrandMark() {
  return (
    <span className="brand-mark" aria-hidden>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.5"
          d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
        />
      </svg>
    </span>
  );
}

export function MainMenu() {
  const startGame = useGame((s) => s.startGame);
  const history = useGame((s) => s.history);
  const clearHistory = useGame((s) => s.clearHistory);
  const saved = useGame((s) => s.config);
  const settings = useGame((s) => s.settings);
  const setSettings = useGame((s) => s.setSettings);
  const continueGame = useGame((s) => s.continueGame);
  const game = useGame((s) => s.game);
  const savedSnapshot = useGame((s) => s.savedSnapshot);

  const [view, setView] = useState<View>("home");

  const [players, setPlayers] = useState(saved.players);
  const [names, setNames] = useState<string[]>(() => {
    const n = saved.names.slice(0, 4);
    while (n.length < 4) n.push(PLAYER_NAMES[n.length]);
    return n;
  });
  const [timerOn, setTimerOn] = useState(saved.clockSeconds > 0);
  const [clockSeconds, setClockSeconds] = useState(saved.clockSeconds > 0 ? saved.clockSeconds : 120);
  const [draftPicks, setDraftPicks] = useState(saved.draftPicks);
  const [affinitiesOn, setAffinitiesOn] = useState(saved.affinitiesOn);
  const [ai, setAi] = useState<(Difficulty | null)[]>(() => {
    const a = saved.ai.slice(0, 4);
    while (a.length < 4) a.push(null);
    return a;
  });

  const setName = (i: number, v: string) => setNames((prev) => prev.map((n, j) => (j === i ? v : n)));
  const setPlayerAi = (i: number, v: Difficulty | null) =>
    setAi((prev) => prev.map((d, j) => (j === i ? v : d)));

  const animated = settings.animatedBg && !settings.reduceMotion;
  const theme = getTheme(settings.theme);

  // A resumable game in memory or restored from a prior session.
  const resumable = (game && game.phase !== "ended" ? game : null) ?? (savedSnapshot?.game ?? null);
  const canContinue = !!resumable;
  const resumeCfg = game && game.phase !== "ended" ? saved : savedSnapshot?.config;

  const fireflies = useMemo(
    () =>
      Array.from({ length: 14 }, () => ({
        left: Math.random() * 100,
        top: Math.random() * 100,
        delay: Math.random() * 6,
        dur: 6 + Math.random() * 6,
        size: 2 + Math.random() * 3,
      })),
    [],
  );

  const start = () => {
    const cfg: MenuConfig = {
      players,
      names: names.map((n, i) => n.trim() || PLAYER_NAMES[i]),
      clockSeconds: timerOn ? clockSeconds : 0,
      draftPicks,
      affinitiesOn,
      ai,
    };
    startGame(cfg);
  };

  const winnerLabel = (r: RunWinner): string =>
    r.winner === "draw" ? "Draw" : r.names[r.winner] ?? PLAYER_NAMES[r.winner];

  return (
    <div className={`menu${view === "home" ? " menu-landing" : ""}`}>
      <PlasmaBackdrop animated={animated} palette={theme.plasma} />
      {!settings.reduceMotion && (
        <div className="menu-fireflies" aria-hidden>
          {fireflies.map((f, i) => (
            <span
              key={i}
              style={{
                left: `${f.left}%`,
                top: `${f.top}%`,
                width: `${f.size}px`,
                height: `${f.size}px`,
                animationDelay: `${f.delay}s`,
                animationDuration: `${f.dur}s`,
              }}
            />
          ))}
        </div>
      )}

      <div className="menu-brand">
        <BrandMark />
        <div>
          <h1 className="brand-title">LACUNA</h1>
          <p className="brand-sub">{theme.subtitle}</p>
        </div>
      </div>

      {view === "home" && (
        <nav className="menu-nav">
          <button className="nav-btn primary" onClick={() => setView("new")}>
            <span className="nav-btn-title">New Game</span>
            <span className="nav-btn-sub">Set up a fresh pond</span>
          </button>
          <button className="nav-btn" onClick={continueGame} disabled={!canContinue}>
            <span className="nav-btn-title">Continue</span>
            <span className="nav-btn-sub">
              {canContinue
                ? `Resume your ${resumeCfg?.players ?? 2}-player game`
                : "No game in progress"}
            </span>
          </button>
          <button className="nav-btn" onClick={() => setView("runs")}>
            <span className="nav-btn-title">Past Runs</span>
            <span className="nav-btn-sub">
              {history.length > 0 ? `${history.length} recorded` : "No games yet"}
            </span>
          </button>
          <button className="nav-btn" onClick={() => setView("settings")}>
            <span className="nav-btn-title">Settings</span>
            <span className="nav-btn-sub">Background &amp; motion</span>
          </button>
        </nav>
      )}

      {view === "new" && (
        <div className="menu-sheet">
          <div className="sheet-head">
            <h2>New Game</h2>
            <button className="ghost-btn" onClick={() => setView("home")}>
              ← Back
            </button>
          </div>

          <div className="field">
            <label>Players</label>
            <div className="segmented">
              {[2, 3, 4].map((n) => (
                <button key={n} className={players === n ? "seg on" : "seg"} onClick={() => setPlayers(n)}>
                  {n}
                </button>
              ))}
            </div>
            <span className="field-hint">{12 / players} pawns each · 12 total</span>
          </div>

          <div className="field">
            <label>Names &amp; players</label>
            <div className="name-list">
              {Array.from({ length: players }, (_, i) => (
                <div className="name-row" key={i}>
                  <span className="name-dot" style={{ background: PLAYER_COLOR_CSS[i] }} aria-hidden />
                  <input
                    value={names[i]}
                    maxLength={16}
                    onChange={(e) => setName(i, e.target.value)}
                    placeholder={PLAYER_NAMES[i]}
                    aria-label={`Player ${i + 1} name`}
                  />
                  <div className="segmented sm" role="group" aria-label={`Player ${i + 1} type`}>
                    {AI_OPTS.map((o) => (
                      <button
                        key={o.label}
                        className={ai[i] === o.value ? "seg on" : "seg"}
                        onClick={() => setPlayerAi(i, o.value)}
                      >
                        {o.label}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="field">
            <label className="field-toggle">
              <input type="checkbox" checked={timerOn} onChange={(e) => setTimerOn(e.target.checked)} />
              Turn timer (chess clock)
            </label>
            {timerOn && (
              <div className="slider-row">
                <input
                  type="range"
                  min={30}
                  max={300}
                  step={30}
                  value={clockSeconds}
                  onChange={(e) => setClockSeconds(Number(e.target.value))}
                  aria-label="Time per player"
                />
                <span className="slider-val">{fmtMMSS(clockSeconds)}</span>
              </div>
            )}
            <span className="field-hint">
              {timerOn
                ? `${fmtMMSS(clockSeconds)} per player — flag and you forfeit your remaining pawns.`
                : "No timer."}
            </span>
          </div>

          <div className="field">
            <label>Special powers (drafted per player)</label>
            <div className="segmented">
              {[0, 1, 2].map((n) => (
                <button key={n} className={draftPicks === n ? "seg on" : "seg"} onClick={() => setDraftPicks(n)}>
                  {n === 0 ? "Off" : n}
                </button>
              ))}
            </div>
            <span className="field-hint">
              {draftPicks === 0
                ? "No powers — pure Lacuna."
                : `Each player drafts ${draftPicks} power${draftPicks > 1 ? "s" : ""} from a shared pool before play.`}
            </span>
          </div>

          <div className="field">
            <label className="field-toggle">
              <input type="checkbox" checked={affinitiesOn} onChange={(e) => setAffinitiesOn(e.target.checked)} />
              Colour affinities
            </label>
            <span className="field-hint">
              {affinitiesOn
                ? "Each player also drafts one colour affinity — a bonus triggered by collecting that flower."
                : "Off."}
            </span>
          </div>

          <button className="menu-start" onClick={start}>
            {draftPicks > 0 || affinitiesOn ? "Draft & start" : "Start game"}
          </button>
        </div>
      )}

      {view === "settings" && (
        <div className="menu-sheet">
          <div className="sheet-head">
            <h2>Settings</h2>
            <button className="ghost-btn" onClick={() => setView("home")}>
              ← Back
            </button>
          </div>

          <div className="field">
            <label>Theme</label>
            <div className="segmented">
              {(Object.keys(THEMES) as ThemeId[]).map((id) => (
                <button
                  key={id}
                  className={settings.theme === id ? "seg on" : "seg"}
                  onClick={() => setSettings({ theme: id })}
                >
                  {THEMES[id].label}
                </button>
              ))}
            </div>
            <span className="field-hint">{theme.subtitle} — reskins the board, glyphs &amp; backdrop.</span>
          </div>

          <div className="field">
            <label className="field-toggle">
              <input
                type="checkbox"
                checked={settings.animatedBg}
                onChange={(e) => setSettings({ animatedBg: e.target.checked })}
              />
              Animated background
            </label>
            <span className="field-hint">The living pond plasma behind the menus.</span>
          </div>

          <div className="field">
            <label className="field-toggle">
              <input
                type="checkbox"
                checked={settings.reduceMotion}
                onChange={(e) => setSettings({ reduceMotion: e.target.checked })}
              />
              Reduce motion
            </label>
            <span className="field-hint">Hold the backdrop still and drop the drifting fireflies.</span>
          </div>

          <div className="field">
            <label className="field-toggle">
              <input
                type="checkbox"
                checked={settings.music}
                onChange={(e) => setSettings({ music: e.target.checked })}
              />
              Background music
            </label>
            <div className="slider-row">
              <input
                type="range"
                min={0}
                max={100}
                step={1}
                value={Math.round(settings.musicVolume * 100)}
                disabled={!settings.music}
                onChange={(e) => setSettings({ musicVolume: Number(e.target.value) / 100 })}
                aria-label="Music volume"
              />
              <span className="slider-val">{Math.round(settings.musicVolume * 100)}%</span>
            </div>
            <span className="field-hint">A soft, generative ambient soundscape.</span>
          </div>

          <div className="field">
            <label className="field-toggle">
              <input
                type="checkbox"
                checked={settings.sfx}
                onChange={(e) => setSettings({ sfx: e.target.checked })}
              />
              Sound effects
            </label>
            <div className="slider-row">
              <input
                type="range"
                min={0}
                max={100}
                step={1}
                value={Math.round(settings.sfxVolume * 100)}
                disabled={!settings.sfx}
                onChange={(e) => setSettings({ sfxVolume: Number(e.target.value) / 100 })}
                aria-label="Sound effects volume"
              />
              <span className="slider-val">{Math.round(settings.sfxVolume * 100)}%</span>
            </div>
            <span className="field-hint">A per-colour terz: root on selecting, third on placing, fifth as the flowers land — plus clicks and the win flourish.</span>
          </div>

          <div className="field">
            <label>Past runs</label>
            <button className="ghost-btn" onClick={clearHistory} disabled={history.length === 0}>
              Clear {history.length > 0 ? `(${history.length})` : ""}
            </button>
            <span className="field-hint">Permanently delete the recorded scoreboard.</span>
          </div>
        </div>
      )}

      {view === "runs" && (
        <div className="menu-sheet">
          <div className="sheet-head">
            <h2>Past Runs</h2>
            <div className="sheet-head-actions">
              {history.length > 0 && (
                <button className="ghost-btn" onClick={clearHistory}>
                  Clear
                </button>
              )}
              <button className="ghost-btn" onClick={() => setView("home")}>
                ← Back
              </button>
            </div>
          </div>

          {history.length === 0 ? (
            <p className="empty-scores">No games played yet. Your results will appear here.</p>
          ) : (
            <ul className="run-list">
              {history.map((r, i) => (
                <li className="run" key={r.ts + "-" + i}>
                  <div className="run-top">
                    <span className="run-winner">
                      {r.winner === "draw" ? (
                        "Draw"
                      ) : (
                        <>
                          <span className="name-dot" style={{ background: PLAYER_COLOR_CSS[r.winner] }} aria-hidden />
                          {winnerLabel(r)} won
                        </>
                      )}
                    </span>
                    <span className="run-date">{fmtDate(r.ts)}</span>
                  </div>
                  <div className="run-players">
                    {r.names.map((nm, p) => (
                      <span className="run-player" key={p}>
                        <span className="name-dot sm" style={{ background: PLAYER_COLOR_CSS[p] }} aria-hidden />
                        {nm}: <strong>{r.colorsWon[p]}</strong>
                        <span className="run-flowers">({r.flowers[p]})</span>
                      </span>
                    ))}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

type RunWinner = { winner: number | "draw"; names: string[] };
