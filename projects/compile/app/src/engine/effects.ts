// The effect runtime. Card commands are authored as generator functions that drive THIS api; when
// an effect needs a decision it `yield`s a ChoiceRequest and is resumed with a ChoiceResponse (see
// game.ts for the driver that answers via the human UI or the AI). Nested resolution — flipping a
// card face-up, or uncovering one — is just a `yield*` into another effect, which gives the
// rulebook's "last in, first out" interrupt ordering for free.
//
// MVP simplification (documented in README): every choice in a resolution chain is made by the
// active player (state.turn). The rulebook hands some sub-decisions to a card's owner; faithfully
// modelling that hand-off is deferred until the real card data lands.

import {
  CardInstance,
  ChoiceRequest,
  ChoiceResponse,
  EffectGen,
  GameState,
  Side,
} from "./types";
import { getDef } from "./cards";
import { opponent, uncovered as topOf, uncoveredTargets, locate } from "./field";
import { shuffle } from "./rng";

export interface TargetSpec {
  side?: "self" | "opp" | "any";
  faceUp?: boolean;
  faceDown?: boolean;
  optional?: boolean;
  prompt?: string;
  excludeUid?: string;
}

export interface EffectAPI {
  readonly state: GameState;
  readonly self: Side;
  readonly opp: Side;
  log(text: string): void;
  uncovered(side: Side, line: number): CardInstance | null;
  /** Draw n cards for `side`, reshuffling trash into deck when the deck empties mid-draw. */
  draw(side: Side, n: number): void;
  discard(side: Side, n: number, optional?: boolean): EffectGen;
  flip(card: CardInstance): EffectGen;
  shiftCard(card: CardInstance): EffectGen;
  deleteCard(card: CardInstance): EffectGen;
  returnToHand(card: CardInstance): EffectGen;
  chooseTarget(spec: TargetSpec): Generator<ChoiceRequest, CardInstance | null, ChoiceResponse>;
  chooseLine(side: Side, prompt: string, exclude?: number): Generator<ChoiceRequest, number, ChoiceResponse>;
  yesno(prompt: string): Generator<ChoiceRequest, boolean, ChoiceResponse>;
}

const MAX_UNCOVER_DEPTH = 12;

export class Effects implements EffectAPI {
  constructor(
    readonly state: GameState,
    readonly self: Side,
    private depth = 0,
  ) {}

  get opp(): Side {
    return opponent(self0(this.self));
  }

  log(text: string): void {
    this.state.log.push({ side: this.self, text });
  }

  uncovered(side: Side, line: number): CardInstance | null {
    return topOf(this.state.players[side], line);
  }

  draw(side: Side, n: number): void {
    const p = this.state.players[side];
    let drew = 0;
    for (let i = 0; i < n; i++) {
      if (p.deck.length === 0) {
        if (p.trash.length === 0) break; // nothing left anywhere
        const res = shuffle(p.trash, this.state.rngState);
        this.state.rngState = res.state;
        p.deck = res.arr;
        p.trash = [];
      }
      const card = p.deck.shift();
      if (!card) break;
      p.hand.push(card);
      drew++;
    }
    if (drew > 0) this.state.fx.push({ kind: "draw", side });
  }

  *discard(side: Side, n: number, optional = false): EffectGen {
    const p = this.state.players[side];
    for (let i = 0; i < n; i++) {
      if (p.hand.length === 0) break;
      const res: ChoiceResponse = yield {
        kind: "hand",
        prompt: optional ? `Discard a card (optional)` : `Discard a card`,
        side,
        count: 1,
        candidates: p.hand.map((c) => c.uid),
        optional,
      };
      if (res.skip) break;
      const uid = res.cardId ?? res.cardIds?.[0];
      const idx = p.hand.findIndex((c) => c.uid === uid);
      if (idx < 0) break;
      const [card] = p.hand.splice(idx, 1);
      p.trash.push(card);
    }
  }

  /** Remove a card from the field into its owner's trash, then resolve any uncover trigger. */
  *deleteCard(card: CardInstance): EffectGen {
    const loc = locate(this.state, card.uid);
    if (!loc) return;
    const wasTop = loc.index === this.state.players[loc.side].stacks[loc.line].length - 1;
    this.state.players[loc.side].stacks[loc.line].splice(loc.index, 1);
    this.state.players[card.owner].trash.push(card);
    this.state.fx.push({ kind: "delete", side: loc.side, line: loc.line });
    if (wasTop) yield* this.onUncover(loc.side, loc.line);
  }

  *returnToHand(card: CardInstance): EffectGen {
    const loc = locate(this.state, card.uid);
    if (!loc) return;
    const wasTop = loc.index === this.state.players[loc.side].stacks[loc.line].length - 1;
    this.state.players[loc.side].stacks[loc.line].splice(loc.index, 1);
    card.faceUp = true; // returns to hand as a normal card
    this.state.players[card.owner].hand.push(card);
    if (wasTop) yield* this.onUncover(loc.side, loc.line);
  }

  *shiftCard(card: CardInstance): EffectGen {
    const loc = locate(this.state, card.uid);
    if (!loc) return;
    const dest = yield* this.chooseLine(loc.side, "Shift to which line?", loc.line);
    const wasTop = loc.index === this.state.players[loc.side].stacks[loc.line].length - 1;
    this.state.players[loc.side].stacks[loc.line].splice(loc.index, 1);
    this.state.players[loc.side].stacks[dest].push(card);
    if (wasTop) yield* this.onUncover(loc.side, loc.line);
  }

  *flip(card: CardInstance): EffectGen {
    card.faceUp = !card.faceUp;
    if (card.faceUp) {
      const def = getDef(card.defId);
      if (def.middle) yield* this.resolveMiddle(card);
    }
  }

  /** Resolve a card's immediate (middle) effect as a nested chain controlled by the active player. */
  *resolveMiddle(card: CardInstance): EffectGen {
    if (this.depth >= MAX_UNCOVER_DEPTH) return;
    const def = getDef(card.defId);
    if (!def.middle) return;
    const nested = new Effects(this.state, this.self, this.depth + 1);
    yield* def.middle(nested);
  }

  /** When the top card of a stack leaves, the newly exposed card (if face-up) resolves its middle. */
  private *onUncover(side: Side, line: number): EffectGen {
    if (this.depth >= MAX_UNCOVER_DEPTH) return;
    const top = topOf(this.state.players[side], line);
    if (top && top.faceUp) {
      const def = getDef(top.defId);
      if (def.middle) {
        const nested = new Effects(this.state, this.self, this.depth + 1);
        yield* def.middle(nested);
      }
    }
  }

  *chooseTarget(spec: TargetSpec): Generator<ChoiceRequest, CardInstance | null, ChoiceResponse> {
    const cands = uncoveredTargets(this.state, {
      side: spec.side ?? "any",
      self: this.self,
      faceUp: spec.faceUp,
      faceDown: spec.faceDown,
      excludeUid: spec.excludeUid,
    });
    if (cands.length === 0) return null;
    if (cands.length === 1 && !spec.optional) return cands[0];
    const res: ChoiceResponse = yield {
      kind: "target",
      prompt: spec.prompt ?? "Choose a target card",
      candidates: cands.map((c) => c.uid),
      optional: spec.optional,
    };
    if (res.skip || !res.cardId) return null;
    return cands.find((c) => c.uid === res.cardId) ?? null;
  }

  *chooseLine(side: Side, prompt: string, exclude?: number): Generator<ChoiceRequest, number, ChoiceResponse> {
    const candidates = [0, 1, 2].filter((l) => l !== exclude);
    if (candidates.length === 1) return candidates[0];
    const res: ChoiceResponse = yield { kind: "line", prompt, side, candidates };
    return res.line ?? candidates[0];
  }

  *yesno(prompt: string): Generator<ChoiceRequest, boolean, ChoiceResponse> {
    const res: ChoiceResponse = yield { kind: "yesno", prompt };
    return !!res.yes;
  }
}

// Tiny helper so `opponent()` (typed for Side) accepts our self field cleanly.
function self0(s: Side): Side {
  return s;
}
