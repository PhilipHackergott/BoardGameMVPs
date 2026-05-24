// createGame — the deterministic initial state from { config, seed }. Same seed ⇒ identical setup.

import type {
  CardDeck,
  CharacterState,
  Config,
  GameState,
  Nation,
  PoliticalState,
  Stack,
} from './types';
import { FP_NATIONS, SHADOW_NATIONS } from './types';
import { makeRng, shuffle } from './rng';
import { REGIONS } from './data/map';
import { AT_WAR_STEP, POLITICAL_START } from './data/nations';
import { CHARACTERS, STARTING_COMPANIONS } from './data/characters';
import { CARDS } from './data/cards';
import { makeReserveHuntTiles, makeStandardHuntPool } from './data/huntPool';
import {
  FELLOWSHIP_START_REGION,
  STARTING_PLACEMENT,
  startingReinforcements,
} from './data/setup';
import { addUnits, emptyStack } from './army';

function buildPolitics(): Record<Nation, PoliticalState> {
  const out = {} as Record<Nation, PoliticalState>;
  for (const nation of [...FP_NATIONS, ...SHADOW_NATIONS]) {
    const start = POLITICAL_START[nation];
    out[nation] = {
      active: start.active,
      step: start.step,
      atWar: start.active && start.step >= AT_WAR_STEP,
    };
  }
  return out;
}

function buildRegions(): { regions: Record<string, Stack | undefined>; control: Record<string, string> } {
  const regions: Record<string, Stack | undefined> = {};
  const control: Record<string, string> = {};
  // settlement control starts with the controlling nation's side
  for (const r of Object.values(REGIONS)) {
    if (r.settlement !== 'none' && r.nation) {
      control[r.id] = SHADOW_NATIONS.includes(r.nation as never) ? 'shadow' : 'fp';
    }
  }
  for (const [regionId, p] of Object.entries(STARTING_PLACEMENT)) {
    const s = emptyStack(p.side);
    for (const u of p.units) {
      if (u.regular) addUnits(s, u.nation, 'regular', u.regular);
      if (u.elite) addUnits(s, u.nation, 'elite', u.elite);
    }
    s.leaders = p.leaders ?? 0;
    s.nazgul = p.nazgul ?? 0;
    s.characters = p.characters ? [...p.characters] : [];
    regions[regionId] = s;
  }
  return { regions, control: control as Record<string, string> };
}

function buildCharacters(): Record<string, CharacterState> {
  const out: Record<string, CharacterState> = {};
  for (const c of CHARACTERS) {
    if (c.startsInFellowship) {
      out[c.id] = { id: c.id, location: { where: 'fellowship' }, inPlay: true };
    } else if (c.id === 'aragorn' || c.id === 'gandalf_white') {
      out[c.id] = { id: c.id, location: { where: 'reserve' }, inPlay: false };
    } else {
      out[c.id] = { id: c.id, location: { where: 'available' }, inPlay: false };
    }
  }
  return out;
}

function buildDecks(seed: number): { decks: GameState['decks']; rngState: number } {
  const rng = makeRng(seed ^ 0x9e3779b9);
  const byDeck: Record<CardDeck, string[]> = {
    fpCharacter: [],
    fpStrategy: [],
    shadowCharacter: [],
    shadowStrategy: [],
  };
  for (const c of CARDS) byDeck[c.deck].push(c.id);
  const decks: GameState['decks'] = {
    fpCharacter: shuffle(rng, byDeck.fpCharacter),
    fpStrategy: shuffle(rng, byDeck.fpStrategy),
    shadowCharacter: shuffle(rng, byDeck.shadowCharacter),
    shadowStrategy: shuffle(rng, byDeck.shadowStrategy),
  };
  return { decks, rngState: rng.state() };
}

export function createGame(config: Config, seed: number): GameState {
  const { regions, control } = buildRegions();
  const { decks } = buildDecks(seed);
  const rng = makeRng(seed);

  return {
    config,
    seed,
    rngState: rng.state(),
    turn: 1,
    phase: 'recoverAndDraw',
    current: 'fp',
    passed: { fp: false, shadow: false },
    dice: { fp: [], shadow: [] },
    huntBox: { shadowAllocated: 0, eye: 0 },
    regions,
    control: control as Record<string, GameState['current']>,
    fellowship: {
      progress: 0,
      guideId: 'gandalf_grey',
      companions: [...STARTING_COMPANIONS],
      corruption: 0,
      revealed: false,
      onMordorTrack: false,
      mordorStep: 0,
      lastDeclaredRegion: FELLOWSHIP_START_REGION,
      fpDiceInBox: 0,
      actedThisTurn: false,
    },
    politics: buildPolitics(),
    reinforcements: startingReinforcements(),
    characters: buildCharacters(),
    hands: { fp: [], shadow: [] },
    decks,
    discards: { fpCharacter: [], fpStrategy: [], shadowCharacter: [], shadowStrategy: [] },
    cardsOnTable: { fp: [], shadow: [] },
    huntPool: makeStandardHuntPool(),
    huntReserve: makeReserveHuntTiles(),
    drawnThisTurn: { fp: 0, shadow: 0 },
    vp: { fp: 0, shadow: 0 },
    winner: null,
    pendingCombat: null,
    outcome: null,
    log: [{ turn: 1, phase: 'recoverAndDraw', side: 'system', text: `Game created (seed ${seed}).` }],
  };
}
