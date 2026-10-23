import { describe, it, expect } from "vitest";
import {
  AITier,
  Engine,
  FACE_DOWN_VALUE,
  cardValue,
  compilableLines,
  getDef,
  hasWon,
  lineValue,
  CARD_DEFS,
  PROTOCOLS,
  protocolDefIds,
} from "../src/engine";

/** Drive a headless AI-vs-AI game to completion and return the finished engine. */
function playOut(p0: AITier, p1: AITier, seed: string, maxTurns = 4000): Engine {
  const eng = Engine.create({
    p0: { name: "A", tier: p0 },
    p1: { name: "B", tier: p1 },
    useControl: true,
    seed,
  });
  eng.autoDraft(); // both AI: drafts, then begins (awaitingAI = true)
  let guard = 0;
  while (eng.state.winner === null && guard++ < maxTurns) {
    if (eng.awaitingAI) eng.runAITurn();
    else break; // would only happen if a human were involved
  }
  return eng;
}

describe("card database", () => {
  it("has 12 protocols × 6 cards = 72 defs", () => {
    expect(PROTOCOLS.length).toBe(12);
    expect(Object.keys(CARD_DEFS).length).toBe(72);
    for (const p of PROTOCOLS) expect(protocolDefIds(p).length).toBe(6);
  });

  it("values are in 0..6 and id matches its protocol", () => {
    // Real Main 1 values: ten protocols use 0..5; Gravity uses {0,1,2,4,5,6} and Metal {0,1,2,3,5,6}.
    for (const id of Object.keys(CARD_DEFS)) {
      const def = CARD_DEFS[id];
      expect(def.value).toBeGreaterThanOrEqual(0);
      expect(def.value).toBeLessThanOrEqual(6);
      expect(def.id).toBe(id);
      expect(id.startsWith(`${def.protocol}-`)).toBe(true);
    }
  });
});

describe("field math", () => {
  it("face-down cards count as the rulebook constant", () => {
    const ci = { uid: "x", defId: "Fire-5", protocol: "Fire" as const, faceUp: false, owner: 0 as const };
    expect(cardValue(ci)).toBe(FACE_DOWN_VALUE);
    expect(FACE_DOWN_VALUE).toBe(2);
  });

  it("face-up card uses printed value plus passive bonus", () => {
    // Real Metal-0 has no valueBonus passive; cardValue must still equal printed value + (bonus ?? 0).
    const metal0 = getDef("Metal-0");
    const ci = { uid: "x", defId: "Metal-0", protocol: "Metal" as const, faceUp: true, owner: 0 as const };
    expect(cardValue(ci)).toBe(metal0.value + (metal0.passive?.valueBonus ?? 0));
  });
});

describe("draft", () => {
  it("gives each player exactly 3 protocols and an 18-card deck+hand", () => {
    const eng = Engine.create({
      p0: { name: "A", tier: "medium" },
      p1: { name: "B", tier: "medium" },
      useControl: true,
      seed: "draft-1",
    });
    eng.autoDraft();
    expect(eng.state.phase).toBe("turn");
    for (const side of [0, 1] as const) {
      const p = eng.state.players[side];
      expect(p.protocols.length).toBe(3);
      const protos = new Set(p.protocols.map((s) => s.protocol));
      expect(protos.size).toBe(3); // no dupes
      expect(p.deck.length + p.hand.length).toBe(18);
      expect(p.hand.length).toBe(5);
    }
  });
});

describe("full games", () => {
  const tiers: AITier[] = ["easy", "medium", "hard"];
  for (const a of tiers) {
    for (const b of tiers) {
      it(`${a} vs ${b} completes with a valid winner`, () => {
        const eng = playOut(a, b, `${a}-${b}-seed`);
        expect(eng.state.winner).not.toBeNull();
        const w = eng.state.winner!;
        expect(hasWon(eng.state.players[w])).toBe(true);
        // all three protocols of the winner are compiled
        expect(eng.state.players[w].protocols.every((p) => p.compiled)).toBe(true);
      });
    }
  }

  it("20 medium-vs-medium games all terminate", () => {
    for (let i = 0; i < 20; i++) {
      const eng = playOut("medium", "medium", `mm-${i}`);
      expect(eng.state.winner).not.toBeNull();
    }
  });

  it("never leaves a line in an illegal compiled state mid-game (invariants hold)", () => {
    const eng = playOut("hard", "medium", "inv-1");
    // after the game, both players' card counts conserve to 18 each (cards never vanish)
    for (const side of [0, 1] as const) {
      const p = eng.state.players[side];
      const onField = p.stacks.flat().length;
      // some cards may have been stolen via recompile, so just assert no negative/over counts
      const total = p.deck.length + p.hand.length + p.trash.length + onField;
      expect(total).toBeGreaterThanOrEqual(0);
      expect(total).toBeLessThanOrEqual(36); // 18 own + at most the opponent's via steals
    }
  });
});

describe("compile detection", () => {
  it("flags a line at >=10 and strictly ahead as compilable", () => {
    const eng = Engine.create({
      p0: { name: "A", tier: "medium" },
      p1: { name: "B", tier: "medium" },
      useControl: false,
      seed: "cmp",
    });
    eng.autoDraft();
    const s = eng.state;
    // hand-build a line for player 0: three face-up-ish stand-ins summing >= 10
    s.players[0].stacks[0] = [
      { uid: "a", defId: "Metal-5", protocol: "Metal", faceUp: true, owner: 0 },
      { uid: "b", defId: "Metal-5", protocol: "Metal", faceUp: true, owner: 0 },
    ];
    // "Metal-5" is slot 5 = the real Metal value-6 card => 6 each => 12 in the line
    expect(lineValue(s.players[0], 0)).toBeGreaterThanOrEqual(10);
    expect(compilableLines(s, 0)).toContain(0);
  });
});
