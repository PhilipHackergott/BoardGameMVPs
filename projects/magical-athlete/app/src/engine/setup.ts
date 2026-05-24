// Match construction: seed the deck + draft, initialize per-player state.

import type { MatchConfig, MatchState, PlayerId, RacerId } from './types';
import { makeRng } from './rng';
import { buildDraft } from './draft';
import { racersById } from './racers';

export function createMatch(config: MatchConfig): MatchState {
  const rng = makeRng(config.seed);
  const draft = buildDraft(config, rng);
  const used: Record<PlayerId, RacerId[]> = {};
  for (let p = 0; p < config.players; p++) used[p] = [];
  return {
    config,
    racersById,
    draft,
    reveal: { needed: [], chosen: {} },
    used,
    pastWinners: [],
    race: null,
    raceNo: 0,
    nextFirst: 0,
    chips: Array.from({ length: config.players }, () => []),
    phase: 'draft',
    winners: null,
    rngState: rng.state(),
    events: [],
    log: [],
  };
}
