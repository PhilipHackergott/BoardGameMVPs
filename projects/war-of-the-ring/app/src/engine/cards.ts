// Card interpreter: draw/discard with hand limit, and the small scripted-hook vocabulary. Cards
// without a hook carry their real text and are resolved by hand (the UI shows the text). The deck
// metadata (id/side/deck/die) is always valid; nothing is fabricated.

import type { CardDeck, CardHook, FpNation, GameState, Outcome, Side } from './types';
import { CARD_BY_ID } from './data/cards';
import { makeRng, shuffle } from './rng';
import { activate, advance } from './politics';
import { FP_NATIONS } from './types';

export const HAND_LIMIT = 6;

function reshuffleIfEmpty(state: GameState, deck: CardDeck): void {
  if (state.decks[deck].length === 0 && state.discards[deck].length > 0) {
    const rng = makeRng(state.rngState);
    state.decks[deck] = shuffle(rng, state.discards[deck]);
    state.discards[deck] = [];
    state.rngState = rng.state();
  }
}

export function drawCard(state: GameState, deck: CardDeck): string | null {
  reshuffleIfEmpty(state, deck);
  const id = state.decks[deck].shift();
  if (!id) return null;
  const side: Side = deck.startsWith('fp') ? 'fp' : 'shadow';
  state.hands[side].push(id);
  return id;
}

export function discardToHandLimit(state: GameState, side: Side): number {
  let discarded = 0;
  while (state.hands[side].length > HAND_LIMIT) {
    const id = state.hands[side].shift()!; // discard oldest (UI lets the player choose; sim is arbitrary)
    const deck = CARD_BY_ID[id].deck;
    state.discards[deck].push(id);
    discarded++;
  }
  return discarded;
}

function deckFor(side: Side, kind: 'strategy' | 'character'): CardDeck {
  return (side === 'fp' ? 'fp' : 'shadow') + (kind === 'strategy' ? 'Strategy' : 'Character') as CardDeck;
}

/** Apply a scripted hook. Returns a human description. */
export function applyHook(state: GameState, side: Side, hook: CardHook): string {
  switch (hook.kind) {
    case 'drawCards': {
      const kind = hook.deck === 'choice' ? 'strategy' : hook.deck;
      let drawn = 0;
      for (let i = 0; i < hook.count; i++) if (drawCard(state, deckFor(side, kind))) drawn++;
      return `drew ${drawn} ${kind} card(s)`;
    }
    case 'healCorruption': {
      const before = state.fellowship.corruption;
      state.fellowship.corruption = Math.max(0, before - hook.amount);
      return `healed ${before - state.fellowship.corruption} Corruption`;
    }
    case 'addCorruption': {
      const before = state.fellowship.corruption;
      state.fellowship.corruption = Math.min(12, before + hook.amount);
      return `added ${state.fellowship.corruption - before} Corruption`;
    }
    case 'advancePolitical': {
      const nation = hook.nation === 'choice' ? pickFpToAdvance(state) : hook.nation;
      activate(state, nation, 'event card');
      advance(state, nation, hook.steps, 'event card');
      return `advanced ${nation} ${hook.steps} step(s)`;
    }
    case 'activateNation': {
      const nation = hook.nation === 'choice' ? pickFpToAdvance(state) : hook.nation;
      activate(state, nation, 'event card');
      return `activated ${nation}`;
    }
    case 'addHuntLevel':
      state.huntBox.shadowAllocated += hook.amount;
      return `added ${hook.amount} to the Hunt`;
    case 'eyeToHuntBox': {
      const unused = state.dice.shadow.filter((d) => !d.used && d.face !== 'eye');
      const n = Math.min(hook.max, unused.length);
      let moved = 0;
      for (const d of state.dice.shadow) {
        if (moved >= n) break;
        if (!d.used && d.face !== 'eye') {
          d.used = true;
          state.huntBox.eye += 1;
          moved++;
        }
      }
      return `moved ${moved} die(dice) to the Hunt Box as Eyes`;
    }
  }
}

function pickFpToAdvance(state: GameState): FpNation {
  // choose the FP nation furthest from war that is activatable (sim/auto convenience)
  let best: FpNation = 'gondor';
  let bestStep = Infinity;
  for (const n of FP_NATIONS) {
    const p = state.politics[n];
    if (!p.atWar && p.step < bestStep) {
      best = n;
      bestStep = p.step;
    }
  }
  return best;
}

/** Play a card from hand: apply its hook if scripted, then move it to table or discard. */
export function playCard(state: GameState, side: Side, cardId: string): Outcome {
  const card = CARD_BY_ID[cardId];
  const idx = state.hands[side].indexOf(cardId);
  if (idx >= 0) state.hands[side].splice(idx, 1);

  let detail = card.title;
  if (card.scripted && card.hook) {
    detail += ` — ${applyHook(state, side, card.hook)}`;
  } else {
    detail += ' — resolve by hand (see card text).';
  }
  // "Play on the table" cards stay; others go to discard. Heuristic: keep on table if text says so.
  if (/play on the table/i.test(card.event)) state.cardsOnTable[side].push(cardId);
  else state.discards[card.deck].push(cardId);

  return { kind: 'card', title: `${side === 'fp' ? 'Free Peoples' : 'Shadow'} play ${card.title}`, detail };
}
