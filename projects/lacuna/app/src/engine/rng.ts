// Deterministic PRNG (mulberry32). The ONLY source of randomness in the engine,
// so a game is fully reproducible from its seed.

export interface Rng {
  next(): number; // float in [0, 1)
  range(min: number, max: number): number; // float in [min, max)
}

export function makeRng(seed: number): Rng {
  let a = seed >>> 0;
  const next = (): number => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    range: (min: number, max: number) => min + next() * (max - min),
  };
}
