import { useEffect, useRef } from 'react';
import { MapView } from '../render/map';
import { useGame } from '../state/store';

export function GameCanvas() {
  const wrap = useRef<HTMLDivElement>(null);
  const viewRef = useRef<MapView | null>(null);
  const select = useGame((s) => s.select);

  // mount the Pixi map exactly once (guard the v8 async init / React lifecycle)
  useEffect(() => {
    const mv = new MapView();
    viewRef.current = mv;
    let cancelled = false;
    if (wrap.current) {
      void mv.init(wrap.current, (id) => select(id)).then(() => {
        if (cancelled) return;
        const v = useGame.getState().currentView();
        if (v) mv.update(v);
      });
    }
    return () => {
      cancelled = true;
      mv.destroy();
      viewRef.current = null;
    };
  }, [select]);

  // push view + selection updates into the renderer
  useEffect(() => {
    return useGame.subscribe((s) => {
      const mv = viewRef.current;
      if (!mv) return;
      const v = s.game ? useGame.getState().currentView() : null;
      if (v) mv.update(v);
      mv.setSelected(s.selected);
    });
  }, []);

  return (
    <div className="canvas-wrap" ref={wrap} data-testid="map-canvas" />
  );
}
