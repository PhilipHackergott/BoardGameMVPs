// ===================================================================================================
// CARD DATABASE  —  ⚠️ PLACEHOLDER CONTENT  ⚠️
// ===================================================================================================
// The rulebook PDF defines the *system* but contains NO individual card texts. Compile: Main 1 has
// 12 protocols × 6 command cards = 72 unique cards, and each card's real effects live on the card
// face. Until those are supplied, every card below is a STAND-IN: its value spread (0..5) and its
// effects are invented but kept thematically true to each protocol's verb summary printed in the
// rulebook (e.g. Death = DELETE/DRAW, Fire = DISCARD FOR EFFECT, Water = RETURN/DRAW/FLIP).
//
// HOW TO MAKE THIS 1:1
// --------------------
// Replace the effects/text in `PROTOCOL_CARDS` with the published data. The schema (see
// engine/types.ts → CardDef) gives you three command boxes:
//   • topText / passive       — persistent passive, live while face-up (even covered)
//   • middleText / middle      — immediate effect, resolves on play / flip face-up / uncover
//   • bottomText / trigger+triggerEffect — auxiliary, live only while face-up AND uncovered
// Effects are authored as generator functions over the EffectAPI (see the builders below for the
// common verbs; compose with `seq(...)`). Set `placeholder: false` on cards you've verified.
// Nothing else in the engine needs to change.
// ===================================================================================================

import { CardDef, EffectFn, ProtocolName, PROTOCOLS } from "./types";

// --- Effect builders (the verb vocabulary) ----------------------------------------------------

/** Run several effects in order (top of the resolution chain to bottom). */
const seq =
  (...fns: EffectFn[]): EffectFn =>
  function* (api) {
    for (const f of fns) yield* f(api);
  };

const draw = (n: number): EffectFn =>
  function* (api) {
    api.draw(api.self, n);
    api.log(`draws ${n}`);
  };

const deleteTarget = (side: "self" | "opp" | "any", opts?: { faceDown?: boolean; faceUp?: boolean }): EffectFn =>
  function* (api) {
    const t = yield* api.chooseTarget({ side, prompt: "Delete a card", faceDown: opts?.faceDown, faceUp: opts?.faceUp });
    if (t) {
      api.log(`deletes a card`);
      yield* api.deleteCard(t);
    }
  };

const flipTarget = (side: "self" | "opp" | "any"): EffectFn =>
  function* (api) {
    const t = yield* api.chooseTarget({ side, prompt: "Flip a card" });
    if (t) {
      api.log(`flips a card`);
      yield* api.flip(t);
    }
  };

const shiftTarget = (side: "self" | "opp" | "any"): EffectFn =>
  function* (api) {
    const t = yield* api.chooseTarget({ side, prompt: "Shift a card to another line" });
    if (t) {
      api.log(`shifts a card`);
      yield* api.shiftCard(t);
    }
  };

const returnTarget = (side: "self" | "opp" | "any"): EffectFn =>
  function* (api) {
    const t = yield* api.chooseTarget({ side, prompt: "Return a card to hand" });
    if (t) {
      api.log(`returns a card to hand`);
      yield* api.returnToHand(t);
    }
  };

/** Opponent discards n cards of their choice. */
const forceDiscard = (n: number): EffectFn =>
  function* (api) {
    api.log(`forces a discard`);
    yield* api.discard(api.opp, n);
  };

/** Discard 1 of your own; if you do, run a payoff effect. */
const discardForEffect = (payoff: EffectFn): EffectFn =>
  function* (api) {
    if (api.state.players[api.self].hand.length === 0) return;
    const willing = yield* api.yesno("Discard 1 card for effect?");
    if (!willing) return;
    yield* api.discard(api.self, 1);
    yield* payoff(api);
  };

// --- Per-protocol placeholder card sets (values 0..5) -----------------------------------------

type CardSpec = {
  value: number;
  topText?: string;
  middleText?: string;
  bottomText?: string;
  middle?: EffectFn;
  passive?: CardDef["passive"];
  trigger?: CardDef["trigger"];
  triggerEffect?: EffectFn;
};

const PROTOCOL_CARDS: Record<ProtocolName, CardSpec[]> = {
  // FLIP, SHIFT, DRAW
  Spirit: [
    { value: 0, topText: "Face-up cards may be played without matching protocols.", passive: { playAnyProtocol: true }, middleText: "Draw 1.", middle: draw(1) },
    { value: 1, middleText: "Flip 1 card.", middle: flipTarget("any") },
    { value: 2, middleText: "Shift 1 of your cards.", middle: shiftTarget("self") },
    { value: 3, middleText: "Draw 1, then flip 1 card.", middle: seq(draw(1), flipTarget("any")) },
    { value: 4, bottomText: "Start: Draw 1.", trigger: "start", triggerEffect: draw(1) },
    { value: 5, middleText: "Flip 1 of your cards, then draw 1.", middle: seq(flipTarget("self"), draw(1)) },
  ],
  // DELETE, DRAW
  Death: [
    { value: 0, middleText: "Delete 1 face-down card.", middle: deleteTarget("any", { faceDown: true }) },
    { value: 1, middleText: "Draw 1, then delete 1 other card.", middle: seq(draw(1), deleteTarget("any")) },
    { value: 2, middleText: "Delete 1 of the opponent's cards.", middle: deleteTarget("opp") },
    { value: 3, bottomText: "End: Delete 1 face-down card.", trigger: "end", triggerEffect: deleteTarget("any", { faceDown: true }) },
    { value: 4, middleText: "Delete 1 card, then draw 1.", middle: seq(deleteTarget("any"), draw(1)) },
    { value: 5, middleText: "Delete 1 of the opponent's uncovered cards.", middle: deleteTarget("opp", { faceUp: true }) },
  ],
  // DISCARD FOR EFFECT
  Fire: [
    { value: 0, middleText: "Discard 1: draw 2.", middle: discardForEffect(draw(2)) },
    { value: 1, middleText: "Discard 1: delete 1 card.", middle: discardForEffect(deleteTarget("any")) },
    { value: 2, middleText: "Draw 1.", middle: draw(1) },
    { value: 3, middleText: "Discard 1: flip 1 card, then draw 1.", middle: discardForEffect(seq(flipTarget("any"), draw(1))) },
    { value: 4, middleText: "Discard 1: delete 1 of the opponent's cards.", middle: discardForEffect(deleteTarget("opp")) },
    { value: 5, middleText: "Discard 1: draw 3.", middle: discardForEffect(draw(3)) },
  ],
  // PREVENT, DRAW, FLIP
  Metal: [
    { value: 0, topText: "+1 to this card's value.", passive: { valueBonus: 1 }, middleText: "Draw 1.", middle: draw(1) },
    { value: 1, middleText: "Flip 1 of your face-down cards.", middle: flipTarget("self") },
    { value: 2, topText: "+1 to this card's value.", passive: { valueBonus: 1 } },
    { value: 3, middleText: "Draw 1, then flip 1 card.", middle: seq(draw(1), flipTarget("any")) },
    { value: 4, middleText: "Flip 1 of the opponent's cards.", middle: flipTarget("opp") },
    { value: 5, topText: "+1 to this card's value.", passive: { valueBonus: 1 }, middleText: "Draw 1.", middle: draw(1) },
  ],
  // SHIFT, FLIP, DRAW
  Gravity: [
    { value: 0, middleText: "Shift 1 of the opponent's cards.", middle: shiftTarget("opp") },
    { value: 1, middleText: "Shift 1 card, then flip it.", middle: seq(shiftTarget("any"), flipTarget("any")) },
    { value: 2, middleText: "Draw 1.", middle: draw(1) },
    { value: 3, middleText: "Shift 1 of your cards, then draw 1.", middle: seq(shiftTarget("self"), draw(1)) },
    { value: 4, bottomText: "Start: Shift 1 of the opponent's cards.", trigger: "start", triggerEffect: shiftTarget("opp") },
    { value: 5, middleText: "Flip 1 card, then shift 1 card.", middle: seq(flipTarget("any"), shiftTarget("any")) },
  ],
  // FLIP, TOP DECK PLAY, DRAW
  Life: [
    { value: 0, middleText: "Draw 2.", middle: draw(2) },
    { value: 1, middleText: "Flip 1 of your face-down cards, then draw 1.", middle: seq(flipTarget("self"), draw(1)) },
    { value: 2, middleText: "Draw 1.", middle: draw(1) },
    { value: 3, bottomText: "Start: Draw 1.", trigger: "start", triggerEffect: draw(1) },
    { value: 4, middleText: "Flip 1 card.", middle: flipTarget("any") },
    { value: 5, middleText: "Draw 2, then flip 1 of your cards.", middle: seq(draw(2), flipTarget("self")) },
  ],
  // DRAW, FLIP, SHIFT
  Light: [
    { value: 0, middleText: "Draw 1.", middle: draw(1) },
    { value: 1, middleText: "Flip 1 of the opponent's face-down cards.", middle: flipTarget("opp") },
    { value: 2, middleText: "Draw 1, then shift 1 of your cards.", middle: seq(draw(1), shiftTarget("self")) },
    { value: 3, middleText: "Flip 1 card.", middle: flipTarget("any") },
    { value: 4, middleText: "Draw 2.", middle: draw(2) },
    { value: 5, middleText: "Flip 1 card, then draw 1.", middle: seq(flipTarget("any"), draw(1)) },
  ],
  // FORCED DISCARD, FLIP
  Plague: [
    { value: 0, middleText: "Opponent discards 1.", middle: forceDiscard(1) },
    { value: 1, middleText: "Flip 1 of the opponent's cards.", middle: flipTarget("opp") },
    { value: 2, middleText: "Opponent discards 1, then you draw 1.", middle: seq(forceDiscard(1), draw(1)) },
    { value: 3, bottomText: "End: Opponent discards 1.", trigger: "end", triggerEffect: forceDiscard(1) },
    { value: 4, middleText: "Opponent discards 2.", middle: forceDiscard(2) },
    { value: 5, middleText: "Flip 1 card, then opponent discards 1.", middle: seq(flipTarget("any"), forceDiscard(1)) },
  ],
  // DRAW, SHIFT, MANIPULATE
  Darkness: [
    { value: 0, middleText: "Draw 1.", middle: draw(1) },
    { value: 1, middleText: "Shift 1 card.", middle: shiftTarget("any") },
    { value: 2, middleText: "Draw 1, then shift 1 of the opponent's cards.", middle: seq(draw(1), shiftTarget("opp")) },
    { value: 3, middleText: "Flip 1 card, then shift it.", middle: seq(flipTarget("any"), shiftTarget("any")) },
    { value: 4, bottomText: "Start: Draw 1.", trigger: "start", triggerEffect: draw(1) },
    { value: 5, middleText: "Shift 1 card, then flip 1 card.", middle: seq(shiftTarget("any"), flipTarget("any")) },
  ],
  // RETURN, DRAW, FLIP
  Water: [
    { value: 0, middleText: "Return 1 of the opponent's cards to hand.", middle: returnTarget("opp") },
    { value: 1, middleText: "Draw 1.", middle: draw(1) },
    { value: 2, middleText: "Return 1 of your cards, then draw 1.", middle: seq(returnTarget("self"), draw(1)) },
    { value: 3, middleText: "Flip 1 card.", middle: flipTarget("any") },
    { value: 4, middleText: "Return 1 card to hand, then draw 1.", middle: seq(returnTarget("any"), draw(1)) },
    { value: 5, middleText: "Return 1 of the opponent's uncovered cards.", middle: returnTarget("opp") },
  ],
  // DRAW, MANIPULATE, SHIFT
  Psychic: [
    { value: 0, middleText: "Draw 1.", middle: draw(1) },
    { value: 1, middleText: "Flip 1 of the opponent's cards.", middle: flipTarget("opp") },
    { value: 2, middleText: "Draw 1, then flip 1 card.", middle: seq(draw(1), flipTarget("any")) },
    { value: 3, middleText: "Shift 1 of the opponent's cards.", middle: shiftTarget("opp") },
    { value: 4, bottomText: "Start: Opponent discards 1.", trigger: "start", triggerEffect: forceDiscard(1) },
    { value: 5, middleText: "Flip 1 card, then shift 1 card.", middle: seq(flipTarget("any"), shiftTarget("any")) },
  ],
  // DRAW, PLAY, SHIFT
  Speed: [
    { value: 0, middleText: "Draw 2.", middle: draw(2) },
    { value: 1, middleText: "Draw 1, then shift 1 of your cards.", middle: seq(draw(1), shiftTarget("self")) },
    { value: 2, middleText: "Draw 1.", middle: draw(1) },
    { value: 3, middleText: "Shift 1 card, then draw 1.", middle: seq(shiftTarget("any"), draw(1)) },
    { value: 4, bottomText: "Start: Draw 1.", trigger: "start", triggerEffect: draw(1) },
    { value: 5, middleText: "Draw 2, then shift 1 of your cards.", middle: seq(draw(2), shiftTarget("self")) },
  ],
};

// --- Build the flat registry ------------------------------------------------------------------

function buildDefs(): Record<string, CardDef> {
  const out: Record<string, CardDef> = {};
  for (const protocol of PROTOCOLS) {
    PROTOCOL_CARDS[protocol].forEach((spec, i) => {
      const id = `${protocol}-${i}`;
      out[id] = {
        id,
        protocol,
        value: spec.value,
        topText: spec.topText,
        middleText: spec.middleText,
        bottomText: spec.bottomText,
        passive: spec.passive,
        middle: spec.middle,
        trigger: spec.trigger,
        triggerEffect: spec.triggerEffect,
        placeholder: true,
      };
    });
  }
  return out;
}

export const CARD_DEFS: Record<string, CardDef> = buildDefs();

export function getDef(defId: string): CardDef {
  const def = CARD_DEFS[defId];
  if (!def) throw new Error(`Unknown card def: ${defId}`);
  return def;
}

/** The 6 card def ids that make up a protocol's command set (used when building a deck). */
export function protocolDefIds(protocol: ProtocolName): string[] {
  return PROTOCOL_CARDS[protocol].map((_, i) => `${protocol}-${i}`);
}
