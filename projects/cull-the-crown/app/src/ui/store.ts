// Thin UI/session store (Zustand). All game state lives in the engine's RunState; this store
// holds the current run + ephemeral selection, routes intents through applyAction, and emits typed
// FX events the presentation layer animates against (hit / strike / discard / jester).

import { create } from "zustand";
import { Action, DeckDef, FightingStyleId, ResolutionResult, RunState, Suit } from "../engine/types";
import { applyAction, createRun } from "../engine/run";
import { previewPlay, STAKE_IDS, stakeIndex, styleOf } from "../engine/index";

export type FxKind = "play" | "yield" | "discard" | "jester";

export interface FxEvent {
  id: number;
  kind: FxKind;
  result?: ResolutionResult; // for 'play'
  killed?: boolean; // for 'play'
  strike?: number; // incoming damage when the enemy strikes back (partial-block OR lethal OR fully-blocked amount)
  lost?: boolean; // the strike was lethal (the run will end after the animation)
  blocked?: boolean; // the enemy attacked but shield turned it FULLY aside (no damage) — play the parry beat

  // for 'play' — drives the per-fighting-style attack animation (origin = the played cards,
  // directional toward the royal; size scales with comboValue, intensity with result.damage).
  style?: FightingStyleId; // size-style (1→twoHanded … 5→mage)
  mounted?: boolean; // an Animal Companion (Ace) rode along → a charge overlay
  comboValue?: number; // raw point total of the play (for animation size)
}

const SAVE_KEY = "ctc_save";
const HISTORY_KEY = "ctc_history";
const DEBUG_KEY = "ctc_debug";
const DEBUG_GOLD = 999999; // "infinite" gold while debug mode is on

function loadDebug(): boolean {
  try {
    return localStorage.getItem(DEBUG_KEY) === "1";
  } catch {
    return false;
  }
}

export interface PastRun {
  seed: string;
  result: "won" | "lost" | "surrendered";
  royals: number;
  totalRoyals: number;
  gold: number;
  date: number;
}

/** A saved run is only loadable if it matches the current engine shape (the shop redesign added
 *  `held`/`deckBaseline`/pack-based shop — pre-redesign saves are discarded rather than crash). */
function isCompatibleSave(r: unknown): r is RunState {
  const o = r as Record<string, unknown> | null;
  return (
    !!o &&
    Array.isArray(o.held) &&
    typeof o.deckBaseline === "number" &&
    Array.isArray(o.actEdictsTaken) &&
    !!o.styleLevels &&
    typeof o.styleLevels === "object"
  );
}

/** Is there a loadable in-progress run to continue? */
export function hasSavedRun(): boolean {
  return loadSavedRun() !== null;
}
/** A light summary of the in-progress save, for the setup overlay's Continue tab. */
export function savedRunSummary(): { seed: string; royal: number; total: number; gold: number; deckId: string } | null {
  const r = loadSavedRun();
  if (!r) return null;
  return { seed: r.seedLabel, royal: Math.min(r.enemyIndex + 1, r.castle.length), total: r.castle.length, gold: r.gold, deckId: r.deckId };
}
function loadSavedRun(): RunState | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return isCompatibleSave(parsed) ? parsed : null;
  } catch {
    return null;
  }
}
/** Completed/abandoned runs, newest first. */
export function pastRuns(): PastRun[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? (JSON.parse(raw) as PastRun[]) : [];
  } catch {
    return [];
  }
}

// ─── Deck & stake unlocks (Balatro-style win chain; Debug mode unlocks everything) ───
const DECKS_WON_KEY = "ctc_decks_won";
const STAKE_WON_KEY = "ctc_stake_won";

function decksWon(): string[] {
  try {
    const raw = localStorage.getItem(DECKS_WON_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}
/** Highest stake index (0–7) the player has WON at. White (0) is always available. */
function highestStakeWon(): number {
  try {
    const raw = localStorage.getItem(STAKE_WON_KEY);
    const n = raw ? parseInt(raw, 10) : -1;
    return Number.isFinite(n) ? n : -1;
  } catch {
    return -1;
  }
}

/** Is a deck variant available to choose? Debug mode unlocks all; otherwise its `unlock` deck must
 *  have been won (or it has no requirement). */
export function isDeckUnlocked(deck: DeckDef): boolean {
  if (loadDebug()) return true;
  if (!deck.unlock) return true;
  return decksWon().includes(deck.unlock);
}
/** Highest stake index selectable: White always; each win unlocks the next rung. Debug unlocks all. */
export function maxStakeUnlocked(): number {
  if (loadDebug()) return STAKE_IDS.length - 1;
  return Math.min(STAKE_IDS.length - 1, Math.max(0, highestStakeWon() + 1));
}

function recordWin(run: RunState): void {
  try {
    const won = decksWon();
    if (run.deckId && !won.includes(run.deckId)) {
      won.push(run.deckId);
      localStorage.setItem(DECKS_WON_KEY, JSON.stringify(won));
    }
    const si = stakeIndex(run.stakeId);
    if (si > highestStakeWon()) localStorage.setItem(STAKE_WON_KEY, String(si));
  } catch {
    /* ignore */
  }
}
function recordRunEnd(run: RunState, result: PastRun["result"]): void {
  try {
    localStorage.removeItem(SAVE_KEY); // a finished run can't be continued
    const hist = pastRuns();
    hist.unshift({
      seed: run.seedLabel,
      result,
      royals: run.fightsWon,
      totalRoyals: run.castle.length,
      gold: run.goldEarned,
      date: Date.now(),
    });
    localStorage.setItem(HISTORY_KEY, JSON.stringify(hist.slice(0, 30)));
    if (result === "won") recordWin(run); // unlock the next deck / stake rung
  } catch {
    /* ignore */
  }
}

interface UIState {
  run: RunState;
  selected: string[];
  /** A pending "pick a card" flow: the callback dispatches the right action with the chosen card id.
   *  Shared by remove-card, sigil application, and tarot targeting (shop modal OR combat hand). */
  pendingPick: ((cardId: string) => void) | null;
  pickLabel: string | null;
  /** Chosen suits for selected Wildcard cards, keyed by card id (cleared on play / deselect). */
  wildSuits: Record<string, Suit>;
  fxEvent: FxEvent | null;
  pileModal: "deck" | "discard" | "all" | null;
  newRun: (seed: string, deckId?: string, stakeId?: string) => void;
  dispatch: (action: Action) => void;
  playCards: () => void;
  yieldTurn: () => void;
  discardSelected: () => void;
  /** Defend helper: auto-select the smallest card subset whose values cover the incoming strike. */
  autoBlock: () => void;
  toggleSelect: (id: string) => void;
  clearSelect: () => void;
  setPendingPick: (fn: ((cardId: string) => void) | null, label?: string) => void;
  setWildSuit: (cardId: string, suit: Suit) => void;
  setPileModal: (which: "deck" | "discard" | "all" | null) => void;
  mapOpen: boolean;
  setMapOpen: (open: boolean) => void;
  deckHover: boolean; // pointer is over the combat draw pile → show the remaining-cards peek
  setDeckHover: (over: boolean) => void;
  hoverId: string | null;
  setHoverId: (id: string | null) => void;
  sortHand: (by: "rank" | "suit") => void;
  paused: boolean;
  setPaused: (paused: boolean) => void;
  saveAndQuit: () => void;
  continueRun: () => void;
  surrender: () => void;
  debug: boolean;
  setDebug: (on: boolean) => void;
}

const TITLE_RUN: RunState = { ...createRun(""), phase: "title", notice: null };

// After a non-killing play/yield the enemy strikes back. Report the blow and how it landed:
//  • lost      — the blow is lethal (run ends after the animation)
//  • defend    — a partial blow the player must cover (strike = incoming to discard against)
//  • blocked   — shield turned the blow FULLY aside (the turn continued straight to "play"); the
//                strike is the attack that was parried, so the FX can scale to it
//  • (none)    — the royal was felled (outcome "won"); no counter
function strikeOf(run: RunState): { strike: number; lost: boolean; blocked: boolean } {
  const c = run.combat;
  if (!c) return { strike: 0, lost: false, blocked: false };
  if (c.outcome === "won") return { strike: 0, lost: false, blocked: false }; // felled — no counter
  if (c.outcome === "lost") return { strike: c.incoming, lost: true, blocked: false };
  if (c.subphase === "defend") return { strike: c.incoming, lost: false, blocked: false };
  // Back to "play" with no outcome ⇒ the counter was fully absorbed by shield (a full block).
  return { strike: c.enemy.attack, lost: false, blocked: true };
}

export const useGame = create<UIState>((set) => ({
  run: TITLE_RUN,
  selected: [],
  pendingPick: null,
  pickLabel: null,
  wildSuits: {},
  fxEvent: null,
  pileModal: null,
  mapOpen: false,
  deckHover: false,
  hoverId: null,
  paused: false,
  newRun: (seed, deckId, stakeId) => {
    try {
      localStorage.removeItem(SAVE_KEY); // starting fresh abandons any prior save
    } catch {
      /* ignore */
    }
    set({ run: createRun(seed, deckId, stakeId), selected: [], pendingPick: null, pickLabel: null, wildSuits: {}, fxEvent: null, pileModal: null, paused: false });
  },
  dispatch: (action) =>
    set((s) => {
      const before = s.run;
      let after = applyAction(before, action);
      if ((after.phase === "won" || after.phase === "lost") && before.phase !== after.phase) {
        recordRunEnd(after, after.phase === "won" ? "won" : "lost");
      }
      // Debug mode: keep gold topped up so it never depletes (infinite gold).
      if (s.debug && after.phase !== "title" && after.phase !== "won" && after.phase !== "lost" && after.gold < DEBUG_GOLD) {
        after = { ...after, gold: DEBUG_GOLD };
      }
      return { run: after, selected: [], pendingPick: null, pickLabel: null, wildSuits: {} };
    }),
  playCards: () =>
    set((s) => {
      const before = s.run;
      if (before.phase !== "combat" || before.combat?.subphase !== "play" || before.combat?.outcome) return {};
      const cardIds = s.selected;
      const result = previewPlay(before, cardIds, s.wildSuits);
      const after = applyAction(before, { type: "play", cardIds, wildSuits: s.wildSuits });
      if (!result.valid) return { run: after, selected: [], wildSuits: {} };
      const killed = after.combat?.outcome === "won";
      const { strike, lost, blocked } = strikeOf(after);
      // classify the play for its fighting-style animation
      const played = before.hand.filter((c) => cardIds.includes(c.id));
      const { size, mounted } = styleOf(played);
      const comboValue = played.reduce((a, c) => a + c.value, 0);
      return { run: after, selected: [], wildSuits: {}, fxEvent: { id: (s.fxEvent?.id ?? 0) + 1, kind: "play", result, killed, strike, lost, blocked, style: size, mounted, comboValue } };
    }),
  yieldTurn: () =>
    set((s) => {
      const before = s.run;
      if (before.phase !== "combat" || before.combat?.subphase !== "play" || before.combat?.outcome) return {};
      if (before.combat?.yieldedLastTurn) return {}; // can't yield twice — a no-op, emit no FX
      const after = applyAction(before, { type: "yield" });
      const { strike, lost, blocked } = strikeOf(after);
      return { run: after, selected: [], fxEvent: { id: (s.fxEvent?.id ?? 0) + 1, kind: "yield", strike, lost, blocked } };
    }),
  discardSelected: () =>
    set((s) => {
      const before = s.run;
      if (before.phase !== "combat" || before.combat?.subphase !== "defend") return {};
      const after = applyAction(before, { type: "discard", cardIds: s.selected });
      return { run: after, selected: [], fxEvent: { id: (s.fxEvent?.id ?? 0) + 1, kind: "discard" } };
    }),
  autoBlock: () =>
    set((s) => {
      const combat = s.run.combat;
      if (!combat || combat.subphase !== "defend") return {};
      const cards = s.run.hand;
      const target = combat.incoming;
      const n = cards.length;
      // smallest-sum, then fewest-cards subset that meets the strike (n ≤ 8 → a cheap bitmask sweep)
      let bestMask = (1 << n) - 1;
      let bestSum = Infinity;
      let bestCount = n + 1;
      for (let mask = 1; mask < 1 << n; mask++) {
        let sum = 0;
        let count = 0;
        for (let i = 0; i < n; i++) {
          if (mask & (1 << i)) {
            sum += cards[i].value;
            count++;
          }
        }
        if (sum >= target && (sum < bestSum || (sum === bestSum && count < bestCount))) {
          bestSum = sum;
          bestCount = count;
          bestMask = mask;
        }
      }
      const selected = cards.filter((_, i) => (bestMask & (1 << i)) !== 0).map((c) => c.id);
      return { selected, wildSuits: {} };
    }),
  toggleSelect: (id) =>
    set((s) => {
      const has = s.selected.includes(id);
      const selected = has ? s.selected.filter((x) => x !== id) : [...s.selected, id];
      const wildSuits = { ...s.wildSuits };
      if (has) delete wildSuits[id]; // deselecting a wildcard drops its chosen suit
      return { selected, wildSuits };
    }),
  clearSelect: () => set({ selected: [], wildSuits: {} }),
  setPendingPick: (fn, label) => set({ pendingPick: fn, pickLabel: fn ? (label ?? "Pick a card") : null }),
  setWildSuit: (cardId, suit) => set((s) => ({ wildSuits: { ...s.wildSuits, [cardId]: suit } })),
  setPileModal: (which) => set({ pileModal: which }),
  setMapOpen: (open) => set({ mapOpen: open }),
  setDeckHover: (over) => set((s) => (s.deckHover === over ? {} : { deckHover: over })),
  setHoverId: (id) => set((s) => (s.hoverId === id ? {} : { hoverId: id })),
  // Presentational re-order of the hand (Balatro "Sort Hand"). Order is display-only — selection and
  // play are keyed by card id — so reordering run.hand is safe outside the pure engine.
  sortHand: (by) =>
    set((s) => {
      const so: Record<string, number> = { S: 0, H: 1, C: 2, D: 3 };
      const k = (c: { suit: string | null }) => so[c.suit ?? ""] ?? 9;
      const hand = [...s.run.hand].sort((a, b) =>
        a.kind === "jester" || b.kind === "jester"
          ? (a.kind === "jester" ? 1 : 0) - (b.kind === "jester" ? 1 : 0)
          : by === "suit"
            ? k(a) - k(b) || b.value - a.value
            : b.value - a.value || k(a) - k(b),
      );
      return { run: { ...s.run, hand } };
    }),
  setPaused: (paused) => set({ paused }),
  saveAndQuit: () =>
    set((s) => {
      try {
        const p = s.run.phase;
        if (p !== "title" && p !== "won" && p !== "lost") localStorage.setItem(SAVE_KEY, JSON.stringify(s.run));
      } catch {
        /* ignore */
      }
      return { run: TITLE_RUN, paused: false, selected: [], pendingPick: null, pickLabel: null, wildSuits: {}, fxEvent: null, pileModal: null };
    }),
  continueRun: () =>
    set(() => {
      const saved = loadSavedRun();
      return saved
        ? { run: saved, paused: false, selected: [], pendingPick: null, pickLabel: null, wildSuits: {}, fxEvent: null, pileModal: null }
        : {};
    }),
  surrender: () =>
    set((s) => {
      const after: RunState = { ...s.run, phase: "lost", notice: "You surrendered the run." };
      recordRunEnd(after, "surrendered");
      return { run: after, paused: false, selected: [] };
    }),
  debug: loadDebug(),
  setDebug: (on) =>
    set((s) => {
      try {
        localStorage.setItem(DEBUG_KEY, on ? "1" : "0");
      } catch {
        /* ignore */
      }
      const p = s.run.phase;
      if (on && p !== "title" && p !== "won" && p !== "lost") return { debug: on, run: { ...s.run, gold: DEBUG_GOLD } };
      return { debug: on };
    }),
}));

// Autosave the in-progress run so "Continue" always works, even after a refresh. Saves only when the
// run object actually changes (not on selection/hover) and only during active phases.
let lastSavedRun: RunState | null = null;
useGame.subscribe((s) => {
  if (s.run === lastSavedRun) return;
  lastSavedRun = s.run;
  const p = s.run.phase;
  if (p === "title" || p === "won" || p === "lost") return;
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(s.run));
  } catch {
    /* ignore */
  }
});

// Dev/e2e seam: lets Playwright drive the engine to capture real frames. Harmless in prod.
if (typeof window !== "undefined") {
  const w = window as unknown as { __game: typeof useGame; __preview: (ids: string[]) => ResolutionResult };
  w.__game = useGame;
  w.__preview = (ids) => previewPlay(useGame.getState().run, ids);
}
