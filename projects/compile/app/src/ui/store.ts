// Zustand store: a thin shell around the live Engine. The Engine mutates its GameState in place, so
// the store carries a `rev` counter that we bump after every interaction to drive React re-renders;
// components read engine.state directly. The store also owns presentation-only state (the human's
// current hand selection) and the AI pacing (a delay so opponent moves are watchable).

import { create } from "zustand";
import { ActionChoice, AITier, Engine, GameState, ProtocolName, Side, draftTurn } from "../engine";

const AI_DELAY_MS = 850;
const DRAFT_DELAY_MS = 700;

export interface SetupOpts {
  mode: "hotseat" | "ai";
  aiTier: AITier; // used when mode === "ai"
  useControl: boolean;
  seed?: string;
}

export type Overlay = "none" | "codex" | "tutorial";

interface UIState {
  engine: Engine | null;
  rev: number;
  aiThinking: boolean;
  draftThinking: boolean;
  /** Text of the AI's most recent move, shown as a banner until the human acts. */
  aiMove: string | null;
  /** Full-screen info overlay shown over any screen (card codex / tutorial). */
  overlay: Overlay;
  // human action-step selection
  selUid: string | null;
  selFaceUp: boolean;

  setOverlay(o: Overlay): void;
  setup(opts: SetupOpts): void;
  reset(): void;
  draftPick(p: ProtocolName): void;
  advanceDraft(): void;

  selectCard(uid: string | null): void;
  setFaceUp(faceUp: boolean): void;
  playSelected(line: number): void;
  refresh(): void;

  submit(res: import("../engine").ChoiceResponse): void;

  clearFx(): void;
}

let aiTimer: ReturnType<typeof setTimeout> | null = null;
let draftTimer: ReturnType<typeof setTimeout> | null = null;

const ACTION_RE = /plays|refreshes|COMPILES|recompiles|seizes/i;

export const useGame = create<UIState>((set, get) => {
  function bump(): void {
    set((s) => ({ rev: s.rev + 1 }));
  }

  function scheduleAI(): void {
    const eng = get().engine;
    if (!eng) return;
    if (aiTimer) {
      clearTimeout(aiTimer);
      aiTimer = null;
    }
    if (eng.awaitingAI && eng.state.winner === null) {
      set({ aiThinking: true });
      bump();
      aiTimer = setTimeout(() => {
        aiTimer = null;
        const before = eng.state.log.length;
        eng.runAITurn();
        const moves = eng.state.log.slice(before).filter((l) => ACTION_RE.test(l.text));
        set({ aiThinking: false, aiMove: moves.length ? moves[0].text : get().aiMove });
        bump();
        scheduleAI(); // chain (covers AI-vs-AI or back-to-back)
      }, AI_DELAY_MS);
    } else {
      set({ aiThinking: false });
    }
  }

  function advanceDraft(): void {
    const eng = get().engine;
    if (!eng) return;
    if (draftTimer) {
      clearTimeout(draftTimer);
      draftTimer = null;
    }
    if (eng.state.phase === "turn") {
      set({ draftThinking: false });
      eng.beginPlay();
      bump();
      scheduleAI();
      return;
    }
    const dt = draftTurn(eng.state);
    if (dt && eng.state.players[dt.side].isAI) {
      set({ draftThinking: true });
      bump();
      draftTimer = setTimeout(() => {
        draftTimer = null;
        eng.aiDraftStep();
        set({ draftThinking: false });
        bump();
        advanceDraft(); // chain to the next pick (paced)
      }, DRAFT_DELAY_MS);
    } else {
      set({ draftThinking: false });
      bump();
    }
  }

  function clearSel(): void {
    set({ selUid: null, selFaceUp: false, aiMove: null });
  }

  return {
    engine: null,
    rev: 0,
    aiThinking: false,
    draftThinking: false,
    aiMove: null,
    overlay: "none",
    selUid: null,
    selFaceUp: false,

    setOverlay(o) {
      set({ overlay: o });
    },

    setup(opts) {
      const p0 = { name: "PLAYER 1", tier: "human" as AITier };
      const p1 =
        opts.mode === "ai"
          ? { name: aiName(opts.aiTier), tier: opts.aiTier }
          : { name: "PLAYER 2", tier: "human" as AITier };
      const eng = Engine.create({ p0, p1, useControl: opts.useControl, seed: opts.seed });
      set({ engine: eng, rev: get().rev + 1, aiThinking: false, draftThinking: false, aiMove: null, selUid: null, selFaceUp: false });
      advanceDraft(); // paces any AI picks; waits when it's the human's pick
    },

    reset() {
      if (aiTimer) clearTimeout(aiTimer);
      if (draftTimer) clearTimeout(draftTimer);
      aiTimer = null;
      draftTimer = null;
      set({ engine: null, aiThinking: false, draftThinking: false, aiMove: null, selUid: null, selFaceUp: false, rev: get().rev + 1 });
    },

    draftPick(p) {
      const eng = get().engine;
      if (!eng) return;
      eng.draftPick(p);
      set({ aiMove: null });
      bump();
      advanceDraft();
    },

    advanceDraft,

    selectCard(uid) {
      set({ selUid: uid });
    },
    setFaceUp(faceUp) {
      set({ selFaceUp: faceUp });
    },

    playSelected(line) {
      const eng = get().engine;
      const { selUid, selFaceUp } = get();
      if (!eng || selUid === null) return;
      eng.playAction({ type: "play", uid: selUid, faceUp: selFaceUp, line });
      clearSel();
      bump();
      scheduleAI();
    },

    refresh() {
      const eng = get().engine;
      if (!eng) return;
      eng.playAction({ type: "refresh" });
      clearSel();
      bump();
      scheduleAI();
    },

    submit(res) {
      const eng = get().engine;
      if (!eng) return;
      eng.submitChoice(res);
      clearSel();
      bump();
      scheduleAI();
    },

    clearFx() {
      const eng = get().engine;
      if (eng) eng.state.fx = [];
    },
  };
});

function aiName(tier: AITier): string {
  return tier === "easy" ? "AI · NOVICE" : tier === "medium" ? "AI · ADEPT" : "AI · OVERMIND";
}

// Convenience selectors used by components.
export function gs(): GameState | null {
  return useGame.getState().engine?.state ?? null;
}
export function currentDrafter(state: GameState): { side: Side; remaining: number } | null {
  return draftTurn(state);
}
export type { ActionChoice };
