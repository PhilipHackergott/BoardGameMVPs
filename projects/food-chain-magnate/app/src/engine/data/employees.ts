// The employee card registry — the content spine. Transcribed from FCM_Rules_EN_v3.pdf (incl. the
// p.5 card-layout image) → see ../../../06-card-reference.md. The engine interprets these defs; the
// org chart / working actions / training all read this data rather than hard-coding behaviour.
//
// Tracks: management (the black VP ladder + specialists), recruiting, training, kitchen, buying,
// marketing, pricing, sales. Entry (►) cards are hireable and salary-free; trained cards cost $5.

import type { CampaignType, Track } from './tracks';

export type { Track } from './tracks';

export interface EmployeeDef {
  id: string;
  name: string;
  track: Track;
  entry: boolean; // hireable from the job market (►)
  salaried: boolean; // costs $5 at payday (all entry cards are free; all trained cards are salaried)
  slots?: number; // report slots if this is a manager (black card)
  top?: boolean; // top position — only one copy per player
  trainsInto?: string[]; // ids this card can be trained into (one step)
  mandatory?: boolean; // its Working action must be used if at work

  // action semantics (read by working.ts)
  recruit?: number; // extra recruit actions granted
  train?: number; // training actions granted
  trainSteps?: number; // may advance the same card this many steps (coach 2 / guru 3)
  produce?: { burger?: number; pizza?: number; choose?: number };
  buy?: { range: number; perSource: number; ignoreRoads?: boolean }; // errand boy: range 0 = on-tile
  marketeer?: { type: CampaignType; maxDuration: number; range: number | null }; // null = unlimited
  price?: number; // pricing managers: −1 / −3 / +10
  cfo?: boolean;
  waitress?: boolean;
  restaurant?: 'local' | 'regional';
  developer?: boolean; // place house / garden
}

function def(d: EmployeeDef): EmployeeDef {
  return d;
}

export const EMPLOYEES: Record<string, EmployeeDef> = {
  // --- management (black VP ladder + specialists) ---
  ceo: def({ id: 'ceo', name: 'CEO', track: 'management', entry: false, salaried: false, slots: 3, top: true, recruit: 1 }),
  'mgmt-trainee': def({
    id: 'mgmt-trainee', name: 'Management Trainee', track: 'management', entry: true, salaried: false, slots: 2,
    trainsInto: ['new-biz-dev', 'junior-vp', 'luxuries-mgr'],
  }),
  'junior-vp': def({
    id: 'junior-vp', name: 'Junior Vice-President', track: 'management', entry: false, salaried: true, slots: 3,
    trainsInto: ['local-mgr', 'vice-president', 'discount-mgr', 'recruiting-mgr', 'coach'],
  }),
  'vice-president': def({
    id: 'vice-president', name: 'Vice-President', track: 'management', entry: false, salaried: true, slots: 4,
    trainsInto: ['regional-mgr', 'senior-vp', 'guru'],
  }),
  'senior-vp': def({
    id: 'senior-vp', name: 'Senior Vice-President', track: 'management', entry: false, salaried: true, slots: 5,
    trainsInto: ['cfo', 'executive-vp', 'hr-director'],
  }),
  'executive-vp': def({ id: 'executive-vp', name: 'Executive Vice-President', track: 'management', entry: false, salaried: true, slots: 10, top: true }),
  'new-biz-dev': def({ id: 'new-biz-dev', name: 'New Business Developer', track: 'management', entry: false, salaried: true, developer: true }),
  'local-mgr': def({ id: 'local-mgr', name: 'Local Manager', track: 'management', entry: false, salaried: true, restaurant: 'local' }),
  'regional-mgr': def({ id: 'regional-mgr', name: 'Regional Manager', track: 'management', entry: false, salaried: true, top: true, restaurant: 'regional' }),
  cfo: def({ id: 'cfo', name: 'CFO', track: 'management', entry: false, salaried: true, top: true, mandatory: true, cfo: true }),

  // --- pricing ---
  'pricing-mgr': def({ id: 'pricing-mgr', name: 'Pricing Manager', track: 'pricing', entry: true, salaried: false, mandatory: true, price: -1 }),
  'discount-mgr': def({ id: 'discount-mgr', name: 'Discount Manager', track: 'pricing', entry: false, salaried: true, mandatory: true, price: -3 }),
  'luxuries-mgr': def({ id: 'luxuries-mgr', name: 'Luxuries Manager', track: 'pricing', entry: false, salaried: true, top: true, mandatory: true, price: 10 }),

  // --- recruiting ---
  'recruiting-girl': def({ id: 'recruiting-girl', name: 'Recruiting Girl', track: 'recruiting', entry: true, salaried: false, recruit: 1 }),
  'recruiting-mgr': def({ id: 'recruiting-mgr', name: 'Recruiting Manager', track: 'recruiting', entry: false, salaried: true, mandatory: true, recruit: 2 }),
  'hr-director': def({ id: 'hr-director', name: 'HR Director', track: 'recruiting', entry: false, salaried: true, top: true, mandatory: true, recruit: 4 }),

  // --- training ---
  trainer: def({ id: 'trainer', name: 'Trainer', track: 'training', entry: true, salaried: false, train: 1, trainSteps: 1 }),
  coach: def({ id: 'coach', name: 'Coach', track: 'training', entry: false, salaried: true, train: 2, trainSteps: 2 }),
  guru: def({ id: 'guru', name: 'Guru', track: 'training', entry: false, salaried: true, top: true, train: 3, trainSteps: 3 }),

  // --- kitchen ---
  'kitchen-trainee': def({ id: 'kitchen-trainee', name: 'Kitchen Trainee', track: 'kitchen', entry: true, salaried: false, produce: { choose: 1 }, trainsInto: ['burger-cook', 'pizza-cook'] }),
  'burger-cook': def({ id: 'burger-cook', name: 'Burger Cook', track: 'kitchen', entry: false, salaried: true, produce: { burger: 3 }, trainsInto: ['burger-chef'] }),
  'burger-chef': def({ id: 'burger-chef', name: 'Burger Chef', track: 'kitchen', entry: false, salaried: true, top: true, produce: { burger: 8 } }),
  'pizza-cook': def({ id: 'pizza-cook', name: 'Pizza Cook', track: 'kitchen', entry: false, salaried: true, produce: { pizza: 3 }, trainsInto: ['pizza-chef'] }),
  'pizza-chef': def({ id: 'pizza-chef', name: 'Pizza Chef', track: 'kitchen', entry: false, salaried: true, top: true, produce: { pizza: 8 } }),

  // --- buying (drinks) ---
  'errand-boy': def({ id: 'errand-boy', name: 'Errand Boy', track: 'buying', entry: true, salaried: false, buy: { range: 0, perSource: 1 }, trainsInto: ['cart-operator'] }),
  'cart-operator': def({ id: 'cart-operator', name: 'Cart Operator', track: 'buying', entry: false, salaried: true, buy: { range: 2, perSource: 2 }, trainsInto: ['truck-driver'] }),
  'truck-driver': def({ id: 'truck-driver', name: 'Truck Driver', track: 'buying', entry: false, salaried: true, buy: { range: 3, perSource: 3 }, trainsInto: ['zeppelin-pilot'] }),
  'zeppelin-pilot': def({ id: 'zeppelin-pilot', name: 'Zeppelin Pilot', track: 'buying', entry: false, salaried: true, top: true, buy: { range: 4, perSource: 2, ignoreRoads: true } }),

  // --- marketing ---
  'marketing-trainee': def({ id: 'marketing-trainee', name: 'Marketing Trainee', track: 'marketing', entry: true, salaried: false, marketeer: { type: 'billboard', maxDuration: 2, range: 2 }, trainsInto: ['campaign-mgr'] }),
  'campaign-mgr': def({ id: 'campaign-mgr', name: 'Campaign Manager', track: 'marketing', entry: false, salaried: true, marketeer: { type: 'mailbox', maxDuration: 3, range: 3 }, trainsInto: ['brand-mgr'] }),
  'brand-mgr': def({ id: 'brand-mgr', name: 'Brand Manager', track: 'marketing', entry: false, salaried: true, marketeer: { type: 'airplane', maxDuration: 4, range: null }, trainsInto: ['brand-director'] }),
  'brand-director': def({ id: 'brand-director', name: 'Brand Director', track: 'marketing', entry: false, salaried: true, top: true, marketeer: { type: 'radio', maxDuration: 5, range: null } }),

  // --- sales ---
  waitress: def({ id: 'waitress', name: 'Waitress', track: 'sales', entry: true, salaried: false, mandatory: true, waitress: true }),
};

/** Entry (►) cards — hireable from the job market. */
export const ENTRY_IDS: string[] = Object.values(EMPLOYEES)
  .filter((e) => e.entry)
  .map((e) => e.id);

/** Which campaign types a marketeer tier may place (it may place its own type "or lower"). */
export const CAMPAIGN_RANK: CampaignType[] = ['billboard', 'mailbox', 'airplane', 'radio'];
export function canPlace(marketeerType: CampaignType, want: CampaignType): boolean {
  return CAMPAIGN_RANK.indexOf(want) <= CAMPAIGN_RANK.indexOf(marketeerType);
}

export function isManager(defId: string): boolean {
  return (EMPLOYEES[defId]?.slots ?? 0) > 0 && defId !== 'ceo';
}

/**
 * Per-card copy counts in the shared job market.
 * Entry-card counts scale with player count (rulebook setup table). Non-entry counts are not
 * published in the rulebook (see 06-card-reference §9, item 2) → set to a generous default so the
 * "deck ran out" rule rarely bites; this is the one flagged [VERIFY] value and is a one-line change.
 */
export function jobMarketCounts(players: number): Record<string, number> {
  const entryCopies = players >= 4 ? 2 : 1; // 2p/3p → 1, 4p → 2 (5p → 3, out of MVP)
  const NONENTRY_DEFAULT = 6; // [VERIFY] — real per-card counts need the physical cards
  const out: Record<string, number> = {};
  for (const e of Object.values(EMPLOYEES)) {
    if (e.id === 'ceo') continue; // CEOs are dealt 1 per player, not from the market
    out[e.id] = e.entry ? entryCopies : e.top ? 1 : NONENTRY_DEFAULT;
  }
  return out;
}
