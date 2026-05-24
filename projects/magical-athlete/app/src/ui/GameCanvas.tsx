import { useEffect, useRef } from 'react';
import { BoardView } from '../render/board';
import { useGame } from '../state/store';

// Mounts the Pixi BoardView once and feeds it engine state. Init is async (Pixi v8); the view guards
// against unmount-before-init and is destroyed on cleanup.
export function GameCanvas() {
  const hostRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<BoardView | null>(null);
  const match = useGame((s) => s.match);

  useEffect(() => {
    const view = new BoardView();
    viewRef.current = view;
    if (hostRef.current) void view.init(hostRef.current);
    return () => {
      view.destroy();
      viewRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (match) viewRef.current?.update(match);
  }, [match]);

  return <div ref={hostRef} style={{ width: '100%', margin: '0 auto', lineHeight: 0 }} />;
}
