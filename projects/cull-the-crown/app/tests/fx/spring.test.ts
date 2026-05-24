import { describe, expect, it } from "vitest";
import { Spring } from "../../src/fx/spring";
import { clamp01, easeOutBack, easeOutCubic, lerp, linear } from "../../src/fx/easing";

describe("Spring", () => {
  it("converges to its target and comes to rest", () => {
    const s = new Spring(0);
    s.to(100);
    let steps = 0;
    while (!s.atRest && steps < 2000) {
      s.update(1 / 60);
      steps++;
    }
    expect(s.atRest).toBe(true);
    expect(s.value).toBeCloseTo(100, 3);
    expect(steps).toBeLessThan(2000);
  });

  it("snap jumps with no motion", () => {
    const s = new Spring(0);
    s.snap(42);
    expect(s.value).toBe(42);
    expect(s.atRest).toBe(true);
  });

  it("stays finite under a large dt (sub-stepping keeps it stable)", () => {
    const s = new Spring(0, { stiffness: 400, damping: 12 });
    s.to(50);
    for (let i = 0; i < 10; i++) s.update(0.5); // huge frame gaps
    expect(Number.isFinite(s.value)).toBe(true);
    expect(s.value).toBeCloseTo(50, 1);
  });

  it("a velocity kick moves the value away before it settles back", () => {
    const s = new Spring(0);
    s.kick(200);
    s.update(1 / 60);
    expect(s.value).toBeGreaterThan(0);
  });
});

describe("easing", () => {
  it("all easings map endpoints 0->0 and 1->1", () => {
    for (const f of [linear, easeOutCubic, easeOutBack]) {
      expect(f(0)).toBeCloseTo(0, 5);
      expect(f(1)).toBeCloseTo(1, 5);
    }
  });
  it("easeOutBack overshoots past 1 in the middle-late range", () => {
    expect(easeOutBack(0.8)).toBeGreaterThan(1);
  });
  it("clamp01 and lerp behave", () => {
    expect(clamp01(-2)).toBe(0);
    expect(clamp01(5)).toBe(1);
    expect(lerp(0, 10, 0.5)).toBe(5);
  });
});
