import { useEffect, useRef } from "react";
import { Application } from "pixi.js";
import { DEFAULT_CONFIG } from "../engine";
import { lensLockedOut, useGame } from "../state/store";
import { BoardView } from "../render/board";
import { getTheme } from "./theme";

export function GameCanvas() {
  const hostRef = useRef<HTMLDivElement>(null);
  const themeId = useGame((s) => s.settings.theme);

  useEffect(() => {
    let cancelled = false;
    let app: Application | null = null;
    let view: BoardView | null = null;
    let unsub: (() => void) | null = null;

    const size = (DEFAULT_CONFIG.fieldR + 40) * 2;
    const application = new Application();
    application
      .init({ width: size, height: size, backgroundAlpha: 0, antialias: true })
      .then(() => {
        if (cancelled) {
          application.destroy(true);
          return;
        }
        app = application;
        const host = hostRef.current;
        if (host) host.appendChild(application.canvas);

        view = new BoardView(
          application,
          DEFAULT_CONFIG,
          {
            onStarClick: (id) => useGame.getState().selectStar(id),
            onBoardHover: (x, y) => useGame.getState().hoverAt(x, y),
            onBoardCommit: (x, y) => useGame.getState().commitAt(x, y),
          },
          getTheme(themeId),
        );

        const draw = () => {
          const { game, selection, reveal, lens } = useGame.getState();
          if (view && game) view.update(game, selection, reveal, lens && !lensLockedOut(game));
        };
        draw();
        unsub = useGame.subscribe(draw);
      });

    return () => {
      cancelled = true;
      if (unsub) unsub();
      if (view) view.destroy();
      if (app) app.destroy(true);
    };
  }, [themeId]); // rebuild the Pixi view when the theme changes

  return <div className="board-host" ref={hostRef} aria-label="Game board" />;
}
