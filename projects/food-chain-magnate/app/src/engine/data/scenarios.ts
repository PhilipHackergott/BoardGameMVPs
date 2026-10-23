// Campaign — "Rise of a Fast-Food Empire". A scenario is a data-driven setup + objectives (the
// engine applies it onto createGame). The authored arc runs ~12 scenarios across four eras; each is
// 1 human + 1–3 AI rivals (the campaign is solo; the whole MVP runs at 2–4 seats). Scenarios unlock
// in order; clearing one unlocks the next plus a content reward (skirmish maps / rivals / cosmetics).

import type { Fail, Objective } from '../objectives';

export type Era = "Late '50s diner" | "'60s suburban boom" | "'70s chain wars" | "'80s corporate empire";

export interface ScenarioDef {
  id: string;
  era: Era;
  title: string;
  briefing: string;
  modifier?: string; // a named scenario modifier shown in-game (flavour; e.g. "1958 recession")
  players: number; // 2–4 (1 human + rivals)
  rivals: { profile: string; tier: 'low' | 'med' | 'hard' }[];
  objectives: Objective[];
  fails: Fail[];
  medals: { bronze: number; silver: number; gold: number }; // turns-to-win thresholds (lower = better)
  unlocks: string[]; // content unlocked on clearing (cosmetic/skirmish only — never in-game power)
}

export const CAMPAIGN_ARC: ScenarioDef[] = [
  // --- Era I: Late '50s diner ---
  {
    id: 'grand-opening', era: "Late '50s diner", title: 'Grand Opening',
    briefing: 'One sleepy rival, a quiet suburb. Learn the loop: market, produce, serve, get paid.',
    players: 2, rivals: [{ profile: 'old-hubbard', tier: 'low' }],
    objectives: [{ kind: 'richestAtEnd' }], fails: [{ kind: 'turnLimit', turn: 45 }],
    medals: { bronze: 32, silver: 24, gold: 18 }, unlocks: ['crest:diner-star'],
  },
  {
    id: 'word-of-mouth', era: "Late '50s diner", title: 'Word of Mouth',
    briefing: 'Demand only exists where you advertise. Out-market a cautious rival and bank $50.',
    players: 2, rivals: [{ profile: 'old-hubbard', tier: 'med' }],
    objectives: [{ kind: 'richestAtEnd' }, { kind: 'cashBy', amount: 50, turn: 35 }], fails: [{ kind: 'turnLimit', turn: 45 }],
    medals: { bronze: 32, silver: 24, gold: 18 }, unlocks: ['map:crossroads'],
  },
  {
    id: 'price-war', era: "Late '50s diner", title: 'Price War on Main Street',
    briefing: 'Dollar Bill undercuts everyone. Win houses on price + distance — or out-volume him.',
    players: 2, rivals: [{ profile: 'discounter', tier: 'med' }],
    objectives: [{ kind: 'richestAtEnd' }], fails: [{ kind: 'turnLimit', turn: 45 }],
    medals: { bronze: 32, silver: 24, gold: 18 }, unlocks: ['rival:discounter'],
  },
  // --- Era II: '60s suburban boom ---
  {
    id: 'hiring-spree', era: "'60s suburban boom", title: 'Hiring Spree',
    briefing: 'The suburb is exploding. Build the deepest company — be first to 8 employees.',
    players: 3, rivals: [{ profile: 'the-suit', tier: 'med' }, { profile: 'old-hubbard', tier: 'med' }],
    objectives: [{ kind: 'employeesFirstTo', n: 8 }, { kind: 'richestAtEnd' }], fails: [{ kind: 'turnLimit', turn: 50 }],
    medals: { bronze: 36, silver: 28, gold: 20 }, unlocks: ['crest:boom-rocket'],
  },
  {
    id: 'burger-belt', era: "'60s suburban boom", title: 'The Burger Belt',
    briefing: 'Burgers rule the cul-de-sacs. Be the richest, fuelled by a burger empire.',
    players: 3, rivals: [{ profile: 'burger-baron', tier: 'med' }, { profile: 'ad-man', tier: 'med' }],
    objectives: [{ kind: 'richestAtEnd' }], fails: [{ kind: 'turnLimit', turn: 50 }],
    medals: { bronze: 36, silver: 28, gold: 20 }, unlocks: ['map:the-strip'],
  },
  {
    id: 'madison-avenue', era: "'60s suburban boom", title: 'Madison Avenue',
    briefing: 'Mad Sterling blankets the board with ads. Match his reach and bank more than him.',
    players: 3, rivals: [{ profile: 'ad-man', tier: 'hard' }, { profile: 'old-hubbard', tier: 'low' }],
    objectives: [{ kind: 'richestAtEnd' }], fails: [{ kind: 'turnLimit', turn: 50 }],
    medals: { bronze: 36, silver: 28, gold: 20 }, unlocks: ['rival:ad-man'],
  },
  // --- Era III: '70s chain wars ---
  {
    id: 'recession-58', era: "'70s chain wars", title: 'The Lean Years',
    briefing: 'Wallets are tight. Stay solvent and on top through a hard market.',
    modifier: 'Recession — thin margins',
    players: 3, rivals: [{ profile: 'discounter', tier: 'hard' }, { profile: 'the-suit', tier: 'med' }],
    objectives: [{ kind: 'richestAtEnd' }], fails: [{ kind: 'turnLimit', turn: 55 }, { kind: 'wentBroke' }],
    medals: { bronze: 40, silver: 30, gold: 22 }, unlocks: ['challenge:ironman'],
  },
  {
    id: 'logistics', era: "'70s chain wars", title: 'Logistics',
    briefing: 'Thirsty houses everywhere. Own the drinks supply and win the suburb.',
    players: 3, rivals: [{ profile: 'logistics', tier: 'hard' }, { profile: 'burger-baron', tier: 'med' }],
    objectives: [{ kind: 'richestAtEnd' }], fails: [{ kind: 'turnLimit', turn: 55 }],
    medals: { bronze: 40, silver: 30, gold: 22 }, unlocks: ['rival:logistics'],
  },
  {
    id: 'two-front-war', era: "'70s chain wars", title: 'Two-Front War',
    briefing: 'Two aggressive chains close in. Outlast them both — be the last one standing.',
    players: 3, rivals: [{ profile: 'burger-baron', tier: 'hard' }, { profile: 'discounter', tier: 'hard' }],
    objectives: [{ kind: 'outlastAll' }], fails: [{ kind: 'turnLimit', turn: 55 }],
    medals: { bronze: 42, silver: 32, gold: 24 }, unlocks: ['crest:war-laurels'],
  },
  // --- Era IV: '80s corporate empire ---
  {
    id: 'the-suit', era: "'80s corporate empire", title: 'The Suit',
    briefing: 'V. P. Crane runs a milestone machine. Grab the milestones first and out-earn him.',
    players: 3, rivals: [{ profile: 'the-suit', tier: 'hard' }, { profile: 'ad-man', tier: 'med' }],
    objectives: [{ kind: 'richestAtEnd' }], fails: [{ kind: 'turnLimit', turn: 58 }],
    medals: { bronze: 44, silver: 34, gold: 26 }, unlocks: ['map:downtown'],
  },
  {
    id: 'hostile-takeover', era: "'80s corporate empire", title: 'Hostile Takeover',
    briefing: 'A full 4-seat table of sharks. Bankrupt two of the three rivals.',
    players: 4, rivals: [{ profile: 'burger-baron', tier: 'hard' }, { profile: 'ad-man', tier: 'hard' }, { profile: 'discounter', tier: 'med' }],
    objectives: [{ kind: 'bankruptRivals', count: 2 }, { kind: 'richestAtEnd' }], fails: [{ kind: 'turnLimit', turn: 60 }],
    medals: { bronze: 48, silver: 36, gold: 28 }, unlocks: ['challenge:no-undo'],
  },
  {
    id: 'empire', era: "'80s corporate empire", title: 'Empire',
    briefing: 'The capstone: the hardest table in the suburb. Stand alone at the top.',
    players: 4, rivals: [{ profile: 'the-suit', tier: 'hard' }, { profile: 'burger-baron', tier: 'hard' }, { profile: 'ad-man', tier: 'hard' }],
    objectives: [{ kind: 'richestAtEnd' }], fails: [{ kind: 'turnLimit', turn: 60 }],
    medals: { bronze: 50, silver: 40, gold: 30 }, unlocks: ['crest:gold-crown'],
  },
];

export const ERAS: Era[] = ["Late '50s diner", "'60s suburban boom", "'70s chain wars", "'80s corporate empire"];
