// Zustand store — the composition root that wires the pure engine to the UI, drives the AI in
// watchable beats (Lacuna pattern: AI plays through the same actions a human would), turns engine
// FxEvents into pops/shake/sound, and persists settings/decks/history.

import { create } from "zustand";
import { Action, Duel } from "../engine/prism/types";
import { createDuel } from "../engine/prism/setup";
import { reduce } from "../engine/prism/reduce";
import { Persona } from "../engine/prism/evaluate";
import { chooseMove, bandFor } from "../ai/ai";
import { getDeck, expandDeck, DECKS, STARTER_DECK_ID } from "../engine/content/decks";
import { ROSTER, PERSONAS, Opponent, getOpponent } from "../engine/content/opponents";
import { getCard } from "../engine/content/registry";
import { sound } from "../audio/sound";
import { CareerState, createCareer, careerReduce, currentObjective } from "../engine/career";
import { ACT1, Line } from "../engine/content/story";
import { WORLD } from "../engine/content/world";
import { openPack, getPack } from "../engine/content/packs";
import { marketPrice, sellPrice } from "../engine/content/market";
import { ACTIVITIES, examDue } from "../engine/content/lifesim";
import { getTournament } from "../engine/content/tournaments";

export type View = "menu" | "duel" | "deckbuilder" | "gallery" | "world";
export type Overlay =
  | null | "modeSelect" | "freeplay" | "gauntlet" | "result" | "rules" | "settings" | "pause" | "deckPeek" | "deskMenu"
  | "shop" | "market" | "packReveal" | "contextSelect" | "status" | "tournament" | "pcHub" | "community";

export interface DialogueState { lines: Line[]; idx: number; onDone?: () => void; }

export interface Settings { music: number; sfx: number; muted: boolean; reduceMotion: boolean; textScale: number; }
export interface SavedDeck { id: string; name: string; cards: string[]; }
export interface ResultRecord { mode: string; opponent: string; outcome: "win" | "loss"; turns: number; ts: number; }
export interface Pop { id: number; kind: "dmg" | "heal" | "light"; text: string; x: number; y: number; }

interface DuelMeta { mode: "free" | "gauntlet" | "starter" | "story" | "tournament"; oppName: string; oppFlavor: string; skill: number; persona: Persona; playerDeckName: string; storyStepId?: string; }
interface TourneyState { defId: string; round: number; wins: number; status: "ready" | "champion" | "lost"; }
interface GauntletState { rung: number; deckId: string; deckName: string; wins: number; }

const SAVE_KEY = "prism.save.v1";
const AI_BEAT = 560;

interface Store {
  view: View;
  overlay: Overlay;
  duel: Duel | null;
  meta: DuelMeta | null;
  gauntlet: GauntletState | null;
  selectedHand: number | null; // iid of a hand card chosen (for click-to-target / lane select)
  attackLanes: number[]; // lanes selected to attack with
  pendingResult: { outcome: "win" | "loss"; turns: number } | null;
  paused: boolean;
  aiThinking: boolean;

  // builder
  builderCards: string[];
  builderName: string;
  savedDecks: SavedDeck[];
  editingDeckId: string | null;

  settings: Settings;
  history: ResultRecord[];

  pops: Pop[];
  shakeId: number;
  peekCardId: string | null;

  // career / world (Act I)
  career: CareerState | null;
  worldEntrance: string;
  nearEntity: { id: string; label: string } | null;
  dialogue: DialogueState | null;

  // career nav
  startStory: (contextId?: string) => void;
  doActivity: (id: string) => void;
  continueStory: () => void;
  hasSavedCareer: () => boolean;
  setNear: (e: { id: string; label: string } | null) => void;
  worldInteract: (id: string) => void;
  advanceDialogue: () => void;
  pickActiveDeck: (id: string) => void;
  deckName: (id: string) => string;
  exitToHub: () => void;

  // economy
  packCards: string[];
  buyPack: (packId: string) => void;
  closePackReveal: () => void;
  buySingle: (cardId: string) => void;
  sellSingle: (cardId: string) => void;

  // tournaments
  tournament: TourneyState | null;
  enterTournament: (defId: string) => void;
  startTournamentMatch: () => void;
  collectTournament: () => void;

  // nav
  setView: (v: View) => void;
  openOverlay: (o: Overlay) => void;
  closeOverlay: () => void;

  // duel lifecycle
  startFreePlay: (playerDeck: string[], playerName: string, oppDeckId: string, skill: number) => void;
  startGauntlet: (deckId: string) => void;
  startStarter: () => void;
  nextGauntletRung: () => void;
  concede: () => void;
  togglePause: () => void;
  quitToMenu: () => void;

  // player moves
  selectHand: (iid: number | null) => void;
  playUnit: (iid: number, lane: number) => void;
  playSpell: (iid: number, targetIid?: number) => void;
  playGear: (iid: number, targetIid?: number, toNexus?: boolean) => void;
  refractCard: (iid: number) => void;
  toggleAttacker: (lane: number) => void;
  declareCombat: (lanes?: number[]) => void;
  endTurn: () => void;

  // builder
  newDeck: () => void;
  editDeck: (id: string) => void;
  addCard: (cardId: string) => void;
  removeCard: (cardId: string) => void;
  setBuilderName: (n: string) => void;
  saveDeck: () => void;
  deleteDeck: (id: string) => void;

  // settings
  setSetting: <K extends keyof Settings>(k: K, v: Settings[K]) => void;

  // fx
  setPeek: (id: string | null) => void;
  _clearPop: (id: number) => void;

  _persist: () => void;
}

let aiTimer: ReturnType<typeof setTimeout> | null = null;
let popSeq = 1;

function loadSave(): { settings: Settings; savedDecks: SavedDeck[]; history: ResultRecord[]; career: CareerState | null } {
  const def = {
    settings: { music: 0.5, sfx: 0.7, muted: false, reduceMotion: false, textScale: 1 } as Settings,
    savedDecks: [] as SavedDeck[],
    history: [] as ResultRecord[],
    career: null as CareerState | null,
  };
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return def;
    const p = JSON.parse(raw);
    return { settings: { ...def.settings, ...p.settings }, savedDecks: p.savedDecks ?? [], history: p.history ?? [], career: p.career ?? null };
  } catch {
    return def;
  }
}

function popAt(sel: string, kind: Pop["kind"], text: string): Pop | null {
  const el = document.querySelector(sel) as HTMLElement | null;
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return { id: popSeq++, kind, text, x: r.left + r.width / 2, y: r.top + r.height / 2 };
}

export const useStore = create<Store>((set, get) => {
  const saved = loadSave();
  // apply persisted audio/a11y at boot
  sound.setMix(saved.settings.music, saved.settings.sfx, saved.settings.muted);
  if (saved.settings.reduceMotion) document.body.classList.add("reduce-motion");
  document.documentElement.style.setProperty("--ui-scale", String(saved.settings.textScale));

  /** Process the FxEvents on `next` (the events from the action just applied) into pops/shake/sound. */
  function processFx(next: Duel, prev: Duel) {
    const newPops: Pop[] = [];
    let shake = false;
    for (const fx of next.fx) {
      switch (fx.kind) {
        case "deploy": sound.sfx("deploy"); break;
        case "cast": sound.sfx("cast"); break;
        case "attach": sound.sfx("deploy"); break;
        case "refract": {
          sound.sfx("refract");
          const p = popAt(`[data-light="${fx.side}"]`, "light", `+${fx.amount} Light`);
          if (p) newPops.push(p);
          break;
        }
        case "draw": sound.sfx("draw"); break;
        case "clash": sound.sfx("clash"); shake = true; break;
        case "nexusHit": {
          sound.sfx("nexusHit"); shake = true;
          const p = popAt(`[data-nexus="${fx.side}"]`, "dmg", `-${fx.amount}`);
          if (p) newPops.push(p);
          break;
        }
        case "heal": {
          sound.sfx("heal");
          const p = popAt(`[data-nexus="${fx.side}"]`, "heal", `+${fx.amount}`);
          if (p) newPops.push(p);
          break;
        }
        case "unitDie": sound.sfx("die"); break;
      }
    }
    if (next.winner != null) sound.sfx(next.winner === 0 ? "win" : "lose");
    void prev;
    if (newPops.length) {
      set((s) => ({ pops: [...s.pops, ...newPops] }));
      for (const p of newPops) setTimeout(() => get()._clearPop(p.id), 1000);
    }
    if (shake && !get().settings.reduceMotion) set((s) => ({ shakeId: s.shakeId + 1 }));
  }

  function openDialogue(lines: Line[] | undefined, onDone?: () => void) {
    if (!lines || lines.length === 0) { onDone?.(); return; }
    set({ dialogue: { lines, idx: 0, onDone } });
  }

  function examDueToday(c: CareerState): boolean {
    return examDue(c.day, c.context, c.flags);
  }
  function examThreshold(c: CareerState): number {
    return 5 + Math.floor(c.day / 4); // exams get harder as the year goes on
  }
  function doExam() {
    const c = get().career!;
    const thr = examThreshold(c);
    const passed = c.stats.knowledge >= thr;
    set({ career: careerReduce(careerReduce(c, { type: "exam", passed }), { type: "reward", flags: [`exam_${c.day}`] }) });
    get()._persist();
    openDialogue([{ speaker: "", text: passed
      ? `Exam passed! (Knowledge ${c.stats.knowledge} ≥ ${thr}) Reputation up, and a ◆10 reward.`
      : `You bombed the exam (Knowledge ${c.stats.knowledge} < ${thr}). Reputation took a hit — hit the Library before exam days.` }]);
  }

  // Resolve a deck id from EITHER a custom saved deck or a prebuilt — so story play can use either.
  function deckCardsById(id: string): string[] {
    const sd = get().savedDecks.find((d) => d.id === id);
    return sd ? sd.cards.slice() : expandDeck(getDeck(id));
  }
  function deckNameById(id: string): string {
    const sd = get().savedDecks.find((d) => d.id === id);
    if (sd) return sd.name;
    try { return getDeck(id).name; } catch { return id; }
  }

  function startStoryDuel(opponentId: string, stepId: string) {
    const opp = getOpponent(opponentId);
    const od = getDeck(opp.deckId);
    const career = get().career!;
    beginDuel(deckCardsById(career.activeDeckId), expandDeck(od), {
      mode: "story", oppName: opp.name, oppFlavor: opp.flavor, skill: opp.skill, persona: opp.persona,
      playerDeckName: deckNameById(career.activeDeckId), storyStepId: stepId,
    }, `story-${stepId}-` + Date.now());
  }

  function finishStoryDuel(outcome: "win" | "loss", stepId?: string) {
    const career = get().career!;
    const step = ACT1.find((s) => s.id === stepId) ?? ACT1[career.beat];
    set({ view: "world", overlay: null, duel: null, pops: [] });
    sound.music("menu");
    if (outcome === "win") {
      openDialogue(step?.winDialogue, () => { set((s) => ({ career: careerReduce(s.career!, { type: "completeStep" }) })); get()._persist(); });
    } else {
      openDialogue(step?.lossDialogue);
    }
  }

  function finishTournamentDuel(outcome: "win" | "loss") {
    const t = get().tournament;
    set({ view: "world", duel: null, pops: [] });
    sound.music("menu");
    if (!t) { set({ overlay: null }); return; }
    const def = getTournament(t.defId);
    if (outcome === "loss") {
      set({ tournament: { ...t, status: "lost" }, overlay: "tournament" });
      get()._persist();
      return;
    }
    // won the round → per-round prize
    let career = careerReduce(get().career!, { type: "reward", money: def.prizeMoneyPerWin, fame: def.prizeFamePerWin });
    const round = t.round + 1;
    const wins = t.wins + 1;
    if (round >= def.rounds.length) {
      // champion → bonus + trophy + a prize pack
      career = careerReduce(career, { type: "reward", money: def.championBonusMoney, fame: def.championFame, trophy: true });
      if (def.championPack) {
        const opened = openPack(getPack(def.championPack).setId, career.rngState);
        career = careerReduce(career, { type: "acquireCards", cardIds: opened.cardIds, rngState: opened.rngState });
        set({ packCards: opened.cardIds });
      }
      set({ career, tournament: { ...t, round, wins, status: "champion" }, overlay: "tournament" });
    } else {
      set({ career, tournament: { ...t, round, wins, status: "ready" }, overlay: "tournament" });
    }
    sound.sfx("win");
    get()._persist();
  }

  function finishDuel(d: Duel) {
    if (aiTimer) { clearTimeout(aiTimer); aiTimer = null; }
    const meta = get().meta!;
    const outcome: "win" | "loss" = d.winner === 0 ? "win" : "loss";
    const rec: ResultRecord = { mode: meta.mode, opponent: meta.oppName, outcome, turns: d.turn, ts: Date.now() };
    set((s) => ({ history: [rec, ...s.history].slice(0, 50) }));
    if (meta.mode === "tournament") { finishTournamentDuel(outcome); get()._persist(); return; }
    if (meta.mode === "story") { finishStoryDuel(outcome, meta.storyStepId); get()._persist(); return; }
    const g = get().gauntlet;
    let gauntlet = g;
    if (g && outcome === "win") gauntlet = { ...g, wins: g.wins + 1 };
    set({ pendingResult: { outcome, turns: d.turn }, overlay: "result", gauntlet });
    get()._persist();
  }

  function commit(next: Duel, prev: Duel) {
    processFx(next, prev);
    set({ duel: next, selectedHand: null, attackLanes: [] });
  }

  function startAiTurn() {
    set({ aiThinking: true });
    const tick = () => {
      aiTimer = null;
      const d = get().duel;
      if (!d || d.phase === "over" || d.active !== 1 || get().paused) { set({ aiThinking: false }); return; }
      const meta = get().meta!;
      const move = chooseMove(d, { skill: meta.skill, persona: meta.persona });
      const next = reduce(d, move);
      commit(next, d);
      if (next.phase === "over") { set({ aiThinking: false }); finishDuel(next); return; }
      if (next.active === 1) { aiTimer = setTimeout(tick, AI_BEAT); }
      else set({ aiThinking: false }); // turn passed back to player
    };
    aiTimer = setTimeout(tick, AI_BEAT);
  }

  function playerAction(action: Action) {
    const d = get().duel;
    if (!d || d.phase === "over" || d.active !== 0 || get().paused) return;
    const next = reduce(d, action);
    commit(next, d);
    if (next.phase === "over") finishDuel(next);
    else if (next.active === 1) startAiTurn();
  }

  function beginDuel(playerDeck: string[], oppDeck: string[], meta: DuelMeta, seed: string) {
    if (aiTimer) { clearTimeout(aiTimer); aiTimer = null; }
    const duel = createDuel({ decks: [playerDeck, oppDeck], seed, names: [meta.playerDeckName, meta.oppName], firstPlayer: 0 });
    set({ duel, meta, view: "duel", overlay: null, pendingResult: null, selectedHand: null, attackLanes: [], paused: false, pops: [] });
    sound.music("duel");
  }

  return {
    view: "menu",
    overlay: null,
    duel: null,
    meta: null,
    gauntlet: null,
    selectedHand: null,
    attackLanes: [],
    pendingResult: null,
    paused: false,
    aiThinking: false,
    builderCards: [],
    builderName: "New Deck",
    savedDecks: saved.savedDecks,
    editingDeckId: null,
    settings: saved.settings,
    history: saved.history,
    pops: [],
    shakeId: 0,
    peekCardId: null,

    career: saved.career,
    worldEntrance: "start",
    nearEntity: null,
    dialogue: null,
    packCards: [],
    tournament: null,

    setView: (v) => { set({ view: v, overlay: null }); sound.music(v === "duel" ? "duel" : "menu"); },
    openOverlay: (o) => set({ overlay: o }),
    closeOverlay: () => set({ overlay: null }),

    startFreePlay: (playerDeck, playerName, oppDeckId, skill) => {
      const od = getDeck(oppDeckId);
      const persona = PERSONAS[od.archetype] ?? PERSONAS.midrange;
      set({ gauntlet: null });
      beginDuel(playerDeck, expandDeck(od), {
        mode: "free", oppName: od.name + " AI", oppFlavor: od.description, skill, persona, playerDeckName: playerName,
      }, "free-" + Date.now());
    },
    startGauntlet: (deckId) => {
      const d = getDeck(deckId);
      set({ gauntlet: { rung: 0, deckId, deckName: d.name, wins: 0 } });
      const opp: Opponent = ROSTER[0];
      const od = getDeck(opp.deckId);
      beginDuel(expandDeck(d), expandDeck(od), {
        mode: "gauntlet", oppName: opp.name, oppFlavor: opp.flavor, skill: opp.skill, persona: opp.persona, playerDeckName: d.name,
      }, "gauntlet-0-" + Date.now());
    },
    nextGauntletRung: () => {
      const g = get().gauntlet;
      if (!g) return;
      const rung = g.rung + 1;
      if (rung >= ROSTER.length) { set({ overlay: null, view: "menu", gauntlet: null }); sound.music("menu"); return; }
      set({ gauntlet: { ...g, rung } });
      const opp = ROSTER[rung];
      const od = getDeck(opp.deckId);
      beginDuel(expandDeck(getDeck(g.deckId)), expandDeck(od), {
        mode: "gauntlet", oppName: opp.name, oppFlavor: opp.flavor, skill: opp.skill, persona: opp.persona, playerDeckName: g.deckName,
      }, `gauntlet-${rung}-` + Date.now());
    },
    startStarter: () => {
      const opp = ROSTER[0];
      const od = getDeck(opp.deckId);
      set({ gauntlet: null });
      beginDuel(expandDeck(getDeck(STARTER_DECK_ID)), expandDeck(od), {
        mode: "starter", oppName: opp.name, oppFlavor: "Your first duel. Take it slow — deploy, attack, end turn.", skill: 0.05, persona: opp.persona, playerDeckName: "Starter Deck",
      }, "starter-" + Date.now());
    },
    concede: () => { const d = get().duel; if (d) { const next = { ...d, winner: 1 as const, phase: "over" as const }; set({ duel: next, paused: false }); finishDuel(next); } },
    togglePause: () => {
      const p = !get().paused;
      set({ paused: p, overlay: p ? "pause" : null });
      if (!p) { const d = get().duel; if (d && d.active === 1 && d.phase !== "over") startAiTurn(); }
    },
    quitToMenu: () => {
      if (aiTimer) { clearTimeout(aiTimer); aiTimer = null; }
      set({ view: "menu", overlay: null, duel: null, meta: null, gauntlet: null, paused: false, pendingResult: null, pops: [], dialogue: null, nearEntity: null });
      sound.music("menu");
    },

    // ── career / world ──
    startStory: (contextId) => {
      const career = createCareer((Date.now() & 0xffff) >>> 0, contextId);
      set({ career, worldEntrance: "start", view: "world", overlay: null, dialogue: null, nearEntity: null, meta: null, gauntlet: null });
      get()._persist();
      sound.music("menu");
      openDialogue([
        { speaker: "", text: "ACT I — Discovery" },
        { speaker: "", text: "There's a card game everyone's playing. Today you find out why." },
      ]);
    },
    doActivity: (id) => {
      const c = get().career;
      if (!c) return;
      if (c.slotIndex >= 3) { openDialogue([{ speaker: "You", text: "I'm out of time today — better head home and sleep." }]); return; }
      const act = ACTIVITIES[id];
      if (!act) return;
      set({ career: careerReduce(c, { type: "activity", id }) });
      get()._persist();
      const after = get().career!;
      const lines: Line[] = [{ speaker: "", text: act.resultText }];
      if (after.slotIndex >= 3) lines.push({ speaker: "You", text: "That's the day gone. Time to head home and sleep." });
      openDialogue(lines);
      sound.sfx(act.money > 0 ? "heal" : "click");
    },
    continueStory: () => {
      const c = get().career;
      if (!c) return;
      set({ view: "world", overlay: null, dialogue: null, nearEntity: null, worldEntrance: "start", meta: null, gauntlet: null });
      sound.music("menu");
    },
    hasSavedCareer: () => !!get().career,
    setNear: (e) => set({ nearEntity: e }),
    advanceDialogue: () => {
      const d = get().dialogue;
      if (!d) return;
      if (d.idx + 1 < d.lines.length) set({ dialogue: { ...d, idx: d.idx + 1 } });
      else { const done = d.onDone; set({ dialogue: null }); done?.(); }
    },
    pickActiveDeck: (id) => { set((s) => ({ career: s.career ? careerReduce(s.career, { type: "pickDeck", id }) : s.career })); get()._persist(); },
    deckName: (id) => deckNameById(id),

    // ── economy ──
    buyPack: (packId) => {
      const c = get().career; if (!c) return;
      const pack = getPack(packId);
      if (c.money < pack.cost) { openDialogue([{ speaker: "Pip", text: "Come back when you've got the coin." }]); return; }
      const opened = openPack(pack.setId, c.rngState);
      set({ career: careerReduce(c, { type: "acquireCards", cardIds: opened.cardIds, cost: pack.cost, rngState: opened.rngState }), packCards: opened.cardIds, overlay: "packReveal" });
      sound.sfx("draw"); sound.sfx("refract");
      get()._persist();
    },
    closePackReveal: () => set({ overlay: "shop", packCards: [] }),
    buySingle: (cardId) => {
      const c = get().career; if (!c) return;
      const price = marketPrice(cardId, c.day);
      if (c.money < price) return;
      set({ career: careerReduce(c, { type: "acquireCards", cardIds: [cardId], cost: price }) });
      sound.sfx("click"); get()._persist();
    },
    sellSingle: (cardId) => {
      const c = get().career; if (!c || (c.collection[cardId] ?? 0) <= 0) return;
      set({ career: careerReduce(c, { type: "sellCard", cardId, price: sellPrice(cardId, c.day) }) });
      sound.sfx("heal"); get()._persist();
    },

    // ── tournaments ──
    enterTournament: (defId) => {
      const c = get().career; if (!c) return;
      const def = getTournament(defId);
      if (def.reqFame && c.fame < def.reqFame) { openDialogue([{ speaker: "Pip", text: `That event needs ${def.reqFame} scene rep — keep grinding the Friday nights.` }]); return; }
      if (c.money < def.entryFee) { openDialogue([{ speaker: "Pip", text: "Entry fee's a bit steep for you right now." }]); return; }
      set({ career: careerReduce(c, { type: "reward", money: -def.entryFee }), tournament: { defId, round: 0, wins: 0, status: "ready" }, overlay: "tournament" });
      get()._persist();
    },
    startTournamentMatch: () => {
      const t = get().tournament; const c = get().career; if (!t || !c) return;
      const def = getTournament(t.defId);
      const opp = getOpponent(def.rounds[t.round].opponentId);
      const od = getDeck(opp.deckId);
      beginDuel(deckCardsById(c.activeDeckId), expandDeck(od), {
        mode: "tournament", oppName: opp.name, oppFlavor: `${def.name} — Round ${t.round + 1}/${def.rounds.length}`,
        skill: opp.skill, persona: opp.persona, playerDeckName: deckNameById(c.activeDeckId),
      }, `tourney-${t.defId}-${t.round}-` + Date.now());
    },
    collectTournament: () => { set({ tournament: null, overlay: null, packCards: [] }); },
    exitToHub: () => { const c = get().career; set({ view: c ? "world" : "menu", overlay: null }); sound.music("menu"); },
    worldInteract: (id) => {
      const st = get();
      const career = st.career;
      if (!career || st.dialogue) return;
      const loc = WORLD[career.location];
      const e = loc.entities.find((x) => x.id === id);
      if (!e) return;
      if (e.kind === "door") {
        set({ career: careerReduce(career, { type: "enter", loc: e.to! }), worldEntrance: e.toEntrance ?? "start", nearEntity: null });
        sound.sfx("click");
        get()._persist();
        return;
      }
      // Story comes first: if this entity is the CURRENT story target, run the beat.
      const step = ACT1[career.beat];
      const storyRelevant = !career.actComplete && step && step.target === id && step.location === career.location;
      if (storyRelevant) {
        if (step.duelOpponent) openDialogue(step.preDialogue, () => startStoryDuel(step.duelOpponent!, step.id));
        else openDialogue(step.preDialogue, () => { set((s) => ({ career: careerReduce(s.career!, { type: "completeStep" }) })); get()._persist(); });
        return;
      }
      // Otherwise the entity's own function.
      if (e.kind === "object" && e.action === "sleep") {
        const skip = examDueToday(career);
        const lines: Line[] = skip
          ? [{ speaker: "You", text: "…I never took today's exam. Skipping it won't look good." }, { speaker: "You", text: "Turn in for the night anyway. (Progress saved.)" }]
          : [{ speaker: "You", text: "You turn in for the night. (Progress saved.)" }];
        openDialogue(lines, () => {
          set((s) => {
            let c = s.career!;
            if (examDueToday(c)) c = careerReduce(careerReduce(c, { type: "exam", passed: false }), { type: "reward", flags: [`exam_${c.day}`] }); // skip = a Reputation hit
            c = careerReduce(c, { type: "sleep" });
            return { career: c };
          });
          get()._persist();
        });
        return;
      }
      if (e.kind === "object" && e.action === "deck") { set({ overlay: "deskMenu" }); return; }
      if (e.kind === "object" && e.action === "shop") { set({ overlay: "shop" }); return; }
      if (e.kind === "object" && e.action === "market") { set({ overlay: "market" }); return; }
      if (e.kind === "object" && e.action === "pchub") { set({ overlay: "pcHub" }); return; }
      // The Library runs the EXAM on exam days, otherwise it's a Study activity.
      if (e.kind === "object" && e.activityId === "study" && examDueToday(career)) { doExam(); return; }
      if (e.kind === "object" && e.action === "activity") { get().doActivity(e.activityId!); return; }
      // The events board runs tournaments once its story beat is cleared.
      if (e.kind === "object" && e.action === "board") { set({ tournament: null, overlay: "tournament" }); return; }
      openDialogue(e.idle ?? [{ speaker: e.name ?? "", text: "…" }]);
    },

    selectHand: (iid) => set({ selectedHand: iid }),
    playUnit: (iid, lane) => playerAction({ type: "deploy", iid, lane }),
    playSpell: (iid, targetIid) => playerAction({ type: "cast", iid, targetIid }),
    playGear: (iid, targetIid, toNexus) => playerAction({ type: "attach", iid, targetIid, toNexus }),
    refractCard: (iid) => playerAction({ type: "refract", iid }),
    toggleAttacker: (lane) => set((s) => ({ attackLanes: s.attackLanes.includes(lane) ? s.attackLanes.filter((l) => l !== lane) : [...s.attackLanes, lane] })),
    declareCombat: (lanes) => {
      const sel = lanes ?? get().attackLanes;
      const d = get().duel;
      if (!d) return;
      const able = [0, 1, 2].filter((l) => {
        const u = d.players[0].lanes[l].unit;
        return u && !(u.justPlayed && !u.keywords.some((k) => k.kw === "haste")) && u.power - u.dmgTaken > 0;
      });
      const order = sel.length ? sel.filter((l) => able.includes(l)) : able;
      if (order.length) playerAction({ type: "combat", laneOrder: order });
    },
    endTurn: () => playerAction({ type: "endTurn" }),

    newDeck: () => set({ builderCards: [], builderName: "New Deck", editingDeckId: null, view: "deckbuilder", overlay: null }),
    editDeck: (id) => { const d = get().savedDecks.find((x) => x.id === id); if (d) set({ builderCards: d.cards.slice(), builderName: d.name, editingDeckId: id, view: "deckbuilder", overlay: null }); },
    addCard: (cardId) => set((s) => {
      const count = s.builderCards.filter((c) => c === cardId).length;
      if (s.builderCards.length >= 30 || count >= 3) return {};
      sound.sfx("click");
      return { builderCards: [...s.builderCards, cardId] };
    }),
    removeCard: (cardId) => set((s) => {
      const i = s.builderCards.indexOf(cardId);
      if (i < 0) return {};
      const next = s.builderCards.slice(); next.splice(i, 1);
      return { builderCards: next };
    }),
    setBuilderName: (n) => set({ builderName: n }),
    saveDeck: () => {
      const { builderCards, builderName, editingDeckId, savedDecks } = get();
      const id = editingDeckId ?? "deck-" + Date.now();
      const entry: SavedDeck = { id, name: builderName || "Untitled", cards: builderCards.slice() };
      const next = editingDeckId ? savedDecks.map((d) => (d.id === id ? entry : d)) : [...savedDecks, entry];
      set({ savedDecks: next, editingDeckId: id });
      // in Story mode a saved deck becomes usable (selectable as your active deck at the desk)
      const c = get().career;
      if (c && !c.ownedDeckIds.includes(id)) set({ career: { ...c, ownedDeckIds: [...c.ownedDeckIds, id] } });
      get()._persist();
      sound.sfx("win");
    },
    deleteDeck: (id) => { set((s) => ({ savedDecks: s.savedDecks.filter((d) => d.id !== id) })); get()._persist(); },

    setSetting: (k, v) => {
      set((s) => ({ settings: { ...s.settings, [k]: v } }));
      const st = get().settings;
      if (k === "music" || k === "sfx" || k === "muted") sound.setMix(st.music, st.sfx, st.muted);
      if (k === "reduceMotion") document.body.classList.toggle("reduce-motion", !!v);
      if (k === "textScale") document.documentElement.style.setProperty("--ui-scale", String(v));
      get()._persist();
    },

    setPeek: (id) => set({ peekCardId: id }),
    _clearPop: (id) => set((s) => ({ pops: s.pops.filter((p) => p.id !== id) })),
    _persist: () => {
      const { settings, savedDecks, history, career } = get();
      try { localStorage.setItem(SAVE_KEY, JSON.stringify({ settings, savedDecks, history, career })); } catch { /* ignore */ }
    },
  };
});

// helpers used by screens
export { DECKS, ROSTER, getCard, getDeck, expandDeck, bandFor, currentObjective, WORLD };
