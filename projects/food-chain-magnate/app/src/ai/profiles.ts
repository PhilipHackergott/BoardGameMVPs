// AI personalities = evaluator-weight presets layered on the one shared heuristic (no bespoke AI
// per rival). They give the campaign its named rivals and skirmish its flavour. Tier (low/med/hard)
// is orthogonal — set per scenario / per seat.

import type { Product } from '../engine';

export type Tier = 'low' | 'med' | 'hard';

export interface AIProfile {
  id: string;
  name: string;
  tell: string; // the one-line "playstyle tell" shown at the rival reveal
  bias: Product | 'drink' | null; // preferred product to build/market around
  marketing: number; // weight 0..2 — appetite for campaigns
  pricing: number; // weight 0..2 — appetite for price-cutting
  production: number; // weight 0..2 — appetite for cooks/output
}

export const PROFILES: Record<string, AIProfile> = {
  'old-hubbard': { id: 'old-hubbard', name: 'Old Man Hubbard', tell: 'A gentle warm-up — slow to expand.', bias: null, marketing: 0.5, pricing: 0.3, production: 0.6 },
  'burger-baron': { id: 'burger-baron', name: 'Patty Vanderburg, the Burger Baron', tell: 'Floods the suburb with cheap burgers — out-produce her.', bias: 'burger', marketing: 1, pricing: 0.6, production: 1.6 },
  'ad-man': { id: 'ad-man', name: 'Mad Sterling, the Ad-Man', tell: 'Creates demand everywhere — be ready to serve it (or deny it).', bias: null, marketing: 1.8, pricing: 0.5, production: 1 },
  discounter: { id: 'discounter', name: 'Dollar Bill, the Discounter', tell: 'Slashes prices to win every house — bring volume or be undercut.', bias: 'burger', marketing: 1, pricing: 1.8, production: 1.2 },
  'the-suit': { id: 'the-suit', name: 'V. P. Crane, the Suit', tell: 'Builds a deep management engine and grabs milestones first.', bias: 'pizza', marketing: 1, pricing: 0.8, production: 1.1 },
  logistics: { id: 'logistics', name: 'Zeppelin Zoë, the Logistics Tycoon', tell: 'Owns the drinks supply — wins thirsty houses.', bias: 'drink', marketing: 1.1, pricing: 0.6, production: 1.2 },
};

export const DEFAULT_PROFILE = 'old-hubbard';

export function tierStrength(t: Tier): number {
  return t === 'hard' ? 1 : t === 'med' ? 0.7 : 0.45;
}
