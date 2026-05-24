import { describe, expect, it } from "vitest";
import { parseSelection, resolvePlay, styleOf } from "../../src/engine/resolution";
import { jokerById, tarotById } from "../../src/engine/content";
import { createRun } from "../../src/engine/run";
import { Card, Enemy, FightingStyleId, Suit, SuitUpgrades } from "../../src/engine/types";

const NO_UPG: SuitUpgrades = { H: 0, D: 0, C: 0, S: 0 };
const num = (suit: Suit, value: number, id = `${suit}${value}-${Math.random()}`): Card => ({
  id,
  suit,
  value,
  kind: "number",
});
const comp = (suit: Suit): Card => ({ id: `${suit}A`, suit, value: 1, kind: "companion" });

function enemy(suit: Suit): Enemy {
  return { tier: "jack", suit, maxHealth: 99, attack: 10, damageTaken: 0, shield: 0, immunityCancelled: false };
}

const lvl = (over: Partial<Record<FightingStyleId, number>>): Record<FightingStyleId, number> => ({
  twoHanded: 0,
  swordShield: 0,
  spear: 0,
  dualWield: 0,
  mage: 0,
  mounted: 0,
  ...over,
});
// resolve a play scaled by the given style levels (vs a Hearts-immune enemy so other suits fire)
const play = (cards: Card[], styleLevels: Record<FightingStyleId, number>, e = enemy("H")) =>
  resolvePlay(cards, e, [], NO_UPG, true, undefined, undefined, {}, styleLevels);

describe("rules change: bigger combos + Ace joins a combo (up to 5 cards)", () => {
  it("accepts a 5-card combo summing <= 10 (five 2s)", () => {
    const p = parseSelection([num("S", 2), num("D", 2), num("C", 2), num("H", 2), num("S", 2)]);
    expect(p.ok).toBe(true);
    expect(p.isCombo).toBe(true);
    expect(p.comboCount).toBe(5);
    expect(p.value).toBe(10);
  });
  it("rejects a 6-card combo (over the 5-card cap)", () => {
    const six = [2, 2, 2, 2, 2, 2].map((v, i) => num("S", v, `c${i}`));
    const p = parseSelection(six);
    expect(p.ok).toBe(false);
  });
  it("accepts an Ace added to a 4-combo (a 5-card play), adding the Ace's value", () => {
    const p = parseSelection([comp("D"), num("D", 2), num("D", 2), num("D", 2), num("D", 2)]);
    expect(p.ok).toBe(true);
    expect(p.comboCount).toBe(4); // still a "combo of 4" for combo jokers
    expect(p.value).toBe(9); // 8 from the combo + 1 from the Ace
  });
  it("rejects an Ace + 5-combo (6 cards)", () => {
    const p = parseSelection([comp("D"), num("D", 2), num("D", 2), num("D", 2), num("D", 2), num("D", 2)]);
    expect(p.ok).toBe(false);
  });
  it("rejects two Animal Companions together", () => {
    expect(parseSelection([comp("D"), comp("S")]).ok).toBe(false);
  });
});

describe("styleOf classifier", () => {
  it("maps card count to the size style", () => {
    expect(styleOf([num("S", 4)]).size).toBe("twoHanded");
    expect(styleOf([num("S", 3), num("D", 3)]).size).toBe("swordShield");
    expect(styleOf([num("S", 3), num("D", 3), num("C", 3)]).size).toBe("spear");
    expect(styleOf([num("S", 2), num("D", 2), num("C", 2), num("H", 2)]).size).toBe("dualWield");
    expect(styleOf([num("S", 2), num("D", 2), num("C", 2), num("H", 2), num("S", 2)]).size).toBe("mage");
  });
  it("flags Mounted when an Ace is present", () => {
    expect(styleOf([comp("S"), num("S", 5)]).mounted).toBe(true);
    expect(styleOf([num("S", 5)]).mounted).toBe(false);
  });
  it("an Animal Companion is the Mounted axis only — it never inflates the size style", () => {
    // Ace + four-of-a-kind is a 5-card play, but the equal-rank group is 4 → Dual Wielding, NOT Mage.
    const aceFour = styleOf([comp("D"), num("D", 2), num("D", 2), num("D", 2), num("D", 2)]);
    expect(aceFour.size).toBe("dualWield");
    expect(aceFour.mounted).toBe(true);
    // A lone Ace reads as a single-card (Two-Handed) play; an Ace + one card stays Two-Handed.
    expect(styleOf([comp("S")]).size).toBe("twoHanded");
    expect(styleOf([comp("S"), num("S", 8)]).size).toBe("twoHanded");
    // Mage demands five same-rank cards — only reachable by deck-shaping (a fresh deck has max four).
    expect(styleOf([num("S", 2), num("D", 2), num("C", 2), num("H", 2), num("S", 2)]).size).toBe("mage");
  });
});

describe("STYLE scaling (curved, floored)", () => {
  it("is inert at level 0", () => {
    const cards = [num("S", 3), num("D", 3), num("C", 3)]; // Spear, base shield 9
    expect(play(cards, lvl({})).shield).toBe(9);
  });
  it("Spear (+1/3 per level) doubles a Spades combo's shield at level 3", () => {
    const cards = [num("S", 3), num("D", 3), num("C", 3)];
    expect(play(cards, lvl({ spear: 3 })).shield).toBe(18); // 9 × (1 + 3/3)
  });
  it("Mage (+1/1 per level) doubles a 5-card play at level 1", () => {
    const cards = [num("S", 2), num("D", 2), num("C", 2), num("H", 2), num("S", 2)]; // value 10
    expect(play(cards, lvl({ mage: 1 })).shield).toBe(20); // 10 × 2
  });
  it("Two-Handed (+1/8 per level) needs 8 levels to double; floors in between", () => {
    expect(play([num("S", 8)], lvl({ twoHanded: 8 })).shield).toBe(16); // 8 × 2
    expect(play([num("S", 7)], lvl({ twoHanded: 3 })).shield).toBe(9); // floor(7 × 1.375) = floor(9.625)
  });
  it("scales club-doubled damage", () => {
    const cards = [num("C", 3), num("D", 3), num("S", 3)]; // Spear, clubs double: base damage 18
    expect(play(cards, lvl({ spear: 3 })).damage).toBe(36); // 18 × 2
  });
  it("does NOT scale plain (non-club) attack damage", () => {
    const r = play([num("S", 8)], lvl({ twoHanded: 8 }));
    expect(r.damage).toBe(8); // damage unchanged …
    expect(r.shield).toBe(16); // … only the suit effect scales
  });
  it("Mounted (+1/5) stacks on the size style when an Ace is in the play", () => {
    // Ace(S) + 8 of Spades = single-card Two-Handed + Mounted (the Ace is the mount), base shield = 9
    const cards = [comp("S"), num("S", 8)];
    expect(play(cards, lvl({ mounted: 5 })).shield).toBe(18); // 9 × (1 + 5/5)
  });
});

describe("§J Fighting-Style jokers (wired into JOKER_LIBRARY)", () => {
  const J = (id: string) => [jokerById(id)!];
  const r = (cards: Card[], jokers: ReturnType<typeof J>) =>
    resolvePlay(cards, enemy("H"), jokers, NO_UPG, true);
  it("Lone Champion: +6 on a single-card play only", () => {
    expect(r([num("S", 5)], J("lone-champion")).damage).toBe(11); // 5 + 6
    expect(r([num("S", 3), num("D", 3)], J("lone-champion")).damage).toBe(6); // combo: no bonus
  });
  it("Twin Fury: ×2 on a 4-card (Dual Wielding) play", () => {
    const four = [num("S", 2), num("D", 2), num("C", 2), num("H", 2)]; // value 8, clubs double → 16…
    // …but Twin Fury then doubles total damage again
    expect(r(four, J("twin-fury")).damage).toBe(32);
  });
  it("Arcane Surge: +25 on a 5-card (Mage) play", () => {
    const five = [num("S", 2), num("D", 2), num("S", 2), num("H", 2), num("S", 2)];
    expect(r(five, J("arcane-surge")).damage).toBe(35); // value 10 (five 2s) + 25
  });
  it("Cavalier: +5 when the play contains an Ace (Mounted)", () => {
    expect(r([comp("S"), num("S", 5)], J("cavalier")).damage).toBe(11); // 6 + 5
    expect(r([num("S", 5)], J("cavalier")).damage).toBe(5); // no Ace: no bonus
  });
});

describe("§A–I catalogue jokers (wired)", () => {
  const J = (id: string) => [jokerById(id)!];
  const r = (cards: Card[], jokers: ReturnType<typeof J>, info?: { gold: number }) =>
    resolvePlay(cards, enemy("S"), jokers, NO_UPG, true, undefined, info ? { fightsWon: 0, gold: info.gold, enemyTier: "jack", jokerCount: 1 } : undefined);
  it("Bloodletter heals +2 per Heart played", () => {
    expect(r([num("H", 4), num("H", 4)], J("bloodletter")).heal).toBe(12); // base 8 + (+2 × 2 hearts)
  });
  it("Headsman's Pride: +3 damage per Spade (vs a Spade-immune foe, base damage still applies)", () => {
    // enemy("S") is Spade-immune (no shield), but the +3/spade damage bonus is independent
    expect(r([num("S", 3), num("S", 3)], J("headsmans-pride")).damage).toBe(12); // 6 + 3×2
  });
  it("Twin Blades: +6 on a 2-combo", () => {
    expect(r([num("D", 3), num("H", 3)], J("twin-blades")).damage).toBe(12); // 6 + 6
  });
  it("The Phalanx: ×3 on a 4-combo", () => {
    expect(r([num("D", 2), num("H", 2), num("D", 2), num("H", 2)], J("the-phalanx")).damage).toBe(24); // 8 × 3
  });
  it("War Chest: +1 damage per 5 gold", () => {
    expect(r([num("D", 5)], J("war-chest"), { gold: 12 }).damage).toBe(7); // 5 + floor(12/5)=2
  });
  it("Court Jester carries the decree-disable flag", () => {
    expect(jokerById("court-jester")!.disablesDecrees).toBe(true);
  });
});

describe("Drills level a Fighting Style (the Planet-card acquisition)", () => {
  it("a Spear Drill raises styleLevels.spear by 1", () => {
    const run = createRun("drill-test");
    expect(run.styleLevels.spear).toBe(0);
    expect(tarotById("drill-spear")!.apply(run)).toBe(true);
    expect(run.styleLevels.spear).toBe(1);
  });
});

describe("Spectral cards (wired)", () => {
  it("Black Hole levels every Fighting Style by 1", () => {
    const run = createRun("bh");
    expect(tarotById("black-hole")!.apply(run)).toBe(true);
    expect(Object.values(run.styleLevels).every((v) => v === 1)).toBe(true);
  });
  it("Immolate destroys 5 hand cards and grants 20 gold (baseline stays consistent)", () => {
    const run = createRun("imm");
    const before = run.deckBaseline;
    const handBefore = run.hand.length;
    const gold = run.gold;
    tarotById("immolate")!.apply(run);
    expect(run.gold).toBe(gold + 20);
    const destroyed = Math.min(5, handBefore);
    expect(run.deckBaseline).toBe(before - destroyed);
  });
  it("Familiar adds 3 cards (net +2 after destroying 1) and keeps the baseline in sync", () => {
    const run = createRun("fam");
    const before = run.deckBaseline;
    const had = run.hand.length;
    tarotById("familiar")!.apply(run);
    const destroyed = had > 0 ? 1 : 0;
    expect(run.deckBaseline).toBe(before - destroyed + 3);
  });
});

describe("Seals", () => {
  it("Gold Seal grants +3 gold when the card is played", () => {
    const c: Card = { id: "g", suit: "S", value: 5, kind: "number", seal: "gold" };
    expect(resolvePlay([c], enemy("H"), [], NO_UPG, true).goldDelta).toBe(3);
  });
  it("Red Seal makes the card's value count twice", () => {
    const c: Card = { id: "r", suit: "S", value: 5, kind: "number", seal: "red" };
    expect(resolvePlay([c], enemy("H"), [], NO_UPG, true).damage).toBe(10); // 5 + 5 (retrigger)
  });
  it("the four Seal spectrals apply their seal", () => {
    const run = createRun("seal");
    const t = run.deck[0];
    expect(tarotById("talisman")!.apply(run, t.id)).toBe(true);
    expect(t.seal).toBe("gold");
  });
});

describe("★ joker hooks (scaling / hand-read / retrigger)", () => {
  it("Echo Herald doubles suit powers on the first play of a fight only", () => {
    const j = [jokerById("echo-herald")!];
    expect(resolvePlay([num("H", 5)], enemy("S"), j, NO_UPG, false).heal).toBe(10); // first play ×2
    expect(resolvePlay([num("H", 5)], enemy("S"), j, NO_UPG, true).heal).toBe(5); // later play unchanged
  });
  it("Coward's Gambit adds 2× the lowest card still in hand", () => {
    const played = num("S", 6, "p6");
    const info = { fightsWon: 0, gold: 0, enemyTier: "jack" as const, jokerCount: 1, handCards: [played, num("S", 2, "h2"), num("S", 9, "h9")] };
    expect(resolvePlay([played], enemy("H"), [jokerById("cowards-gambit")!], NO_UPG, true, undefined, info).damage).toBe(10); // 6 + 2×2
  });
  it("Veteran's Instinct reads its accumulated jokerState", () => {
    const info = { fightsWon: 0, gold: 0, enemyTier: "jack" as const, jokerCount: 1, jokerState: { "veterans-instinct": 6 } };
    expect(resolvePlay([num("S", 5)], enemy("H"), [jokerById("veterans-instinct")!], NO_UPG, true, undefined, info).damage).toBe(11); // 5 + 6
  });
  it("Loose Grip raises the combo cap to 13", () => {
    const cards = [num("S", 6), num("D", 6)]; // sums to 12
    expect(resolvePlay(cards, enemy("H"), [], NO_UPG, true).valid).toBe(false); // > 10 normally
    expect(resolvePlay(cards, enemy("H"), [jokerById("loose-grip")!], NO_UPG, true).valid).toBe(true);
  });
  it("Sworn Number doubles damage for the fight's chosen rank", () => {
    const info = { fightsWon: 0, gold: 0, enemyTier: "jack" as const, jokerCount: 1, swornRank: 7 };
    expect(resolvePlay([num("S", 7)], enemy("H"), [jokerById("sworn-number")!], NO_UPG, true, undefined, info).damage).toBe(14);
    expect(resolvePlay([num("S", 6)], enemy("H"), [jokerById("sworn-number")!], NO_UPG, true, undefined, info).damage).toBe(6);
  });
  it("Lone Wolf scales with empty slots", () => {
    const info = { fightsWon: 0, gold: 0, enemyTier: "jack" as const, jokerCount: 1, emptySlots: 2 };
    expect(resolvePlay([num("S", 6)], enemy("H"), [jokerById("lone-wolf")!], NO_UPG, true, undefined, info).damage).toBe(12); // 6 × (1 + 0.5×2)
  });
  it("Last Stand carries the survive-lethal flag", () => {
    expect(jokerById("last-stand")!.survivesLethal).toBe(true);
  });
  it("Mirror Knight applies the ability of the joker to its right", () => {
    const headsman = jokerById("headsmans-pride")!;
    const base = resolvePlay([num("S", 5)], enemy("H"), [headsman], NO_UPG, true).damage; // 5 + 3
    const copied = resolvePlay([num("S", 5)], enemy("H"), [jokerById("mirror-knight")!, headsman], NO_UPG, true).damage;
    expect(base).toBe(8);
    expect(copied).toBe(11); // Headsman's +3 applied twice
  });
  it("Veteran's Instinct onPlay accumulates +2 per combo", () => {
    const run = { ...createRun("vet"), jokerState: {} as Record<string, number> };
    jokerById("veterans-instinct")!.onPlay!(run as never, { cards: [num("S", 3), num("D", 3)], isCombo: true });
    expect((run.jokerState as Record<string, number>)["veterans-instinct"]).toBe(2);
  });
});

describe("Editions", () => {
  it("Edition flat + mult boost the play's damage (Burnished + Prismatic)", () => {
    const c: Card = { id: "e", suit: "S", value: 6, kind: "number" };
    const info = { fightsWon: 0, gold: 0, enemyTier: "jack" as const, jokerCount: 1, editionFlat: 5, editionMult: 1.5 };
    // (6 + 5) × 1.5 = 16.5 → rounded 17
    expect(resolvePlay([c], enemy("H"), [], NO_UPG, true, undefined, info).damage).toBe(17);
  });
  it("Aura grants a guild member a random edition", () => {
    const run = { ...createRun("aura"), slots: ["field-medic"], slotEditions: {} as Record<string, string> };
    expect(tarotById("aura")!.apply(run as never)).toBe(true);
    expect(["burnished", "haloed", "prismatic"]).toContain((run.slotEditions as Record<string, string>)["field-medic"]);
  });
});
