import { create } from "zustand";
import {
  applyAction,
  beaconsLeft,
  createGame,
  hasLegalMove,
  lineClearFor,
  makeConfig,
  placementOrder,
  POWERS,
  projectOnSegment,
  snapBeacon,
} from "../engine";
import type { GameState, PlayerId, PowerId, Result } from "../engine";
import type { Difficulty } from "../ai/ai";
import { PLAYER_NAMES } from "../ui/colors";
import { getTheme } from "../ui/theme";
import type { ThemeId } from "../ui/theme";

// Player-facing game setup chosen on the main menu.
export interface MenuConfig {
  players: number; // 2..4
  names: string[]; // length 4; first `players` are used
  clockSeconds: number; // per-player chess clock; 0 = off
  draftPicks: number; // special powers each player drafts (0 = off)
  affinitiesOn: boolean; // each player also drafts one colour affinity
  ai: (Difficulty | null)[]; // per player: null = human, else AI difficulty
}

// In-progress draft (between menu and game). Two rounds: powers, then affinities.
export interface DraftState {
  mode: "powers" | "affinities";
  pool: PowerId[]; // powers still on offer
  affinityPool: number[]; // colour affinities still on offer
  order: PlayerId[]; // snake pick order for the current round
  turn: number; // index into order
  picks: PowerId[][]; // powers taken, per player
  affinity: (number | null)[]; // affinity taken, per player
}

// A finished game, persisted for the menu scoreboard.
export interface RunRecord {
  ts: number;
  players: number;
  names: string[];
  colorsWon: number[];
  flowers: number[];
  winner: Result;
  clockSeconds: number;
}

export const DEFAULT_MENU_CONFIG: MenuConfig = {
  players: 2,
  names: [...PLAYER_NAMES],
  clockSeconds: 0,
  draftPicks: 0,
  affinitiesOn: false,
  ai: [null, null, null, null],
};

function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const HISTORY_KEY = "lacuna.history.v1";
function loadHistory(): RunRecord[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? (JSON.parse(raw) as RunRecord[]) : [];
  } catch {
    return [];
  }
}
function saveHistory(h: RunRecord[]): void {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(h));
  } catch {
    /* storage unavailable — ignore */
  }
}

// App-level preferences (distinct from per-match setup), persisted across sessions.
export interface AppSettings {
  animatedBg: boolean; // the living plasma backdrop on the menu
  reduceMotion: boolean; // damp animations (static backdrop, instant transitions)
  theme: ThemeId; // visual reskin: "pond" (default) or "zodiac" (watercolor astrology)
  music: boolean; // generative ambient background music
  sfx: boolean; // game sound effects
  musicVolume: number; // 0..1
  sfxVolume: number; // 0..1
}
const DEFAULT_SETTINGS: AppSettings = {
  animatedBg: true,
  reduceMotion: false,
  theme: "pond",
  music: true,
  sfx: true,
  musicVolume: 0.7,
  sfxVolume: 0.8,
};
const SETTINGS_KEY = "lacuna.settings.v1";
function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    return raw ? { ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as Partial<AppSettings>) } : { ...DEFAULT_SETTINGS };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}
function saveSettings(s: AppSettings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
  } catch {
    /* ignore */
  }
}

// A resumable snapshot of an in-progress game (engine state is plain serializable data).
export interface SavedGame {
  game: GameState;
  config: MenuConfig;
  clocks: number[];
  flagged: boolean[];
}
const SAVE_KEY = "lacuna.save.v1";
function loadSave(): SavedGame | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as SavedGame;
    return s.game && s.game.phase !== "ended" ? s : null;
  } catch {
    return null;
  }
}
function saveSnapshot(s: SavedGame): void {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(s));
  } catch {
    /* ignore */
  }
}
function clearSave(): void {
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch {
    /* ignore */
  }
}

// One flower is "in hand". Same-colour flowers split into green (clear path) and
// red (blocked path); `hover` is the snapped pawn preview gliding along a green line.
export interface Selection {
  aStarId: number | null;
  partners: number[]; // green — clear line
  flyPartners: number[]; // sky — clear only via the Flying power
  blocked: number[]; // red — blocked line
  hover: { bStarId: number; x: number; y: number } | null;
}

// A flower in motion toward a player's pile (board coords → handled by the UI layer).
// `fromPlayer` marks an inter-player transfer: the flight starts at that player's
// pile instead of a board position (Dusk steal, and any future transfer).
export interface Flight {
  id: number;
  color: number;
  owner: PlayerId;
  fromX: number;
  fromY: number;
  fromPlayer?: PlayerId;
}

const emptySelection: Selection = {
  aStarId: null,
  partners: [],
  flyPartners: [],
  blocked: [],
  hover: null,
};

// Stage-space radius within which the cursor "grabs" a green guide line.
const SNAP = 22;

let flightSeq = 0;
function makeFlight(color: number, owner: PlayerId, fromX: number, fromY: number): Flight {
  return { id: flightSeq++, color, owner, fromX, fromY };
}

// Inter-player transfer: a flower travels from one player's pile to another's.
function makeTransferFlight(color: number, fromPlayer: PlayerId, owner: PlayerId): Flight {
  return { id: flightSeq++, color, owner, fromX: 0, fromY: 0, fromPlayer };
}

interface Store {
  screen: "menu" | "draft" | "game";
  config: MenuConfig;
  history: RunRecord[];
  draft: DraftState | null;
  game: GameState | null;
  selection: Selection;
  message: string | null;
  reveal: number; // how many leftover flowers have been assigned in the end animation
  revealAuto: boolean; // true while the end animation auto-advances; false once the user scrubs
  lens: boolean; // influence-lens overlay on/off
  paused: boolean; // all-AI match: halt the AI driver so you can analyse
  flights: Flight[]; // flowers currently animating to a pile
  clocks: number[]; // ms of thinking time left per player (chess clock)
  flagged: boolean[]; // players whose clock ran out
  recorded: boolean; // whether the finished game was saved to history
  togglePause: () => void;
  settings: AppSettings;
  setSettings: (partial: Partial<AppSettings>) => void;
  savedSnapshot: SavedGame | null; // a resumable game restored from a prior session
  continueGame: () => void;
  startGame: (cfg: MenuConfig) => void;
  draftPower: (id: PowerId) => void;
  draftAffinity: (color: number) => void;
  returnToMenu: () => void;
  newGame: (seedInput?: string, powers?: PowerId[][], affinity?: (number | null)[]) => void;
  toggleLens: () => void;
  selectStar: (id: number) => void;
  hoverAt: (x: number, y: number) => void;
  commitAt: (x: number, y: number) => void;
  confirmPlace: () => void;
  passTurn: () => void;
  flexPass: () => void;
  flexExtra: () => void;
  nomadReclaim: (beaconId: number) => void;
  enterRedeploy: () => void;
  pickupMode: boolean; // Nomad: clicking a pawn reclaims it
  duskSteal: (color: number) => void;
  abyssVoid: (starId: number) => void;
  abyssSkip: () => void;
  deselect: () => void;
  tickReveal: () => void;
  setReveal: (n: number) => void;
  replayHarvest: () => void;
  removeFlight: (id: number) => void;
  tickClock: (deltaMs: number) => void;
  recordRun: () => void;
  clearHistory: () => void;
}

// Split a flower's same-colour neighbours into clear (green), Flying-only (sky), blocked (red).
function splitPartners(
  game: GameState,
  starId: number,
): { partners: number[]; flyPartners: number[]; blocked: number[] } {
  const a = game.stars.find((s) => s.id === starId);
  if (!a) return { partners: [], flyPartners: [], blocked: [] };
  const partners: number[] = [];
  const flyPartners: number[] = [];
  const blocked: number[] = [];
  for (const b of game.stars) {
    if (b.id === a.id || b.color !== a.color) continue;
    if (lineClearFor(game, game.current, a, b, true)) partners.push(b.id); // clear without flying
    else if (lineClearFor(game, game.current, a, b)) flyPartners.push(b.id); // only via Flying
    else blocked.push(b.id);
  }
  return { partners, flyPartners, blocked };
}

// Nearest green line to (x,y) within the snap window, as a ready-to-place point.
function snapToGreenLine(
  game: GameState,
  selection: Selection,
  x: number,
  y: number,
): { bStarId: number; x: number; y: number } | null {
  const a = game.stars.find((s) => s.id === selection.aStarId);
  if (!a) return null;
  let best: { bStarId: number; x: number; y: number } | null = null;
  let bestDist = SNAP;
  for (const id of [...selection.partners, ...selection.flyPartners]) {
    const b = game.stars.find((s) => s.id === id);
    if (!b) continue;
    const proj = projectOnSegment({ x, y }, a, b);
    if (proj.distance < bestDist) {
      bestDist = proj.distance;
      const snapped = snapBeacon(game, a, b, proj.x, proj.y);
      best = { bStarId: id, x: snapped.x, y: snapped.y };
    }
  }
  return best;
}

export const useGame = create<Store>((set, get) => {
  // Setup: take one flower as the starting bonus and launch it toward the pile.
  const claimStar = (starId: number) => {
    const { game, flights } = get();
    if (!game || game.phase !== "setup") return;
    const s = game.stars.find((st) => st.id === starId);
    const owner = game.current;
    try {
      const next = applyAction(game, { type: "claim", starId });
      const launched = s ? [...flights, makeFlight(s.color, owner, s.x, s.y)] : flights;
      set({ game: next, selection: { ...emptySelection }, message: null, flights: launched });
    } catch (err) {
      set({ message: err instanceof Error ? err.message : "Illegal claim" });
    }
  };

  // Place a pawn between two flowers, claim them, and launch both toward their piles.
  const placePawn = (aStarId: number, bStarId: number, x: number, y: number) => {
    const { game, flights } = get();
    if (!game) return;
    const a = game.stars.find((s) => s.id === aStarId);
    const b = game.stars.find((s) => s.id === bStarId);
    const owner = game.current;
    try {
      const next = applyAction(game, { type: "place", aStarId, bStarId, x, y });
      const launched = [...flights];
      if (a) launched.push(makeFlight(a.color, owner, a.x, a.y));
      if (b) launched.push(makeFlight(b.color, owner, b.x, b.y));
      set({ game: next, selection: { ...emptySelection }, message: null, flights: launched });
    } catch (err) {
      set({ message: err instanceof Error ? err.message : "Illegal move" });
    }
  };

  // Repeller: a board click aims the cone (direction = click − pawn).
  const repelToward = (x: number, y: number) => {
    const { game } = get();
    if (!game) return;
    try {
      set({ game: applyAction(game, { type: "repel", x, y }), selection: { ...emptySelection }, message: null });
    } catch (err) {
      set({ message: err instanceof Error ? err.message : "Can't aim there" });
    }
  };

  // Nomad: a board click reclaims the nearest of your own pawns.
  const reclaimNear = (x: number, y: number) => {
    const { game } = get();
    if (!game) return;
    let best: number | null = null;
    let bd = Infinity;
    for (const b of game.beacons) {
      if (b.owner !== game.current || b.phantom) continue;
      const d = Math.hypot(b.x - x, b.y - y);
      if (d < bd) {
        bd = d;
        best = b.id;
      }
    }
    if (best === null) {
      set({ pickupMode: false, message: "No pawn to reclaim." });
      return;
    }
    try {
      set({
        game: applyAction(game, { type: "nomadPickup", beaconId: best }),
        pickupMode: false,
        message: "Pawn reclaimed — redeploy it on your next turn.",
      });
    } catch (err) {
      set({ pickupMode: false, message: err instanceof Error ? err.message : "Can't reclaim" });
    }
  };

  return {
    screen: "menu",
    config: { ...DEFAULT_MENU_CONFIG },
    history: loadHistory(),
    draft: null,
    game: null,
    selection: emptySelection,
    message: null,
    reveal: 0,
    revealAuto: true,
    lens: false,
    paused: false,
    flights: [],
    clocks: [],
    flagged: [],
    recorded: false,
    pickupMode: false,
    settings: loadSettings(),
    savedSnapshot: loadSave(),

    togglePause: () => set((s) => ({ paused: !s.paused })),

    setSettings: (partial) =>
      set((s) => {
        const next = { ...s.settings, ...partial };
        saveSettings(next);
        return { settings: next };
      }),

    // Resume an in-progress game: prefer the one already in memory, else the
    // snapshot restored from a prior session.
    continueGame: () => {
      const { game, savedSnapshot } = get();
      if (game && game.phase !== "ended") {
        set({ screen: "game" });
        return;
      }
      if (savedSnapshot && savedSnapshot.game.phase !== "ended") {
        const snap = savedSnapshot;
        set({
          screen: "game",
          draft: null,
          config: snap.config,
          game: snap.game,
          clocks: snap.clocks,
          flagged: snap.flagged,
          selection: { ...emptySelection },
          message: null,
          reveal: 0,
          revealAuto: true,
          flights: [],
          recorded: false,
          pickupMode: false,
          paused: false,
        });
      }
    },

    enterRedeploy: () =>
      set({ pickupMode: true, selection: { ...emptySelection }, message: "Click one of your pawns to reclaim it." }),

    toggleLens: () =>
      set((s) => (lensLockedOut(s.game) ? {} : { lens: !s.lens })),

    startGame: (cfg: MenuConfig) => {
      set({ config: cfg });
      if (cfg.draftPicks <= 0 && !cfg.affinitiesOn) {
        get().newGame();
        return;
      }
      // Pool = picks*players + players (one spare per player), capped at the catalog.
      const poolSize = Math.min(cfg.draftPicks * cfg.players + cfg.players, POWERS.length);
      const pool = shuffle(POWERS.map((p) => p.id)).slice(0, poolSize);
      const powersFirst = cfg.draftPicks > 0;
      set({
        screen: "draft",
        paused: false,
        draft: {
          mode: powersFirst ? "powers" : "affinities",
          pool,
          affinityPool: [0, 1, 2, 3, 4, 5, 6],
          order: placementOrder(cfg.players, powersFirst ? cfg.draftPicks : 1),
          turn: 0,
          picks: Array.from({ length: cfg.players }, () => []),
          affinity: Array.from({ length: cfg.players }, () => null),
        },
      });
    },

    // A drafter takes a power; advance, then move to the affinity round or deal.
    draftPower: (id: PowerId) => {
      const { draft, config } = get();
      if (!draft || draft.mode !== "powers" || !draft.pool.includes(id)) return;
      const player = draft.order[draft.turn];
      const pool = draft.pool.filter((p) => p !== id);
      const picks = draft.picks.map((arr, i) => (i === player ? [...arr, id] : arr));
      const turn = draft.turn + 1;
      const roundDone = turn >= draft.order.length || pool.length === 0;
      if (!roundDone) {
        set({ draft: { ...draft, pool, picks, turn } });
      } else if (config.affinitiesOn) {
        set({
          draft: { ...draft, mode: "affinities", pool, picks, turn: 0, order: placementOrder(config.players, 1) },
        });
      } else {
        set({ draft: null });
        get().newGame(undefined, picks);
      }
    },

    // A drafter takes a colour affinity (unique); when the round ends, deal.
    draftAffinity: (color: number) => {
      const { draft } = get();
      if (!draft || draft.mode !== "affinities" || !draft.affinityPool.includes(color)) return;
      const player = draft.order[draft.turn];
      const affinityPool = draft.affinityPool.filter((c) => c !== color);
      const affinity = draft.affinity.map((a, i) => (i === player ? color : a));
      const turn = draft.turn + 1;
      if (turn >= draft.order.length || affinityPool.length === 0) {
        set({ draft: null });
        get().newGame(undefined, draft.picks, affinity);
      } else {
        set({ draft: { ...draft, affinityPool, affinity, turn } });
      }
    },

    returnToMenu: () => set({ screen: "menu", draft: null, paused: false }),

    newGame: (seedInput?: string, powers?: PowerId[][], affinity?: (number | null)[]) => {
      const { config } = get();
      const trimmed = (seedInput ?? "").trim();
      const seed =
        trimmed.length > 0 && Number.isFinite(Number(trimmed))
          ? Number(trimmed) >>> 0
          : Math.floor(Math.random() * 0xffffffff);
      const clockMs = config.clockSeconds * 1000;
      set({
        screen: "game",
        draft: null,
        game: createGame(seed, makeConfig(config.players), true, powers ?? [], affinity ?? []),
        selection: { ...emptySelection },
        message: null,
        reveal: 0,
        revealAuto: true,
        flights: [],
        clocks: new Array(config.players).fill(clockMs),
        flagged: new Array(config.players).fill(false),
        recorded: false,
        pickupMode: false,
        paused: false,
      });
    },

    // Click a flower: take it in hand (revealing red/green lines), or drop it if it
    // was already the one in hand. Clicking a different flower switches to it.
    selectStar: (id: number) => {
      const { game, selection, flights } = get();
      if (!game) return;
      if (game.phase === "setup") {
        claimStar(id);
        return;
      }
      if (game.phase !== "play") return;

      // Repeller cone / Nomad reclaim / Abyss banish: a flower click resolves the sub-phase.
      const clicked = game.stars.find((s) => s.id === id);
      if (game.repelOrigin && clicked) {
        repelToward(clicked.x, clicked.y);
        return;
      }
      if (get().pickupMode && clicked) {
        reclaimNear(clicked.x, clicked.y);
        return;
      }
      if (game.abyssPending && clicked) {
        get().abyssVoid(id);
        return;
      }

      // Free-pick sub-phase: clicks resolve queued picks — collected flowers fly to the
      // pile; removed flowers (Assassin) just vanish.
      if (game.freePicks.length > 0) {
        const picked = game.stars.find((s) => s.id === id);
        const owner = game.current;
        const collecting = game.freePicks[0] === "collect";
        try {
          const next = applyAction(game, { type: "freePick", starId: id });
          const launched =
            picked && collecting ? [...flights, makeFlight(picked.color, owner, picked.x, picked.y)] : flights;
          set({ game: next, selection: { ...emptySelection }, message: null, flights: launched });
        } catch (err) {
          set({ message: err instanceof Error ? err.message : "Can't pick that" });
        }
        return;
      }

      if (beaconsLeft(game, game.current) <= 0) return;

      if (selection.aStarId === id) {
        set({ selection: { ...emptySelection }, message: null });
        return;
      }
      const { partners, flyPartners, blocked } = splitPartners(game, id);
      set({
        selection: { aStarId: id, partners, flyPartners, blocked, hover: null },
        message:
          partners.length === 0 && flyPartners.length === 0
            ? "No clear line from that flower — pick another."
            : "Glide along a green line and click to drop your pawn.",
      });
    },

    // Live preview as the cursor moves: snap the pawn onto the nearest green line.
    hoverAt: (x: number, y: number) => {
      const { game, selection } = get();
      if (!game || selection.aStarId === null) return;
      const hover = snapToGreenLine(game, selection, x, y);
      if (hover === selection.hover) return;
      if (
        hover &&
        selection.hover &&
        hover.bStarId === selection.hover.bStarId &&
        hover.x === selection.hover.x &&
        hover.y === selection.hover.y
      ) {
        return; // unchanged — skip the state churn
      }
      set({ selection: { ...selection, hover } });
    },

    // Click on the board: drop the pawn if the cursor is over a green line, otherwise
    // (clicking anywhere off the placement lines) cancel the current selection.
    commitAt: (x: number, y: number) => {
      const { game, selection } = get();
      if (!game) return;
      if (game.repelOrigin) {
        repelToward(x, y);
        return;
      }
      if (get().pickupMode) {
        reclaimNear(x, y);
        return;
      }
      if (selection.aStarId === null) return;
      const target = snapToGreenLine(game, selection, x, y);
      if (!target) {
        set({ selection: { ...emptySelection }, message: null });
        return;
      }
      placePawn(selection.aStarId, target.bStarId, target.x, target.y);
    },

    // Keyboard affordance (Enter): commit the current hovered preview.
    confirmPlace: () => {
      const { game, selection } = get();
      if (!game || selection.aStarId === null || !selection.hover) return;
      placePawn(selection.aStarId, selection.hover.bStarId, selection.hover.x, selection.hover.y);
    },

    passTurn: () => {
      const { game } = get();
      if (!game || game.phase !== "play") return;
      set({
        game: applyAction(game, { type: "pass" }),
        selection: { ...emptySelection },
        message: null,
      });
    },

    flexPass: () => {
      const { game } = get();
      if (!game || game.phase !== "play") return;
      try {
        set({
          game: applyAction(game, { type: "flexPass" }),
          selection: { ...emptySelection },
          message: null,
        });
      } catch (err) {
        set({ message: err instanceof Error ? err.message : "Can't pass" });
      }
    },

    flexExtra: () => {
      const { game } = get();
      if (!game || game.phase !== "play") return;
      try {
        set({ game: applyAction(game, { type: "flexExtra" }), message: "Extra turn — place again." });
      } catch (err) {
        set({ message: err instanceof Error ? err.message : "No extra turn available" });
      }
    },

    // Nomad redeploy by beacon id (used by the AI driver; humans use enterRedeploy + click).
    nomadReclaim: (beaconId: number) => {
      const { game } = get();
      if (!game || game.phase !== "play") return;
      try {
        set({
          game: applyAction(game, { type: "nomadPickup", beaconId }),
          message: "Pawn reclaimed — redeploy it.",
        });
      } catch (err) {
        set({ message: err instanceof Error ? err.message : "Can't reclaim" });
      }
    },

    duskSteal: (color: number) => {
      const { game, flights } = get();
      if (!game) return;
      try {
        // Mirror the engine's target selection so the transfer animation flies from
        // the same rival pile the flower is actually taken from.
        let target: PlayerId | null = null;
        let most = 0;
        for (let p = 0; p < game.config.players; p++) {
          if (p === game.current) continue;
          if (game.collected[p][color] > most) {
            most = game.collected[p][color];
            target = p;
          }
        }
        const next = applyAction(game, { type: "duskSteal", colorId: color });
        const launched =
          target !== null && most > 0
            ? [...flights, makeTransferFlight(color, target, game.current)]
            : flights;
        set({ game: next, message: null, flights: launched });
      } catch (err) {
        set({ message: err instanceof Error ? err.message : "Can't steal that" });
      }
    },

    abyssVoid: (starId: number) => {
      const { game } = get();
      if (!game) return;
      try {
        set({ game: applyAction(game, { type: "abyssVoid", starId }), selection: { ...emptySelection }, message: null });
      } catch (err) {
        set({ message: err instanceof Error ? err.message : "Can't banish that" });
      }
    },

    abyssSkip: () => {
      const { game } = get();
      if (!game) return;
      try {
        set({ game: applyAction(game, { type: "abyssSkip" }), message: null });
      } catch (err) {
        set({ message: err instanceof Error ? err.message : "" });
      }
    },

    deselect: () => set({ selection: { ...emptySelection }, message: null, pickupMode: false }),

    // Reveal one more leftover-flower assignment; launch it toward the owner's pile.
    tickReveal: () => {
      const { game, reveal, flights } = get();
      const terr = game?.territory;
      const total = terr?.length ?? 0;
      if (!terr || reveal >= total) return;
      const t = terr[reveal];
      const launched =
        t.owner !== null ? [...flights, makeFlight(t.color, t.owner, t.x, t.y)] : flights;
      set({ reveal: reveal + 1, flights: launched });
    },

    // Scrub the harvest timeline directly (the slider under the board). Taking manual
    // control stops the auto-advance so it doesn't fight the user.
    setReveal: (n: number) => {
      const { game } = get();
      const total = game?.territory?.length ?? 0;
      const clamped = Math.max(0, Math.min(total, Math.round(n)));
      set({ reveal: clamped, revealAuto: false, flights: [] });
    },

    // Replay the harvest animation from the start (re-arms the auto-advance).
    replayHarvest: () => set({ reveal: 0, revealAuto: true, flights: [] }),

    removeFlight: (id: number) => set((s) => ({ flights: s.flights.filter((f) => f.id !== id) })),

    // Chess clock: burn the active player's time during play; flag at zero.
    tickClock: (deltaMs: number) => {
      const { game, config, clocks, flagged } = get();
      if (!game || game.phase !== "play" || config.clockSeconds <= 0) return;
      const p = game.current;
      const remaining = Math.max(0, (clocks[p] ?? 0) - deltaMs);
      if (remaining === clocks[p]) return;
      const nextClocks = clocks.slice();
      nextClocks[p] = remaining;
      if (remaining === 0 && !flagged[p]) {
        const nextFlagged = flagged.slice();
        nextFlagged[p] = true;
        set({ clocks: nextClocks, flagged: nextFlagged });
      } else {
        set({ clocks: nextClocks });
      }
    },

    recordRun: () => {
      const { game, config, history, recorded } = get();
      if (!game || game.phase !== "ended" || recorded || !game.finalByColor || !game.colorWinners) {
        return;
      }
      const colorsWon = new Array(config.players).fill(0);
      for (const w of game.colorWinners) if (w !== null) colorsWon[w]++;
      const flowers = game.finalByColor.map((row) => row.reduce((s, n) => s + n, 0));
      const rec: RunRecord = {
        ts: Date.now(),
        players: config.players,
        names: config.names.slice(0, config.players),
        colorsWon,
        flowers,
        winner: game.result ?? "draw",
        clockSeconds: config.clockSeconds,
      };
      const next = [rec, ...history].slice(0, 50);
      saveHistory(next);
      set({ history: next, recorded: true });
    },

    clearHistory: () => {
      saveHistory([]);
      set({ history: [] });
    },
  };
});

// Persist the active game so "Continue" survives a reload; drop the save once a
// game ends. Runs on every game-state change (cheap identity guard).
useGame.subscribe((s, prev) => {
  if (s.game === prev.game) return;
  if (s.game && s.game.phase !== "ended") {
    saveSnapshot({ game: s.game, config: s.config, clocks: s.clocks, flagged: s.flagged });
  } else {
    clearSave();
  }
});

export function currentHasLegalMove(game: GameState | null): boolean {
  return game ? hasLegalMove(game) : false;
}

// The active visual theme (reskin), driven by settings.
export const useTheme = () => getTheme(useGame((s) => s.settings.theme));

// The Controlling power (lens lockout) was removed in the rebalance; the lens is always
// free. Kept as a stable no-op so existing call sites need no change.
export function lensLockedOut(_game: GameState | null): boolean {
  return false;
}
