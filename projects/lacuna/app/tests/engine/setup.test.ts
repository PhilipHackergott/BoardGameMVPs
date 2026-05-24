import { describe, expect, it } from "vitest";
import { createGame, DEFAULT_CONFIG } from "../../src/engine";

describe("setup", () => {
  it("creates 49 stars (7 colors x 7)", () => {
    const g = createGame(123);
    expect(g.stars.length).toBe(49);
    const counts = new Array(7).fill(0);
    for (const s of g.stars) counts[s.color]++;
    expect(counts).toEqual([7, 7, 7, 7, 7, 7, 7]);
  });

  it("places stars inside the field and non-overlapping", () => {
    const g = createGame(456);
    const { fieldR, edgeInset, starR, minCenterDist } = DEFAULT_CONFIG;
    const maxR = fieldR - edgeInset - starR + 1e-6;
    for (const s of g.stars) {
      expect(Math.hypot(s.x, s.y)).toBeLessThanOrEqual(maxR);
    }
    for (let i = 0; i < g.stars.length; i++) {
      for (let j = i + 1; j < g.stars.length; j++) {
        const d = Math.hypot(g.stars[i].x - g.stars[j].x, g.stars[i].y - g.stars[j].y);
        expect(d).toBeGreaterThanOrEqual(minCenterDist - 1e-6);
      }
    }
  });

  it("is deterministic for a given seed", () => {
    const a = createGame(789);
    const b = createGame(789);
    expect(a.stars).toEqual(b.stars);
    const c = createGame(790);
    expect(a.stars).not.toEqual(c.stars);
  });

  it("starts in play with no beacons and P0 to move", () => {
    const g = createGame(1);
    expect(g.phase).toBe("play");
    expect(g.beacons.length).toBe(0);
    expect(g.current).toBe(0);
    expect(g.collected).toEqual([new Array(7).fill(0), new Array(7).fill(0)]);
  });
});
