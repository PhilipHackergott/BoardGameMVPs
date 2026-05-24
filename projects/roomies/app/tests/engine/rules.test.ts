import { describe, it, expect } from "vitest";
import { createGame } from "../../src/engine/setup";
import { applyAction } from "../../src/engine/rules";
import type { EnvInstance, GameState } from "../../src/engine/types";

function envCardId(state: GameState, defId: string): number {
  return state.cards.find((c) => c.kind === "env" && c.defId === defId)!.id;
}
function animalCardId(state: GameState, defId: string, skip = 0): number {
  return state.cards.filter((c) => c.kind === "animal" && c.defId === defId)[skip].id;
}
function improvementCardId(state: GameState, defId: string): number {
  return state.cards.find((c) => c.kind === "improvement" && c.defId === defId)!.id;
}
function giveEnv(state: GameState, player: number, defId: string): EnvInstance {
  const env: EnvInstance = { cardId: envCardId(state, defId), defId, ausbau: 0, dekoration: false, extraBiomes: [], animalIds: [] };
  state.players[player].environments.push(env);
  return env;
}

describe("draft phase: pick-and-pass into pool", () => {
  it("a pick moves the card to the player's pool and advances the seat", () => {
    const g = createGame({ players: 2, handSize: 3 }, 1);
    const a = g.hands[0][0];
    const next = applyAction(g, { type: "draftPick", cardId: a });
    expect(next.players[0].pool).toEqual([a]);
    expect(next.hands[0]).not.toContain(a);
    expect(next.current).toBe(1);
    expect(next.phase).toBe("draft");
  });

  it("after both pick, hands pass one seat (2 players swap)", () => {
    const g = createGame({ players: 2, handSize: 3 }, 1);
    g.hands[0] = [10, 11, 12];
    g.hands[1] = [20, 21, 22];
    let s = applyAction(g, { type: "draftPick", cardId: 10 });
    s = applyAction(s, { type: "draftPick", cardId: 20 });
    expect(s.pick).toBe(1);
    expect(s.current).toBe(0);
    expect(s.hands[0]).toEqual([21, 22]); // player 1's remaining now in front of player 0
    expect(s.hands[1]).toEqual([11, 12]);
  });

  it("drafting empties hands and enters the PLACE phase", () => {
    const g = createGame({ players: 2, handSize: 2, rounds: 1 }, 1);
    // 2 players × 2 picks = drain in 2 pick-rounds.
    let s: GameState = g;
    for (let i = 0; i < 4; i++) s = applyAction(s, { type: "draftPick", cardId: s.hands[s.current][0] });
    expect(s.phase).toBe("place");
    expect(s.players.every((p) => p.pool.length === 2)).toBe(true);
    expect(s.hands.every((h) => h.length === 0)).toBe(true);
  });
});

describe("draft intercepts fire on the pick", () => {
  it("Dalai Lama drafted → queues an extra rotation", () => {
    const g = createGame({ players: 3, handSize: 3 }, 1);
    const dalai = animalCardId(g, "dalai_lama");
    g.hands[0] = [dalai, 91, 92];
    const next = applyAction(g, { type: "draftPick", cardId: dalai });
    expect(next.extraRotations).toBe(1);
    expect(next.current).toBe(1);
    expect(next.players[0].pool).toContain(dalai); // still goes to the pool
  });

  it("Marty drafted → pending swap; resolving queues it for the pass step", () => {
    const g = createGame({ players: 3, handSize: 3 }, 1);
    const marty = animalCardId(g, "marty");
    g.hands[0] = [marty, 91, 92];
    const played = applyAction(g, { type: "draftPick", cardId: marty });
    expect(played.pending).toEqual({ type: "martySwap", cardId: marty, options: [1, 2] });
    expect(played.current).toBe(0); // does not advance until resolved

    const resolved = applyAction(played, { type: "resolveMarty", withPlayer: 2 });
    expect(resolved.pending).toBeNull();
    expect(resolved.pendingSwaps).toEqual([{ from: 0, to: 2 }]);
    expect(resolved.current).toBe(1);
  });
});

describe("place phase: arranging the pool", () => {
  function placeState(): GameState {
    const g = createGame({ players: 2, handSize: 6, rounds: 1 }, 1);
    g.phase = "place";
    g.current = 0;
    g.hands = [[], []];
    return g;
  }

  it("plays an environment from the pool as a new room", () => {
    const g = placeState();
    const park = envCardId(g, "park");
    g.players[0].pool = [park];
    const next = applyAction(g, { type: "place", cardId: park });
    expect(next.players[0].environments.map((e) => e.defId)).toEqual(["park"]);
    expect(next.players[0].pool).toEqual([]);
    expect(next.current).toBe(0); // same player keeps placing
  });

  it("places an animal only if Raum allows", () => {
    const g = placeState();
    const cafe = giveEnv(g, 0, "cafe"); // Raum 3
    const leo = animalCardId(g, "leo"); // Raum 4
    const sheep = animalCardId(g, "sheep_white"); // Raum 1
    g.players[0].pool = [leo, sheep];
    expect(() => applyAction(g, { type: "place", cardId: leo, targetEnvCardId: cafe.cardId })).toThrow(/room/i);
    const next = applyAction(g, { type: "place", cardId: sheep, targetEnvCardId: cafe.cardId });
    expect(next.players[0].environments[0].animalIds).toContain(sheep);
  });

  it("Ausbau raises capacity; Verkleidung jokers a placed animal", () => {
    const g = placeState();
    const cafe = giveEnv(g, 0, "cafe");
    const dromi = animalCardId(g, "dromi");
    cafe.animalIds.push(dromi);
    const ausbau = improvementCardId(g, "ausbau");
    const verk = improvementCardId(g, "verkleidung");
    g.players[0].pool = [ausbau, verk];
    let s = applyAction(g, { type: "place", cardId: ausbau, targetEnvCardId: cafe.cardId });
    expect(s.players[0].environments[0].ausbau).toBe(1);
    s = applyAction(s, { type: "place", cardId: verk, targetAnimalCardId: dromi });
    expect(s.jokered).toContain(dromi);
  });

  it("endPlacement discards leftovers and advances; last player ends the game", () => {
    const g = placeState(); // rounds: 1
    g.players[0].pool = [envCardId(g, "park")];
    g.players[1].pool = [envCardId(g, "feld")];
    let s = applyAction(g, { type: "endPlacement" }); // player 0 done (park leftover -> discard)
    expect(s.current).toBe(1);
    expect(s.players[0].pool).toEqual([]);
    expect(s.players[0].discard).toContain(envCardId(g, "park"));
    s = applyAction(s, { type: "endPlacement" }); // player 1 done -> last round -> end
    expect(s.phase).toBe("ended");
    expect(s.scores).not.toBeNull();
  });
});
