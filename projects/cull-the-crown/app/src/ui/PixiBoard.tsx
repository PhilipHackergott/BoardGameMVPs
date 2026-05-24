import { useEffect, useRef } from "react";
import { Application } from "pixi.js";
import { useGame } from "./store";
import { sfx } from "../audio/chiptune";
import { CombatStage, STAGE_H, STAGE_W } from "../render/combatStage";
import { applyPixiFixes } from "../render/pixiFixes";

applyPixiFixes(); // guard a Pixi v8.6 texture-pool bug before any rendering happens

// Mounts the PixiJS combat board and keeps it in sync with the store. Renders at a low logical
// resolution (480x270) with antialiasing off, then the host upscales with nearest-neighbour for a
// crisp 8-bit look. Handles Pixi v8 async init + React StrictMode double-mount, and waits for the
// pixel fonts before building text.

async function loadFonts(): Promise<void> {
  try {
    await Promise.all([
      document.fonts.load("12px 'Silkscreen'"),
      document.fonts.load("16px 'Press Start 2P'"),
    ]);
  } catch {
    /* fall back to system font silently */
  }
}

export default function PixiBoard() {
  const hostRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<CombatStage | null>(null);
  const lastFx = useRef(0);

  function syncFromState(): void {
    const stage = stageRef.current;
    if (!stage) return;
    const s = useGame.getState();
    const run = s.run;
    if (!run.combat) return;
    const e = run.combat.enemy;
    const lastCard = run.discard[run.discard.length - 1] ?? run.table[run.table.length - 1] ?? null;
    stage.sync({
      hand: run.hand,
      selectedIds: s.selected,
      subphase: run.combat.subphase,
      incoming: run.combat.incoming,
      deckCount: run.deck.length,
      discardCount: run.discard.length + run.table.length,
      deckId: run.deckId,
      lastDiscard: lastCard ? { suit: lastCard.suit, value: lastCard.value, kind: lastCard.kind } : null,
      enemy: {
        tier: e.tier,
        maxHealth: e.maxHealth,
        damageTaken: e.damageTaken,
        attack: e.attack,
        shield: e.shield,
        immuneSuit: e.suit,
      },
    });
  }

  useEffect(() => {
    let cancelled = false;
    const app = new Application();

    void (async () => {
      await app.init({
        width: STAGE_W,
        height: STAGE_H,
        background: 0x120a18,
        antialias: false,
        roundPixels: true,
        resolution: 1,
        autoDensity: false,
        // This game has a tiny, fixed texture set, so Pixi's automatic GC buys us nothing — and its
        // periodic text-texture sweep trips an internal pool bug (returnTexture → undefined.push).
        // Disable it; we destroy our own nodes explicitly.
        textureGCActive: false,
        renderableGCActive: false,
      });
      await loadFonts();
      if (cancelled) {
        app.destroy(true, { children: true });
        return;
      }
      const host = hostRef.current;
      if (host) {
        host.appendChild(app.canvas);
        app.canvas.style.width = "100%";
        app.canvas.style.height = "auto";
        app.canvas.style.display = "block";
        app.canvas.style.imageRendering = "pixelated";
      }
      const stage = new CombatStage(app);
      stage.onCardTap = (id) => {
        const g = useGame.getState();
        if (g.pendingPick) {
          // targeting a card for a held tarot — tap to apply, don't select for play
          sfx.reward();
          g.pendingPick(id);
          g.setPendingPick(null);
          return;
        }
        sfx.select();
        g.toggleSelect(id);
      };
      stage.onDeckClick = () => {
        sfx.pile();
        useGame.getState().setPileModal("deck");
      };
      stage.onDiscardClick = () => {
        sfx.pile();
        useGame.getState().setPileModal("discard");
      };
      stage.onDeckHover = (over) => useGame.getState().setDeckHover(over);
      // report the hovered card so the action box can preview its powers on hover (not just select),
      // and tick a soft "leaf" sound as the pointer moves onto each new card
      stage.onHover = (id) => {
        if (id) sfx.leaf();
        useGame.getState().setHoverId(id);
      };
      // drag-to-block: throwing a card onto the block commits it; auto-resolve once it covers the blow
      stage.onCardBlock = (id) => {
        const g = useGame.getState();
        if (!g.selected.includes(id)) g.toggleSelect(id);
        const s2 = useGame.getState();
        const c = s2.run.combat;
        if (!c) return;
        const total = s2.run.hand.filter((card) => s2.selected.includes(card.id)).reduce((a, card) => a + card.value, 0);
        if (total >= c.incoming) s2.discardSelected();
      };
      stage.onCardPlay = (id) => {
        const g = useGame.getState();
        if (g.pendingPick) {
          sfx.reward();
          g.pendingPick(id);
          g.setPendingPick(null);
          return;
        }
        // drag-to-play: if the card is part of a multi-card selection (a combo), play the
        // selection; otherwise play just this card.
        if (g.selected.includes(id) && g.selected.length > 1) {
          g.playCards();
        } else {
          g.clearSelect();
          g.toggleSelect(id);
          useGame.getState().playCards();
        }
      };
      stageRef.current = stage;
      // Treat any pre-existing FX event as already handled — otherwise a stale "kill" event from the
      // previous fight re-fires the OVERTHROWN cascade on this fight's first store update (remount).
      lastFx.current = useGame.getState().fxEvent?.id ?? 0;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).__stage = stage;
      syncFromState();
    })();

    const unsub = useGame.subscribe((s) => {
      const stage = stageRef.current;
      if (!stage) return;
      // Pause actually freezes the board: stop the render/animation ticker while paused.
      if (s.paused) {
        stage.app.ticker.stop();
        return;
      }
      if (!stage.app.ticker.started) stage.app.ticker.start();
      const ev = s.fxEvent;
      if (ev && ev.id !== lastFx.current) {
        lastFx.current = ev.id;
        if (ev.kind === "jester") sfx.jester();
        stage.setExitMode(ev.kind === "play" ? "toEnemy" : "toDiscard");
        syncFromState(); // applies new state; departing cards exit per the mode just set
        stage.handleEvent(ev.kind, ev.result, ev.killed, ev.strike);
      } else {
        syncFromState();
      }
    });

    return () => {
      cancelled = true;
      unsub();
      const stage = stageRef.current;
      stageRef.current = null;
      if (stage) {
        stage.destroy();
        stage.app.destroy(true, { children: true });
      }
    };
  }, []);

  return <div className="pixi-host" ref={hostRef} />;
}
