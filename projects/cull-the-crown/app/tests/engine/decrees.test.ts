import { describe, expect, it } from "vitest";
import { applyAction, createRun, DEFAULT_CONFIG } from "../../src/engine/run";
import { counterIncoming, effectiveAttack } from "../../src/engine/combat";
import { decreeById } from "../../src/engine/content";
import { enemyIntent, previewPlay } from "../../src/engine/index";
import { Card, CombatState, Enemy, RunState, Suit } from "../../src/engine/types";

const num = (id: string, suit: Suit, value: number): Card => ({ id, suit, value, kind: "number" });

function enemy(suit: Suit, over: Partial<Enemy> = {}): Enemy {
  return {
    tier: "jack",
    suit,
    maxHealth: 20,
    attack: 10,
    damageTaken: 0,
    shield: 0,
    immunityCancelled: false,
    decreeId: null,
    decreeParam: null,
    ...over,
  };
}
function combat(e: Enemy, over: Partial<CombatState> = {}): CombatState {
  return { enemy: e, subphase: "play", incoming: 0, firstAttackDone: false, yieldedLastTurn: false, outcome: null, wonExact: false, lastSuits: [], ...over };
}
function mkRun(over: Partial<RunState>): RunState {
  return {
    config: DEFAULT_CONFIG, deckId: "royal", stakeId: "white", seedLabel: "t", rngState: 12345, deck: [], hand: [], discard: [], table: [],
    gold: 0, slots: [], suitUpgrades: { H: 0, D: 0, C: 0, S: 0 }, castle: [enemy("H")], enemyIndex: 0,
    combat: combat(enemy("H")), shop: null, phase: "combat", notice: null, log: [], fightsWon: 0, exactKills: 0, goldEarned: 0,
    held: [], removeUses: 0, cardSeq: 0, actEdictsTaken: [], deckBaseline: 40,
    styleLevels: { twoHanded: 0, swordShield: 0, spear: 0, dualWield: 0, mage: 0, mounted: 0 },
    ...over,
  };
}

describe("decree assignment (createRun)", () => {
  it("the first royal is decree-free; every later royal carries a known decree", () => {
    const run = createRun("decree-seed");
    expect(run.castle[0].decreeId).toBeNull();
    for (const e of run.castle.slice(1)) {
      expect(typeof e.decreeId).toBe("string");
      expect(decreeById(e.decreeId)).toBeTruthy();
    }
  });
  it("Kings escalate (enrage fields set)", () => {
    const run = createRun("decree-seed");
    for (const k of run.castle.filter((e) => e.tier === "king")) {
      expect(k.enrageAtPct).toBe(0.5);
      expect(k.enrageAttackBonus).toBeGreaterThan(0);
    }
  });
  it("is deterministic for a seed", () => {
    const a = createRun("zz").castle.map((e) => `${e.decreeId}:${e.decreeParam ?? ""}`);
    const b = createRun("zz").castle.map((e) => `${e.decreeId}:${e.decreeParam ?? ""}`);
    expect(a).toEqual(b);
  });
});

describe("The Executioner — strikes ignore shield", () => {
  it("the counter is the full attack despite accumulated shield", () => {
    const e = enemy("H", { decreeId: "executioner", attack: 10, maxHealth: 100 });
    let run = mkRun({ hand: [num("s5", "S", 5), num("h6", "H", 6), num("h6b", "H", 6)], castle: [e], combat: combat(e) });
    run = applyAction(run, { type: "play", cardIds: ["s5"] }); // shield 5
    expect(run.combat!.enemy.shield).toBe(5);
    expect(run.combat!.incoming).toBe(10); // ignores the 5 shield (would be 5 without the decree)
  });
});

describe("The Vampire King — self-heals from its blow", () => {
  it("heals half the incoming once the player covers it", () => {
    const e = enemy("H", { decreeId: "vampire", attack: 10, maxHealth: 100 });
    let run = mkRun({ hand: [num("c8", "C", 8), num("s6", "S", 6), num("s6b", "S", 6)], castle: [e], combat: combat(e) });
    run = applyAction(run, { type: "play", cardIds: ["c8"] }); // clubs double -> 16 damage, incoming 10
    expect(run.combat!.enemy.damageTaken).toBe(16);
    run = applyAction(run, { type: "discard", cardIds: ["s6", "s6b"] }); // cover 10 -> vampire drains 5
    expect(run.combat!.enemy.damageTaken).toBe(11);
  });
});

describe("The Headsman — lops a card after each attack", () => {
  it("a surviving play sends one extra card from hand to the discard", () => {
    const e = enemy("H", { decreeId: "headsman", attack: 0, maxHealth: 100 });
    const run = mkRun({ hand: [num("c2", "C", 2), num("c2b", "C", 2), num("c2c", "C", 2), num("c2d", "C", 2)], castle: [e], combat: combat(e) });
    const r = applyAction(run, { type: "play", cardIds: ["c2"] });
    expect(r.table).toHaveLength(1); // the card you played
    expect(r.discard).toHaveLength(1); // the card the Headsman lopped
    expect(r.hand).toHaveLength(2); // 4 - 1 played - 1 lopped
  });
});

describe("The Paranoid Crown — no repeating a suit", () => {
  it("rejects the same suit two turns running, but allows a different suit", () => {
    const e = enemy("S", { decreeId: "paranoid-crown", attack: 0, maxHealth: 100 });
    let run = mkRun({ hand: [num("h4", "H", 4), num("h5", "H", 5), num("c3", "C", 3)], castle: [e], combat: combat(e) });
    run = applyAction(run, { type: "play", cardIds: ["h4"] });
    expect(run.combat!.lastSuits).toEqual(["H"]);
    // a second Hearts play is vetoed
    expect(previewPlay(run, ["h5"]).valid).toBe(false);
    const rejected = applyAction(run, { type: "play", cardIds: ["h5"] });
    expect(rejected.notice).toMatch(/two turns/i);
    expect(rejected.hand.find((c) => c.id === "h5")).toBeTruthy(); // not consumed
    // a Clubs play is allowed
    expect(previewPlay(run, ["c3"]).valid).toBe(true);
  });
});

describe("The Plague Court — a second suit is corrupted", () => {
  it("nullifies the corrupted suit's power (preview reflects it)", () => {
    const e = enemy("S", { decreeId: "plague-court", decreeParam: "H", maxHealth: 100, attack: 0 });
    const run = mkRun({ hand: [num("h7", "H", 7)], castle: [e], combat: combat(e) });
    const p = previewPlay(run, ["h7"]);
    expect(p.heal).toBe(0); // Hearts corrupted -> no heal
    expect(p.damage).toBe(7); // raw damage still lands
  });
});

describe("King enrage escalation", () => {
  it("attack rises once the King is below the threshold", () => {
    const fresh = enemy("S", { tier: "king", attack: 20, maxHealth: 40, enrageAtPct: 0.5, enrageAttackBonus: 5 });
    expect(effectiveAttack(fresh)).toBe(20);
    const wounded = { ...fresh, damageTaken: 20 };
    expect(effectiveAttack(wounded)).toBe(25);
    expect(counterIncoming(wounded)).toBe(25);
  });
});

describe("Usurper's Sigil — the immunity answer", () => {
  it("strips a royal's immunity to its own suit", () => {
    const e = enemy("H", { maxHealth: 100, attack: 0 });
    const without = mkRun({ hand: [num("h7", "H", 7)], castle: [e], combat: combat(e) });
    expect(previewPlay(without, ["h7"]).heal).toBe(0); // immune to Hearts
    const withRelic = mkRun({ slots: ["usurpers-sigil"], hand: [num("h7", "H", 7)], castle: [e], combat: combat(e) });
    expect(previewPlay(withRelic, ["h7"]).heal).toBe(7); // immunity cancelled
  });
});

describe("enemyIntent telegraph", () => {
  it("reports the incoming counter and the decree", () => {
    const e = enemy("H", { decreeId: "executioner", attack: 10, shield: 0 });
    const run = mkRun({ castle: [e], combat: combat(e) });
    const intent = enemyIntent(run)!;
    expect(intent.incoming).toBe(10);
    expect(intent.ignoresShield).toBe(true);
    expect(intent.decrees[0].name).toMatch(/Executioner/);
  });
});

describe("the difficulty curve (tiered decrees)", () => {
  const MILD = ["iron-wall", "vampire", "thick-hide"];
  const STANDARD = ["headsman", "paranoid-crown", "plague-court"];
  const SEVERE = ["executioner", "the-tyrant"];

  it("Jacks draw mild decrees (no stack), Queens standard, Kings severe + a stacked decree", () => {
    const run = createRun("curve-seed");
    for (let i = 1; i <= 3; i++) {
      expect(MILD).toContain(run.castle[i].decreeId);
      expect(run.castle[i].decreeId2 ?? null).toBeNull();
    }
    for (let i = 4; i <= 7; i++) {
      expect(STANDARD).toContain(run.castle[i].decreeId);
    }
    for (let i = 8; i <= 10; i++) {
      expect(SEVERE).toContain(run.castle[i].decreeId);
      expect(run.castle[i].decreeId2).toBeTruthy(); // a stacked second decree
    }
  });

  it("the final King is the Mad King finisher with a stacked severe decree", () => {
    const run = createRun("curve-seed");
    const last = run.castle[run.castle.length - 1];
    expect(last.decreeId).toBe("the-mad-king");
    expect(SEVERE).toContain(last.decreeId2 ?? "");
  });
});
