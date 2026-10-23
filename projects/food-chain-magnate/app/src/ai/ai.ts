// The AI entry point. One factory, tier-routed:
//   • Low / Med  → the shared heuristic ({@link ./heuristic}) — same coherent game, scaled reliability
//                  (action-skip), marketing volume, and engine-building.
//   • Hard       → the multi-turn best-response search ({@link ./search}), which uses the heuristic as
//                  its own rollout proxy and the Med heuristic as the opponent model, looking 2 full
//                  turns ahead to value marketing whose demand only pays off next Dinnertime.
// The ladder is sim-verified in tests/sim/balance.test.ts.

import type { Policy } from '../engine';
import { DEFAULT_PROFILE, type Tier } from './profiles';
import { heuristicPolicy } from './heuristic';
import { makeSearchAI } from './search';

export function makeAI(tier: Tier, profileId: string = DEFAULT_PROFILE): Policy {
  return tier === 'hard' ? makeSearchAI(profileId) : heuristicPolicy(tier, profileId);
}
