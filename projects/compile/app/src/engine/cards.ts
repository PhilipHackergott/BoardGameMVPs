// ===================================================================================================
// CARD DATABASE  —  REAL published card data (Compile: Main 1)
// ===================================================================================================
// The 12 protocols × 6 command cards = 72 cards below carry the *real* printed VALUE and the *real*
// command-box TEXTS, sourced and cross-checked in 2026-05 (see ../../../card-reference.md for the
// full sourcing + citations). This replaces the earlier invented stand-in data.
//
// TEXT vs EFFECT (read this before trusting `placeholder`)
// --------------------------------------------------------
//   • Every card's value + top/middle/bottom TEXT here is the real published data.
//   • The EFFECT runtime (effects.ts) speaks a limited verb vocabulary: draw, self-discard, opponent
//     forced-discard, and single-UNCOVERED-target delete/flip/shift/return (optionally face-up/-down
//     filtered), plus "discard 1 -> payoff". Per the rulebook, effects target uncovered cards by
//     default, so single-target commands run faithfully.
//   • Each card is wired to the FAITHFUL SUBSET of its real text the runtime can express; parts it
//     cannot yet model (value modifiers, play-from-deck, reactive "when covered/flipped" triggers,
//     lock-outs, rearrange, reveal, value/line-conditional multi-delete, covered targeting, refresh)
//     are DROPPED, never substituted.
//   • `placeholder: false`  => the WHOLE card text is executed faithfully (24/72).
//     `placeholder: true`   => text & value are real, but the effect logic is SIMPLIFIED pending
//                              richer runtime primitives (a future build-stage task). 48/72.
//
// To raise fidelity further, extend types.ts/effects.ts/field.ts/game.ts with the missing primitives
// (listed in card-reference.md) — then flip the remaining `placeholder` flags to false here. The
// schema (types.ts -> CardDef) is unchanged.
//
// Value spread note: ten protocols use 0..5; GRAVITY uses {0,1,2,4,5,6} (no 3) and METAL uses
// {0,1,2,3,5,6} (no 4). Cards are listed in ascending value; the trailing id number is the slot
// index 0..5, which equals the printed value for ten protocols but not for Gravity/Metal's top slots.
// ===================================================================================================

import { CardDef, EffectFn, ProtocolName, PROTOCOLS } from "./types";

// --- Effect builders (the verb vocabulary) ----------------------------------------------------

type TargetOpts = { faceUp?: boolean; faceDown?: boolean; optional?: boolean };

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

/** You discard n cards of your own choice (the value-5 "You discard 1 card." cost, etc.). */
const selfDiscard = (n: number): EffectFn =>
  function* (api) {
    api.log(`discards ${n}`);
    yield* api.discard(api.self, n);
  };

const deleteTarget = (side: "self" | "opp" | "any", opts?: TargetOpts): EffectFn =>
  function* (api) {
    const t = yield* api.chooseTarget({ side, prompt: "Delete a card", faceDown: opts?.faceDown, faceUp: opts?.faceUp, optional: opts?.optional });
    if (t) {
      api.log(`deletes a card`);
      yield* api.deleteCard(t);
    }
  };

const flipTarget = (side: "self" | "opp" | "any", opts?: TargetOpts): EffectFn =>
  function* (api) {
    const t = yield* api.chooseTarget({ side, prompt: "Flip a card", faceDown: opts?.faceDown, faceUp: opts?.faceUp, optional: opts?.optional });
    if (t) {
      api.log(`flips a card`);
      yield* api.flip(t);
    }
  };

const shiftTarget = (side: "self" | "opp" | "any", opts?: TargetOpts): EffectFn =>
  function* (api) {
    const t = yield* api.chooseTarget({ side, prompt: "Shift a card to another line", faceDown: opts?.faceDown, faceUp: opts?.faceUp, optional: opts?.optional });
    if (t) {
      api.log(`shifts a card`);
      yield* api.shiftCard(t);
    }
  };

const returnTarget = (side: "self" | "opp" | "any", opts?: TargetOpts): EffectFn =>
  function* (api) {
    const t = yield* api.chooseTarget({ side, prompt: "Return a card to hand", faceDown: opts?.faceDown, faceUp: opts?.faceUp, optional: opts?.optional });
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

/** Discard 1 of your own; if you do, run a payoff effect ("Discard 1 card. If you do, ..."). */
const discardForEffect = (payoff: EffectFn): EffectFn =>
  function* (api) {
    if (api.state.players[api.self].hand.length === 0) return;
    const willing = yield* api.yesno("Discard 1 card for effect?");
    if (!willing) return;
    yield* api.discard(api.self, 1);
    yield* payoff(api);
  };

// --- Per-protocol card sets — REAL value + REAL text, ascending by value ----------------------
// `faithful: true` => the whole text is executed faithfully (=> placeholder:false).
// `faithful: false` => text/value real, effect is the faithful subset (=> placeholder:true).

type CardSpec = {
  value: number;
  topText?: string;
  middleText?: string;
  bottomText?: string;
  middle?: EffectFn;
  passive?: CardDef["passive"];
  trigger?: CardDef["trigger"];
  triggerEffect?: EffectFn;
  faithful: boolean;
};

const PROTOCOL_CARDS: Record<ProtocolName, CardSpec[]> = {
  // FLIP, SHIFT, DRAW
  Spirit: [
    { value: 0, middleText: "Refresh. Draw 1 card.", bottomText: "Skip your check cache phase.", faithful: false },
    {
      value: 1,
      topText: "You can play cards in any line.",
      middleText: "Draw 2 cards.",
      bottomText: "Start: Either discard 1 card or flip this card.",
      passive: { playAnyProtocol: true },
      middle: draw(2),
      trigger: "start",
      triggerEffect: selfDiscard(1),
      faithful: false, // passive + middle faithful; the Start aux ("or flip this card") is approximated
    },
    { value: 2, middleText: "You may flip 1 card.", middle: flipTarget("any", { optional: true }), faithful: true },
    { value: 3, topText: "After you draw cards: You may shift this card, even if this card is covered.", faithful: false },
    { value: 4, middleText: "Swap the positions of 2 of your protocols.", faithful: false },
    { value: 5, middleText: "You discard 1 card.", middle: selfDiscard(1), faithful: true },
  ],
  // DELETE, DRAW
  Death: [
    { value: 0, middleText: "Delete 1 card from each other line.", middle: deleteTarget("any"), faithful: false },
    {
      value: 1,
      topText: "Start: You may draw 1 card. If you do, delete 1 other card, then delete this card.",
      trigger: "start",
      triggerEffect: seq(draw(1), deleteTarget("any")),
      faithful: false, // "then delete this card" (self-delete) dropped
    },
    { value: 2, middleText: "Delete all cards in 1 line with values of 1 or 2.", middle: deleteTarget("any"), faithful: false },
    { value: 3, middleText: "Delete 1 face-down card.", middle: deleteTarget("any", { faceDown: true }), faithful: true },
    { value: 4, middleText: "Delete a card with a value of 0 or 1.", middle: deleteTarget("any"), faithful: false },
    { value: 5, middleText: "You discard 1 card.", middle: selfDiscard(1), faithful: true },
  ],
  // DISCARD FOR EFFECT
  Fire: [
    {
      value: 0,
      middleText: "Flip 1 other card. Draw 2 cards.",
      bottomText: "When this card would be covered: First, draw 1 card and flip 1 other card.",
      middle: seq(flipTarget("any"), draw(2)),
      faithful: false, // reactive "when covered" bottom not modeled
    },
    { value: 1, middleText: "Discard 1 card. If you do, delete 1 card.", middle: discardForEffect(deleteTarget("any")), faithful: true },
    { value: 2, middleText: "Discard 1 card. If you do, return 1 card.", middle: discardForEffect(returnTarget("any")), faithful: true },
    { value: 3, bottomText: "End: You may discard 1 card. If you do, flip 1 card.", trigger: "end", triggerEffect: discardForEffect(flipTarget("any")), faithful: true },
    { value: 4, middleText: "Discard 1 or more cards. Draw the amount discarded plus 1.", middle: discardForEffect(draw(2)), faithful: false }, // models the single-discard case (discard 1 -> draw 2)
    { value: 5, middleText: "You discard 1 card.", middle: selfDiscard(1), faithful: true },
  ],
  // PREVENT, DRAW, FLIP   (values 0,1,2,3,5,6 — no 4)
  Metal: [
    { value: 0, topText: "Your opponent's total value in this line is reduced by 2.", middleText: "Flip 1 card.", middle: flipTarget("any"), faithful: false }, // value-debuff top not modeled
    { value: 1, middleText: "Draw 2 cards. Your opponent cannot compile next turn.", middle: draw(2), faithful: false }, // compile lock-out not modeled
    { value: 2, topText: "Your opponent cannot play cards face-down in this line.", faithful: false },
    { value: 3, middleText: "Draw 1 card. Delete all cards in 1 other line with 8 or more cards.", middle: draw(1), faithful: false }, // conditional multi-delete dropped
    { value: 5, middleText: "You discard 1 card.", middle: selfDiscard(1), faithful: true },
    { value: 6, topText: "When this card would be covered or flipped: First, delete this card.", faithful: false },
  ],
  // SHIFT, FLIP, DRAW   (values 0,1,2,4,5,6 — no 3)
  Gravity: [
    { value: 0, middleText: "For every 2 cards in this line, play the top card of your deck face-down under this card.", faithful: false },
    { value: 1, middleText: "Draw 2 cards. Shift 1 card either to or from this line.", middle: seq(draw(2), shiftTarget("self")), faithful: false },
    { value: 2, middleText: "Flip 1 card. Shift that card to this line.", middle: flipTarget("any"), faithful: false }, // "shift that card to this line" dropped
    { value: 4, middleText: "Shift 1 face-down card to this line.", middle: shiftTarget("any", { faceDown: true }), faithful: false }, // destination "this line" not enforced
    { value: 5, middleText: "You discard 1 card.", middle: selfDiscard(1), faithful: true },
    { value: 6, middleText: "Your opponent plays the top card of their deck face-down in this line.", faithful: false },
  ],
  // FLIP, TOP DECK PLAY, DRAW
  Life: [
    {
      value: 0,
      middleText: "Play the top card of your deck face-down in each line where you have a card.",
      bottomText: "When this card would be covered: First, delete this card.",
      faithful: false,
    },
    { value: 1, middleText: "Flip 1 card. Flip 1 card.", middle: seq(flipTarget("any"), flipTarget("any")), faithful: true },
    { value: 2, middleText: "Draw 1 card. You may flip 1 face-down card.", middle: seq(draw(1), flipTarget("any", { faceDown: true, optional: true })), faithful: true },
    { value: 3, bottomText: "When this card would be covered: First, play the top card of your deck face-down in another line.", faithful: false },
    { value: 4, middleText: "If this card is covering a card, draw 1 card.", faithful: false }, // self-context condition not modeled (left inert rather than over-draw)
    { value: 5, middleText: "You discard 1 card.", middle: selfDiscard(1), faithful: true },
  ],
  // DRAW, FLIP, SHIFT
  Light: [
    { value: 0, middleText: "Flip 1 card. Draw cards equal to that card's value.", middle: flipTarget("any"), faithful: false }, // value-based draw dropped
    { value: 1, bottomText: "End: Draw 1 card.", trigger: "end", triggerEffect: draw(1), faithful: true },
    { value: 2, middleText: "Draw 2 cards. Reveal 1 face-down card. You may shift or flip that card.", middle: seq(draw(2), flipTarget("any", { faceDown: true, optional: true })), faithful: false },
    { value: 3, middleText: "Shift all face-down cards in this line to another line.", middle: shiftTarget("self", { faceDown: true }), faithful: false }, // "all" -> one
    { value: 4, middleText: "Your opponent reveals their hand.", faithful: false }, // reveal not surfaced
    { value: 5, middleText: "You discard 1 card.", middle: selfDiscard(1), faithful: true },
  ],
  // FORCED DISCARD, FLIP
  Plague: [
    { value: 0, middleText: "Your opponent discards 1 card.", bottomText: "Your opponent cannot play cards in this line.", middle: forceDiscard(1), faithful: false }, // bottom lock-out not modeled
    { value: 1, topText: "After your opponent discards cards: Draw 1 card.", middleText: "Your opponent discards 1 card.", middle: forceDiscard(1), faithful: false }, // reactive top not modeled
    { value: 2, middleText: "Discard 1 or more cards. Your opponent discards the amount of cards discarded plus 1.", middle: discardForEffect(forceDiscard(2)), faithful: false }, // single-discard case
    { value: 3, middleText: "Flip each other face-up card.", middle: flipTarget("any", { faceUp: true }), faithful: false }, // "each" -> one
    { value: 4, bottomText: "End: Your opponent deletes 1 of their face-down cards. You may flip this card.", trigger: "end", triggerEffect: deleteTarget("opp", { faceDown: true }), faithful: false }, // owner-choice + flip-this dropped
    { value: 5, middleText: "You discard 1 card.", middle: selfDiscard(1), faithful: true },
  ],
  // DRAW, SHIFT, MANIPULATE
  Darkness: [
    { value: 0, middleText: "Draw 3 cards. Shift 1 of your opponent's covered cards.", middle: draw(3), faithful: false }, // covered-shift dropped
    { value: 1, middleText: "Flip 1 of your opponent's cards. You may shift that card.", middle: flipTarget("opp"), faithful: false }, // "shift that card" dropped
    { value: 2, topText: "All face-down cards in this stack have a value of 4.", middleText: "You may flip 1 covered card in this line.", faithful: false }, // value-mod + covered targeting not modeled
    { value: 3, middleText: "Play 1 card face-down in another line.", faithful: false }, // play-from-hand not modeled
    { value: 4, middleText: "Shift 1 face-down card.", middle: shiftTarget("any", { faceDown: true }), faithful: true },
    { value: 5, middleText: "You discard 1 card.", middle: selfDiscard(1), faithful: true },
  ],
  // RETURN, DRAW, FLIP
  Water: [
    { value: 0, middleText: "Flip 1 other card. Flip this card.", middle: flipTarget("any"), faithful: false }, // "flip this card" (self) dropped
    { value: 1, middleText: "Play the top card of your deck face-down in each other line.", faithful: false },
    { value: 2, middleText: "Draw 2 cards. Rearrange your protocols.", middle: draw(2), faithful: false }, // rearrange dropped
    { value: 3, middleText: "Return all cards with a value of 2 in 1 line.", faithful: false }, // value-filtered return not expressible; returning an arbitrary card is unfaithful (and loops) -> inert
    { value: 4, middleText: "Return 1 of your cards.", middle: returnTarget("self"), faithful: true },
    { value: 5, middleText: "You discard 1 card.", middle: selfDiscard(1), faithful: true },
  ],
  // DRAW, MANIPULATE, SHIFT
  Psychic: [
    { value: 0, middleText: "Draw 2 cards. Your opponent discards 2 cards, then reveals their hand.", middle: seq(draw(2), forceDiscard(2)), faithful: false }, // reveal dropped
    { value: 1, topText: "Your opponent can only play cards face-down.", bottomText: "Start: Flip this card.", trigger: "start", faithful: false }, // lock-out + self-flip not modeled
    { value: 2, middleText: "Your opponent discards 2 cards. Rearrange their protocols.", middle: forceDiscard(2), faithful: false }, // rearrange dropped
    { value: 3, middleText: "Your opponent discards 1 card. Shift 1 of their cards.", middle: seq(forceDiscard(1), shiftTarget("opp")), faithful: true },
    { value: 4, bottomText: "End: You may return 1 of your opponent's cards. If you do, flip this card.", faithful: false }, // the self-flip ("flip this card") is the brake that stops this recurring; un-modelable -> dropped (else it loops)
    { value: 5, middleText: "You discard 1 card.", middle: selfDiscard(1), faithful: true },
  ],
  // DRAW, PLAY, SHIFT
  Speed: [
    { value: 0, middleText: "Play 1 card.", faithful: false }, // play-from-hand not modeled
    { value: 1, topText: "After you clear cache: Draw 1 card.", middleText: "Draw 2 cards.", middle: draw(2), faithful: false }, // reactive top not modeled
    { value: 2, topText: "When this card would be deleted by compiling: Shift this card, even if this card is covered.", faithful: false },
    { value: 3, middleText: "Shift 1 of your other cards.", bottomText: "End: You may shift 1 of your cards. If you do, flip this card.", middle: shiftTarget("self"), faithful: false }, // middle (one-time) kept; recurring End aux needs the self-flip brake -> dropped
    { value: 4, middleText: "Shift 1 of your opponent's face-down cards.", middle: shiftTarget("opp", { faceDown: true }), faithful: true },
    { value: 5, middleText: "You discard 1 card.", middle: selfDiscard(1), faithful: true },
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
        placeholder: !spec.faithful,
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
