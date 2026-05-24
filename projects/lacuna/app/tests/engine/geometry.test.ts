import { describe, expect, it } from "vitest";
import { nearestBeaconOwner, pointSegInfo, projectOnSegment, segmentClear } from "../../src/engine";
import type { Beacon, Star } from "../../src/engine";

const star = (id: number, x: number, y: number, color = 0): Star => ({ id, x, y, color });
const beacon = (id: number, owner: 0 | 1, x: number, y: number): Beacon => ({ id, owner, x, y });

describe("pointSegInfo", () => {
  it("computes perpendicular distance and interior projection", () => {
    const info = pointSegInfo({ x: 50, y: 10 }, { x: 0, y: 0 }, { x: 100, y: 0 });
    expect(info.distance).toBeCloseTo(10);
    expect(info.t).toBeCloseTo(0.5);
  });

  it("reports t outside (0,1) when the foot is beyond an endpoint", () => {
    const info = pointSegInfo({ x: -20, y: 0 }, { x: 0, y: 0 }, { x: 100, y: 0 });
    expect(info.t).toBeLessThan(0);
  });
});

describe("projectOnSegment", () => {
  const a = { x: 0, y: 0 };
  const b = { x: 100, y: 0 };

  it("projects onto the interior with the perpendicular distance", () => {
    const p = projectOnSegment({ x: 40, y: 12 }, a, b);
    expect(p.x).toBeCloseTo(40);
    expect(p.y).toBeCloseTo(0);
    expect(p.t).toBeCloseTo(0.4);
    expect(p.distance).toBeCloseTo(12);
  });

  it("clamps the foot to the nearer endpoint when beyond the segment", () => {
    const before = projectOnSegment({ x: -30, y: 5 }, a, b);
    expect(before.t).toBe(0);
    expect(before.x).toBeCloseTo(0);
    const after = projectOnSegment({ x: 150, y: 5 }, a, b);
    expect(after.t).toBe(1);
    expect(after.x).toBeCloseTo(100);
  });
});

describe("segmentClear", () => {
  const a = star(0, 0, 0);
  const b = star(1, 100, 0);

  it("is clear when nothing lies on the line", () => {
    const stars = [a, b, star(2, 50, 40)];
    expect(segmentClear(a, b, stars, [], 12, 9)).toBe(true);
  });

  it("is blocked by a star sitting on the line", () => {
    const stars = [a, b, star(2, 50, 3)]; // within starR=12 of the segment
    expect(segmentClear(a, b, stars, [], 12, 9)).toBe(false);
  });

  it("ignores a star whose projection is beyond an endpoint", () => {
    const stars = [a, b, star(2, -10, 0)];
    expect(segmentClear(a, b, stars, [], 12, 9)).toBe(true);
  });

  it("is blocked by a beacon on the line", () => {
    expect(segmentClear(a, b, [a, b], [beacon(0, 0, 50, 2)], 12, 9)).toBe(false);
  });
});

describe("nearestBeaconOwner", () => {
  it("awards to the closest beacon's owner", () => {
    const owner = nearestBeaconOwner(star(0, 10, 0), [beacon(0, 0, 0, 0), beacon(1, 1, 100, 0)]);
    expect(owner).toBe(0);
  });

  it("returns null when equidistant between different owners", () => {
    const owner = nearestBeaconOwner(star(0, 50, 0), [beacon(0, 0, 0, 0), beacon(1, 1, 100, 0)]);
    expect(owner).toBeNull();
  });

  it("returns null when there are no beacons", () => {
    expect(nearestBeaconOwner(star(0, 0, 0), [])).toBeNull();
  });
});
