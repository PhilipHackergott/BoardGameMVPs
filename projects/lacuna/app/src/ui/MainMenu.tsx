import { useMemo, useState } from "react";
import { useGame } from "../state/store";
import type { MenuConfig } from "../state/store";
import type { Difficulty } from "../ai/ai";
import { PLAYER_COLOR_CSS, PLAYER_NAMES } from "./colors";
import { PlasmaBackdrop } from "./PlasmaBackdrop";
import { getTheme, THEMES } from "./theme";
import type { ThemeId } from "./theme";
import { AccountPanel, AuthScreen } from "./AccountUI";
import { FriendsPanel, InviteToast } from "./FriendsUI";
import { APP_NAME } from "../brand";

type View = "home" | "new" | "settings" | "runs" | "auth" | "friends";

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
  const auth = useGame((s) => s.auth);
  const online = useGame((s) => s.online);
  const findMatch = useGame((s) => s.findMatch);
  const cancelQueue = useGame((s) => s.cancelQueue);

  const [view, setView] = useState<View>("home");
  // Sign-in modal (instead of a full screen): clicking Find Match while signed out opens it,
  // and on success we continue into matchmaking. `afterAuth` is the deferred intent.
  const [authModal, setAuthModal] = useState(false);
  const [afterAuth, setAfterAuth] = useState<null | "find">(null);
  const openAuth = (then: null | "find" = null) => {
    setAfterAuth(then);
    setAuthModal(true);
  };
  const closeAuth = () => {
    setAuthModal(false);
    setAfterAuth(null);
  };
  const onAuthDone = () => {
    setAuthModal(false);
    if (afterAuth === "find") findMatch();
    setAfterAuth(null);
  };

  const [players, setPlayers] = useState(saved.players);
  const [names, setNames] = useState<string[]>(() => {
    const n = saved.names.slice(0, 4);
    while (n.length < 4) n.push(PLAYER_NAMES[n.length]);
    return n;
  });
  const [timerOn, setTimerOn] = useState(saved.clockSeconds > 0);
  const [clockSeconds, setClockSeconds] = useState(saved.clockSeconds > 0 ? saved.clockSeconds : 120);
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
      // Special powers & colour affinities are cut from the alpha-0.1 ship build. The
      // feature code still lives on `main`; here we force them off so the draft flow is
      // never entered (startGame deals straight into the game when both are off).
      draftPicks: 0,
      affinitiesOn: false,
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
          <h1 className="brand-title">{APP_NAME}</h1>
          <p className="brand-sub">{theme.subtitle}</p>
        </div>
      </div>

      {view === "home" && (
        <button
          className={`account-corner${auth ? "" : " signin"}`}
          onClick={() => (auth ? setView("settings") : openAuth())}
        >
          {auth ? (
            <>
              <span className="account-chip-rank">{auth.user.elo}</span>
              <span className="account-chip-name">{auth.user.handle}</span>
            </>
          ) : (
            <span className="account-chip-name">Sign in</span>
          )}
        </button>
      )}

      {view === "home" && (
        <nav className="menu-nav">
          <button className="nav-btn" onClick={continueGame} disabled={!canContinue}>
            <span className="nav-btn-title">Continue</span>
            <span className="nav-btn-sub">
              {canContinue ? `Resume your ${resumeCfg?.players ?? 2}-player game` : "No game in progress"}
            </span>
          </button>

          <button className="nav-btn primary" onClick={() => (auth ? findMatch() : openAuth("find"))}>
            <span className="nav-btn-title">Find Match</span>
            <span className="nav-btn-sub">
              {auth ? `Ranked online · Elo ${auth.user.elo}` : "Sign in to play ranked online"}
            </span>
          </button>

          <button className="nav-btn" onClick={() => setView("new")}>
            <span className="nav-btn-title">Local Match</span>
            <span className="nav-btn-sub">Pass-and-play or vs CPU on this device</span>
          </button>

          <button className="nav-btn" onClick={() => setView("runs")}>
            <span className="nav-btn-title">Match History</span>
            <span className="nav-btn-sub">{history.length > 0 ? `${history.length} recorded` : "No games yet"}</span>
          </button>

          <button className="nav-btn" onClick={() => setView("settings")}>
            <span className="nav-btn-title">Settings</span>
            <span className="nav-btn-sub">Account, audio &amp; display</span>
          </button>
        </nav>
      )}

      {view === "friends" && <FriendsPanel onBack={() => setView("home")} onSignIn={() => openAuth()} />}

      {view === "new" && (
        <div className="menu-sheet">
          <div className="sheet-head">
            <h2>Local Match</h2>
            <button className="ghost-btn" onClick={() => setView("home")}>
              ← Back
            </button>
          </div>

          {/* Players */}
          <section className="setup-group">
            <div className="setup-group-head">
              <h3>Players</h3>
            </div>
            <div className="segmented">
              {[2, 3, 4].map((n) => (
                <button key={n} className={players === n ? "seg on" : "seg"} onClick={() => setPlayers(n)}>
                  {n}
                </button>
              ))}
            </div>
            <span className="field-hint">{12 / players} pawns each · 12 on the pond</span>
          </section>

          {/* Seats — name each player and choose human or CPU strength. */}
          <section className="setup-group">
            <div className="setup-group-head">
              <h3>Seats</h3>
              <span className="setup-group-note">Name each player; pick who's human or CPU.</span>
            </div>
            <div className="seat-list">
              {Array.from({ length: players }, (_, i) => (
                <div className="seat-row" key={i}>
                  <span className="name-dot" style={{ background: PLAYER_COLOR_CSS[i] }} aria-hidden />
                  <input
                    value={names[i]}
                    maxLength={16}
                    onChange={(e) => setName(i, e.target.value)}
                    placeholder={PLAYER_NAMES[i]}
                    aria-label={`Player ${i + 1} name`}
                  />
                  <div className="segmented sm seat-type" role="group" aria-label={`Player ${i + 1} type`}>
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
          </section>

          {/* Match options */}
          <section className="setup-group">
            <div className="setup-group-head">
              <h3>Match options</h3>
            </div>
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
                : "No timer — play at your own pace."}
            </span>
          </section>

          <button className="menu-start" onClick={start}>
            Start game
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

          <AccountPanel onSignIn={() => openAuth()} />

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
            <label>Match history</label>
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
            <h2>Match History</h2>
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

      {online.status === "queued" && (
        <div className="modal-overlay">
          <div className="queue-card">
            <div className="queue-spinner" aria-hidden />
            <h3>Finding a ranked match…</h3>
            <p className="field-hint">Pairing you with a similarly-rated player.</p>
            <button className="ghost-btn" onClick={cancelQueue}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {authModal && (
        <div className="modal-overlay" onClick={closeAuth}>
          <div onClick={(e) => e.stopPropagation()}>
            <AuthScreen onDone={onAuthDone} onBack={closeAuth} />
          </div>
        </div>
      )}

      <InviteToast />
    </div>
  );
}

type RunWinner = { winner: number | "draw"; names: string[] };
