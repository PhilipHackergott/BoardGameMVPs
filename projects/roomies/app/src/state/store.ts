// UI/session store (Zustand). Holds the engine GameState + ephemeral UI state (screen routing,
// settings, selection, pass-the-device, animation flights, phase announcements). All game
// mutations route through the pure engine; this layer orchestrates presentation + who-plays-when.

import { create } from "zustand";
import { applyAction, createGame } from "../engine";
import type { GameConfig, GameState, PlayerId, SeatType } from "../engine";
import { cardGlyph } from "../ui/cardText";

export interface Flight {
  id: number;
  from: { x: number; y: number };
  toSel: string;
  glyph: string;
}

export type Screen = "menu" | "setup" | "settings" | "game";

export interface Settings {
  reduceMotion: boolean;
  aiSpeedMs: number; // delay between AI actions
}

const SETTINGS_KEY = "roomies.settings";
function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) return { reduceMotion: false, aiSpeedMs: 750, ...JSON.parse(raw) };
  } catch { /* ignore */ }
  return { reduceMotion: false, aiSpeedMs: 750 };
}

interface RoomiesStore {
  screen: Screen;
  game: GameState | null;
  selectedCardId: number | null;
  handHidden: boolean;
  flights: Flight[];
  announce: string | null;
  settings: Settings;

  goMenu: () => void;
  goSetup: () => void;
  goSettings: () => void;
  setSettings: (patch: Partial<Settings>) => void;

  newGame: (config: { seats: SeatType[]; rounds?: number; seed?: number }) => void;
  quitToMenu: () => void;
  selectCard: (id: number | null) => void;
  draftPick: (cardId: number, from?: { x: number; y: number }) => void;
  resolveMarty: (withPlayer: PlayerId | null) => void;
  place: (cardId: number, target: { env?: number; animal?: number }, from?: { x: number; y: number }) => void;
  discardFromPool: (cardId: number) => void;
  endPlacement: () => void;
  revealHand: () => void;
  removeFlight: (id: number) => void;
}

let flightSeq = 1;

export const useStore = create<RoomiesStore>((set, get) => {
  const humansCount = (g: GameState) => g.config.seats.filter((s) => s === "human").length;

  const spawnFlight = (toSel: string, cardId: number, from?: { x: number; y: number }) => {
    const g = get().game;
    if (!g || get().settings.reduceMotion) return;
    let pt = from;
    if (!pt) {
      const el = document.querySelector(`[data-cardid="${cardId}"]`);
      if (el) {
        const r = el.getBoundingClientRect();
        pt = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
      }
    }
    if (!pt) return;
    set((s) => ({ flights: [...s.flights, { id: flightSeq++, from: pt!, toSel, glyph: cardGlyph(g.cards[cardId]) }] }));
  };

  const dispatch = (mutate: (g: GameState) => GameState) => {
    const g = get().game;
    if (!g) return;
    const before = { current: g.current, phase: g.phase, round: g.round };
    const next = mutate(g);

    let announce = get().announce;
    if (next.phase !== before.phase) {
      if (next.phase === "place") announce = `Round ${next.round} · Placement`;
      else if (next.phase === "draft") announce = `Round ${next.round} · Draft`;
      else announce = null;
    } else if (next.round !== before.round) announce = `Round ${next.round} · Draft`;

    const turnChanged = next.current !== before.current || next.phase !== before.phase || next.round !== before.round;
    const nextIsHuman = next.config.seats[next.current] === "human";
    const handHidden = next.phase !== "ended" && !next.pending && turnChanged && nextIsHuman && humansCount(next) >= 2;

    set({ game: next, selectedCardId: null, handHidden, announce });
  };

  return {
    screen: "menu",
    game: null,
    selectedCardId: null,
    handHidden: false,
    flights: [],
    announce: null,
    settings: loadSettings(),

    goMenu: () => set({ screen: "menu" }),
    goSetup: () => set({ screen: "setup" }),
    goSettings: () => set({ screen: "settings" }),
    setSettings: (patch) =>
      set((s) => {
        const settings = { ...s.settings, ...patch };
        try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); } catch { /* ignore */ }
        return { settings };
      }),

    newGame: ({ seats, rounds, seed }) => {
      const config: Partial<GameConfig> = { seats, rounds: rounds ?? 3 };
      const game = createGame(config, seed);
      const hidden = game.config.seats[0] === "human" && game.config.seats.filter((s) => s === "human").length >= 2;
      set({ game, screen: "game", selectedCardId: null, handHidden: hidden, flights: [], announce: "Round 1 · Draft" });
    },
    quitToMenu: () => set({ screen: "menu", game: null, selectedCardId: null, handHidden: false, flights: [], announce: null }),
    selectCard: (id) => set({ selectedCardId: id }),

    draftPick: (cardId, from) => {
      const g = get().game;
      if (g) spawnFlight(`[data-pool="${g.current}"]`, cardId, from);
      dispatch((s) => applyAction(s, { type: "draftPick", cardId }));
    },
    resolveMarty: (withPlayer) => dispatch((s) => applyAction(s, { type: "resolveMarty", withPlayer })),
    place: (cardId, target, from) => {
      spawnFlight(target.env != null ? `[data-room="${target.env}"]` : `[data-anim="${target.animal}"]`, cardId, from);
      dispatch((s) => applyAction(s, { type: "place", cardId, targetEnvCardId: target.env, targetAnimalCardId: target.animal }));
    },
    discardFromPool: (cardId) => dispatch((s) => applyAction(s, { type: "discardFromPool", cardId })),
    endPlacement: () => dispatch((s) => applyAction(s, { type: "endPlacement" })),

    revealHand: () => set({ handHidden: false }),
    removeFlight: (id) => set((s) => ({ flights: s.flights.filter((f) => f.id !== id) })),
  };
});
