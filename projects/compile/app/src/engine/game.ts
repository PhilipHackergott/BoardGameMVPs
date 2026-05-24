// Game setup, the draft, the turn-flow generator, and the Engine that drives it.
//
// THE TURN, as a single generator (turnGen). Every decision — including the action itself — is a
// `yield`ed ChoiceRequest. The Engine pumps the generator: when the deciding player is the AI it
// answers immediately (ai.ts); when it's the human it parks the request on state.pending and waits
// for submitChoice(). This is the whole control flow. The rulebook turn order is the body of
// turnGen: Start → Check Control → Check Compile → Action → Check Cache → End.

import {
  ActionChoice,
  AITier,
  CardInstance,
  ChoiceRequest,
  ChoiceResponse,
  COMPILE_THRESHOLD,
  GameState,
  HAND_SIZE,
  nextUid,
  PlayerState,
  PlayOption,
  ProtocolName,
  PROTOCOLS,
  Side,
} from "./types";
import { getDef, protocolDefIds } from "./cards";
import {
  compilableLines,
  hasWon,
  lineValue,
  linesLed,
  locate,
  opponent,
  uncovered,
} from "./field";
import { Effects } from "./effects";
import { seedFromString, shuffle } from "./rng";
import { aiAnswer, aiDraftPick } from "./ai";

export interface NewGameOpts {
  seed?: string;
  p0: { name: string; tier: AITier };
  p1: { name: string; tier: AITier };
  useControl?: boolean;
}

function emptyPlayer(opts: { name: string; tier: AITier }): PlayerState {
  return {
    protocols: [
      { protocol: "Spirit", compiled: false },
      { protocol: "Spirit", compiled: false },
      { protocol: "Spirit", compiled: false },
    ],
    stacks: [[], [], []],
    deck: [],
    hand: [],
    trash: [],
    isAI: opts.tier !== "human",
    aiTier: opts.tier,
    name: opts.name,
  };
}

/** Create a game in the draft phase. The draft sequence is fixed (1-2-2-1); P0 drafts first and
 *  will be first player. */
export function newGame(opts: NewGameOpts): GameState {
  const seed = opts.seed ?? String(Math.floor(Math.random() * 1e9));
  const state: GameState = {
    phase: "draft",
    players: [emptyPlayer(opts.p0), emptyPlayer(opts.p1)],
    turn: 0,
    firstPlayer: 0,
    step: "start",
    control: -1,
    useControl: opts.useControl ?? true,
    compilableLines: [],
    pending: null,
    winner: null,
    rngState: seedFromString(seed),
    seedLabel: seed,
    log: [],
    draft: {
      pool: PROTOCOLS.slice(),
      order: [
        { side: 0, count: 1 },
        { side: 1, count: 2 },
        { side: 0, count: 2 },
        { side: 1, count: 1 },
      ],
      step: 0,
      assigned: [0, 0],
    },
    rev: 0,
    fx: [],
  };
  return state;
}

/** Whose pick it is in the draft, or null if the draft is complete. */
export function draftTurn(state: GameState): { side: Side; remaining: number } | null {
  const d = state.draft;
  if (!d) return null;
  if (d.step >= d.order.length) return null;
  return { side: d.order[d.step].side, remaining: d.order[d.step].count };
}

/** Apply a single protocol pick for the current drafter, advancing the draft. */
export function draftPick(state: GameState, protocol: ProtocolName): void {
  const d = state.draft;
  if (!d) return;
  const cur = d.order[d.step];
  if (!cur) return;
  const idx = d.pool.indexOf(protocol);
  if (idx < 0) return;
  d.pool.splice(idx, 1);
  // assign to the next empty protocol slot for that side (in draft order)
  const p = state.players[cur.side];
  const assigned = d.assigned[cur.side];
  p.protocols[assigned] = { protocol, compiled: false };
  d.assigned[cur.side] += 1;
  // advance the order step
  cur.count -= 1;
  if (cur.count <= 0) d.step += 1;
  state.rev++;
  if (draftTurn(state) === null) finalizeDraft(state);
}

function buildDeck(state: GameState, side: Side): void {
  const p = state.players[side];
  const ids: string[] = [];
  for (const slot of p.protocols) ids.push(...protocolDefIds(slot.protocol));
  const instances: CardInstance[] = ids.map((defId) => ({
    uid: nextUid(),
    defId,
    protocol: getDef(defId).protocol,
    faceUp: false,
    owner: side,
  }));
  const res = shuffle(instances, state.rngState);
  state.rngState = res.state;
  p.deck = res.arr;
}

function finalizeDraft(state: GameState): void {
  state.draft = null;
  for (const side of [0, 1] as Side[]) {
    buildDeck(state, side);
    const p = state.players[side];
    for (let i = 0; i < HAND_SIZE; i++) {
      const c = p.deck.shift();
      if (c) p.hand.push(c);
    }
  }
  state.phase = "turn";
  state.turn = state.firstPlayer;
  state.step = "start";
  state.log.push({ side: null, text: "Draft complete. Compile your three protocols to win." });
  state.rev++;
}

// --- Legal actions ----------------------------------------------------------------------------

function matchingLine(p: PlayerState, protocol: ProtocolName): number {
  return p.protocols.findIndex((s) => s.protocol === protocol);
}

/** Is a persistent passive flag active for a side (any face-up card with the flag, covered or not)? */
export function passiveActive(state: GameState, side: Side, key: "playAnyProtocol"): boolean {
  const p = state.players[side];
  for (const stack of p.stacks) {
    for (const ci of stack) {
      if (ci.faceUp && getDef(ci.defId).passive?.[key]) return true;
    }
  }
  return false;
}

/** Every legal play (and whether refresh is allowed) for a side during the action step. */
export function legalActions(state: GameState, side: Side): { plays: PlayOption[]; canRefresh: boolean } {
  const p = state.players[side];
  const plays: PlayOption[] = [];
  const anyProto = passiveActive(state, side, "playAnyProtocol");
  for (const card of p.hand) {
    // face-down into any line
    for (let line = 0; line < 3; line++) plays.push({ uid: card.uid, faceUp: false, line });
    // face-up into matching line (or any, with the Spirit-style passive)
    if (anyProto) {
      for (let line = 0; line < 3; line++) plays.push({ uid: card.uid, faceUp: true, line });
    } else {
      const ml = matchingLine(p, card.protocol);
      if (ml >= 0) plays.push({ uid: card.uid, faceUp: true, line: ml });
    }
  }
  return { plays, canRefresh: p.hand.length < HAND_SIZE };
}

// --- The turn flow generator ------------------------------------------------------------------

type Gen = Generator<ChoiceRequest, void, ChoiceResponse>;

export function* runTriggers(state: GameState, side: Side, when: "start" | "end"): Gen {
  // Triggers fire from the side's uncovered, face-up cards. Active player orders them; we use line
  // order 0,1,2 for determinism.
  for (let line = 0; line < 3; line++) {
    const top = uncovered(state.players[side], line);
    if (!top || !top.faceUp) continue;
    const def = getDef(top.defId);
    if (def.trigger === when && def.triggerEffect) {
      const fx = new Effects(state, side);
      yield* def.triggerEffect(fx);
    }
  }
}

function checkControl(state: GameState, side: Side): void {
  if (!state.useControl) return;
  if (linesLed(state, side) >= 2 && state.control !== side) {
    state.control = side;
    state.fx.push({ kind: "control", side });
    state.log.push({ side, text: `${state.players[side].name} seizes CONTROL.` });
  }
}

/** When you compile or refresh while holding control: control returns to neutral, then you MAY
 *  rearrange one player's protocol headers (stacks stay put). */
function* controlRearrange(state: GameState, side: Side): Gen {
  if (!state.useControl || state.control !== side) return;
  state.control = -1;
  state.fx.push({ kind: "control", side: -1 });
  const res: ChoiceResponse = yield { kind: "rearrange", prompt: "You hold CONTROL — rearrange protocols?" };
  if (res.skip || !res.order || res.order.length !== 3) return;
  const target = (res.rearrangeSide ?? side) as Side;
  const p = state.players[target];
  const old = p.protocols.slice();
  const order = res.order;
  // order must be a permutation of [0,1,2] and actually change something
  const valid = [0, 1, 2].every((i) => order.includes(i));
  if (!valid) return;
  p.protocols = [old[order[0]], old[order[1]], old[order[2]]] as PlayerState["protocols"];
  state.log.push({ side, text: `${state.players[side].name} rearranges ${p.name}'s protocols.` });
}

function* doCompile(state: GameState, side: Side, line: number): Gen {
  const me = state.players[side];
  const them = state.players[opponent(side)];
  // delete all cards in that line on both sides (no uncover triggers: the whole stack leaves)
  for (const ci of me.stacks[line]) me.trash.push(ci);
  for (const ci of them.stacks[line]) them.trash.push(ci);
  me.stacks[line] = [];
  them.stacks[line] = [];
  state.fx.push({ kind: "compile", side, line });

  const slot = me.protocols[line];
  if (slot.compiled) {
    // recompile: steal the top of the opponent's deck instead of flipping
    if (them.deck.length === 0 && them.trash.length > 0) {
      const r = shuffle(them.trash, state.rngState);
      state.rngState = r.state;
      them.deck = r.arr;
      them.trash = [];
    }
    const stolen = them.deck.shift();
    if (stolen) {
      stolen.owner = side;
      stolen.faceUp = false;
      me.hand.push(stolen);
      state.log.push({ side, text: `${me.name} recompiles line ${line + 1} and steals a card.` });
    }
  } else {
    slot.compiled = true;
    state.log.push({ side, text: `${me.name} COMPILES ${slot.protocol}!` });
  }

  if (hasWon(me)) {
    state.winner = side;
    state.phase = "gameover";
    state.fx.push({ kind: "win", side });
    return;
  }
  yield* controlRearrange(state, side);
}

export function* doRefresh(state: GameState, side: Side): Gen {
  const p = state.players[side];
  const eff = new Effects(state, side);
  const need = HAND_SIZE - p.hand.length;
  if (need > 0) eff.draw(side, need);
  state.log.push({ side, text: `${p.name} refreshes.` });
  yield* controlRearrange(state, side);
}

export function* doPlay(state: GameState, side: Side, act: Extract<ActionChoice, { type: "play" }>): Gen {
  const p = state.players[side];
  const idx = p.hand.findIndex((c) => c.uid === act.uid);
  if (idx < 0) return;
  const [card] = p.hand.splice(idx, 1);
  card.faceUp = act.faceUp;
  p.stacks[act.line].push(card);
  state.fx.push({ kind: "play", side, line: act.line, faceUp: act.faceUp });
  state.log.push({
    side,
    text: `${p.name} plays ${act.faceUp ? getDef(card.defId).protocol + " " + getDef(card.defId).value : "a card face-down"} in line ${act.line + 1}.`,
  });
  if (act.faceUp) {
    const def = getDef(card.defId);
    if (def.middle) {
      const eff = new Effects(state, side);
      yield* def.middle(eff);
    }
  }
}

export function* clearCache(state: GameState, side: Side): Gen {
  const p = state.players[side];
  const over = p.hand.length - HAND_SIZE;
  if (over <= 0) return;
  const eff = new Effects(state, side);
  yield* eff.discard(side, over, false);
}

/** A full turn for `side`. Stops the game if a compile wins. */
export function* turnGen(state: GameState, side: Side): Gen {
  state.step = "start";
  yield* runTriggers(state, side, "start");
  if (state.winner !== null) return;

  state.step = "control";
  checkControl(state, side);

  state.step = "compile";
  const lines = compilableLines(state, side);
  state.compilableLines = lines;
  if (lines.length > 0) {
    let line = lines[0];
    if (lines.length > 1) {
      const res: ChoiceResponse = yield {
        kind: "compileLine",
        prompt: "You must compile — choose a line",
        candidates: lines,
      };
      line = lines.includes(res.line ?? lines[0]) ? (res.line as number) : lines[0];
    }
    yield* doCompile(state, side, line);
    if (state.winner !== null) return;
  } else {
    state.step = "action";
    const { canRefresh } = legalActions(state, side);
    const res: ChoiceResponse = yield { kind: "action", prompt: "Play a card or refresh", canRefresh };
    const act = res.action ?? { type: "refresh" };
    if (act.type === "refresh" && canRefresh) {
      yield* doRefresh(state, side);
    } else if (act.type === "play") {
      yield* doPlay(state, side, act);
    } else {
      // fallback: must play if can't refresh — play the first legal option
      const opt = legalActions(state, side).plays[0];
      if (opt) yield* doPlay(state, side, { type: "play", ...opt });
    }
  }

  state.step = "cache";
  yield* clearCache(state, side);

  state.step = "end";
  yield* runTriggers(state, side, "end");
}

// --- The Engine: drives turnGen, parks human choices, hands AI choices to ai.ts ---------------

export class Engine {
  state: GameState;
  private gen: Gen | null = null;
  /** True when it's the AI's turn and the UI should pace it (call runAITurn after a beat). */
  awaitingAI = false;
  /** The AI's most recent draft pick, for the UI to highlight/announce. */
  lastDraftPick: { side: Side; protocol: ProtocolName } | null = null;

  constructor(state: GameState) {
    this.state = state;
  }

  static create(opts: NewGameOpts): Engine {
    return new Engine(newGame(opts));
  }

  private currentIsAI(): boolean {
    return this.state.players[this.state.turn].isAI;
  }

  /** Begin play once the draft is done (or resume after a turn). */
  beginPlay(): void {
    if (this.state.phase !== "turn") return;
    this.beginCurrentTurn();
  }

  /** A single human draft pick. The UI then paces any following AI picks via aiDraftStep(). */
  draftPick(protocol: ProtocolName): void {
    if (this.state.phase !== "draft") return;
    draftPick(this.state, protocol);
  }

  /** Perform exactly ONE AI draft pick, if the current drafter is an AI. Returns the pick (so the
   *  UI can pace + animate one at a time), or null if it's a human's pick / draft is done. */
  aiDraftStep(): ProtocolName | null {
    const dt = draftTurn(this.state);
    if (!dt || !this.state.players[dt.side].isAI || this.state.phase !== "draft") return null;
    const pick = aiDraftPick(this.state, dt.side);
    draftPick(this.state, pick);
    this.lastDraftPick = { side: dt.side, protocol: pick };
    return pick;
  }

  /** Headless full draft (used by tests and AI-vs-AI sims): run all remaining picks at once. */
  autoDraft(): void {
    let dt = draftTurn(this.state);
    while (dt && this.state.players[dt.side].isAI && this.state.phase === "draft") {
      draftPick(this.state, aiDraftPick(this.state, dt.side));
      dt = draftTurn(this.state);
    }
    if (this.state.phase === "turn") this.beginCurrentTurn();
  }

  private beginCurrentTurn(): void {
    if (this.state.winner !== null) return;
    this.state.step = "start";
    if (this.currentIsAI()) {
      this.awaitingAI = true;
      return;
    }
    this.gen = turnGen(this.state, this.state.turn);
    this.pump();
  }

  /** Called by the UI after a delay when awaitingAI is true. Runs the AI's whole turn. */
  runAITurn(): void {
    if (!this.awaitingAI || this.state.winner !== null) return;
    this.awaitingAI = false;
    this.gen = turnGen(this.state, this.state.turn);
    this.pump();
  }

  private pump(input?: ChoiceResponse): void {
    if (!this.gen) return;
    const r = input === undefined ? this.gen.next() : this.gen.next(input);
    this.state.rev++;
    if (r.done) {
      this.gen = null;
      this.state.pending = null;
      this.onTurnComplete();
      return;
    }
    const req = r.value;
    if (this.currentIsAI()) {
      const resp = aiAnswer(this.state, req);
      this.pump(resp);
    } else {
      this.state.pending = { request: req, decider: this.state.turn };
    }
  }

  private onTurnComplete(): void {
    if (this.state.winner !== null) return;
    this.state.turn = opponent(this.state.turn);
    this.beginCurrentTurn();
  }

  /** Resume a parked human decision. */
  submitChoice(res: ChoiceResponse): void {
    if (!this.gen || !this.state.pending) return;
    this.state.pending = null;
    this.pump(res);
  }

  /** Convenience the human UI calls during the action step. */
  playAction(act: ActionChoice): void {
    if (this.state.pending?.request.kind !== "action") return;
    this.submitChoice({ action: act });
  }
}

// re-export helpers used by the UI / AI
export { compilableLines, lineValue, linesLed, uncovered, locate, opponent, COMPILE_THRESHOLD };
