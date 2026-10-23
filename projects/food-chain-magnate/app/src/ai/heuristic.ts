// The shared heuristic policy, parameterised by Tier + AIProfile. Low/Med use it directly; Hard uses
// it as the rollout proxy (own future turns) inside the search, and Med is the opponent model. The
// tier scales reliability (action-skip), marketing volume, and engine-building; the "smart" flag adds
// value/rival-aware marketing targeting. (Hard's top-level policy is the search in ./search.ts.)

import {
  EMPLOYEES,
  chainDistance,
  effectiveUnitPrice,
  hireAvailable,
  trainable,
  arrangementLegal,
  BASE_UNIT_PRICE,
  type Company,
  type GameState,
  type Policy,
  type Product,
  type TileId,
  type WorkAction,
} from '../engine';
import { DEFAULT_PROFILE, PROFILES, type Tier } from './profiles';

interface Params {
  actionSkip: number;
  fieldDrop: number;
  marketeers: number;
  buildEngine: boolean;
  wantMarketeers: number;
  smart: boolean;
}
const PARAMS: Record<Tier, Params> = {
  low: { actionSkip: 0.62, fieldDrop: 0.45, marketeers: 1, buildEngine: false, wantMarketeers: 1, smart: false },
  med: { actionSkip: 0.3, fieldDrop: 0.08, marketeers: 1, buildEngine: true, wantMarketeers: 1, smart: false },
  hard: { actionSkip: 0, fieldDrop: 0, marketeers: 9, buildEngine: true, wantMarketeers: 3, smart: true },
};

/** How marketeers pick houses: value/rival-aware spread, all-on-the-single-best, or nearest spread. */
export type Targeting = 'scored' | 'concentrate' | 'nearest';

/**
 * Plan-level overrides the search ({@link ./search}) varies to generate candidate turn-plans. Empty
 * by default, so Low/Med (and Hard's status-quo plan) behave exactly as before.
 */
export interface HeuristicOverrides {
  marketProduct?: Product; // which product to market this turn (else the profile's primary)
  targeting?: Targeting; // how to place marketeers (else scored for smart tiers, nearest otherwise)
}

function jitter(state: GameState, id: number): () => number {
  let a = (state.config.seed * 2654435761 + state.turn * 40503 + id * 97 + 1) >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const RESTRUCT_PRIORITY: Record<string, number> = {
  'junior-vp': 95, 'vice-president': 96, 'senior-vp': 97, 'executive-vp': 98, 'recruiting-mgr': 80,
  'hr-director': 82, 'local-mgr': 70, 'regional-mgr': 72, 'new-biz-dev': 50,
  'burger-chef': 66, 'pizza-chef': 66, 'burger-cook': 64, 'pizza-cook': 64, 'kitchen-trainee': 45,
  'brand-director': 68, 'brand-mgr': 66, 'campaign-mgr': 62, 'marketing-trainee': 60,
  'pricing-mgr': 58, 'discount-mgr': 61, 'luxuries-mgr': 52, cfo: 75, waitress: 56,
  'zeppelin-pilot': 60, 'truck-driver': 56, 'cart-operator': 52, 'errand-boy': 38,
  'recruiting-girl': 30, trainer: 32, coach: 64, guru: 66, 'mgmt-trainee': 28,
};

/** House tiles reachable by the chain, nearest first. */
export function nearestHouseTiles(state: GameState, c: Company): TileId[] {
  const reachable = state.map.houses
    .map((h) => ({ tile: h.tile, d: chainDistance(state.map, c.restaurants, h.tile) }))
    .filter((x): x is { tile: TileId; d: number } => x.d !== null)
    .sort((a, b) => a.d - b.d)
    .map((x) => x.tile);
  if (reachable.length) return reachable;
  return state.map.houses[0] ? [state.map.houses[0].tile] : [];
}

/** Value/rival-aware target ranking: gardens pay ×2, weighted by winning the price+distance race. */
export function scoredHouseTiles(state: GameState, c: Company): TileId[] {
  const rivals = state.companies.filter((r) => r.id !== c.id);
  const myPrice = effectiveUnitPrice(c);
  const scored = state.map.houses
    .map((h) => {
      const d = chainDistance(state.map, c.restaurants, h.tile);
      if (d === null) return null;
      const rivalBest = rivals.reduce((m, r) => {
        const rd = chainDistance(state.map, r.restaurants, h.tile);
        return rd === null ? m : Math.min(m, rd);
      }, Infinity);
      const win = myPrice + d <= BASE_UNIT_PRICE + rivalBest ? 1 : 0.3;
      const gardenMult = h.garden ? 2 : 1;
      const cap = h.garden ? 5 : 3;
      const score = (gardenMult * cap * win) / (1 + d * 0.1);
      return { tile: h.tile, score, d };
    })
    .filter((x): x is { tile: TileId; score: number; d: number } => x !== null)
    .sort((a, b) => b.score - a.score || a.d - b.d);
  return scored.length ? scored.map((x) => x.tile) : nearestHouseTiles(state, c);
}

export function heuristicPolicy(
  tier: Tier,
  profileId: string = DEFAULT_PROFILE,
  ov: HeuristicOverrides = {},
): Policy {
  const profile = PROFILES[profileId] ?? PROFILES[DEFAULT_PROFILE];
  const P = PARAMS[tier];
  const bias: Product = profile.bias === 'pizza' ? 'pizza' : 'burger';
  const primary: Product = profile.bias === 'drink' ? 'beer' : bias;
  const marketProduct: Product = ov.marketProduct ?? primary;
  const mode: Targeting = ov.targeting ?? (P.smart ? 'scored' : 'nearest');

  return {
    restructure(state, id) {
      const c = state.companies[id];
      const ceo = c.cards.find((x) => x.defId === 'ceo')!;
      const candidates = c.cards
        .filter((x) => x.defId !== 'ceo' && !(x.busy && x.busy > 0))
        .sort((a, b) => (RESTRUCT_PRIORITY[b.defId] ?? 20) - (RESTRUCT_PRIORITY[a.defId] ?? 20));
      const atWork = [ceo.uid];
      const defIds = ['ceo'];
      const rnd = jitter(state, id);
      for (const card of candidates) {
        if (P.fieldDrop > 0 && rnd() < P.fieldDrop) continue;
        if (arrangementLegal([...defIds, card.defId])) {
          defIds.push(card.defId);
          atWork.push(card.uid);
        }
      }
      return atWork;
    },

    work(state, id) {
      const c = state.companies[id];
      const actions: WorkAction[] = [];
      const rnd = jitter(state, id + 7);
      const atWork = c.cards.filter((x) => x.atWork);
      const countDef = (defId: string) => c.cards.filter((x) => x.defId === defId).length;

      let recruitBudget = 1 + atWork.reduce((s, x) => s + (EMPLOYEES[x.defId].recruit ?? 0), 0);
      const wishlist: string[] = P.smart
        ? ['marketing-trainee', 'kitchen-trainee', 'waitress', 'recruiting-girl', 'waitress', 'kitchen-trainee', 'marketing-trainee', 'trainer', 'mgmt-trainee']
        : ['marketing-trainee', 'kitchen-trainee'];
      if (P.buildEngine && !P.smart) wishlist.push('marketing-trainee', 'kitchen-trainee', 'mgmt-trainee', 'recruiting-girl', 'trainer');
      if (profile.bias === 'drink') wishlist.push('errand-boy');
      const cap = (defId: string) =>
        defId === 'marketing-trainee' ? P.wantMarketeers
        : defId === 'kitchen-trainee' ? (P.wantMarketeers >= 3 ? 3 : 2)
        : defId === 'waitress' ? (P.smart ? 2 : 1)
        : 1;
      for (const defId of wishlist) {
        if (recruitBudget <= 0) break;
        if (P.actionSkip > 0 && rnd() < P.actionSkip) continue;
        if (!hireAvailable(state, defId)) continue;
        if (countDef(defId) >= cap(defId)) continue;
        actions.push({ kind: 'recruit', defId });
        recruitBudget -= 1;
      }

      let trainBudget = atWork.reduce((s, x) => s + (EMPLOYEES[x.defId].train ?? 0), 0);
      if (P.buildEngine) {
        const trainGoals: Record<string, string> = {
          'kitchen-trainee': bias === 'pizza' ? 'pizza-cook' : 'burger-cook',
          'marketing-trainee': 'campaign-mgr',
          'mgmt-trainee': 'junior-vp',
          'burger-cook': 'burger-chef',
        };
        for (const card of c.cards) {
          if (trainBudget <= 0) break;
          if (card.atWork) continue;
          const goal = trainGoals[card.defId];
          if (goal && trainable(state, c, card.uid, goal)) {
            actions.push({ kind: 'train', uid: card.uid, into: goal });
            trainBudget -= 1;
          }
        }
      }

      const targets = mode === 'nearest' ? nearestHouseTiles(state, c) : scoredHouseTiles(state, c);
      if (targets.length) {
        const mks = atWork.filter((x) => EMPLOYEES[x.defId].marketeer && !(x.busy && x.busy > 0));
        mks.forEach((card, i) => {
          if (i >= P.marketeers) return;
          if (P.actionSkip > 0 && rnd() < P.actionSkip) return;
          const m = EMPLOYEES[card.defId].marketeer!;
          // 'concentrate' piles every marketeer on the single best house (max demand there); the
          // spread modes fan out one marketeer per distinct house.
          const tile = mode === 'concentrate' ? targets[0] : targets[i % targets.length];
          actions.push({ kind: 'marketing', uid: card.uid, type: m.type, product: marketProduct, opts: { tile, axis: 'row', span: 1 } });
        });
      }

      for (const card of atWork) {
        const def = EMPLOYEES[card.defId];
        if (def.produce) {
          if (P.actionSkip > 0 && rnd() < P.actionSkip) continue;
          const product: Product = def.produce.pizza ? 'pizza' : def.produce.burger ? 'burger' : bias;
          actions.push({ kind: 'produce', uid: card.uid, product });
        } else if (def.buy) {
          actions.push(def.buy.range === 0 ? { kind: 'buyErrand', uid: card.uid, drink: 'beer' } : { kind: 'buyRoute', uid: card.uid });
        }
      }
      return actions;
    },
  };
}
