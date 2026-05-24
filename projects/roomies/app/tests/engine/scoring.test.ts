import { describe, it, expect } from "vitest";
import { scoreEnvironment, scorePlayer, biomeSetCount } from "../../src/engine/scoring";
import type { Card } from "../../src/engine/cards";
import type { EnvInstance, PlayerState } from "../../src/engine/types";

// Build an isolated environment for scoring without running the draft.
function buildEnv(
  defId: string,
  animalDefIds: string[],
  opts?: { dekoration?: boolean; ausbau?: number; jokerIdx?: number[]; extraBiomes?: EnvInstance["extraBiomes"] },
) {
  const cards: Card[] = [{ id: 0, kind: "env", defId }];
  const animalIds: number[] = [];
  const jokered: number[] = [];
  animalDefIds.forEach((ad, i) => {
    const id = i + 1;
    cards.push({ id, kind: "animal", defId: ad });
    animalIds.push(id);
    if (opts?.jokerIdx?.includes(i)) jokered.push(id);
  });
  const env: EnvInstance = {
    cardId: 0,
    defId,
    ausbau: opts?.ausbau ?? 0,
    dekoration: opts?.dekoration ?? false,
    extraBiomes: opts?.extraBiomes ?? [],
    animalIds,
  };
  return { env, cards, jokered };
}

const score = (defId: string, animals: string[], opts?: Parameters<typeof buildEnv>[2]) => {
  const { env, cards, jokered } = buildEnv(defId, animals, opts);
  return scoreEnvironment(env, cards, jokered);
};

describe("Hossi / Mikel paired dependency", () => {
  it("Hossi alone loses 1", () => {
    expect(score("park", ["hossi"]).animals[0].adjusted).toBe(2); // 3 - 1
  });
  it("Hossi with Mikel: both +1", () => {
    const s = score("park", ["hossi", "mikel"]);
    expect(s.animals.find((a) => a.defId === "hossi")!.adjusted).toBe(4); // 3 + 1
    expect(s.animals.find((a) => a.defId === "mikel")!.adjusted).toBe(3); // 2 + 1
    expect(s.subtotal).toBe(7);
  });
  it("Mikel alone loses 1", () => {
    expect(score("park", ["mikel"]).animals[0].adjusted).toBe(1); // 2 - 1
  });
});

describe("Sheeps: herd + security", () => {
  it("2 sheeps, no security: each base 1 - 1 = 0", () => {
    const s = score("feld", ["sheep_white", "sheep_white"]);
    expect(s.subtotal).toBe(0);
  });
  it("3 sheeps, no security: +1 (≥3) and -1 (no security) cancel → 1 each", () => {
    const s = score("feld", ["sheep_white", "sheep_white", "sheep_white"]);
    expect(s.subtotal).toBe(3);
  });
  it("3 sheeps + Security guard: each +1, no penalty", () => {
    const s = score("feld", ["sheep_white", "sheep_white", "sheep_white", "croco"]);
    // sheeps: 1+1 = 2 each (×3 = 6); croco: 2 → 8
    expect(s.subtotal).toBe(8);
  });
});

describe("Sheep colours (⚑ D16 — slight per-colour differences)", () => {
  it("White needs a guard: alone & unguarded → 0", () => {
    expect(score("feld", ["sheep_white"]).subtotal).toBe(0); // 1 - 1
  });
  it("Brown is hardy: alone & unguarded → 1 (no penalty)", () => {
    expect(score("feld", ["sheep_brown"]).subtotal).toBe(1); // never -1
  });
  it("Black herds at ≥2: two black + guard → +1 each", () => {
    const s = score("feld", ["sheep_black", "sheep_black", "croco"]);
    expect(s.subtotal).toBe(2 + 2 + 2); // black 2 each (1+1) + croco 2 = 6
  });
  it("White does NOT herd at 2: two white + guard → base only", () => {
    const s = score("feld", ["sheep_white", "sheep_white", "croco"]);
    expect(s.subtotal).toBe(1 + 1 + 2); // <3 → no +1; guard prevents -1 → 4
  });
  it("Black still wants a guard: two black, no Security → +1 then −1 = base", () => {
    expect(score("feld", ["sheep_black", "sheep_black"]).subtotal).toBe(2); // (1+1-1) ×2
  });
  it("all three colours count toward a shared herd", () => {
    const s = score("feld", ["sheep_white", "sheep_brown", "sheep_black", "croco"]);
    expect(s.subtotal).toBe(2 + 2 + 2 + 2); // each sheep 1+1=2, croco 2 = 8
  });
});

describe("Leo: exactly 4 Schafe", () => {
  it("4 sheeps → +2; Leo also guards them", () => {
    const s = score("feld", ["leo", "sheep_white", "sheep_white", "sheep_white", "sheep_white"]);
    const leo = s.animals.find((a) => a.defId === "leo")!;
    expect(leo.adjusted).toBe(6); // 4 + 2
    // each sheep: 1 + 1 (≥3) , Leo provides security so no penalty → 2 each ×4 = 8
    expect(s.subtotal).toBe(14);
  });
  it("3 sheeps → no Leo bonus", () => {
    const s = score("feld", ["leo", "sheep_white", "sheep_white", "sheep_white"]);
    expect(s.animals.find((a) => a.defId === "leo")!.adjusted).toBe(4);
  });
  it("5 sheeps → no Leo bonus", () => {
    const s = score("feld", ["leo", "sheep_white", "sheep_white", "sheep_white", "sheep_white", "sheep_white"]);
    expect(s.animals.find((a) => a.defId === "leo")!.adjusted).toBe(4);
  });
});

describe("Dalai Lama: isolation", () => {
  it("alone → +2", () => {
    expect(score("reisetasche", ["dalai_lama"]).animals[0].adjusted).toBe(4); // 2 + 2
  });
  it("not alone → no bonus", () => {
    const s = score("park", ["dalai_lama", "marley"]);
    expect(s.animals.find((a) => a.defId === "dalai_lama")!.adjusted).toBe(2);
  });
});

describe("Marty: +1 per Security", () => {
  it("two guards → +2", () => {
    const s = score("trattoria", ["marty", "croco", "rocky"]);
    expect(s.animals.find((a) => a.defId === "marty")!.adjusted).toBe(6); // 4 + 2
  });
  it("no guards → base", () => {
    expect(score("park", ["marty"]).animals[0].adjusted).toBe(4);
  });
});

describe("Joker (Hippo / Verkleidung) is wild: Schaf + Security", () => {
  it("Hippo lets 2 sheeps reach a herd of 3 and provides security", () => {
    const s = score("feld", ["sheep_white", "sheep_white", "hippo"]);
    // schafCount = 3 (2 sheeps + hippo), security present (hippo) → each sheep 1+1 = 2 (×2 = 4); hippo base 0
    expect(s.subtotal).toBe(4);
  });
  it("Verkleidung'd animal counts as Schaf + Security", () => {
    // dromi (base 3) turned Joker, with 2 sheeps → schafCount 3, security present
    const s = score("feld", ["sheep_white", "sheep_white", "dromi"], { jokerIdx: [2] });
    // sheeps 2 each (×2 = 4) + dromi base 3 = 7
    expect(s.subtotal).toBe(7);
  });
});

describe("multipliers", () => {
  it("×2 environment doubles the subtotal", () => {
    const s = score("cafe", ["croco"]); // base 2, ×2
    expect(s.total).toBe(4);
    expect(s.multiplier).toBe(2);
  });
  it("×1 environment leaves the subtotal", () => {
    const s = score("park", ["bob"]); // base 4, ×1
    expect(s.total).toBe(4);
  });
});

describe("Dekoration: clamp mechanism (⚑ FINDING — currently a no-op with these numbers)", () => {
  // With the given base points and ±1 modifiers, the lowest any single animal can reach is 0
  // (Sheep: 1 +0 -1 = 0; Mikel: 2 -1 = 1; Hossi: 3 -1 = 2). So no animal is ever negative, and
  // Dekoration's "keine Minuspunkte" clamp never actually changes a score. This is worth raising
  // at the playtest gate: Dekoration is effectively a dead card unless base/penalty values change
  // or a different clamp interpretation (e.g. clamp the env subtotal) is intended.
  it("a lone Sheep floors at 0 even without Dekoration", () => {
    expect(score("feld", ["sheep_white"]).subtotal).toBe(0); // 1 - 1, never negative
  });
  it("Dekoration does not change a (non-negative) environment", () => {
    const without = score("park", ["hossi", "mikel", "sheep_white"]).subtotal;
    const withDeko = score("park", ["hossi", "mikel", "sheep_white"], { dekoration: true }).subtotal;
    expect(withDeko).toBe(without);
  });
});

describe("biome set-collection (⚑ D7)", () => {
  function player(envDefs: { defId: string; extraBiomes?: EnvInstance["extraBiomes"] }[]): PlayerState {
    return {
      id: 0,
      pool: [],
      discard: [],
      environments: envDefs.map((e, i) => ({
        cardId: i,
        defId: e.defId,
        ausbau: 0,
        dekoration: false,
        extraBiomes: e.extraBiomes ?? [],
        animalIds: [],
      })),
    };
  }
  it("one of each biome → 1 set", () => {
    const p = player([{ defId: "wohnzimmer" }, { defId: "cafe" }, { defId: "feld" }]); // zuhause, stadt, natur
    expect(biomeSetCount(p)).toBe(1);
  });
  it("missing a biome → 0 sets", () => {
    const p = player([{ defId: "wohnzimmer" }, { defId: "cafe" }]); // zuhause, stadt only
    expect(biomeSetCount(p)).toBe(0);
  });
  it("improvement-added biome completes a set", () => {
    const p = player([{ defId: "wohnzimmer" }, { defId: "cafe" }, { defId: "bulli", extraBiomes: ["natur"] }]);
    expect(biomeSetCount(p)).toBe(1);
  });
  it("biome bonus folds into player total", () => {
    const p = player([{ defId: "wohnzimmer" }, { defId: "cafe" }, { defId: "feld" }]);
    const s = scorePlayer(p, [], []);
    expect(s.biomeSets).toBe(1);
    expect(s.biomeBonus).toBe(6);
    expect(s.total).toBe(6); // no animals, just the set bonus
  });
});
