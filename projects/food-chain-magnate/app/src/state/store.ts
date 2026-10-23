// UI/session store (Zustand). Wraps the pure engine: holds the GameState, runs a turn via the
// engine's playTurn orchestrator, and translates the human's high-level intents (hire X / market a
// product) into concrete WorkActions resolved against the post-restructuring state. AI seats use the
// heuristic policy. Restructuring is auto-fielded in this v1 (manual drag-drop org chart is a
// documented refinement — see build report).

import { create } from 'zustand';
import {
  EMPLOYEES,
  chainDistance,
  createGame,
  playTurn,
  type CompanyId,
  type GameState,
  type Policies,
  type Policy,
  type Product,
  type WorkAction,
} from '../engine';
import {
  applyScenario,
  medalFor,
  scenarioOutcome,
  CAMPAIGN_ARC,
  type Medal,
  type Outcome,
  type ScenarioDef,
} from '../engine';
import { makeAI } from '../ai/ai';
import { PROFILES } from '../ai/profiles';
import { initAudio, sfxKaChing, setMusicVolume, setSfxVolume, toggleMute, isMuted } from '../audio/chiptune';

export type Screen = 'menu' | 'setup' | 'game' | 'end' | 'campaign' | 'debrief';

// --- career (campaign meta-progression; content & cosmetics only, never in-game power) ---
export interface Career {
  company: { name: string; color: number; crest: number };
  medals: Record<string, Medal>; // scenarioId → best medal (null = cleared, no medal)
  cleared: string[];
  unlocks: string[];
  dossier: { scenariosCleared: number; gamesWon: number; bestTurns: number; lifetimeCash: number };
}
const DEFAULT_CAREER: Career = {
  company: { name: 'Your Co.', color: 0, crest: 0 },
  medals: {},
  cleared: [],
  unlocks: [],
  dossier: { scenariosCleared: 0, gamesWon: 0, bestTurns: 0, lifetimeCash: 0 },
};
function loadCareer(): Career {
  try {
    const raw = localStorage.getItem('fcm_career');
    return raw ? { ...DEFAULT_CAREER, ...JSON.parse(raw) } : DEFAULT_CAREER;
  } catch {
    return DEFAULT_CAREER;
  }
}
function saveCareer(c: Career): void {
  try { localStorage.setItem('fcm_career', JSON.stringify(c)); } catch { /* ignore */ }
}
/** A scenario is unlocked if it's first, or the previous one in the arc has been cleared. */
const MEDAL_RANK = (m: Medal): number => (m === 'gold' ? 3 : m === 'silver' ? 2 : m === 'bronze' ? 1 : 0);
function bestMedal(a: Medal | undefined, b: Medal): Medal {
  return MEDAL_RANK(b) >= MEDAL_RANK(a ?? null) ? b : a ?? null;
}

export function scenarioUnlocked(career: Career, id: string): boolean {
  const i = CAMPAIGN_ARC.findIndex((s) => s.id === id);
  return i === 0 || (i > 0 && career.cleared.includes(CAMPAIGN_ARC[i - 1].id));
}

export interface DebriefResult {
  scenario: ScenarioDef;
  outcome: Outcome;
  medal: Medal;
  turns: number;
  newUnlocks: string[];
}

// --- settings + persistence (localStorage) ---
export interface Settings {
  musicVol: number;
  sfxVol: number;
  muted: boolean;
  aiSpeed: number; // 0..1 pacing preference
  reduceMotion: boolean;
  highContrast: boolean;
}
const DEFAULT_SETTINGS: Settings = { musicVol: 0.4, sfxVol: 0.6, muted: false, aiSpeed: 0.5, reduceMotion: false, highContrast: false };

function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem('fcm_settings');
    return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}
function applySettings(s: Settings): void {
  setMusicVolume(s.muted ? 0 : s.musicVol);
  setSfxVolume(s.muted ? 0 : s.sfxVol);
  if (isMuted() !== s.muted) toggleMute();
  const root = typeof document !== 'undefined' ? document.body : null;
  root?.classList.toggle('reduce-motion', s.reduceMotion);
  root?.classList.toggle('high-contrast', s.highContrast);
}

interface HistoryEntry {
  date: string;
  turns: number;
  winner: string;
  standings: { name: string; cash: number }[];
}

function serialize(s: GameState): string {
  return JSON.stringify({ ...s, map: { ...s.map, roads: [...s.map.roads] } });
}
function deserialize(raw: string): GameState {
  const o = JSON.parse(raw) as GameState & { map: { roads: string[] } };
  return { ...o, map: { ...o.map, roads: new Set(o.map.roads) } } as GameState;
}
function getHistory(): HistoryEntry[] {
  try {
    return JSON.parse(localStorage.getItem('fcm_history') ?? '[]') as HistoryEntry[];
  } catch {
    return [];
  }
}
function recordHistory(s: GameState): void {
  const sorted = [...s.companies].sort((a, b) => b.cash - a.cash);
  const entry: HistoryEntry = {
    date: new Date().toISOString().slice(0, 16).replace('T', ' '),
    turns: s.turn,
    winner: s.companies[s.winner ?? sorted[0].id].name,
    standings: sorted.map((c) => ({ name: c.name, cash: c.cash })),
  };
  const all = [entry, ...getHistory()].slice(0, 30);
  localStorage.setItem('fcm_history', JSON.stringify(all));
}

interface Intents {
  hire: string[];
  market: Product[];
}

interface SeatCfg {
  kind: 'human' | 'ai';
  profile: string;
  tier: 'low' | 'med' | 'hard';
}

interface Store {
  screen: Screen;
  state: GameState | null;
  humanSeat: CompanyId;
  intents: Intents;
  seats: SeatCfg[];
  showDinnertime: boolean;
  closeDinnertime: () => void;
  replayDinnertime: () => void;
  settings: Settings;
  setSetting: (patch: Partial<Settings>) => void;
  hasSave: () => boolean;
  continueGame: () => void;
  history: () => HistoryEntry[];
  // campaign
  mode: 'skirmish' | 'campaign';
  scenario: ScenarioDef | null;
  career: Career;
  debrief: DebriefResult | null;
  toCampaign: () => void;
  startScenario: (def: ScenarioDef) => void;
  setCompany: (patch: Partial<Career['company']>) => void;
  backToHub: () => void;
  toMenu: () => void;
  toSetup: () => void;
  setSeats: (seats: SeatCfg[]) => void;
  newGame: (seed?: number) => void;
  queueHire: (defId: string) => void;
  queueMarket: (p: Product) => void;
  clearIntents: () => void;
  endTurn: () => void;
}

function nearestHouse(s: GameState, id: CompanyId): string | null {
  const c = s.companies[id];
  let best: string | null = c.restaurants[0] ?? null;
  let bestD = Infinity;
  for (const h of s.map.houses) {
    const d = chainDistance(s.map, c.restaurants, h.tile);
    if (d !== null && d < bestD) {
      bestD = d;
      best = h.tile;
    }
  }
  return best;
}

/** Human policy: AI auto-field for restructuring; intents + auto-produce/buy for working. */
function humanPolicy(profile: string, getIntents: () => Intents): Policy {
  const ai = makeAI('med', profile);
  return {
    restructure: (s, id) => ai.restructure(s, id),
    work: (s, id) => {
      const c = s.companies[id];
      const out: WorkAction[] = [];
      const intents = getIntents();
      for (const defId of intents.hire) out.push({ kind: 'recruit', defId });
      const marketeers = c.cards.filter((x) => x.atWork && EMPLOYEES[x.defId].marketeer && !(x.busy && x.busy > 0));
      const tile = nearestHouse(s, id);
      intents.market.forEach((product, i) => {
        const m = marketeers[i];
        if (m && tile) {
          out.push({ kind: 'marketing', uid: m.uid, type: EMPLOYEES[m.defId].marketeer!.type, product, opts: { tile, axis: 'row', span: 1 } });
        }
      });
      // auto produce + buy with whatever is at work
      for (const card of c.cards.filter((x) => x.atWork)) {
        const def = EMPLOYEES[card.defId];
        if (def.produce) {
          const p: Product = def.produce.pizza ? 'pizza' : 'burger';
          out.push({ kind: 'produce', uid: card.uid, product: p });
        } else if (def.buy) {
          out.push(def.buy.range === 0 ? { kind: 'buyErrand', uid: card.uid, drink: 'beer' } : { kind: 'buyRoute', uid: card.uid });
        }
      }
      return out;
    },
  };
}

export const useGame = create<Store>((set, get) => ({
  screen: 'menu',
  state: null,
  humanSeat: 0,
  intents: { hire: [], market: [] },
  showDinnertime: false,
  closeDinnertime: () => set({ showDinnertime: false }),
  replayDinnertime: () => set({ showDinnertime: true }),
  settings: loadSettings(),
  setSetting: (patch) => {
    const next = { ...get().settings, ...patch };
    applySettings(next);
    try { localStorage.setItem('fcm_settings', JSON.stringify(next)); } catch { /* ignore */ }
    set({ settings: next });
  },
  hasSave: () => {
    try { return !!localStorage.getItem('fcm_save'); } catch { return false; }
  },
  continueGame: () => {
    try {
      const raw = localStorage.getItem('fcm_save');
      if (!raw) return;
      const st = deserialize(raw);
      initAudio();
      applySettings(get().settings);
      const humanSeat = Math.max(0, st.companies.findIndex((c) => c.kind === 'human'));
      set({ state: st, screen: 'game', humanSeat, intents: { hire: [], market: [] }, showDinnertime: false });
    } catch { /* ignore corrupt save */ }
  },
  history: () => getHistory(),
  seats: [
    { kind: 'human', profile: 'burger-baron', tier: 'med' },
    { kind: 'ai', profile: 'ad-man', tier: 'med' },
    { kind: 'ai', profile: 'discounter', tier: 'med' },
  ],
  mode: 'skirmish',
  scenario: null,
  career: loadCareer(),
  debrief: null,
  toCampaign: () => set({ screen: 'campaign' }),
  startScenario: (def) => {
    initAudio();
    applySettings(get().settings);
    const state = applyScenario(def, Math.floor(Math.random() * 1e9));
    set({ state, scenario: def, mode: 'campaign', screen: 'game', humanSeat: 0, intents: { hire: [], market: [] }, showDinnertime: false, debrief: null });
  },
  setCompany: (patch) => {
    const career = { ...get().career, company: { ...get().career.company, ...patch } };
    saveCareer(career);
    set({ career });
  },
  backToHub: () => set({ screen: 'campaign', mode: 'skirmish', scenario: null, debrief: null }),
  toMenu: () => set({ screen: 'menu', mode: 'skirmish', scenario: null }),
  toSetup: () => set({ screen: 'setup' }),
  setSeats: (seats) => set({ seats }),
  newGame: (seed = Math.floor(Math.random() * 1e9)) => {
    initAudio(); // first user gesture → start the synth engine
    applySettings(get().settings);
    const seats = get().seats;
    const state = createGame({
      players: seats.length,
      seed,
      seats: seats.map((s) => ({ kind: s.kind, aiProfile: s.profile })),
    });
    const humanSeat = seats.findIndex((s) => s.kind === 'human');
    set({ state, screen: 'game', humanSeat: humanSeat < 0 ? 0 : humanSeat, intents: { hire: [], market: [] } });
  },
  queueHire: (defId) => set((st) => ({ intents: { ...st.intents, hire: [...st.intents.hire, defId] } })),
  queueMarket: (p) => set((st) => ({ intents: { ...st.intents, market: [...st.intents.market, p] } })),
  clearIntents: () => set({ intents: { hire: [], market: [] } }),
  endTurn: () => {
    const { state, seats, scenario, mode, humanSeat, intents } = get();
    if (!state || state.ended) return;

    // Build a policy per company from the game state (so campaign scenario seats work too).
    const policies: Policies = {};
    for (const c of state.companies) {
      if (c.kind === 'human') {
        policies[c.id] = humanPolicy(c.aiProfile ?? 'burger-baron', () => intents);
      } else {
        const tier = mode === 'campaign' && scenario ? scenario.rivals[c.id - 1]?.tier ?? 'med' : seats[c.id]?.tier ?? 'med';
        policies[c.id] = makeAI(tier, c.aiProfile ?? 'old-hubbard');
      }
    }

    const next = playTurn(state, policies);
    const earned = next.lastDinnertime?.earned[humanSeat] ?? 0;
    if (earned > 0) sfxKaChing(earned > 50 ? 2 : 1);
    const hadDemand = (next.lastDinnertime?.houses.length ?? 0) > 0;

    if (next.ended && mode === 'campaign' && scenario) {
      const outcome = scenarioOutcome(next, humanSeat, scenario.objectives, scenario.fails);
      const medal = outcome === 'win' ? medalFor(scenario, next.turn) : null;
      let newUnlocks: string[] = [];
      if (outcome === 'win') {
        const career = { ...get().career, medals: { ...get().career.medals }, dossier: { ...get().career.dossier } };
        if (!career.cleared.includes(scenario.id)) career.cleared = [...career.cleared, scenario.id];
        career.medals[scenario.id] = bestMedal(career.medals[scenario.id], medal);
        newUnlocks = scenario.unlocks.filter((u) => !career.unlocks.includes(u));
        career.unlocks = [...career.unlocks, ...newUnlocks];
        career.dossier.scenariosCleared = career.cleared.length;
        career.dossier.gamesWon += 1;
        career.dossier.bestTurns = career.dossier.bestTurns ? Math.min(career.dossier.bestTurns, next.turn) : next.turn;
        career.dossier.lifetimeCash += next.companies[humanSeat].cash;
        saveCareer(career);
        set({ career });
      }
      try { localStorage.removeItem('fcm_save'); } catch { /* ignore */ }
      set({ state: next, intents: { hire: [], market: [] }, showDinnertime: false, debrief: { scenario, outcome, medal, turns: next.turn, newUnlocks }, screen: 'debrief' });
      return;
    }

    try {
      if (next.ended) {
        localStorage.removeItem('fcm_save');
        recordHistory(next);
      } else if (mode === 'skirmish') {
        localStorage.setItem('fcm_save', serialize(next));
      }
    } catch { /* storage unavailable */ }
    set({
      state: next,
      intents: { hire: [], market: [] },
      screen: next.ended ? 'end' : 'game',
      showDinnertime: hadDemand && !next.ended,
    });
  },
}));

export { PROFILES };
