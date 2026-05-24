// The AI opponents. Three tiers share one decision surface: aiAnswer() responds to every
// ChoiceRequest the turn generator can raise, and aiDraftPick() handles the draft.
//
//   easy   — plays a (lightly biased) random legal move; random sub-choices. Beatable, makes blunders.
//   medium — 1-ply search: clones the state, simulates each candidate action (and its effects) to
//            the end of the turn, scores the result, picks the best. Solid, occasionally short-sighted.
//   hard   — same search with a sharper evaluation (weights opponent compile threats, control, and
//            tempo more) and a wider, deterministic sub-choice policy. Punishing.
//
// Simulation runs on a structuredClone of GameState (no functions live on the state — card effects
// are looked up by id), driving the SAME generators the real game uses, with sub-choices answered
// by a cheap static policy so the lookahead reflects competent (not recursive) play.

import {
  ActionChoice,
  CardInstance,
  ChoiceRequest,
  ChoiceResponse,
  GameState,
  ProtocolName,
  Side,
} from "./types";
import { getDef } from "./cards";
import { cardValue, compilableLines, hasWon, lineValue, opponent } from "./field";
import { rngNext } from "./rng";
import { clearCache, doPlay, doRefresh, legalActions, runTriggers } from "./game";

type Gen = Generator<ChoiceRequest, void, ChoiceResponse>;

function tierOf(state: GameState): GameState["players"][number]["aiTier"] {
  return state.players[state.turn].aiTier;
}

function rand(state: GameState): number {
  const r = rngNext(state.rngState);
  state.rngState = r.state;
  return r.value;
}

// --- Public entry points ----------------------------------------------------------------------

export function aiAnswer(state: GameState, req: ChoiceRequest): ChoiceResponse {
  const side = state.turn;
  const tier = tierOf(state);
  switch (req.kind) {
    case "action":
      return { action: chooseAction(state, side, tier, req.canRefresh) };
    case "compileLine":
      return { line: chooseCompileLine(state, side, req.candidates) };
    case "rearrange":
      return chooseRearrange(side, tier);
    default:
      return cheapAnswer(state, side, req);
  }
}

export function aiDraftPick(state: GameState, side: Side): ProtocolName {
  const pool = state.draft?.pool ?? [];
  if (pool.length === 0) return "Spirit";
  const tier = state.players[side].aiTier;
  if (tier === "easy") return pool[Math.floor(rand(state) * pool.length)];
  // medium/hard: mild preference for protocols whose cards carry more raw value + an effect.
  let best = pool[0];
  let bestScore = -Infinity;
  for (const proto of pool) {
    let s = 0;
    for (let v = 0; v < 6; v++) {
      const def = getDef(`${proto}-${v}`);
      s += def.value + (def.middle ? 1 : 0) + (def.passive ? 1 : 0);
    }
    s += rand(state) * 1.5; // light jitter so the draft varies
    if (s > bestScore) {
      bestScore = s;
      best = proto;
    }
  }
  return best;
}

// --- Action selection -------------------------------------------------------------------------

function chooseAction(
  state: GameState,
  side: Side,
  tier: GameState["players"][number]["aiTier"],
  canRefresh: boolean,
): ActionChoice {
  const { plays } = legalActions(state, side);
  if (plays.length === 0) return { type: "refresh" };

  if (tier === "easy") return chooseActionEasy(state, plays, canRefresh);

  // medium / hard: simulate each candidate to end of turn and score.
  const candidates: ActionChoice[] = plays.map((p) => ({ type: "play", uid: p.uid, faceUp: p.faceUp, line: p.line }));
  if (canRefresh) candidates.push({ type: "refresh" });

  let best = candidates[0];
  let bestScore = -Infinity;
  for (const act of candidates) {
    const clone = cloneState(state);
    simulateAction(clone, side, act);
    let score = evalState(clone, side, tier);
    // tiny anti-dither jitter, deterministic via rng
    score += rand(state) * 0.01;
    if (score > bestScore) {
      bestScore = score;
      best = act;
    }
  }
  return best;
}

function chooseActionEasy(
  state: GameState,
  plays: { uid: string; faceUp: boolean; line: number }[],
  canRefresh: boolean,
): ActionChoice {
  // 15% of the time, refresh if allowed (keeps easy from hoarding / stalling oddly).
  if (canRefresh && rand(state) < 0.15) return { type: "refresh" };
  // Prefer a face-up play 60% of the time when one exists.
  const faceUps = plays.filter((p) => p.faceUp);
  const pool = faceUps.length > 0 && rand(state) < 0.6 ? faceUps : plays;
  const pick = pool[Math.floor(rand(state) * pool.length)];
  return { type: "play", uid: pick.uid, faceUp: pick.faceUp, line: pick.line };
}

function chooseCompileLine(state: GameState, side: Side, candidates: number[]): number {
  // compile the line with the biggest lead (most decisive), preferring an uncompiled protocol.
  let best = candidates[0];
  let bestScore = -Infinity;
  for (const line of candidates) {
    const lead = lineValue(state.players[side], line) - lineValue(state.players[opponent(side)], line);
    const fresh = state.players[side].protocols[line].compiled ? -5 : 5;
    const s = lead + fresh;
    if (s > bestScore) {
      bestScore = s;
      best = line;
    }
  }
  return best;
}

function chooseRearrange(side: Side, tier: GameState["players"][number]["aiTier"]): ChoiceResponse {
  if (tier !== "hard") return { skip: true };
  // Hard: rotate the opponent's protocol headers so their tallest stack no longer matches its
  // protocol (a light disruption). Only do it if it actually changes the order.
  const opp = opponent(side);
  const order = [2, 0, 1]; // a fixed non-identity rotation
  return { rearrangeSide: opp, order };
}

// --- Cheap sub-choice policy (used live and inside simulation) --------------------------------

function cheapAnswer(state: GameState, side: Side, req: ChoiceRequest): ChoiceResponse {
  switch (req.kind) {
    case "target": {
      const cands = req.candidates;
      if (cands.length === 0) return { skip: true };
      // Score each candidate: hurting an opponent's high card is good; flipping our own low/
      // face-down card up is good. Pick the highest-scoring; skip only if optional and all bad.
      let bestId = cands[0];
      let bestScore = -Infinity;
      for (const uid of cands) {
        const found = findCard(state, uid);
        if (!found) continue;
        const v = cardValue(found.card);
        const isOpp = found.side !== side;
        // disruptive on opp (delete/flip/return/shift) scales with their value;
        // beneficial on self scales with how much flipping helps (face-down -> face-up).
        const score = isOpp ? v + 1 : found.card.faceUp ? -v : 3;
        if (score > bestScore) {
          bestScore = score;
          bestId = uid;
        }
      }
      if (req.optional && bestScore < 0) return { skip: true };
      return { cardId: bestId };
    }
    case "line": {
      // shift destination: choose the line where this side currently has the least value (spread
      // out) — a neutral-to-helpful default.
      const cands = req.candidates;
      let best = cands[0];
      let bestVal = Infinity;
      for (const l of cands) {
        const v = lineValue(state.players[req.side], l);
        if (v < bestVal) {
          bestVal = v;
          best = l;
        }
      }
      return { line: best };
    }
    case "yesno": {
      // discard-for-effect style: say yes if we have spare cards in hand.
      return { yes: state.players[side].hand.length > 2 };
    }
    case "hand": {
      // discard the lowest-value card in hand.
      const hand = state.players[req.side].hand;
      if (hand.length === 0) return { skip: true };
      let worst = hand[0];
      for (const c of hand) if (getDef(c.defId).value < getDef(worst.defId).value) worst = c;
      return { cardId: worst.uid };
    }
    case "rearrange":
      return { skip: true };
    default:
      return {};
  }
}

// --- Simulation + evaluation ------------------------------------------------------------------

function cloneState(state: GameState): GameState {
  // structuredClone is safe: GameState carries only plain data (effects are resolved via the card
  // registry keyed by defId). Drop transient fields.
  const c = structuredClone({ ...state, pending: null, fx: [], log: [] }) as GameState;
  return c;
}

/** Run an action's tail (the chosen play/refresh + cache + end triggers) on a cloned state. */
function simulateAction(state: GameState, side: Side, act: ActionChoice): void {
  function* tail(): Gen {
    if (act.type === "refresh") {
      yield* doRefresh(state, side);
    } else {
      yield* doPlay(state, side, act);
    }
    state.step = "cache";
    yield* clearCache(state, side);
    state.step = "end";
    yield* runTriggers(state, side, "end");
  }
  driveCheap(state, side, tail());
}

function driveCheap(state: GameState, side: Side, gen: Gen): void {
  let res = gen.next();
  let guard = 0;
  while (!res.done && guard++ < 200) {
    res = gen.next(cheapAnswer(state, side, res.value));
  }
}

/** Heuristic value of a state from `side`'s perspective. Higher is better. */
function evalState(state: GameState, side: Side, tier: GameState["players"][number]["aiTier"]): number {
  const me = state.players[side];
  const them = state.players[opponent(side)];
  if (state.winner === side || hasWon(me)) return 1e6;
  if (state.winner === opponent(side) || hasWon(them)) return -1e6;

  const hard = tier === "hard";
  let s = 0;

  const myCompiled = me.protocols.filter((p) => p.compiled).length;
  const oppCompiled = them.protocols.filter((p) => p.compiled).length;
  s += (myCompiled - oppCompiled) * 120;

  // Lines I am forced to compile next turn are nearly-banked points.
  const myReady = compilableLines(state, side).length;
  const oppReady = compilableLines(state, opponent(side)).length;
  s += myReady * 22;
  s -= oppReady * (hard ? 30 : 18);

  for (let line = 0; line < 3; line++) {
    const mv = lineValue(me, line);
    const ov = lineValue(them, line);
    s += Math.min(mv, 11) * 1.4; // progress toward the 10 threshold (slight overshoot allowed)
    if (mv > ov) s += hard ? 3 : 2; // leading the line helps control + compiles
    // discourage piling far past 10 on an already-compiled protocol (wasted value)
    if (me.protocols[line].compiled && mv > 10) s -= (mv - 10) * 0.5;
  }

  // control component: leading >=2 lines is how you grab it; value the lead count.
  const myLead = [0, 1, 2].filter((l) => lineValue(me, l) > lineValue(them, l)).length;
  if (myLead >= 2) s += hard ? 8 : 5;
  if (state.control === side) s += 3;

  // resources: cards in hand are options; an empty deck+trash is a soft danger.
  s += me.hand.length * 0.6;
  if (hard) s -= them.hand.length * 0.3;

  return s;
}

function findCard(state: GameState, uid: string): { card: CardInstance; side: Side } | null {
  for (const ss of [0, 1] as Side[]) {
    for (let line = 0; line < 3; line++) {
      const stack = state.players[ss].stacks[line];
      if (stack.length && stack[stack.length - 1].uid === uid) {
        return { card: stack[stack.length - 1], side: ss };
      }
    }
  }
  return null;
}
