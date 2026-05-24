import { useStore } from "../state/store";

const PARADE = ["🦛", "🦁", "🦙", "🐑", "🦓", "🦊", "🐻", "🐊", "🦍", "🐕"];

export function MainMenu() {
  const goSetup = useStore((s) => s.goSetup);
  const goSettings = useStore((s) => s.goSettings);
  return (
    <div className="screen title">
      <div className="title-card">
        <div className="title-emojis">{PARADE.map((e, i) => <span key={i} style={{ animationDelay: `${i * 0.1}s` }}>{e}</span>)}</div>
        <h1>Roomies</h1>
        <p className="tagline">Draft animals into rooms. Mind the roommates. Score the combos.</p>
        <div className="menu-nav">
          <button className="btn primary big" data-testid="menu-newgame" onClick={goSetup}>New game</button>
          <button className="btn big" data-testid="menu-settings" onClick={goSettings}>Settings</button>
        </div>
        <p className="fineprint">Play vs AI, watch AI vs AI, or pass-and-play hot-seat — set it up next.</p>
      </div>
    </div>
  );
}
