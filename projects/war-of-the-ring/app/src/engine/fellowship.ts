// The Fellowship: declare, move (with the Hunt), hide, change Guide, separate, and the Mordor
// track. Progress is a hidden counter (distance from the last-declared region). Entering Mordor at
// Minas Morgul/Morannon switches to the 5-step Mordor track (auto-draw a tile per move, Stop on an
// Eye, idle-turn corruption). Reaching step 5 with Corruption < 12 is a Free Peoples victory.

import type { GameState, Outcome } from './types';
import { CHAR_BY_ID } from './data/characters';
import { MORDOR_ENTRY, region } from './data/map';
import { activate } from './politics';
import { applyHuntDamage, drawHuntTile, huntLevel, huntRoll } from './hunt';
import { checkVictory } from './victory';

/** The current Guide: highest-level Companion (FP may override via changeGuide); Gollum if none. */
export function defaultGuideId(state: GameState): string {
  const comps = state.fellowship.companions;
  if (comps.length === 0) return 'gollum';
  let best = comps[0];
  for (const id of comps) {
    if ((CHAR_BY_ID[id]?.level ?? 0) > (CHAR_BY_ID[best]?.level ?? 0)) best = id;
  }
  return best;
}

export function recomputeGuide(state: GameState): void {
  const comps = state.fellowship.companions;
  if (!comps.includes(state.fellowship.guideId)) {
    state.fellowship.guideId = defaultGuideId(state);
  }
}

export function declareFellowship(state: GameState, regionId: string): Outcome {
  const f = state.fellowship;
  f.lastDeclaredRegion = regionId;
  f.progress = 0;
  f.revealed = false;
  // heal 1 corruption if declared in an FP-controlled City/Stronghold
  const r = region(regionId);
  let healed = false;
  if ((r.settlement === 'city' || r.settlement === 'stronghold') && state.control[regionId] === 'fp') {
    if (f.corruption > 0) {
      f.corruption -= 1;
      healed = true;
    }
  }
  // declaring in a nation's city/stronghold activates that nation
  if (r.nation && (r.settlement === 'city' || r.settlement === 'stronghold')) {
    activate(state, r.nation, 'Fellowship declared');
  }
  return {
    kind: 'info',
    title: 'Fellowship declared',
    detail: `Declared at ${r.name}${healed ? ' — healed 1 Corruption' : ''}.`,
  };
}

export function changeGuide(state: GameState, characterId: string): boolean {
  if (!state.fellowship.companions.includes(characterId)) return false;
  state.fellowship.guideId = characterId;
  return true;
}

/** Move the Fellowship one step. On the Mordor track this auto-draws a tile; otherwise it triggers
 *  a Hunt roll. Returns an Outcome banner for the UI. */
export function moveFellowship(state: GameState): Outcome {
  const f = state.fellowship;
  f.actedThisTurn = true;

  if (f.onMordorTrack) {
    const tile = drawHuntTile(state);
    if (!tile) {
      f.mordorStep = Math.min(5, f.mordorStep + 1);
    } else if (tile.kind === 'eye') {
      // Eye = Stop in Mordor: no advance, damage = current hunt level
      const dmg = Math.min(12, huntLevel(state));
      f.corruption = Math.min(12, f.corruption + dmg);
      checkVictory(state);
      return { kind: 'hunt', title: 'Mordor — Stop!', detail: `An Eye halts the Ring-bearers. +${dmg} Corruption.` };
    } else {
      f.mordorStep = Math.min(5, f.mordorStep + 1);
      f.corruption = Math.min(12, f.corruption + tile.value);
    }
    checkVictory(state);
    return {
      kind: 'hunt',
      title: `Mordor step ${f.mordorStep}/5`,
      detail: `The Ring-bearers crawl deeper. Corruption ${f.corruption}/12.`,
    };
  }

  // normal move: advance hidden progress, add an FP die to the Hunt Box, then Hunt
  f.progress += 1;
  f.fpDiceInBox += 1;
  let detail = `Progress ${f.progress} from ${region(f.lastDeclaredRegion).name}.`;

  if (huntLevel(state) > 0) {
    const roll = huntRoll(state);
    detail += ` Hunt: ${roll.successes} success(es) [need ${roll.threshold}+ on ${roll.dice.length} dice].`;
    if (roll.successes >= 1) {
      const tile = drawHuntTile(state);
      if (tile) {
        const { damage, revealed } = applyHuntDamage(state, tile, roll.successes);
        detail += ` Tile: ${tile.kind === 'eye' ? 'Eye' : tile.value}${tile.reveal ? ' (Reveal)' : ''} → +${damage} Corruption${revealed ? ', revealed' : ''}.`;
      }
    }
  }
  checkVictory(state);
  return { kind: 'hunt', title: 'Fellowship moves', detail };
}

export function hideFellowship(state: GameState): Outcome {
  // Hiding a revealed Fellowship: a Character die may attempt to hide (no Hunt). MVP: simply hide.
  state.fellowship.revealed = false;
  state.fellowship.actedThisTurn = true;
  return { kind: 'info', title: 'Fellowship hides', detail: 'The Fellowship slips back into hiding.' };
}

/** Whether the Fellowship may enter the Mordor track now (declared/at a Mordor entry region). */
export function canEnterMordor(state: GameState): boolean {
  const f = state.fellowship;
  return !f.onMordorTrack && MORDOR_ENTRY.includes(f.lastDeclaredRegion);
}

export function enterMordor(state: GameState): Outcome {
  const f = state.fellowship;
  f.onMordorTrack = true;
  f.mordorStep = 0;
  f.progress = 0;
  return { kind: 'info', title: 'Into Mordor', detail: 'The Ring-bearers pass into the Black Land. Mordor step 0/5.' };
}

/** End-of-turn Mordor idle check: +1 Corruption if no move/hide attempt was made this turn. */
export function mordorIdleCheck(state: GameState): void {
  const f = state.fellowship;
  if (f.onMordorTrack && !f.actedThisTurn) {
    f.corruption = Math.min(12, f.corruption + 1);
    state.log.push({ turn: state.turn, phase: state.phase, side: 'system', text: 'Mordor: the Ring-bearers made no progress — +1 Corruption.' });
    checkVictory(state);
  }
}
